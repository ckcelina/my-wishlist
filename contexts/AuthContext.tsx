
import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { Session, User } from '@supabase/supabase-js';
import { logAppVersionToSupabase } from '@/utils/versionTracking';
import { createWishlist } from '@/lib/supabase-helpers';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, name: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
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

  const signInWithEmail = async (email: string, password: string) => {
    console.log('[AuthContext] Signing in with email:', email);
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error('[AuthContext] Sign in error:', error);
      throw error;
    }

    console.log('[AuthContext] Sign in successful:', data.user?.id);
  };

  const signUpWithEmail = async (email: string, password: string, name: string) => {
    console.log('[AuthContext] Signing up with email:', email);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
        },
      },
    });

    if (error) {
      console.error('[AuthContext] Sign up error:', error);
      throw error;
    }

    // Check if email confirmation is required
    if (data.user && !data.session) {
      console.log('[AuthContext] Email confirmation required for:', email);
      const confirmError: any = new Error('Please check your email to confirm your account');
      confirmError.code = 'email_confirmation_required';
      throw confirmError;
    }

    console.log('[AuthContext] Sign up successful:', data.user?.id);

    // Create default wishlist for new user
    if (data.user) {
      try {
        console.log('[AuthContext] Creating default wishlist for new user');
        await createWishlist({
          user_id: data.user.id,
          name: 'My Wishlist',
        });
        console.log('[AuthContext] Default wishlist created');
      } catch (wishlistError) {
        console.error('[AuthContext] Error creating default wishlist:', wishlistError);
        // Don't throw - user is still signed up successfully
      }
    }
  };

  const signInWithGoogle = async () => {
    console.log('[AuthContext] Signing in with Google');
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin + '/auth-callback',
      },
    });

    if (error) {
      console.error('[AuthContext] Google sign in error:', error);
      throw error;
    }

    console.log('[AuthContext] Google sign in initiated');
  };

  const signInWithApple = async () => {
    console.log('[AuthContext] Signing in with Apple');
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'apple',
      options: {
        redirectTo: window.location.origin + '/auth-callback',
      },
    });

    if (error) {
      console.error('[AuthContext] Apple sign in error:', error);
      throw error;
    }

    console.log('[AuthContext] Apple sign in initiated');
  };

  const resetPassword = async (email: string) => {
    console.log('[AuthContext] Sending password reset email to:', email);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + '/auth-callback',
    });

    if (error) {
      console.error('[AuthContext] Password reset error:', error);
      throw error;
    }

    console.log('[AuthContext] Password reset email sent');
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      session, 
      loading, 
      signOut,
      signInWithEmail,
      signUpWithEmail,
      signInWithGoogle,
      signInWithApple,
      resetPassword,
    }}>
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
