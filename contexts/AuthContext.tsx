
import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Platform } from "react-native";
import { authClient, storeWebBearerToken } from "@/lib/auth";
import { supabase, supabaseAuth } from "@/lib/supabase";
import { supabaseWishlists } from "@/lib/supabase-helpers";
import type { Session, User as SupabaseUser } from "@supabase/supabase-js";

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

function openOAuthPopup(provider: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const popupUrl = `${window.location.origin}/auth-popup?provider=${provider}`;
    const width = 500;
    const height = 600;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;

    const popup = window.open(
      popupUrl,
      "oauth-popup",
      `width=${width},height=${height},left=${left},top=${top},scrollbars=yes`
    );

    if (!popup) {
      reject(new Error("Failed to open popup. Please allow popups."));
      return;
    }

    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === "oauth-success" && event.data?.token) {
        window.removeEventListener("message", handleMessage);
        clearInterval(checkClosed);
        resolve(event.data.token);
      } else if (event.data?.type === "oauth-error") {
        window.removeEventListener("message", handleMessage);
        clearInterval(checkClosed);
        reject(new Error(event.data.error || "OAuth failed"));
      }
    };

    window.addEventListener("message", handleMessage);

    const checkClosed = setInterval(() => {
      if (popup.closed) {
        clearInterval(checkClosed);
        window.removeEventListener("message", handleMessage);
        reject(new Error("Authentication cancelled"));
      }
    }, 500);
  });
}

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
      
      // Check Supabase session first
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
        return;
      }
      
      const session = await authClient.getSession();
      if (session?.data?.user) {
        console.log('[AuthContext] Better Auth user found');
        setUser(session.data.user as User);
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

      const existingWishlists = await supabaseWishlists.getAll();
      console.log('[AuthContext] Existing wishlists:', existingWishlists.length);
      
      if (existingWishlists.length > 0) {
        const defaultWishlist = existingWishlists.find(w => w.name === 'My Wishlist') || existingWishlists[0];
        console.log('[AuthContext] Found existing wishlist:', defaultWishlist.id);
        return defaultWishlist.id;
      }

      const newWishlist = await supabaseWishlists.create({
        user_id: currentUser.id,
        name: 'My Wishlist',
      });
      
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

  const signInWithSocial = async (provider: "google" | "apple") => {
    try {
      console.log(`[AuthContext] Starting ${provider} OAuth flow`);
      
      if (Platform.OS === "web") {
        const token = await openOAuthPopup(provider);
        storeWebBearerToken(token);
        await fetchUser();
      } else {
        await authClient.signIn.social({
          provider,
          callbackURL: "/wishlists",
        });
        await fetchUser();
      }
      
      console.log(`[AuthContext] ${provider} OAuth successful, checking for default wishlist`);
      await initializeDefaultWishlist();
    } catch (error) {
      console.error(`[AuthContext] ${provider} sign in failed:`, error);
      throw error;
    }
  };

  const signInWithGoogle = () => signInWithSocial("google");
  const signInWithApple = () => signInWithSocial("apple");

  const signOut = async () => {
    try {
      console.log('[AuthContext] Signing out user');
      
      // Sign out from Supabase
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('[AuthContext] Supabase sign out error:', error);
      }
      
      // Sign out from Better Auth
      try {
        await authClient.signOut();
      } catch (error) {
        console.error('[AuthContext] Better Auth sign out error:', error);
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
