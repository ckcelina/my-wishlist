
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import type { Database } from './supabase-types';

// Get Supabase configuration from app.json
const SUPABASE_URL = Constants.expoConfig?.extra?.supabaseUrl || '';
const SUPABASE_ANON_KEY = Constants.expoConfig?.extra?.supabaseAnonKey || '';

console.log('[Supabase] Initializing with URL:', SUPABASE_URL);
console.log('[Supabase] Anon key format:', SUPABASE_ANON_KEY ? (SUPABASE_ANON_KEY.startsWith('sb_publishable_') ? 'sb_publishable_*' : 'legacy format') : 'Not configured');
console.log('[Supabase] Anon key configured:', SUPABASE_ANON_KEY ? 'Yes' : 'No');

// Validate configuration
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('[Supabase] ERROR: Missing Supabase URL or Anon Key in app.json extra config');
}

// Platform-specific storage adapter for Supabase
const ExpoSecureStoreAdapter = {
  getItem: async (key: string) => {
    if (Platform.OS === 'web') {
      return localStorage.getItem(key);
    }
    return await SecureStore.getItemAsync(key);
  },
  setItem: async (key: string, value: string) => {
    if (Platform.OS === 'web') {
      localStorage.setItem(key, value);
    } else {
      await SecureStore.setItemAsync(key, value);
    }
  },
  removeItem: async (key: string) => {
    if (Platform.OS === 'web') {
      localStorage.removeItem(key);
    } else {
      await SecureStore.deleteItemAsync(key);
    }
  },
};

// Create Supabase client with custom storage and typed database
// This supports both legacy anon keys and new sb_publishable_* format
// No manual JWT validation - @supabase/supabase-js v2 handles all key formats
export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

console.log('[Supabase] Client initialized successfully');
console.log('[Supabase] Ready to accept sb_publishable_* anon keys');

export { SUPABASE_URL, SUPABASE_ANON_KEY };
