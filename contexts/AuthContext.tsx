
import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/lib/supabase";
import type { User as SupabaseUser, AuthError } from "@supabase/supabase-js";

interface User {
  id: string;
  email: string;
  name?: string;
  image?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, name?: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  signOut: () => Promise<void>;
  fetchUser: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Custom error class for better error messages
class AuthApiError extends Error {
  public code?: string;
  
  constructor(message: string, code?: string) {
    super(message);
    this.name = 'AuthApiError';
    this.code = code;
  }
}

// Helper to format Supabase auth errors
function formatAuthError(error: AuthError): AuthApiError {
  console.log('[AuthContext] Formatting auth error:', error.message, 'Code:', error.status);
  
  // Map Supabase error messages to user-friendly messages
  if (error.message.includes('Invalid login credentials')) {
    return new AuthApiError('Email or password is incorrect', 'invalid_credentials');
  }
  
  if (error.message.includes('Email not confirmed')) {
    return new AuthApiError('Please verify your email address', 'email_not_confirmed');
  }
  
  if (error.message.includes('User already registered')) {
    return new AuthApiError('An account with this email already exists', 'user_exists');
  }
  
  if (error.message.includes('Password should be at least')) {
    return new AuthApiError('Password must be at least 6 characters', 'weak_password');
  }
  
  if (error.message.includes('Unable to validate email address')) {
    return new AuthApiError('Please enter a valid email address', 'invalid_email');
  }
  
  if (error.message.includes('Email address') && error.message.includes('is invalid')) {
    return new AuthApiError('Please enter a valid email address', 'invalid_email');
  }
  
  if (error.message.includes('Signup requires a valid password')) {
    return new AuthApiError('Please enter a password', 'missing_password');
  }
  
  // Default error message
  return new AuthApiError(error.message || 'Authentication failed', error.status?.toString());
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        setError(null);
      } else if (event === 'SIGNED_OUT') {
        console.log('[AuthContext] User signed out');
        setUser(null);
        setError(null);
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
      
      // Check Supabase session - SINGLE CALL
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('[AuthContext] Error getting session:', sessionError);
        setUser(null);
        setError(sessionError.message);
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
        setError(null);
      } else {
        console.log('[AuthContext] No existing session found');
        setUser(null);
      }
    } catch (err) {
      console.error('[AuthContext] Failed to initialize auth:', err);
      setUser(null);
      setError(err instanceof Error ? err.message : 'Failed to initialize auth');
    } finally {
      setLoading(false);
      console.log('[AuthContext] Auth initialization complete');
    }
  };

  const fetchUser = async () => {
    try {
      console.log('[AuthContext] Fetching current user');
      
      const { data: { user: supabaseUser }, error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        console.error('[AuthContext] Get user error:', userError);
        setUser(null);
        setError(userError.message);
        return;
      }
      
      if (supabaseUser) {
        console.log('[AuthContext] Supabase user found:', supabaseUser.id);
        setUser({
          id: supabaseUser.id,
          email: supabaseUser.email || '',
          name: supabaseUser.user_metadata?.name || supabaseUser.email?.split('@')[0],
          image: supabaseUser.user_metadata?.avatar_url,
        });
        setError(null);
      } else {
        console.log('[AuthContext] No user found');
        setUser(null);
      }
    } catch (err) {
      console.error('[AuthContext] Failed to fetch user:', err);
      setUser(null);
      setError(err instanceof Error ? err.message : 'Failed to fetch user');
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    // Trim and normalize email/password BEFORE calling Supabase
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPassword = password.trim();

    // DEV ONLY: Log exact values being sent
    if (__DEV__) {
      console.log('[AuthContext] [DEV] Sign in email:', trimmedEmail);
      console.log('[AuthContext] [DEV] Email length:', trimmedEmail.length);
      console.log('[AuthContext] [DEV] Email type:', typeof trimmedEmail);
      console.log('[AuthContext] [DEV] Password length:', trimmedPassword.length);
    }

    // Validate BEFORE calling Supabase
    if (!trimmedEmail) {
      const validationError = new AuthApiError('Email is required', 'validation_error');
      setError(validationError.message);
      console.log('[AuthContext] Validation failed: Email is empty');
      throw validationError;
    }

    if (!trimmedPassword) {
      const validationError = new AuthApiError('Password is required', 'validation_error');
      setError(validationError.message);
      console.log('[AuthContext] Validation failed: Password is empty');
      throw validationError;
    }

    try {
      console.log('[AuthContext] Signing in with email (SINGLE CALL)');
      
      // SINGLE Supabase call - signInWithPassword
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password: trimmedPassword,
      });
      
      if (signInError) {
        console.error('[AuthContext] Sign in error:', signInError.message);
        const formattedError = formatAuthError(signInError);
        setError(formattedError.message);
        // Return error, do NOT rethrow
        throw formattedError;
      }
      
      if (data.user) {
        console.log('[AuthContext] Sign in successful:', data.user.id);
        const newUser = {
          id: data.user.id,
          email: data.user.email || '',
          name: data.user.user_metadata?.name || data.user.email?.split('@')[0],
          image: data.user.user_metadata?.avatar_url,
        };
        setUser(newUser);
        setError(null);
        
        // Navigation will be handled by RootLayout based on auth state
        console.log('[AuthContext] User state updated, navigation will be handled by RootLayout');
      }
    } catch (err) {
      console.error('[AuthContext] Email sign in failed:', err);
      // Error already set above, just rethrow for UI handling
      throw err;
    }
  };

  const initializeDefaultWishlist = async (): Promise<string | null> => {
    console.log('[AuthContext] Initializing default wishlist');
    try {
      const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !currentUser) {
        console.error('[AuthContext] No user found for wishlist initialization');
        return null;
      }

      // Check if user already has wishlists
      const { data: existingWishlists, error: fetchError } = await supabase
        .from('wishlists')
        .select('id, name')
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: true });
      
      if (fetchError) {
        console.error('[AuthContext] Error fetching wishlists:', fetchError);
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
    } catch (err) {
      console.error('[AuthContext] Failed to initialize default wishlist:', err);
      return null;
    }
  };

  const signUpWithEmail = async (email: string, password: string, name?: string) => {
    // Trim and normalize email/password BEFORE calling Supabase
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPassword = password.trim();
    const trimmedName = name?.trim() || '';

    // DEV ONLY: Log exact values being sent
    if (__DEV__) {
      console.log('[AuthContext] [DEV] Sign up email:', trimmedEmail);
      console.log('[AuthContext] [DEV] Email length:', trimmedEmail.length);
      console.log('[AuthContext] [DEV] Email type:', typeof trimmedEmail);
      console.log('[AuthContext] [DEV] Password length:', trimmedPassword.length);
    }

    // Validate BEFORE calling Supabase
    if (!trimmedEmail) {
      const validationError = new AuthApiError('Email is required', 'validation_error');
      setError(validationError.message);
      console.log('[AuthContext] Validation failed: Email is empty');
      throw validationError;
    }

    if (!trimmedPassword) {
      const validationError = new AuthApiError('Password is required', 'validation_error');
      setError(validationError.message);
      console.log('[AuthContext] Validation failed: Password is empty');
      throw validationError;
    }

    try {
      console.log('[AuthContext] Starting signup process (SINGLE CALL)');
      
      // SINGLE Supabase call - signUp with ONLY email and password
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: trimmedEmail,
        password: trimmedPassword,
        options: {
          data: {
            name: trimmedName,
          },
        },
      });
      
      if (signUpError) {
        console.error('[AuthContext] Sign up error:', signUpError.message);
        const formattedError = formatAuthError(signUpError);
        setError(formattedError.message);
        // Return error, do NOT rethrow
        throw formattedError;
      }
      
      if (data.user) {
        console.log('[AuthContext] Sign up successful:', data.user.id);
        console.log('[AuthContext] User email confirmed status:', data.user.email_confirmed_at ? 'Confirmed' : 'Not confirmed');
        console.log('[AuthContext] Session exists:', !!data.session);
        
        // Check if session exists (user can sign in immediately)
        if (data.session) {
          console.log('[AuthContext] Session exists, user is logged in immediately (email confirmation disabled)');
          const newUser = {
            id: data.user.id,
            email: data.user.email || '',
            name: data.user.user_metadata?.name || data.user.email?.split('@')[0],
            image: data.user.user_metadata?.avatar_url,
          };
          setUser(newUser);
          setError(null);
          
          // Create default wishlist
          console.log('[AuthContext] Creating default wishlist for new user');
          const wishlistId = await initializeDefaultWishlist();
          
          if (wishlistId) {
            console.log('[AuthContext] Navigating to default wishlist:', wishlistId);
            const { router } = await import('expo-router');
            router.replace(`/wishlist/${wishlistId}`);
          } else {
            console.log('[AuthContext] No wishlist created, navigation will be handled by RootLayout');
          }
        } else {
          // No session - email confirmation required
          console.log('[AuthContext] No session, email confirmation required');
          const confirmationMessage = 'Account created! Please check your email and click the confirmation link to sign in.';
          setError(confirmationMessage);
          throw new AuthApiError(confirmationMessage, 'email_confirmation_required');
        }
      }
    } catch (err) {
      console.error('[AuthContext] Email sign up failed:', err);
      // Error already set above, just rethrow for UI handling
      throw err;
    }
  };

  const signInWithGoogle = async () => {
    try {
      console.log('[AuthContext] Starting Google OAuth flow');
      
      const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: 'wishzen://auth-callback',
        },
      });
      
      if (oauthError) {
        console.error('[AuthContext] Google sign in error:', oauthError);
        const formattedError = formatAuthError(oauthError);
        setError(formattedError.message);
        throw formattedError;
      }
      
      console.log('[AuthContext] Google OAuth initiated');
      // The auth state listener will handle the user update after OAuth completes
      // Navigation will be handled by RootLayout based on auth state
    } catch (err) {
      console.error('[AuthContext] Google sign in failed:', err);
      throw err;
    }
  };

  const signInWithApple = async () => {
    try {
      console.log('[AuthContext] Starting Apple OAuth flow');
      
      const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'apple',
        options: {
          redirectTo: 'wishzen://auth-callback',
        },
      });
      
      if (oauthError) {
        console.error('[AuthContext] Apple sign in error:', oauthError);
        const formattedError = formatAuthError(oauthError);
        setError(formattedError.message);
        throw formattedError;
      }
      
      console.log('[AuthContext] Apple OAuth initiated');
      // The auth state listener will handle the user update after OAuth completes
      // Navigation will be handled by RootLayout based on auth state
    } catch (err) {
      console.error('[AuthContext] Apple sign in failed:', err);
      throw err;
    }
  };

  const signOut = async () => {
    try {
      console.log('[AuthContext] Signing out user');
      
      // Sign out from Supabase
      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) {
        console.error('[AuthContext] Supabase sign out error:', signOutError);
        const formattedError = formatAuthError(signOutError);
        setError(formattedError.message);
        throw formattedError;
      }
      
      // Clear user state
      setUser(null);
      setError(null);
      console.log('[AuthContext] Sign out complete');
      
      // Navigation will be handled by RootLayout based on auth state
      console.log('[AuthContext] User state cleared, navigation will be handled by RootLayout');
    } catch (err) {
      console.error('[AuthContext] Sign out failed:', err);
      throw err;
    }
  };

  const resetPassword = async (email: string) => {
    // Trim and normalize email
    const trimmedEmail = email.trim().toLowerCase();

    // Validate
    if (!trimmedEmail) {
      const validationError = new AuthApiError('Email is required', 'validation_error');
      setError(validationError.message);
      throw validationError;
    }

    try {
      console.log('[AuthContext] Resetting password for:', trimmedEmail);
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(trimmedEmail, {
        redirectTo: 'wishzen://reset-password',
      });
      
      if (resetError) {
        console.error('[AuthContext] Reset password error:', resetError);
        const formattedError = formatAuthError(resetError);
        setError(formattedError.message);
        throw formattedError;
      }
      
      console.log('[AuthContext] Password reset email sent');
      setError(null);
    } catch (err) {
      console.error('[AuthContext] Password reset failed:', err);
      throw err;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
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
