
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { supabase } from '@/lib/supabase';

const API_URL = Constants.expoConfig?.extra?.backendUrl || '';

// Export BACKEND_URL for use in other files
export const BACKEND_URL = API_URL;

// Log the backend URL at startup for debugging
console.log('[API] Backend URL configured:', BACKEND_URL);
const BEARER_TOKEN_KEY = 'wishzen_bearer_token';

async function getBearerToken(): Promise<string | null> {
  try {
    // Try Supabase session first
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      console.log('[API] Using Supabase access token');
      return session.access_token;
    }

    // Fallback to Better Auth token
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
    return null;
  }
}

export async function authenticatedFetch(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = await getBearerToken();
  
  const headers: HeadersInit = {
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Only add Content-Type for requests with a body
  if (options.body && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const url = `${API_URL}${endpoint}`;
  console.log(`[API] ${options.method || 'GET'} ${url}`);

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[API] Request failed: ${response.status} ${errorText}`);
    throw new Error(`API request failed: ${response.status} ${errorText}`);
  }

  return response;
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

// Public API call (no authentication required)
export async function apiGet<T>(endpoint: string): Promise<T> {
  const url = `${API_URL}${endpoint}`;
  console.log(`[API] GET ${url} (public)`);

  const response = await fetch(url, {
    method: 'GET',
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[API] Request failed: ${response.status} ${errorText}`);
    throw new Error(`API request failed: ${response.status} ${errorText}`);
  }

  return response.json();
}
