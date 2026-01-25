
import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { User, Session } from '@supabase/supabase-js';
import { logAppVersionToSupabase, getVersionInfo, displayVersionInfo } from '@/utils/versionTracking';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('[AuthContext] Initializing auth state...');

    // Get initial session
    supabase.auth.getSession().then(({ data: { session: initialSession }, error }) => {
      if (error) {
        console.error('[AuthContext] Error getting initial session:', error);
        
        // Handle specific Supabase errors
        if (error.message.includes('Email not confirmed')) {
          console.log('[AuthContext] Email not confirmed - user needs to verify email');
        } else if (error.message.includes('rate_limit')) {
          console.log('[AuthContext] Rate limit exceeded - too many requests');
        }
      }
      
      console.log('[AuthContext] Initial session:', initialSession?.user?.id || 'No session');
      setSession(initialSession);
      setUser(initialSession?.user ?? null);
      setLoading(false);

      // Log app version when user is authenticated
      if (initialSession?.user) {
        console.log('[AuthContext] User authenticated, logging app version...');
        logAppVersionToSupabase(initialSession.user.id).catch((error) => {
          console.error('[AuthContext] Error logging app version:', error);
        });
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        console.log('[AuthContext] Auth state changed:', event, currentSession?.user?.id || 'No user');
        
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        setLoading(false);

        // Log app version on sign in
        if (event === 'SIGNED_IN' && currentSession?.user) {
          console.log('[AuthContext] User signed in, logging app version...');
          try {
            await logAppVersionToSupabase(currentSession.user.id);
            const versionInfo = await getVersionInfo();
            displayVersionInfo(versionInfo);
          } catch (error) {
            console.error('[AuthContext] Error logging app version on sign in:', error);
          }
        }

        // Handle specific auth events
        if (event === 'USER_UPDATED') {
          console.log('[AuthContext] User updated');
        } else if (event === 'SIGNED_OUT') {
          console.log('[AuthContext] User signed out');
        } else if (event === 'TOKEN_REFRESHED') {
          console.log('[AuthContext] Token refreshed');
        }
      }
    );

    return () => {
      console.log('[AuthContext] Cleaning up auth subscription');
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    console.log('[AuthContext] Signing out user...');
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('[AuthContext] Error signing out:', error);
      throw error;
    }
    console.log('[AuthContext] User signed out successfully');
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
