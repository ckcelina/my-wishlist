
import { Platform } from 'react-native';
import { supabase } from '@/lib/supabase';
import { logError } from './observability';
import { appConfig, isEnvironmentConfigured, getConfigurationErrorMessage } from './environmentConfig';
import Constants from 'expo-constants';

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🔌 API CLIENT - UNIFIED INTERFACE FOR BACKEND & SUPABASE EDGE FUNCTIONS
 * ═══════════════════════════════════════════════════════════════════════════
 * This file provides a unified API client for:
 * 1. Backend API (Specular) - for app-specific endpoints
 * 2. Supabase Edge Functions - for location, alerts, and health endpoints
 * 
 * Features:
 * - Centralized base URL configuration from utils/environmentConfig.ts
 * - Runtime validation of environment variables
 * - Proper URL construction (no relative paths)
 * - Comprehensive error logging
 * - Authentication header injection
 * - Dev-only request/response logging (NO TOKEN LEAKS)
 * - Automatic routing of /api/* paths to Supabase Edge Functions
 * ═══════════════════════════════════════════════════════════════════════════
 */

// Get backend URL from app config
const BACKEND_URL = Constants.expoConfig?.extra?.backendUrl || '';

if (__DEV__) {
  console.log('[API] ═══════════════════════════════════════════════════');
  console.log('[API] 🔌 API CLIENT INITIALIZATION');
  console.log('[API] ═══════════════════════════════════════════════════');
  console.log('[API] Backend URL:', BACKEND_URL || '❌ NOT CONFIGURED');
  console.log('[API] Supabase Edge Functions URL:', appConfig.supabaseEdgeFunctionsUrl || '❌ NOT CONFIGURED');
  console.log('[API] Platform:', Platform.OS);
  console.log('[API] Build Type:', __DEV__ ? 'Development' : 'Production');
  console.log('[API] ═══════════════════════════════════════════════════');
}

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * API ENDPOINT ROUTING - MAP /api/* TO SUPABASE EDGE FUNCTIONS
 * ═══════════════════════════════════════════════════════════════════════════
 */

interface RouteMapping {
  edgeFunctionName: string;
  isEdgeFunction: boolean;
}

/**
 * Map legacy /api/* paths to Supabase Edge Functions
 * Returns the Edge Function name and whether it should use Edge Functions
 */
function mapApiPathToEdgeFunction(path: string): RouteMapping {
  // Normalize path (remove leading slash if present)
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;

  // Map specific paths to Edge Functions
  // NOTE: /api/users/location is handled by backend API, not Edge Functions
  const edgeFunctionMappings: Record<string, string> = {
    '/api/location/search-cities': 'location-search-cities',
    '/api/location/smart-settings': 'location-smart-settings',
    '/api/location/detect-ip': 'location-detect-ip',
    '/api/alert-settings': 'alert-settings',
    '/api/alert-settings/items-with-targets': 'alert-items-with-targets',
    '/api/health': 'health',
  };

  // Check if this path should be routed to an Edge Function
  if (edgeFunctionMappings[normalizedPath]) {
    return {
      edgeFunctionName: edgeFunctionMappings[normalizedPath],
      isEdgeFunction: true,
    };
  }

  // Default: use backend API
  return {
    edgeFunctionName: '',
    isEdgeFunction: false,
  };
}

/**
 * Get bearer token from Supabase session
 */
async function getBearerToken(): Promise<string | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      if (__DEV__) {
        console.log('[API] ✅ Using Supabase access token');
      }
      return session.access_token;
    }
    if (__DEV__) {
      console.log('[API] ⚠️ No access token available');
    }
    return null;
  } catch (error) {
    console.error('[API] ❌ Failed to get bearer token:', error);
    logError(error instanceof Error ? error : new Error(String(error)), {
      context: 'getBearerToken',
    });
    return null;
  }
}

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CORE AUTHENTICATED FETCH - WITH VALIDATION & DEV-ONLY LOGGING
 * ═══════════════════════════════════════════════════════════════════════════
 */

/**
 * Core authenticated fetch function with:
 * - Base URL validation (never calls undefined/invalid URLs)
 * - Dev-only request/response logging (NO TOKEN LEAKS)
 * - Automatic routing to Supabase Edge Functions for specific paths
 * - Proper error handling
 */
async function authenticatedFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  // Check if this endpoint should be routed to an Edge Function
  const routing = mapApiPathToEdgeFunction(endpoint);

  if (routing.isEdgeFunction) {
    // Route to Supabase Edge Function
    if (__DEV__) {
      console.log(`[API] 🔀 Routing ${endpoint} → Edge Function: ${routing.edgeFunctionName}`);
    }
    return callEdgeFunction<T>(routing.edgeFunctionName, options);
  }

  // Otherwise, use backend API
  if (!BACKEND_URL) {
    const error = new Error('API base URL missing or invalid. Check env.ts and app config.');
    console.error('[API] ❌', error.message);
    throw error;
  }

  // Validate base URL
  try {
    new URL(BACKEND_URL);
  } catch {
    const error = new Error('API base URL missing or invalid. Check env.ts and app config.');
    console.error('[API] ❌', error.message);
    throw error;
  }

  const url = `${BACKEND_URL}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
  const token = await getBearerToken();
  const method = options.method || 'GET';

  const headers: HeadersInit = {
    ...options.headers,
  };

  // Only add Content-Type for requests with a body
  if (options.body && method !== 'GET' && method !== 'DELETE') {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Dev-only logging (NO TOKEN LEAKS)
  if (__DEV__) {
    console.log(`[API] 📤 ${method} ${url}`);
    if (options.body) {
      const bodyPreview = typeof options.body === 'string' 
        ? options.body.substring(0, 200) 
        : JSON.stringify(options.body).substring(0, 200);
      console.log(`[API] 📦 Body: ${bodyPreview}${bodyPreview.length >= 200 ? '...' : ''}`);
    }
  }

  try {
    const response = await fetch(url, {
      ...options,
      method,
      headers,
    });

    // Dev-only response logging
    if (__DEV__) {
      console.log(`[API] 📥 ${method} ${url} - Status: ${response.status} ${response.statusText}`);
    }

    if (!response.ok) {
      const errorText = await response.clone().text();
      const errorPreview = errorText.substring(0, 200);
      
      if (__DEV__) {
        console.error(`[API] ❌ Request failed: ${method} ${url}`);
        console.error(`[API] Status: ${response.status} ${response.statusText}`);
        console.error(`[API] Response: ${errorPreview}${errorPreview.length >= 200 ? '...' : ''}`);
      }

      const error = new Error(`API request failed: ${response.status} ${errorText}`);
      logError(error, {
        context: 'authenticatedFetch',
        endpoint,
        status: response.status,
        url,
        method,
      });

      throw error;
    }

    const data = await response.json();

    if (__DEV__) {
      const dataPreview = JSON.stringify(data).substring(0, 200);
      console.log(`[API] ✅ Response: ${dataPreview}${dataPreview.length >= 200 ? '...' : ''}`);
    }

    return data;
  } catch (error) {
    console.error(`[API] ❌ Network or API error: ${method} ${url}`);
    console.error('[API] Error details:', error);

    logError(error instanceof Error ? error : new Error(String(error)), {
      context: 'authenticatedFetch',
      endpoint,
      url,
      method,
    });
    throw error;
  }
}

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * SUPABASE EDGE FUNCTIONS
 * ═══════════════════════════════════════════════════════════════════════════
 */

/**
 * Call a Supabase Edge Function with authentication
 * Includes all required headers: Authorization + apikey
 */
async function callEdgeFunction<T>(
  functionName: string,
  options: RequestInit = {}
): Promise<T> {
  // Validate environment configuration
  if (!isEnvironmentConfigured()) {
    const error = new Error(getConfigurationErrorMessage());
    console.error('[API] ❌', error.message);
    throw error;
  }

  if (!appConfig.supabaseEdgeFunctionsUrl) {
    const error = new Error('API base URL missing or invalid. Check env.ts and app config.');
    console.error('[API] ❌', error.message);
    throw error;
  }

  const url = `${appConfig.supabaseEdgeFunctionsUrl}/${functionName}`;
  const token = await getBearerToken();
  const method = options.method || 'GET';

  const headers: HeadersInit = {
    ...options.headers,
    'apikey': appConfig.supabaseAnonKey,
  };

  // Only add Content-Type for requests with a body
  if (options.body && method !== 'GET' && method !== 'DELETE') {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Dev-only logging (NO TOKEN LEAKS)
  if (__DEV__) {
    console.log(`[API] 📤 ${method} ${url}`);
    if (options.body) {
      const bodyPreview = typeof options.body === 'string' 
        ? options.body.substring(0, 200) 
        : JSON.stringify(options.body).substring(0, 200);
      console.log(`[API] 📦 Body: ${bodyPreview}${bodyPreview.length >= 200 ? '...' : ''}`);
    }
  }

  try {
    const response = await fetch(url, {
      ...options,
      method,
      headers,
    });

    // Dev-only response logging
    if (__DEV__) {
      console.log(`[API] 📥 ${method} ${url} - Status: ${response.status} ${response.statusText}`);
    }

    if (!response.ok) {
      const errorText = await response.clone().text();
      const errorPreview = errorText.substring(0, 200);
      
      if (__DEV__) {
        console.error(`[API] ❌ Edge Function failed: ${method} ${url}`);
        console.error(`[API] Status: ${response.status} ${response.statusText}`);
        console.error(`[API] Response: ${errorPreview}${errorPreview.length >= 200 ? '...' : ''}`);
      }

      const error = new Error(`Edge Function request failed: ${response.status} ${errorText}`);
      logError(error, {
        context: 'callEdgeFunction',
        functionName,
        method,
        status: response.status,
        url,
      });

      throw error;
    }

    const data = await response.json();

    if (__DEV__) {
      const dataPreview = JSON.stringify(data).substring(0, 200);
      console.log(`[API] ✅ Response: ${dataPreview}${dataPreview.length >= 200 ? '...' : ''}`);
    }

    return data;
  } catch (error) {
    console.error(`[API] ❌ Network or API error: ${method} ${url}`);
    console.error('[API] Error details:', error);

    logError(error instanceof Error ? error : new Error(String(error)), {
      context: 'callEdgeFunction',
      functionName,
      method,
      url,
    });
    throw error;
  }
}

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PUBLIC API - CONVENIENCE METHODS
 * ═══════════════════════════════════════════════════════════════════════════
 */

/**
 * Make an authenticated GET request
 * Automatically routes to Edge Functions for specific paths
 */
export async function authenticatedGet<T>(endpoint: string): Promise<T> {
  return authenticatedFetch<T>(endpoint, { method: 'GET' });
}

/**
 * Make an authenticated POST request
 * Automatically routes to Edge Functions for specific paths
 */
export async function authenticatedPost<T>(endpoint: string, data: any): Promise<T> {
  return authenticatedFetch<T>(endpoint, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Make an authenticated PUT request
 * Automatically routes to Edge Functions for specific paths
 */
export async function authenticatedPut<T>(endpoint: string, data: any): Promise<T> {
  return authenticatedFetch<T>(endpoint, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

/**
 * Make an authenticated DELETE request
 * Automatically routes to Edge Functions for specific paths
 */
export async function authenticatedDelete<T>(endpoint: string): Promise<T> {
  return authenticatedFetch<T>(endpoint, {
    method: 'DELETE',
  });
}

/**
 * Make a public GET request (no authentication)
 */
export async function apiGet<T>(endpoint: string): Promise<T> {
  if (!BACKEND_URL) {
    const error = new Error('API base URL missing or invalid. Check env.ts and app config.');
    console.error('[API] ❌', error.message);
    throw error;
  }

  const url = `${BACKEND_URL}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

  if (__DEV__) {
    console.log(`[API] 📤 GET (public) ${url}`);
  }

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (__DEV__) {
      console.log(`[API] 📥 GET ${url} - Status: ${response.status} ${response.statusText}`);
    }

    if (!response.ok) {
      const errorText = await response.clone().text();
      const errorPreview = errorText.substring(0, 200);
      
      if (__DEV__) {
        console.error(`[API] ❌ Request failed: GET ${url}`);
        console.error(`[API] Status: ${response.status} ${response.statusText}`);
        console.error(`[API] Response: ${errorPreview}${errorPreview.length >= 200 ? '...' : ''}`);
      }

      const error = new Error(`API request failed: ${response.status} ${errorText}`);
      logError(error, {
        context: 'apiGet',
        endpoint,
        status: response.status,
        url,
      });

      throw error;
    }

    const data = await response.json();

    if (__DEV__) {
      const dataPreview = JSON.stringify(data).substring(0, 200);
      console.log(`[API] ✅ Response: ${dataPreview}${dataPreview.length >= 200 ? '...' : ''}`);
    }

    return data;
  } catch (error) {
    console.error(`[API] ❌ Network or API error: GET ${url}`);
    console.error('[API] Error details:', error);

    logError(error instanceof Error ? error : new Error(String(error)), {
      context: 'apiGet',
      endpoint,
      url,
    });
    throw error;
  }
}

/**
 * Make a public POST request (no authentication)
 */
export async function apiPost<T>(endpoint: string, data: any): Promise<T> {
  if (!BACKEND_URL) {
    const error = new Error('API base URL missing or invalid. Check env.ts and app config.');
    console.error('[API] ❌', error.message);
    throw error;
  }

  const url = `${BACKEND_URL}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

  if (__DEV__) {
    console.log(`[API] 📤 POST (public) ${url}`);
    const bodyPreview = JSON.stringify(data).substring(0, 200);
    console.log(`[API] 📦 Body: ${bodyPreview}${bodyPreview.length >= 200 ? '...' : ''}`);
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (__DEV__) {
      console.log(`[API] 📥 POST ${url} - Status: ${response.status} ${response.statusText}`);
    }

    if (!response.ok) {
      const errorText = await response.clone().text();
      const errorPreview = errorText.substring(0, 200);
      
      if (__DEV__) {
        console.error(`[API] ❌ Request failed: POST ${url}`);
        console.error(`[API] Status: ${response.status} ${response.statusText}`);
        console.error(`[API] Response: ${errorPreview}${errorPreview.length >= 200 ? '...' : ''}`);
      }

      const error = new Error(`API request failed: ${response.status} ${errorText}`);
      logError(error, {
        context: 'apiPost',
        endpoint,
        status: response.status,
        url,
      });

      throw error;
    }

    const responseData = await response.json();

    if (__DEV__) {
      const dataPreview = JSON.stringify(responseData).substring(0, 200);
      console.log(`[API] ✅ Response: ${dataPreview}${dataPreview.length >= 200 ? '...' : ''}`);
    }

    return responseData;
  } catch (error) {
    console.error(`[API] ❌ Network or API error: POST ${url}`);
    console.error('[API] Error details:', error);

    logError(error instanceof Error ? error : new Error(String(error)), {
      context: 'apiPost',
      endpoint,
      url,
    });
    throw error;
  }
}

/**
 * Normalize city name for consistent comparisons
 * Matches backend normalization logic
 */
export function normalizeCityName(city: string | null | undefined): string {
  if (!city) return '';

  return city
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' '); // Replace multiple spaces with single space
}
