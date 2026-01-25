
import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { Session, User } from '@supabase/supabase-js';
import { logAppVersionToSupabase } from '@/utils/versionTracking';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('[AuthContext] Initializing auth state...');

    // Get initial session
    supabase.auth.getSession().then(({ data: { session: initialSession }, error }) => {
      if (error) {
        console.error('[AuthContext] Error getting initial session:', error);
      } else {
        console.log('[AuthContext] Initial session:', initialSession?.user?.id || 'No session');
        setSession(initialSession);
        setUser(initialSession?.user ?? null);
        
        // Log version when user signs in
        if (initialSession?.user) {
          console.log('[AuthContext] User authenticated, logging version to Supabase');
          logAppVersionToSupabase(initialSession.user.id).catch((error) => {
            console.error('[AuthContext] Error logging version on sign in:', error);
          });
        }
      }
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        console.log('[AuthContext] Auth state changed:', event, currentSession?.user?.id || 'No user');
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        
        // Log version when user signs in
        if (event === 'SIGNED_IN' && currentSession?.user) {
          console.log('[AuthContext] User signed in, logging version to Supabase');
          logAppVersionToSupabase(currentSession.user.id).catch((error) => {
            console.error('[AuthContext] Error logging version on sign in:', error);
          });
        }
        
        setLoading(false);
      }
    );

    return () => {
      console.log('[AuthContext] Cleaning up auth subscription');
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    console.log('[AuthContext] Signing out user');
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

export function useUser() {
  const { user } = useAuth();
  return user;
}

export function useSession() {
  const { session } = useAuth();
  return session;
}
