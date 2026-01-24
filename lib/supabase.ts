
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import type { Database } from './supabase-types';

// Get Supabase configuration from app.json
const SUPABASE_URL = Constants.expoConfig?.extra?.supabaseUrl || 'https://dixgmnuayzblwpqyplsi.supabase.co';
const SUPABASE_ANON_KEY = Constants.expoConfig?.extra?.supabaseAnonKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRpeGdtbnVheXpibHdwcXlwbHNpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzc3MzA1NzcsImV4cCI6MjA1MzMwNjU3N30.Ij-Ow0Ij-Ow0Ij-Ow0Ij-Ow0Ij-Ow0Ij-Ow0Ij-Ow0Ij-Ow0';

console.log('[Supabase] Initializing with URL:', SUPABASE_URL);
console.log('[Supabase] Anon key configured:', SUPABASE_ANON_KEY ? 'Yes' : 'No');

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
export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

console.log('[Supabase] Client initialized successfully');

export { SUPABASE_URL, SUPABASE_ANON_KEY };
