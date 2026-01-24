
import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase, supabaseAuth } from "@/lib/supabase";
import type { User as SupabaseUser } from "@supabase/supabase-js";

interface User {
  id: string;
  email: string;
  name?: string;
  image?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, name?: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  signOut: () => Promise<void>;
  fetchUser: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Initialize auth state on mount
  useEffect(() => {
    console.log('[AuthContext] Initializing auth state');
    initializeAuth();
  }, []);

  // Set up auth state listener
  useEffect(() => {
    console.log('[AuthContext] Setting up auth state listener');
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('[AuthContext] Auth state changed:', event, 'Session:', session?.user?.id);
      
      if (event === 'SIGNED_IN' && session?.user) {
        const supabaseUser = session.user;
        const newUser = {
          id: supabaseUser.id,
          email: supabaseUser.email || '',
          name: supabaseUser.user_metadata?.name || supabaseUser.email?.split('@')[0],
          image: supabaseUser.user_metadata?.avatar_url,
        };
        console.log('[AuthContext] User signed in:', newUser.id);
        setUser(newUser);
      } else if (event === 'SIGNED_OUT') {
        console.log('[AuthContext] User signed out');
        setUser(null);
      } else if (event === 'TOKEN_REFRESHED') {
        console.log('[AuthContext] Token refreshed');
        // Session is still valid, user remains logged in
      } else if (event === 'USER_UPDATED' && session?.user) {
        console.log('[AuthContext] User updated');
        const supabaseUser = session.user;
        const updatedUser = {
          id: supabaseUser.id,
          email: supabaseUser.email || '',
          name: supabaseUser.user_metadata?.name || supabaseUser.email?.split('@')[0],
          image: supabaseUser.user_metadata?.avatar_url,
        };
        setUser(updatedUser);
      }
    });

    return () => {
      console.log('[AuthContext] Cleaning up auth state listener');
      subscription.unsubscribe();
    };
  }, []);

  const initializeAuth = async () => {
    try {
      console.log('[AuthContext] Checking for existing session');
      setLoading(true);
      
      // Check Supabase session
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('[AuthContext] Error getting session:', error);
        setUser(null);
        setLoading(false);
        return;
      }

      if (session?.user) {
        console.log('[AuthContext] Found existing Supabase session:', session.user.id);
        const supabaseUser = session.user;
        setUser({
          id: supabaseUser.id,
          email: supabaseUser.email || '',
          name: supabaseUser.user_metadata?.name || supabaseUser.email?.split('@')[0],
          image: supabaseUser.user_metadata?.avatar_url,
        });
      } else {
        console.log('[AuthContext] No existing session found');
        setUser(null);
      }
    } catch (error) {
      console.error('[AuthContext] Failed to initialize auth:', error);
      setUser(null);
    } finally {
      setLoading(false);
      console.log('[AuthContext] Auth initialization complete');
    }
  };

  const fetchUser = async () => {
    try {
      console.log('[AuthContext] Fetching current user');
      
      const supabaseUser = await supabaseAuth.getCurrentUser();
      if (supabaseUser) {
        console.log('[AuthContext] Supabase user found:', supabaseUser.id);
        setUser({
          id: supabaseUser.id,
          email: supabaseUser.email || '',
          name: supabaseUser.user_metadata?.name || supabaseUser.email?.split('@')[0],
          image: supabaseUser.user_metadata?.avatar_url,
        });
      } else {
        console.log('[AuthContext] No user found');
        setUser(null);
      }
    } catch (error) {
      console.error('[AuthContext] Failed to fetch user:', error);
      setUser(null);
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    try {
      console.log('[AuthContext] Signing in with email:', email);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        console.error('[AuthContext] Sign in error:', error);
        throw error;
      }
      
      if (data.user) {
        console.log('[AuthContext] Sign in successful:', data.user.id);
        setUser({
          id: data.user.id,
          email: data.user.email || '',
          name: data.user.user_metadata?.name || data.user.email?.split('@')[0],
          image: data.user.user_metadata?.avatar_url,
        });
      }
    } catch (error) {
      console.error('[AuthContext] Email sign in failed:', error);
      throw error;
    }
  };

  const initializeDefaultWishlist = async (): Promise<string | null> => {
    console.log('[AuthContext] Initializing default wishlist');
    try {
      const currentUser = await supabaseAuth.getCurrentUser();
      if (!currentUser) {
        console.error('[AuthContext] No user found for wishlist initialization');
        return null;
      }

      // Check if user already has wishlists
      const { data: existingWishlists, error } = await supabase
        .from('wishlists')
        .select('id, name')
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: true });
      
      if (error) {
        console.error('[AuthContext] Error fetching wishlists:', error);
        return null;
      }

      console.log('[AuthContext] Existing wishlists:', existingWishlists?.length || 0);
      
      if (existingWishlists && existingWishlists.length > 0) {
        const defaultWishlist = existingWishlists.find(w => w.name === 'My Wishlist') || existingWishlists[0];
        console.log('[AuthContext] Found existing wishlist:', defaultWishlist.id);
        return defaultWishlist.id;
      }

      // Create default wishlist
      const { data: newWishlist, error: createError } = await supabase
        .from('wishlists')
        .insert({
          user_id: currentUser.id,
          name: 'My Wishlist',
        })
        .select()
        .single();
      
      if (createError) {
        console.error('[AuthContext] Error creating wishlist:', createError);
        return null;
      }
      
      console.log('[AuthContext] Created default wishlist:', newWishlist.id);
      return newWishlist.id;
    } catch (error) {
      console.error('[AuthContext] Failed to initialize default wishlist:', error);
      return null;
    }
  };

  const signUpWithEmail = async (email: string, password: string, name?: string) => {
    try {
      console.log('[AuthContext] Starting signup process:', email);
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
        console.error('[AuthContext] Sign up error:', error);
        throw error;
      }
      
      if (data.user) {
        console.log('[AuthContext] Sign up successful:', data.user.id);
        setUser({
          id: data.user.id,
          email: data.user.email || '',
          name: data.user.user_metadata?.name || data.user.email?.split('@')[0],
          image: data.user.user_metadata?.avatar_url,
        });
        
        // Create default wishlist
        console.log('[AuthContext] Creating default wishlist for new user');
        const wishlistId = await initializeDefaultWishlist();
        
        if (wishlistId) {
          console.log('[AuthContext] Navigating to default wishlist:', wishlistId);
          const { router } = await import('expo-router');
          router.replace(`/wishlist/${wishlistId}`);
        } else {
          console.log('[AuthContext] No wishlist created, navigating to wishlists list');
          const { router } = await import('expo-router');
          router.replace('/(tabs)/wishlists');
        }
      }
    } catch (error) {
      console.error('[AuthContext] Email sign up failed:', error);
      throw error;
    }
  };

  const signInWithGoogle = async () => {
    try {
      console.log('[AuthContext] Starting Google OAuth flow');
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: 'wishzen://auth-callback',
        },
      });
      
      if (error) {
        console.error('[AuthContext] Google sign in error:', error);
        throw error;
      }
      
      console.log('[AuthContext] Google OAuth initiated');
      // The auth state listener will handle the user update after OAuth completes
    } catch (error) {
      console.error('[AuthContext] Google sign in failed:', error);
      throw error;
    }
  };

  const signInWithApple = async () => {
    try {
      console.log('[AuthContext] Starting Apple OAuth flow');
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'apple',
        options: {
          redirectTo: 'wishzen://auth-callback',
        },
      });
      
      if (error) {
        console.error('[AuthContext] Apple sign in error:', error);
        throw error;
      }
      
      console.log('[AuthContext] Apple OAuth initiated');
      // The auth state listener will handle the user update after OAuth completes
    } catch (error) {
      console.error('[AuthContext] Apple sign in failed:', error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      console.log('[AuthContext] Signing out user');
      
      // Sign out from Supabase
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('[AuthContext] Supabase sign out error:', error);
        throw error;
      }
      
      // Clear user state
      setUser(null);
      console.log('[AuthContext] Sign out complete');
      
      // Navigate to auth screen
      const { router } = await import('expo-router');
      router.replace('/auth');
    } catch (error) {
      console.error('[AuthContext] Sign out failed:', error);
      throw error;
    }
  };

  const resetPassword = async (email: string) => {
    try {
      console.log('[AuthContext] Resetting password for:', email);
      await supabaseAuth.resetPassword(email);
    } catch (error) {
      console.error('[AuthContext] Password reset failed:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signInWithEmail,
        signUpWithEmail,
        signInWithGoogle,
        signInWithApple,
        signOut,
        fetchUser,
        resetPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
