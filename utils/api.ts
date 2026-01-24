
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { supabase } from '@/lib/supabase';
import { logError, logEvent } from './observability';

// ═══════════════════════════════════════════════════════════════════════════
// ⚠️ DEPRECATED: Legacy Backend API (Natively DB / Specular)
// ═══════════════════════════════════════════════════════════════════════════
// This file is kept for backward compatibility with the backend folder.
// The backend folder uses Specular/Natively DB, but the app now uses Supabase.
// 
// NEW CODE SHOULD USE:
// - @/lib/supabase for database operations
// - @/utils/supabase-edge-functions for AI features
// - @/lib/supabase-helpers for common database operations
// ═══════════════════════════════════════════════════════════════════════════

const API_URL = Constants.expoConfig?.extra?.backendUrl || '';

export const BACKEND_URL = API_URL;

if (API_URL) {
  console.log('[API] ⚠️ WARNING: Legacy backend URL configured:', BACKEND_URL);
  console.log('[API] ⚠️ This app now uses Supabase as the primary data source');
  console.log('[API] ⚠️ Backend folder endpoints are for backward compatibility only');
} else {
  console.log('[API] ✅ No legacy backend URL configured (Supabase-only mode)');
}

const BEARER_TOKEN_KEY = 'wishzen_bearer_token';

async function getBearerToken(): Promise<string | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      console.log('[API] Using Supabase access token');
      return session.access_token;
    }

    if (Platform.OS === 'web') {
      const token = localStorage.getItem(BEARER_TOKEN_KEY);
      console.log('[API] Using Better Auth token from localStorage');
      return token;
    } else {
      const token = await SecureStore.getItemAsync(BEARER_TOKEN_KEY);
      console.log('[API] Using Better Auth token from SecureStore');
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

export async function authenticatedFetch(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  if (!API_URL) {
    throw new Error('[API] No backend URL configured. Use Supabase directly instead.');
  }

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

  const url = `${API_URL}${endpoint}`;
  console.log(`[API] ${options.method || 'GET'} ${url}`);

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[API] Request failed: ${response.status} ${errorText}`);
      
      const error = new Error(`API request failed: ${response.status} ${errorText}`);
      logError(error, {
        context: 'authenticatedFetch',
        endpoint,
        method: options.method || 'GET',
        status: response.status,
      });
      
      throw error;
    }

    return response;
  } catch (error) {
    logError(error instanceof Error ? error : new Error(String(error)), {
      context: 'authenticatedFetch',
      endpoint,
      method: options.method || 'GET',
    });
    throw error;
  }
}

export async function authenticatedGet<T>(endpoint: string): Promise<T> {
  const response = await authenticatedFetch(endpoint, {
    method: 'GET',
  });
  return response.json();
}

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

export async function authenticatedDelete<T>(endpoint: string): Promise<T> {
  const response = await authenticatedFetch(endpoint, {
    method: 'DELETE',
    body: JSON.stringify({}),
  });
  return response.json();
}

export async function apiGet<T>(endpoint: string): Promise<T> {
  if (!API_URL) {
    throw new Error('[API] No backend URL configured. Use Supabase directly instead.');
  }

  const url = `${API_URL}${endpoint}`;
  console.log(`[API] GET ${url} (public)`);

  try {
    const response = await fetch(url, {
      method: 'GET',
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[API] Request failed: ${response.status} ${errorText}`);
      
      const error = new Error(`API request failed: ${response.status} ${errorText}`);
      logError(error, {
        context: 'apiGet',
        endpoint,
        status: response.status,
      });
      
      throw error;
    }

    return response.json();
  } catch (error) {
    logError(error instanceof Error ? error : new Error(String(error)), {
      context: 'apiGet',
      endpoint,
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
