
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { supabase } from '@/lib/supabase';
import { logError, logEvent } from './observability';
import { ENV, validateEnv } from '@/src/config/env';

// ═══════════════════════════════════════════════════════════════════════════
// 🔌 API CLIENT - SUPABASE EDGE FUNCTIONS + LEGACY BACKEND SUPPORT
// ═══════════════════════════════════════════════════════════════════════════
// This file provides a unified API client with:
// - Supabase Edge Functions for new endpoints
// - Legacy backend support for existing endpoints
// - Centralized base URL configuration from src/config/env.ts
// - Runtime validation of environment variables
// - Proper URL construction (no relative paths)
// - Comprehensive error logging
// - Authentication header injection
// ═══════════════════════════════════════════════════════════════════════════

const BEARER_TOKEN_KEY = 'wishzen_bearer_token';

console.log('[API] ═══════════════════════════════════════════════════');
console.log('[API] 🔌 API CLIENT INITIALIZATION');
console.log('[API] ═══════════════════════════════════════════════════');
console.log('[API] API Base URL:', ENV.API_BASE_URL || '❌ NOT CONFIGURED');
console.log('[API] Supabase Edge Functions URL:', ENV.SUPABASE_EDGE_FUNCTIONS_URL || '❌ NOT CONFIGURED');
console.log('[API] Platform:', Platform.OS);
console.log('[API] Build Type:', __DEV__ ? 'Development' : 'Production');
console.log('[API] ═══════════════════════════════════════════════════');

/**
 * Get bearer token from Supabase session or Better Auth storage
 */
async function getBearerToken(): Promise<string | null> {
  try {
    // Try Supabase session first
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      if (__DEV__) {
        console.log('[API] Using Supabase access token');
      }
      return session.access_token;
    }

    // Fallback to Better Auth token
    if (Platform.OS === 'web') {
      const token = localStorage.getItem(BEARER_TOKEN_KEY);
      if (__DEV__) {
        console.log('[API] Using Better Auth token from localStorage');
      }
      return token;
    } else {
      const token = await SecureStore.getItemAsync(BEARER_TOKEN_KEY);
      if (__DEV__) {
        console.log('[API] Using Better Auth token from SecureStore');
      }
      return token;
    }
  } catch (error) {
    console.error('[API] Failed to get bearer token:', error);
    logError(error instanceof Error ? error : new Error(String(error)), {
      context: 'getBearerToken',
    });
    return null;
  }
}

/**
 * Construct full API URL from base URL and endpoint path
 * Ensures base URL never ends with / and path always starts with /
 */
function constructApiUrl(endpoint: string): string {
  // Validate environment configuration
  const validationError = validateEnv();
  if (validationError) {
    const error = new Error(`[API] Environment configuration error: ${validationError}`);
    console.error(error.message);
    throw error;
  }

  if (!ENV.API_BASE_URL) {
    const error = new Error('[API] API_BASE_URL is not configured. Cannot make API call.');
    console.error(error.message);
    throw error;
  }

  // Ensure endpoint starts with /
  const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  
  // Construct full URL (base URL already has trailing slashes removed)
  const fullUrl = `${ENV.API_BASE_URL}${normalizedEndpoint}`;
  
  if (__DEV__) {
    console.log('[API] Constructed URL:', fullUrl);
  }
  
  return fullUrl;
}

/**
 * Construct Supabase Edge Function URL
 */
function constructEdgeFunctionUrl(functionName: string): string {
  if (!ENV.SUPABASE_EDGE_FUNCTIONS_URL) {
    const error = new Error('[API] SUPABASE_EDGE_FUNCTIONS_URL is not configured. Cannot call Edge Function.');
    console.error(error.message);
    throw error;
  }

  const fullUrl = `${ENV.SUPABASE_EDGE_FUNCTIONS_URL}/${functionName}`;
  
  if (__DEV__) {
    console.log('[API] Edge Function URL:', fullUrl);
  }
  
  return fullUrl;
}

/**
 * Call a Supabase Edge Function with authentication
 */
export async function callEdgeFunction<T>(
  functionName: string,
  options: {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
    body?: any;
  } = {}
): Promise<T> {
  const url = constructEdgeFunctionUrl(functionName);
  const token = await getBearerToken();
  const method = options.method || 'GET';
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (__DEV__) {
    console.log(`[API] ${method} ${url}`);
    if (options.body) {
      console.log('[API] Request body:', options.body);
    }
  }

  try {
    const response = await fetch(url, {
      method,
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    // Log response status
    if (__DEV__) {
      console.log(`[API] Response: ${response.status} ${response.statusText}`);
    }

    // Log non-2xx responses
    if (!response.ok) {
      const errorText = await response.clone().text();
      console.error(`[API] ❌ Request failed: ${method} ${url}`);
      console.error(`[API] Status: ${response.status} ${response.statusText}`);
      console.error(`[API] Response body:`, errorText);
      
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
      console.log('[API] Response data:', data);
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
 * Core fetch wrapper with authentication and error handling
 */
export async function authenticatedFetch(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  const url = constructApiUrl(endpoint);
  const token = await getBearerToken();
  
  const headers: HeadersInit = {
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (options.body && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const method = options.method || 'GET';
  
  if (__DEV__) {
    console.log(`[API] ${method} ${url}`);
    if (options.body) {
      console.log('[API] Request body:', options.body);
    }
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    // Log response status
    if (__DEV__) {
      console.log(`[API] Response: ${response.status} ${response.statusText}`);
    }

    // Log non-2xx responses
    if (!response.ok) {
      const errorText = await response.clone().text();
      console.error(`[API] ❌ Request failed: ${method} ${url}`);
      console.error(`[API] Status: ${response.status} ${response.statusText}`);
      console.error(`[API] Response body:`, errorText);
      
      const error = new Error(`API request failed: ${response.status} ${errorText}`);
      logError(error, {
        context: 'authenticatedFetch',
        endpoint,
        method,
        status: response.status,
        url,
      });
      
      throw error;
    }

    return response;
  } catch (error) {
    console.error(`[API] ❌ Network or API error: ${method} ${url}`);
    console.error('[API] Error details:', error);
    
    logError(error instanceof Error ? error : new Error(String(error)), {
      context: 'authenticatedFetch',
      endpoint,
      method,
      url,
    });
    throw error;
  }
}

/**
 * Authenticated GET request
 */
export async function authenticatedGet<T>(endpoint: string): Promise<T> {
  const response = await authenticatedFetch(endpoint, {
    method: 'GET',
  });
  return response.json();
}

/**
 * Authenticated POST request
 */
export async function authenticatedPost<T>(
  endpoint: string,
  data: any
): Promise<T> {
  const response = await authenticatedFetch(endpoint, {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return response.json();
}

/**
 * Authenticated PUT request
 */
export async function authenticatedPut<T>(
  endpoint: string,
  data: any
): Promise<T> {
  const response = await authenticatedFetch(endpoint, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  return response.json();
}

/**
 * Authenticated DELETE request
 */
export async function authenticatedDelete<T>(endpoint: string): Promise<T> {
  const response = await authenticatedFetch(endpoint, {
    method: 'DELETE',
    body: JSON.stringify({}),
  });
  return response.json();
}

/**
 * Public GET request (no authentication)
 */
export async function apiGet<T>(endpoint: string): Promise<T> {
  const url = constructApiUrl(endpoint);
  
  if (__DEV__) {
    console.log(`[API] GET ${url} (public)`);
  }

  try {
    const response = await fetch(url, {
      method: 'GET',
    });

    if (__DEV__) {
      console.log(`[API] Response: ${response.status} ${response.statusText}`);
    }

    if (!response.ok) {
      const errorText = await response.clone().text();
      console.error(`[API] ❌ Request failed: GET ${url}`);
      console.error(`[API] Status: ${response.status} ${response.statusText}`);
      console.error(`[API] Response body:`, errorText);
      
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
      console.log('[API] Response data:', data);
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
 * Public POST request (no authentication)
 */
export async function apiPost<T>(endpoint: string, data: any): Promise<T> {
  const url = constructApiUrl(endpoint);
  
  if (__DEV__) {
    console.log(`[API] POST ${url} (public)`);
    console.log('[API] Request body:', data);
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
      console.log(`[API] Response: ${response.status} ${response.statusText}`);
    }

    if (!response.ok) {
      const errorText = await response.clone().text();
      console.error(`[API] ❌ Request failed: POST ${url}`);
      console.error(`[API] Status: ${response.status} ${response.statusText}`);
      console.error(`[API] Response body:`, errorText);
      
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
      console.log('[API] Response data:', responseData);
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

/**
 * Export API base URL for external use
 */
export const API_BASE_URL = ENV.API_BASE_URL;
export const BACKEND_URL = ENV.API_BASE_URL;
