
import { Platform } from 'react-native';
import { supabase } from '@/lib/supabase';
import { logError } from './observability';
import { ENV, validateEnv } from '@/src/config/env';
import Constants from 'expo-constants';

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🔌 API CLIENT - DUAL MODE (BACKEND API + SUPABASE EDGE FUNCTIONS)
 * ═══════════════════════════════════════════════════════════════════════════
 * This file provides a unified API client for:
 * 1. Backend API (Specular) - for app-specific endpoints
 * 2. Supabase Edge Functions - for Supabase-specific functionality
 * 
 * Features:
 * - Centralized base URL configuration from src/config/env.ts
 * - Runtime validation of environment variables
 * - Proper URL construction (no relative paths)
 * - Comprehensive error logging
 * - Authentication header injection
 * - Dev-only request/response logging
 * ═══════════════════════════════════════════════════════════════════════════
 */

// Get backend URL from app config
const BACKEND_URL = Constants.expoConfig?.extra?.backendUrl || '';

if (__DEV__) {
  console.log('[API] ═══════════════════════════════════════════════════');
  console.log('[API] 🔌 API CLIENT INITIALIZATION');
  console.log('[API] ═══════════════════════════════════════════════════');
  console.log('[API] Backend URL:', BACKEND_URL || '❌ NOT CONFIGURED');
  console.log('[API] Supabase Edge Functions URL:', ENV.SUPABASE_EDGE_FUNCTIONS_URL || '❌ NOT CONFIGURED');
  console.log('[API] Platform:', Platform.OS);
  console.log('[API] Build Type:', __DEV__ ? 'Development' : 'Production');
  console.log('[API] ═══════════════════════════════════════════════════');
}

/**
 * Get bearer token from Supabase session
 */
async function getBearerToken(): Promise<string | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      if (__DEV__) {
        console.log('[API] Using Supabase access token');
      }
      return session.access_token;
    }
    return null;
  } catch (error) {
    console.error('[API] Failed to get bearer token:', error);
    logError(error instanceof Error ? error : new Error(String(error)), {
      context: 'getBearerToken',
    });
    return null;
  }
}

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * BACKEND API CALLS (Specular)
 * ═══════════════════════════════════════════════════════════════════════════
 */

/**
 * Make an authenticated GET request to the backend API
 */
export async function authenticatedGet<T>(endpoint: string): Promise<T> {
  if (!BACKEND_URL) {
    const error = new Error('[API] Backend URL is not configured. Cannot make API call.');
    console.error(error.message);
    throw error;
  }

  const url = `${BACKEND_URL}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
  const token = await getBearerToken();

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (__DEV__) {
    console.log(`[API] GET ${url}`);
  }

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers,
    });

    if (__DEV__) {
      console.log(`[API] Response: ${response.status} ${response.statusText}`);
    }

    if (!response.ok) {
      const errorText = await response.clone().text();
      console.error(`[API] ❌ Request failed: GET ${url}`);
      console.error(`[API] Status: ${response.status} ${response.statusText}`);
      console.error(`[API] Response body:`, errorText.substring(0, 200));

      const error = new Error(`API request failed: ${response.status} ${errorText}`);
      logError(error, {
        context: 'authenticatedGet',
        endpoint,
        status: response.status,
        url,
      });

      throw error;
    }

    const data = await response.json();

    if (__DEV__) {
      console.log('[API] Response data:', JSON.stringify(data).substring(0, 200));
    }

    return data;
  } catch (error) {
    console.error(`[API] ❌ Network or API error: GET ${url}`);
    console.error('[API] Error details:', error);

    logError(error instanceof Error ? error : new Error(String(error)), {
      context: 'authenticatedGet',
      endpoint,
      url,
    });
    throw error;
  }
}

/**
 * Make an authenticated POST request to the backend API
 */
export async function authenticatedPost<T>(endpoint: string, data: any): Promise<T> {
  if (!BACKEND_URL) {
    const error = new Error('[API] Backend URL is not configured. Cannot make API call.');
    console.error(error.message);
    throw error;
  }

  const url = `${BACKEND_URL}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
  const token = await getBearerToken();

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (__DEV__) {
    console.log(`[API] POST ${url}`);
    console.log('[API] Request body:', JSON.stringify(data).substring(0, 200));
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });

    if (__DEV__) {
      console.log(`[API] Response: ${response.status} ${response.statusText}`);
    }

    if (!response.ok) {
      const errorText = await response.clone().text();
      console.error(`[API] ❌ Request failed: POST ${url}`);
      console.error(`[API] Status: ${response.status} ${response.statusText}`);
      console.error(`[API] Response body:`, errorText.substring(0, 200));

      const error = new Error(`API request failed: ${response.status} ${errorText}`);
      logError(error, {
        context: 'authenticatedPost',
        endpoint,
        status: response.status,
        url,
      });

      throw error;
    }

    const responseData = await response.json();

    if (__DEV__) {
      console.log('[API] Response data:', JSON.stringify(responseData).substring(0, 200));
    }

    return responseData;
  } catch (error) {
    console.error(`[API] ❌ Network or API error: POST ${url}`);
    console.error('[API] Error details:', error);

    logError(error instanceof Error ? error : new Error(String(error)), {
      context: 'authenticatedPost',
      endpoint,
      url,
    });
    throw error;
  }
}

/**
 * Make an authenticated PUT request to the backend API
 */
export async function authenticatedPut<T>(endpoint: string, data: any): Promise<T> {
  if (!BACKEND_URL) {
    const error = new Error('[API] Backend URL is not configured. Cannot make API call.');
    console.error(error.message);
    throw error;
  }

  const url = `${BACKEND_URL}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
  const token = await getBearerToken();

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (__DEV__) {
    console.log(`[API] PUT ${url}`);
    console.log('[API] Request body:', JSON.stringify(data).substring(0, 200));
  }

  try {
    const response = await fetch(url, {
      method: 'PUT',
      headers,
      body: JSON.stringify(data),
    });

    if (__DEV__) {
      console.log(`[API] Response: ${response.status} ${response.statusText}`);
    }

    if (!response.ok) {
      const errorText = await response.clone().text();
      console.error(`[API] ❌ Request failed: PUT ${url}`);
      console.error(`[API] Status: ${response.status} ${response.statusText}`);
      console.error(`[API] Response body:`, errorText.substring(0, 200));

      const error = new Error(`API request failed: ${response.status} ${errorText}`);
      logError(error, {
        context: 'authenticatedPut',
        endpoint,
        status: response.status,
        url,
      });

      throw error;
    }

    const responseData = await response.json();

    if (__DEV__) {
      console.log('[API] Response data:', JSON.stringify(responseData).substring(0, 200));
    }

    return responseData;
  } catch (error) {
    console.error(`[API] ❌ Network or API error: PUT ${url}`);
    console.error('[API] Error details:', error);

    logError(error instanceof Error ? error : new Error(String(error)), {
      context: 'authenticatedPut',
      endpoint,
      url,
    });
    throw error;
  }
}

/**
 * Make an authenticated DELETE request to the backend API
 */
export async function authenticatedDelete<T>(endpoint: string): Promise<T> {
  if (!BACKEND_URL) {
    const error = new Error('[API] Backend URL is not configured. Cannot make API call.');
    console.error(error.message);
    throw error;
  }

  const url = `${BACKEND_URL}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
  const token = await getBearerToken();

  const headers: HeadersInit = {};

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (__DEV__) {
    console.log(`[API] DELETE ${url}`);
  }

  try {
    const response = await fetch(url, {
      method: 'DELETE',
      headers,
    });

    if (__DEV__) {
      console.log(`[API] Response: ${response.status} ${response.statusText}`);
    }

    if (!response.ok) {
      const errorText = await response.clone().text();
      console.error(`[API] ❌ Request failed: DELETE ${url}`);
      console.error(`[API] Status: ${response.status} ${response.statusText}`);
      console.error(`[API] Response body:`, errorText.substring(0, 200));

      const error = new Error(`API request failed: ${response.status} ${errorText}`);
      logError(error, {
        context: 'authenticatedDelete',
        endpoint,
        status: response.status,
        url,
      });

      throw error;
    }

    const responseData = await response.json();

    if (__DEV__) {
      console.log('[API] Response data:', JSON.stringify(responseData).substring(0, 200));
    }

    return responseData;
  } catch (error) {
    console.error(`[API] ❌ Network or API error: DELETE ${url}`);
    console.error('[API] Error details:', error);

    logError(error instanceof Error ? error : new Error(String(error)), {
      context: 'authenticatedDelete',
      endpoint,
      url,
    });
    throw error;
  }
}

/**
 * Make a public GET request to the backend API (no authentication)
 */
export async function apiGet<T>(endpoint: string): Promise<T> {
  if (!BACKEND_URL) {
    const error = new Error('[API] Backend URL is not configured. Cannot make API call.');
    console.error(error.message);
    throw error;
  }

  const url = `${BACKEND_URL}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

  if (__DEV__) {
    console.log(`[API] GET (public) ${url}`);
  }

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (__DEV__) {
      console.log(`[API] Response: ${response.status} ${response.statusText}`);
    }

    if (!response.ok) {
      const errorText = await response.clone().text();
      console.error(`[API] ❌ Request failed: GET ${url}`);
      console.error(`[API] Status: ${response.status} ${response.statusText}`);
      console.error(`[API] Response body:`, errorText.substring(0, 200));

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
      console.log('[API] Response data:', JSON.stringify(data).substring(0, 200));
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
 * Make a public POST request to the backend API (no authentication)
 */
export async function apiPost<T>(endpoint: string, data: any): Promise<T> {
  if (!BACKEND_URL) {
    const error = new Error('[API] Backend URL is not configured. Cannot make API call.');
    console.error(error.message);
    throw error;
  }

  const url = `${BACKEND_URL}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

  if (__DEV__) {
    console.log(`[API] POST (public) ${url}`);
    console.log('[API] Request body:', JSON.stringify(data).substring(0, 200));
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
      console.error(`[API] Response body:`, errorText.substring(0, 200));

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
      console.log('[API] Response data:', JSON.stringify(responseData).substring(0, 200));
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
 * ═══════════════════════════════════════════════════════════════════════════
 * SUPABASE EDGE FUNCTIONS
 * ═══════════════════════════════════════════════════════════════════════════
 */

/**
 * Construct Supabase Edge Function URL
 */
function constructEdgeFunctionUrl(functionName: string): string {
  const missingKeys = validateEnv();
  if (missingKeys.length > 0) {
    const error = new Error(`[API] Environment configuration error. Missing: ${missingKeys.join(', ')}`);
    console.error(error.message);
    throw error;
  }

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
    'apikey': ENV.SUPABASE_ANON_KEY,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (__DEV__) {
    console.log(`[API] ${method} ${url}`);
    if (options.body) {
      console.log('[API] Request body:', JSON.stringify(options.body).substring(0, 200));
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
      console.error(`[API] Response body:`, errorText.substring(0, 200));

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
      console.log('[API] Response data:', JSON.stringify(data).substring(0, 200));
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
