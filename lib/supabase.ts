
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// Supabase configuration
const SUPABASE_URL = 'https://dixgmnuayzblwpqyplsi.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_YouNJ6jKsZgKgdWMpWUL4w_gPqrMNT-';

// Storage keys
const SUPABASE_SESSION_KEY = 'wishzen_supabase_session';

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

// Create Supabase client with custom storage
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Helper methods for authentication
export const supabaseAuth = {
  // Sign up with email and password
  signUp: async (email: string, password: string, name?: string) => {
    console.log('[Supabase] Signing up user:', email);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: name || '',
        },
      },
    });
    
    if (error) {
      console.error('[Supabase] Sign up error:', error);
      throw error;
    }
    
    console.log('[Supabase] Sign up successful:', data.user?.id);
    return data;
  },

  // Sign in with email and password
  signIn: async (email: string, password: string) => {
    console.log('[Supabase] Signing in user:', email);
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) {
      console.error('[Supabase] Sign in error:', error);
      throw error;
    }
    
    console.log('[Supabase] Sign in successful:', data.user?.id);
    return data;
  },

  // Sign out
  signOut: async () => {
    console.log('[Supabase] Signing out user');
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      console.error('[Supabase] Sign out error:', error);
      throw error;
    }
    
    console.log('[Supabase] Sign out successful');
  },

  // Get current user
  getCurrentUser: async () => {
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error) {
      console.error('[Supabase] Get user error:', error);
      return null;
    }
    
    return user;
  },

  // Get current session
  getSession: async () => {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('[Supabase] Get session error:', error);
      return null;
    }
    
    return session;
  },

  // Reset password
  resetPassword: async (email: string) => {
    console.log('[Supabase] Sending password reset email to:', email);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'wishzen://reset-password',
    });
    
    if (error) {
      console.error('[Supabase] Reset password error:', error);
      throw error;
    }
    
    console.log('[Supabase] Password reset email sent');
  },
};

export { SUPABASE_URL, SUPABASE_ANON_KEY };
