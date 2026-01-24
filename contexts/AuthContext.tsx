
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
  constructor(message: string, public code?: string) {
    super(message);
    this.name = 'AuthApiError';
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
        
        // Check if session exists (user can sign in immediately)
        if (data.session) {
          console.log('[AuthContext] Session exists, user is logged in');
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
          setError('Check your email to confirm your account');
          throw new AuthApiError('Check your email to confirm your account', 'email_confirmation_required');
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
</write file>

Now let's fix the AuthScreen to remove duplicate auth calls and add inline validation:

<write file="app/auth.tsx">
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
} from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/design-system/Button';
import { Logo } from '@/components/Logo';
import { colors, typography, spacing, inputStyles, containerStyles } from '@/styles/designSystem';

type Mode = 'signin' | 'signup' | 'forgot-password';

export default function AuthScreen() {
  const { signInWithEmail, signUpWithEmail, signInWithGoogle, signInWithApple, resetPassword } = useAuth();
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleEmailAuth = async () => {
    // Clear previous validation errors
    setValidationError(null);

    // Trim and normalize BEFORE validation
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPassword = password.trim();
    const trimmedName = name.trim();

    // Inline validation - DO NOT call Supabase if validation fails
    if (!trimmedEmail) {
      setValidationError('Email is required');
      console.log('[AuthScreen] Validation failed: Email is empty');
      return;
    }

    if (!trimmedPassword) {
      setValidationError('Password is required');
      console.log('[AuthScreen] Validation failed: Password is empty');
      return;
    }

    if (mode === 'signup' && !trimmedName) {
      setValidationError('Name is required');
      console.log('[AuthScreen] Validation failed: Name is empty');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setValidationError('Please enter a valid email address');
      console.log('[AuthScreen] Validation failed: Invalid email format');
      return;
    }

    // Password length validation
    if (trimmedPassword.length < 6) {
      setValidationError('Password must be at least 6 characters');
      console.log('[AuthScreen] Validation failed: Password too short');
      return;
    }

    // All validation passed - now call Supabase ONCE
    setLoading(true);
    try {
      if (mode === 'signin') {
        console.log('[AuthScreen] User tapped Sign In button');
        // SINGLE call to signInWithEmail
        await signInWithEmail(trimmedEmail, trimmedPassword);
        console.log('[AuthScreen] Sign in successful');
      } else {
        console.log('[AuthScreen] User tapped Sign Up button');
        // SINGLE call to signUpWithEmail
        await signUpWithEmail(trimmedEmail, trimmedPassword, trimmedName);
        console.log('[AuthScreen] Sign up successful');
      }
    } catch (error: any) {
      console.error('[AuthScreen] Authentication error:', error);
      
      // Use the error message from the formatted error
      const errorMessage = error.message || 'Authentication failed';
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    // Clear previous validation errors
    setValidationError(null);

    const trimmedEmail = email.trim().toLowerCase();
    
    // Inline validation
    if (!trimmedEmail) {
      setValidationError('Email is required');
      console.log('[AuthScreen] Validation failed: Email is empty');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setValidationError('Please enter a valid email address');
      console.log('[AuthScreen] Validation failed: Invalid email format');
      return;
    }

    setLoading(true);
    try {
      console.log('[AuthScreen] User tapped Reset Password button');
      await resetPassword(trimmedEmail);
      setResetEmailSent(true);
      console.log('[AuthScreen] Password reset email sent');
      Alert.alert('Success', 'Password reset email sent! Check your inbox.');
    } catch (error: any) {
      console.error('[AuthScreen] Password reset error:', error);
      const errorMessage = error.message || 'Failed to send reset email';
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleSocialAuth = async (provider: 'google' | 'apple') => {
    setLoading(true);
    try {
      console.log(`[AuthScreen] User tapped ${provider} sign in button`);
      if (provider === 'google') {
        await signInWithGoogle();
      } else if (provider === 'apple') {
        await signInWithApple();
      }
      console.log(`[AuthScreen] ${provider} sign in initiated`);
    } catch (error: any) {
      console.error(`[AuthScreen] ${provider} sign in error:`, error);
      const errorMessage = error.message || `${provider} sign in failed`;
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const renderForgotPasswordScreen = () => {
    const titleText = 'Reset Password';
    const subtitleText = 'Enter your email to receive a password reset link';
    const buttonText = 'Send Reset Link';
    const backButtonText = 'Back to Sign In';

    return (
      <View style={styles.scrollContent}>
        <View style={styles.logoContainer}>
          <Logo size="large" />
        </View>
        
        <Text style={styles.title}>{titleText}</Text>
        <Text style={styles.subtitle}>{subtitleText}</Text>

        {resetEmailSent && (
          <View style={styles.successMessage}>
            <Text style={styles.successMessageText}>
              Password reset email sent! Check your inbox.
            </Text>
          </View>
        )}

        {validationError && (
          <View style={styles.errorMessage}>
            <Text style={styles.errorMessageText}>{validationError}</Text>
          </View>
        )}

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor={colors.textTertiary}
          value={email}
          onChangeText={(text) => {
            setEmail(text);
            setValidationError(null);
          }}
          autoCapitalize="none"
          keyboardType="email-address"
          editable={!loading}
          returnKeyType="done"
          onSubmitEditing={handleForgotPassword}
        />

        <Button
          title={buttonText}
          onPress={handleForgotPassword}
          variant="primary"
          loading={loading}
          disabled={loading}
          style={styles.button}
        />

        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            setMode('signin');
            setResetEmailSent(false);
            setValidationError(null);
          }}
          disabled={loading}
        >
          <Text style={styles.backButtonText}>{backButtonText}</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderAuthScreen = () => {
    const isSignIn = mode === 'signin';
    const titleText = isSignIn ? 'Welcome Back' : 'Create Account';
    const subtitleText = isSignIn
      ? 'Sign in to My Wishlist'
      : 'Sign up to My Wishlist';
    const buttonText = isSignIn ? 'Sign In' : 'Sign Up';
    const switchText = isSignIn
      ? "Don't have an account?"
      : 'Already have an account?';
    const switchButtonText = isSignIn ? 'Sign Up' : 'Sign In';

    return (
      <View style={styles.scrollContent}>
        <View style={styles.logoContainer}>
          <Logo size="large" />
        </View>
        
        <Text style={styles.title}>{titleText}</Text>
        <Text style={styles.subtitle}>{subtitleText}</Text>

        {validationError && (
          <View style={styles.errorMessage}>
            <Text style={styles.errorMessageText}>{validationError}</Text>
          </View>
        )}

        {!isSignIn && (
          <TextInput
            style={styles.input}
            placeholder="Name"
            placeholderTextColor={colors.textTertiary}
            value={name}
            onChangeText={(text) => {
              setName(text);
              setValidationError(null);
            }}
            autoCapitalize="words"
            editable={!loading}
            returnKeyType="next"
          />
        )}

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor={colors.textTertiary}
          value={email}
          onChangeText={(text) => {
            setEmail(text);
            setValidationError(null);
          }}
          autoCapitalize="none"
          keyboardType="email-address"
          editable={!loading}
          returnKeyType="next"
        />

        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor={colors.textTertiary}
          value={password}
          onChangeText={(text) => {
            setPassword(text);
            setValidationError(null);
          }}
          secureTextEntry
          editable={!loading}
          returnKeyType="done"
          onSubmitEditing={handleEmailAuth}
        />

        {isSignIn && (
          <TouchableOpacity
            style={styles.forgotPasswordButton}
            onPress={() => {
              setMode('forgot-password');
              setValidationError(null);
            }}
            disabled={loading}
          >
            <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
          </TouchableOpacity>
        )}

        <Button
          title={buttonText}
          onPress={handleEmailAuth}
          variant="primary"
          loading={loading}
          disabled={loading}
          style={styles.button}
        />

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or continue with</Text>
          <View style={styles.dividerLine} />
        </View>

        <Button
          title="Continue with Google"
          onPress={() => handleSocialAuth('google')}
          variant="secondary"
          disabled={loading}
          style={styles.socialButton}
        />

        {Platform.OS === 'ios' && (
          <Button
            title="Continue with Apple"
            onPress={() => handleSocialAuth('apple')}
            variant="secondary"
            disabled={loading}
            style={styles.socialButton}
          />
        )}

        <View style={styles.switchModeContainer}>
          <Text style={styles.switchModeText}>{switchText}</Text>
          <TouchableOpacity 
            onPress={() => {
              setMode(isSignIn ? 'signup' : 'signin');
              setValidationError(null);
            }}
            disabled={loading}
          >
            <Text style={styles.switchModeButton}>{switchButtonText}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {mode === 'forgot-password' ? renderForgotPasswordScreen() : renderAuthScreen()}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    ...containerStyles.screen,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.displayLarge,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    ...typography.bodyLarge,
    color: colors.textSecondary,
    marginBottom: spacing.xl,
    textAlign: 'center',
  },
  input: {
    ...inputStyles.base,
    marginBottom: spacing.md,
  },
  button: {
    marginBottom: spacing.md,
  },
  socialButton: {
    marginBottom: spacing.sm,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.divider,
  },
  dividerText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    paddingHorizontal: spacing.md,
  },
  switchModeContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing.md,
  },
  switchModeText: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
  },
  switchModeButton: {
    ...typography.bodyMedium,
    color: colors.primary,
    fontWeight: '600',
    marginLeft: spacing.xs,
  },
  forgotPasswordButton: {
    alignSelf: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  forgotPasswordText: {
    ...typography.bodyMedium,
    color: colors.primary,
  },
  backButton: {
    alignSelf: 'center',
    marginTop: spacing.md,
  },
  backButtonText: {
    ...typography.bodyMedium,
    color: colors.primary,
  },
  successMessage: {
    backgroundColor: colors.successLight,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  successMessageText: {
    ...typography.bodyMedium,
    color: colors.success,
    textAlign: 'center',
  },
  errorMessage: {
    backgroundColor: '#fee',
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  errorMessageText: {
    ...typography.bodyMedium,
    color: colors.error,
    textAlign: 'center',
  },
});
</write file>

Now let's fix the errorLogger to not rethrow errors:

<write file="utils/errorLogger.ts">
// Global error logging for runtime errors
// Captures console.log/warn/error and sends to Natively server for AI debugging

// Declare __DEV__ global (React Native global for development mode detection)
declare const __DEV__: boolean;

import { Platform } from "react-native";
import Constants from "expo-constants";

// Simple debouncing to prevent duplicate logs
const recentLogs: { [key: string]: boolean } = {};
const clearLogAfterDelay = (logKey: string) => {
  setTimeout(() => delete recentLogs[logKey], 100);
};

// Messages to mute (noisy warnings that don't help debugging)
const MUTED_MESSAGES = [
  'each child in a list should have a unique "key" prop',
  'Each child in a list should have a unique "key" prop',
];

// Check if a message should be muted
const shouldMuteMessage = (message: string): boolean => {
  return MUTED_MESSAGES.some(muted => message.includes(muted));
};

// Queue for batching logs
let logQueue: Array<{ level: string; message: string; source: string; timestamp: string; platform: string }> = [];
let flushTimeout: ReturnType<typeof setTimeout> | null = null;
const FLUSH_INTERVAL = 500; // Flush every 500ms

// Get a friendly platform name
const getPlatformName = (): string => {
  switch (Platform.OS) {
    case 'ios':
      return 'iOS';
    case 'android':
      return 'Android';
    case 'web':
      return 'Web';
    default:
      return Platform.OS;
  }
};

// Cache the log server URL
let cachedLogServerUrl: string | null = null;
let urlChecked = false;

// Get the log server URL based on platform
const getLogServerUrl = (): string | null => {
  if (urlChecked) return cachedLogServerUrl;

  try {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      // For web, use the current origin
      cachedLogServerUrl = `${window.location.origin}/natively-logs`;
    } else {
      // For native, try to get the Expo dev server URL
      // experienceUrl format: exp://xxx.ngrok.io/... or exp://192.168.1.1:8081/...
      const experienceUrl = (Constants as any).experienceUrl;
      if (experienceUrl) {
        // Convert exp:// to https:// (for tunnels) or http:// (for local)
        let baseUrl = experienceUrl
          .replace('exp://', 'https://')
          .split('/')[0] + '//' + experienceUrl.replace('exp://', '').split('/')[0];

        // If it looks like a local IP, use http
        if (baseUrl.includes('192.168.') || baseUrl.includes('10.') || baseUrl.includes('localhost')) {
          baseUrl = baseUrl.replace('https://', 'http://');
        }

        cachedLogServerUrl = `${baseUrl}/natively-logs`;
      } else {
        // Fallback: try to use manifest hostUri
        const hostUri = Constants.expoConfig?.hostUri || (Constants as any).manifest?.hostUri;
        if (hostUri) {
          const protocol = hostUri.includes('ngrok') || hostUri.includes('.io') ? 'https' : 'http';
          cachedLogServerUrl = `${protocol}://${hostUri.split('/')[0]}/natively-logs`;
        }
      }
    }
  } catch (e) {
    // Silently fail
  }

  urlChecked = true;
  return cachedLogServerUrl;
};

// Track if we've logged fetch errors to avoid spam
let fetchErrorLogged = false;

// Flush the log queue to server
const flushLogs = async () => {
  if (logQueue.length === 0) return;

  const logsToSend = [...logQueue];
  logQueue = [];
  flushTimeout = null;

  const url = getLogServerUrl();
  if (!url) {
    // URL not available, silently skip
    return;
  }

  for (const log of logsToSend) {
    try {
      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(log),
      }).catch((e) => {
        // Log fetch errors only once to avoid spam
        if (!fetchErrorLogged) {
          fetchErrorLogged = true;
          // Use a different method to avoid recursion - write directly without going through our intercept
          if (typeof window !== 'undefined' && window.console) {
            (window.console as any).__proto__.log.call(console, '[Natively] Fetch error (will not repeat):', e.message || e);
          }
        }
      });
    } catch (e) {
      // Silently ignore sync errors
    }
  }
};

// Queue a log to be sent
const queueLog = (level: string, message: string, source: string = '') => {
  const logKey = `${level}:${message}`;

  // Skip duplicates
  if (recentLogs[logKey]) return;
  recentLogs[logKey] = true;
  clearLogAfterDelay(logKey);

  logQueue.push({
    level,
    message,
    source,
    timestamp: new Date().toISOString(),
    platform: getPlatformName(),
  });

  // Schedule flush if not already scheduled
  if (!flushTimeout) {
    flushTimeout = setTimeout(flushLogs, FLUSH_INTERVAL);
  }
};

// Function to send errors to parent window (React frontend) - for web iframe mode
const sendErrorToParent = (level: string, message: string, data: any) => {
  // Create a simple key to identify duplicate errors
  const errorKey = `${level}:${message}:${JSON.stringify(data)}`;

  // Skip if we've seen this exact error recently
  if (recentLogs[errorKey]) {
    return;
  }

  // Mark this error as seen and schedule cleanup
  recentLogs[errorKey] = true;
  clearLogAfterDelay(errorKey);

  try {
    if (typeof window !== 'undefined' && window.parent && window.parent !== window) {
      window.parent.postMessage({
        type: 'EXPO_ERROR',
        level: level,
        message: message,
        data: data,
        timestamp: new Date().toISOString(),
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
        source: 'expo-template'
      }, '*');
    }
  } catch (error) {
    // Silently fail
  }
};

// Function to extract meaningful source location from stack trace
const extractSourceLocation = (stack: string): string => {
  if (!stack) return '';

  // Look for various patterns in the stack trace
  const patterns = [
    // Pattern for app files: app/filename.tsx:line:column
    /at .+\/(app\/[^:)]+):(\d+):(\d+)/,
    // Pattern for components: components/filename.tsx:line:column
    /at .+\/(components\/[^:)]+):(\d+):(\d+)/,
    // Pattern for any .tsx/.ts files
    /at .+\/([^/]+\.tsx?):(\d+):(\d+)/,
    // Pattern for bundle files with source maps
    /at .+\/([^/]+\.bundle[^:]*):(\d+):(\d+)/,
    // Pattern for any JavaScript file
    /at .+\/([^/\s:)]+\.[jt]sx?):(\d+):(\d+)/
  ];

  for (const pattern of patterns) {
    const match = stack.match(pattern);
    if (match) {
      return `${match[1]}:${match[2]}:${match[3]}`;
    }
  }

  // If no specific pattern matches, try to find any file reference
  const fileMatch = stack.match(/at .+\/([^/\s:)]+\.[jt]sx?):(\d+)/);
  if (fileMatch) {
    return `${fileMatch[1]}:${fileMatch[2]}`;
  }

  return '';
};

// Function to get caller information from stack trace
const getCallerInfo = (): string => {
  const stack = new Error().stack || '';
  const lines = stack.split('\n');

  // Skip the first few lines (Error, getCallerInfo, stringifyArgs, console override, setupErrorLogging internals)
  for (let i = 3; i < lines.length; i++) {
    const line = lines[i];

    // Skip internal errorLogger calls and node_modules
    if (line.includes('errorLogger') || line.includes('node_modules')) {
      continue;
    }

    // Try multiple patterns to extract source location
    // Pattern 1: Standard format "at Component (file.tsx:10:5)"
    let match = line.match(/at\s+\S+\s+\((?:.*\/)?([^/\s:)]+\.[jt]sx?):(\d+):(\d+)\)/);
    if (match) {
      return `${match[1]}:${match[2]}`;
    }

    // Pattern 2: Anonymous function "at file.tsx:10:5"
    match = line.match(/at\s+(?:.*\/)?([^/\s:)]+\.[jt]sx?):(\d+):(\d+)/);
    if (match) {
      return `${match[1]}:${match[2]}`;
    }

    // Pattern 3: Hermes/React Native bundle format
    match = line.match(/(?:.*\/)?([^/\s:)]+\.[jt]sx?):(\d+):\d+/);
    if (match) {
      return `${match[1]}:${match[2]}`;
    }

    // Pattern 4: Look for app/ or components/ paths specifically
    if (line.includes('app/') || line.includes('components/') || line.includes('screens/') || line.includes('hooks/') || line.includes('utils/')) {
      match = line.match(/([^/\s:)]+\.[jt]sx?):(\d+)/);
      if (match) {
        return `${match[1]}:${match[2]}`;
      }
    }
  }

  return '';
};

// Helper to safely stringify arguments
const stringifyArgs = (args: any[]): string => {
  return args.map(arg => {
    if (typeof arg === 'string') return arg;
    if (arg === null) return 'null';
    if (arg === undefined) return 'undefined';
    try {
      return JSON.stringify(arg);
    } catch {
      return String(arg);
    }
  }).join(' ');
};

export const setupErrorLogging = () => {
  // Don't initialize in production builds - no need for log forwarding
  if (!__DEV__) {
    return;
  }

  // Store original console methods BEFORE any modifications
  const originalConsoleLog = console.log;
  const originalConsoleWarn = console.warn;
  const originalConsoleError = console.error;

  // Log initialization info using original console (not intercepted)
  const logServerUrl = getLogServerUrl();
  originalConsoleLog('[Natively] Setting up error logging...');
  originalConsoleLog('[Natively] Log server URL:', logServerUrl || 'NOT AVAILABLE');
  originalConsoleLog('[Natively] Platform:', Platform.OS);

  // Override console.log to capture and send to server
  console.log = (...args: any[]) => {
    // Always call original first
    originalConsoleLog.apply(console, args);

    // Queue log for sending to server
    const message = stringifyArgs(args);
    const source = getCallerInfo();
    queueLog('log', message, source);
  };

  // Override console.warn to capture and send to server
  console.warn = (...args: any[]) => {
    // Always call original first
    originalConsoleWarn.apply(console, args);

    // Queue log for sending to server (skip muted messages)
    const message = stringifyArgs(args);
    if (shouldMuteMessage(message)) return;

    const source = getCallerInfo();
    queueLog('warn', message, source);
  };

  // Override console.error to capture and send to server
  // CRITICAL FIX: Log errors once, do NOT rethrow
  console.error = (...args: any[]) => {
    // Queue log for sending to server (skip muted messages)
    const message = stringifyArgs(args);
    if (shouldMuteMessage(message)) return;

    // Always call original first
    originalConsoleError.apply(console, args);

    const source = getCallerInfo();
    queueLog('error', message, source);

    // Also send to parent window for web iframe mode
    sendErrorToParent('error', 'Console Error', message);

    // DO NOT RETHROW - this prevents cascading logs for single auth failures
  };

  // Capture unhandled errors in web environment
  if (typeof window !== 'undefined') {
    // Override window.onerror to catch JavaScript errors
    window.onerror = (message, source, lineno, colno, error) => {
      const sourceFile = source ? source.split('/').pop() : 'unknown';
      const errorMessage = `RUNTIME ERROR: ${message} at ${sourceFile}:${lineno}:${colno}`;

      queueLog('error', errorMessage, `${sourceFile}:${lineno}:${colno}`);
      sendErrorToParent('error', 'JavaScript Runtime Error', {
        message,
        source: `${sourceFile}:${lineno}:${colno}`,
        error: error?.stack || error,
      });

      return false; // Don't prevent default error handling
    };

    // Capture unhandled promise rejections (web only)
    if (Platform.OS === 'web') {
      window.addEventListener('unhandledrejection', (event) => {
        const message = `UNHANDLED PROMISE REJECTION: ${event.reason}`;
        queueLog('error', message, '');
        sendErrorToParent('error', 'Unhandled Promise Rejection', { reason: event.reason });
      });
    }
  }
};

// Auto-initialize logging when this module is imported
// Only run in development mode - production apps don't need log forwarding
if (__DEV__) {
  setupErrorLogging();
}
</write file>

Now let's update the RootLayout to add a proper loading/splash state while checking session:

<write file="app/_layout.tsx">
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import 'react-native-reanimated';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { ThemeProvider as AppThemeProvider } from '@/contexts/ThemeContext';
import { I18nProvider } from '@/contexts/I18nContext';
import { WidgetProvider } from '@/contexts/WidgetContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { verifySupabaseConnection, getSupabaseConfig } from '@/utils/supabase-connection';
import { SUPABASE_CONNECTION_STATUS } from '@/lib/supabase';
import { colors } from '@/styles/designSystem';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

function RootLayoutNav() {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    // CRITICAL: Wait for auth to finish loading before navigation
    if (loading) {
      console.log('[RootLayout] Auth loading, waiting for session check...');
      return;
    }

    const inAuthGroup = segments[0] === 'auth' || segments[0] === 'auth-popup' || segments[0] === 'auth-callback';

    console.log('[RootLayout] Auth state resolved - User:', user?.id, 'In auth group:', inAuthGroup);

    if (!user && !inAuthGroup) {
      // User is not logged in and not on auth screen, redirect to auth
      console.log('[RootLayout] User not authenticated, redirecting to auth screen');
      router.replace('/auth');
    } else if (user && inAuthGroup) {
      // User is logged in but on auth screen, redirect to wishlists
      console.log('[RootLayout] User authenticated, redirecting to wishlists');
      router.replace('/(tabs)/wishlists');
    }
  }, [user, loading, segments]);

  // Show loading screen while checking session
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="auth" options={{ headerShown: false }} />
      <Stack.Screen name="auth-popup" options={{ headerShown: false }} />
      <Stack.Screen name="auth-callback" options={{ headerShown: false }} />
      <Stack.Screen name="auth-debug" options={{ headerShown: false }} />
      <Stack.Screen name="+not-found" />
    </Stack>
  );
}

export default function RootLayout() {
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  useEffect(() => {
    // Verify Supabase connection on app start
    console.log('[App] ═══════════════════════════════════════════════════');
    console.log('[App] 🚀 MY WISHLIST APP STARTING');
    console.log('[App] ═══════════════════════════════════════════════════');
    console.log('[App] Verifying Supabase connection...');
    
    const config = getSupabaseConfig();
    console.log('[App] Supabase Config:', config);
    console.log('[App] Supabase Connection Status:', SUPABASE_CONNECTION_STATUS);
    
    verifySupabaseConnection().then((status) => {
      console.log('[App] ═══════════════════════════════════════════════════');
      if (status.connected) {
        console.log('[App] ✅ SUPABASE CONNECTION VERIFIED SUCCESSFULLY');
        console.log('[App] ═══════════════════════════════════════════════════');
        console.log('[App] - URL:', status.url);
        console.log('[App] - Auth configured:', status.authConfigured);
        console.log('[App] - Database accessible:', status.databaseAccessible);
        console.log('[App] - Anon key configured:', status.hasAnonKey);
        console.log('[App] ═══════════════════════════════════════════════════');
        console.log('[App] 🎉 NATIVELY + SUPABASE INTEGRATION ACTIVE');
        console.log('[App] ═══════════════════════════════════════════════════');
      } else {
        console.error('[App] ❌ Supabase connection failed:', status.error);
      }
    });
  }, []);

  if (!loaded) {
    return null;
  }

  return (
    <ErrorBoundary>
      <AppThemeProvider>
        <AuthProvider>
          <I18nProvider>
            <WidgetProvider>
              <RootLayoutNav />
              <StatusBar style="auto" />
            </WidgetProvider>
          </I18nProvider>
        </AuthProvider>
      </AppThemeProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
});
</write file>

Now let's create the Auth Debug panel (DEV only):

<write file="app/auth-debug.tsx">
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { Stack, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, typography, spacing, containerStyles } from '@/styles/designSystem';
import { Button } from '@/components/design-system/Button';
import { IconSymbol } from '@/components/IconSymbol';

export default function AuthDebugScreen() {
  const { user, loading, error, signOut } = useAuth();
  const router = useRouter();

  // Only show in DEV mode
  if (!__DEV__) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen
          options={{
            title: 'Auth Debug',
            headerShown: true,
          }}
        />
        <View style={styles.content}>
          <Text style={styles.warningText}>
            Auth Debug panel is only available in development mode.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const handleClearSession = async () => {
    Alert.alert(
      'Clear Session',
      'Are you sure you want to sign out?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('[AuthDebug] User tapped Clear Session button');
              await signOut();
              console.log('[AuthDebug] Session cleared successfully');
              Alert.alert('Success', 'Session cleared successfully');
            } catch (err: any) {
              console.error('[AuthDebug] Failed to clear session:', err);
              Alert.alert('Error', err.message || 'Failed to clear session');
            }
          },
        },
      ]
    );
  };

  const sessionStatus = user ? 'exists' : 'null';
  const userId = user?.id || 'N/A';
  const userEmail = user?.email || 'N/A';
  const authStatus = loading ? 'Loading...' : (user ? 'Authenticated' : 'Not authenticated');
  const lastError = error || 'None';

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Auth Debug (DEV)',
          headerShown: true,
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <IconSymbol
                ios_icon_name="chevron.left"
                android_material_icon_name="arrow-back"
                size={24}
                color={colors.text}
              />
            </TouchableOpacity>
          ),
        }}
      />
      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Auth Status</Text>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Status:</Text>
            <Text style={styles.value}>{authStatus}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Session:</Text>
            <Text style={styles.value}>{sessionStatus}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>User Info</Text>
          <View style={styles.infoRow}>
            <Text style={styles.label}>User ID:</Text>
            <Text style={styles.value}>{userId}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Email:</Text>
            <Text style={styles.value}>{userEmail}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Last Error</Text>
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{lastError}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Actions</Text>
          <Button
            title="Clear Session (Sign Out)"
            onPress={handleClearSession}
            variant="secondary"
            disabled={!user}
            style={styles.button}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.helpText}>
            This debug panel helps verify that auth is behaving correctly.
            {'\n\n'}
            • Session should be "exists" when logged in
            {'\n'}
            • User ID should be a valid UUID when logged in
            {'\n'}
            • Last error shows the most recent auth error
            {'\n'}
            • Clear session signs out the current user
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    ...containerStyles.screen,
  },
  content: {
    flex: 1,
    padding: spacing.lg,
  },
  backButton: {
    padding: spacing.sm,
    marginLeft: spacing.sm,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    ...typography.headingMedium,
    marginBottom: spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  label: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  value: {
    ...typography.bodyMedium,
    color: colors.text,
    flex: 1,
    textAlign: 'right',
    marginLeft: spacing.md,
  },
  errorBox: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  errorText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontFamily: 'monospace',
  },
  button: {
    marginTop: spacing.md,
  },
  helpText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  warningText: {
    ...typography.bodyLarge,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
</write file>

Now let's add a link to the Auth Debug panel in the profile screen (DEV only):

<write file="app/(tabs)/profile.tsx">
import { useAppTheme } from '@/contexts/ThemeContext';
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { PressableScale } from '@/components/design-system/PressableScale';
import { getCurrencyByCode } from '@/constants/currencies';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { colors, typography, spacing, containerStyles } from '@/styles/designSystem';
import { SUPPORTED_LANGUAGES } from '@/lib/i18n';
import { Card } from '@/components/design-system/Card';
import { Divider } from '@/components/design-system/Divider';
import { useRouter } from 'expo-router';
import { authenticatedGet, authenticatedPut } from '@/utils/api';
import { PremiumCard } from '@/components/PremiumCard';
import { Button } from '@/components/design-system/Button';
import { CurrencyPicker } from '@/components/pickers/CurrencyPicker';
import { useI18n } from '@/contexts/I18nContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  Platform,
  TouchableOpacity,
  Switch,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { useHaptics } from '@/hooks/useHaptics';
import { IconSymbol } from '@/components/IconSymbol';

interface UserLocation {
  id: string;
  userId: string;
  countryCode: string;
  countryName: string;
  city: string | null;
  region: string | null;
  postalCode: string | null;
  updatedAt: string;
}

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const { t } = useTranslation();
  const { theme, setTheme } = useAppTheme();
  const { language, setLanguage } = useI18n();
  const { triggerHaptic } = useHaptics();

  const [loading, setLoading] = useState(true);
  const [priceDropAlertsEnabled, setPriceDropAlertsEnabled] = useState(true);
  const [weeklyDigestEnabled, setWeeklyDigestEnabled] = useState(false);
  const [defaultCurrency, setDefaultCurrency] = useState('USD');
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);
  const [location, setLocation] = useState<UserLocation | null>(null);

  const fetchSettings = useCallback(async () => {
    if (!user) return;

    try {
      console.log('[ProfileScreen] Fetching user settings');
      const response = await authenticatedGet('/api/users/settings');
      
      if (response.ok) {
        const data = await response.json();
        console.log('[ProfileScreen] Settings fetched:', data);
        setPriceDropAlertsEnabled(data.priceDropAlertsEnabled ?? true);
        setWeeklyDigestEnabled(data.weeklyDigestEnabled ?? false);
        setDefaultCurrency(data.defaultCurrency || 'USD');
      } else {
        console.error('[ProfileScreen] Failed to fetch settings:', response.status);
      }
    } catch (error) {
      console.error('[ProfileScreen] Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const fetchLocation = useCallback(async () => {
    if (!user) return;

    try {
      console.log('[ProfileScreen] Fetching user location');
      const response = await authenticatedGet('/api/location');
      
      if (response.ok) {
        const data = await response.json();
        console.log('[ProfileScreen] Location fetched:', data);
        setLocation(data);
      } else {
        console.log('[ProfileScreen] No location set');
      }
    } catch (error) {
      console.error('[ProfileScreen] Error fetching location:', error);
    }
  }, [user]);

  useEffect(() => {
    fetchSettings();
    fetchLocation();
  }, [user, fetchSettings, fetchLocation]);

  const updateSettings = async (updates: {
    priceDropAlertsEnabled?: boolean;
    weeklyDigestEnabled?: boolean;
    defaultCurrency?: string;
  }) => {
    try {
      console.log('[ProfileScreen] Updating settings:', updates);
      const response = await authenticatedPut('/api/users/settings', updates);
      
      if (!response.ok) {
        console.error('[ProfileScreen] Failed to update settings:', response.status);
        Alert.alert('Error', 'Failed to update settings');
      } else {
        console.log('[ProfileScreen] Settings updated successfully');
      }
    } catch (error) {
      console.error('[ProfileScreen] Error updating settings:', error);
      Alert.alert('Error', 'Failed to update settings');
    }
  };

  const handleTogglePriceAlerts = (value: boolean) => {
    console.log('[ProfileScreen] User toggled price alerts:', value);
    triggerHaptic('light');
    setPriceDropAlertsEnabled(value);
    updateSettings({ priceDropAlertsEnabled: value });
  };

  const handleSelectCurrency = (currency: { currencyCode: string; currencyName: string }) => {
    console.log('[ProfileScreen] User selected currency:', currency.currencyCode);
    triggerHaptic('light');
    setDefaultCurrency(currency.currencyCode);
    setShowCurrencyPicker(false);
    updateSettings({ defaultCurrency: currency.currencyCode });
  };

  const handleThemeChange = (preference: 'light' | 'dark' | 'system') => {
    console.log('[ProfileScreen] User changed theme to:', preference);
    triggerHaptic('light');
    setTheme(preference);
  };

  const handleSignOut = async () => {
    Alert.alert(
      t('profile.signOut'),
      t('profile.signOutConfirm'),
      [
        {
          text: t('common.cancel'),
          style: 'cancel',
        },
        {
          text: t('profile.signOut'),
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('[ProfileScreen] User tapped Sign Out button');
              triggerHaptic('medium');
              await signOut();
              console.log('[ProfileScreen] Sign out successful');
            } catch (error: any) {
              console.error('[ProfileScreen] Sign out error:', error);
              Alert.alert('Error', error.message || 'Failed to sign out');
            }
          },
        },
      ]
    );
  };

  const handleContactSupport = () => {
    console.log('[ProfileScreen] User tapped Contact Support');
    triggerHaptic('light');
    Linking.openURL('mailto:support@mywishlist.app');
  };

  const handlePrivacyPolicy = () => {
    console.log('[ProfileScreen] User tapped Privacy Policy');
    triggerHaptic('light');
    router.push('/legal/privacy');
  };

  const handleTerms = () => {
    console.log('[ProfileScreen] User tapped Terms of Service');
    triggerHaptic('light');
    router.push('/legal/terms');
  };

  const handleEditLocation = () => {
    console.log('[ProfileScreen] User tapped Edit Location');
    triggerHaptic('light');
    router.push('/location');
  };

  const selectedCurrency = getCurrencyByCode(defaultCurrency);
  const currencyDisplay = selectedCurrency
    ? `${selectedCurrency.currencyCode} (${selectedCurrency.symbol})`
    : defaultCurrency;

  const locationDisplay = location
    ? `${location.city ? location.city + ', ' : ''}${location.countryName}`
    : 'Not set';

  const themeDisplay = theme === 'system' ? 'System' : theme === 'dark' ? 'Dark' : 'Light';

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content}>
        <Animated.View entering={FadeIn}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>{t('profile.title')}</Text>
          </View>

          <View style={styles.userInfo}>
            <View style={styles.avatarPlaceholder}>
              <IconSymbol
                ios_icon_name="person.fill"
                android_material_icon_name="person"
                size={40}
                color={colors.primary}
              />
            </View>
            <Text style={styles.userName}>{user?.name || user?.email}</Text>
            <Text style={styles.userEmail}>{user?.email}</Text>
          </View>

          <PremiumCard />

          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>{t('profile.preferences')}</Text>

            <TouchableOpacity
              style={styles.settingRow}
              onPress={() => setShowCurrencyPicker(true)}
            >
              <View style={styles.settingLeft}>
                <IconSymbol
                  ios_icon_name="dollarsign.circle"
                  android_material_icon_name="attach-money"
                  size={24}
                  color={colors.textSecondary}
                />
                <Text style={styles.settingLabel}>{t('profile.defaultCurrency')}</Text>
              </View>
              <View style={styles.settingRight}>
                <Text style={styles.settingValue}>{currencyDisplay}</Text>
                <IconSymbol
                  ios_icon_name="chevron.right"
                  android_material_icon_name="chevron-right"
                  size={20}
                  color={colors.textTertiary}
                />
              </View>
            </TouchableOpacity>

            <Divider />

            <TouchableOpacity style={styles.settingRow} onPress={handleEditLocation}>
              <View style={styles.settingLeft}>
                <IconSymbol
                  ios_icon_name="location.fill"
                  android_material_icon_name="location-on"
                  size={24}
                  color={colors.textSecondary}
                />
                <Text style={styles.settingLabel}>{t('profile.location')}</Text>
              </View>
              <View style={styles.settingRight}>
                <Text style={styles.settingValue}>{locationDisplay}</Text>
                <IconSymbol
                  ios_icon_name="chevron.right"
                  android_material_icon_name="chevron-right"
                  size={20}
                  color={colors.textTertiary}
                />
              </View>
            </TouchableOpacity>

            <Divider />

            <View style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <IconSymbol
                  ios_icon_name="bell.fill"
                  android_material_icon_name="notifications"
                  size={24}
                  color={colors.textSecondary}
                />
                <Text style={styles.settingLabel}>{t('profile.priceDropAlerts')}</Text>
              </View>
              <Switch
                value={priceDropAlertsEnabled}
                onValueChange={handleTogglePriceAlerts}
                trackColor={{ false: colors.divider, true: colors.primary }}
                thumbColor={colors.background}
              />
            </View>
          </Card>

          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>{t('profile.appearance')}</Text>

            <View style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <IconSymbol
                  ios_icon_name="moon.fill"
                  android_material_icon_name="dark-mode"
                  size={24}
                  color={colors.textSecondary}
                />
                <Text style={styles.settingLabel}>{t('profile.theme')}</Text>
              </View>
              <View style={styles.settingRight}>
                <Text style={styles.settingValue}>{themeDisplay}</Text>
              </View>
            </View>
          </Card>

          {__DEV__ && (
            <Card style={styles.section}>
              <Text style={styles.sectionTitle}>Developer Tools</Text>
              <TouchableOpacity
                style={styles.settingRow}
                onPress={() => {
                  console.log('[ProfileScreen] User tapped Auth Debug');
                  triggerHaptic('light');
                  router.push('/auth-debug');
                }}
              >
                <View style={styles.settingLeft}>
                  <IconSymbol
                    ios_icon_name="wrench.fill"
                    android_material_icon_name="settings"
                    size={24}
                    color={colors.textSecondary}
                  />
                  <Text style={styles.settingLabel}>Auth Debug Panel</Text>
                </View>
                <IconSymbol
                  ios_icon_name="chevron.right"
                  android_material_icon_name="chevron-right"
                  size={20}
                  color={colors.textTertiary}
                />
              </TouchableOpacity>
            </Card>
          )}

          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>{t('profile.support')}</Text>

            <TouchableOpacity style={styles.settingRow} onPress={handleContactSupport}>
              <View style={styles.settingLeft}>
                <IconSymbol
                  ios_icon_name="envelope.fill"
                  android_material_icon_name="email"
                  size={24}
                  color={colors.textSecondary}
                />
                <Text style={styles.settingLabel}>{t('profile.contactSupport')}</Text>
              </View>
              <IconSymbol
                ios_icon_name="chevron.right"
                android_material_icon_name="chevron-right"
                size={20}
                color={colors.textTertiary}
              />
            </TouchableOpacity>

            <Divider />

            <TouchableOpacity style={styles.settingRow} onPress={handlePrivacyPolicy}>
              <View style={styles.settingLeft}>
                <IconSymbol
                  ios_icon_name="lock.fill"
                  android_material_icon_name="lock"
                  size={24}
                  color={colors.textSecondary}
                />
                <Text style={styles.settingLabel}>{t('profile.privacyPolicy')}</Text>
              </View>
              <IconSymbol
                ios_icon_name="chevron.right"
                android_material_icon_name="chevron-right"
                size={20}
                color={colors.textTertiary}
              />
            </TouchableOpacity>

            <Divider />

            <TouchableOpacity style={styles.settingRow} onPress={handleTerms}>
              <View style={styles.settingLeft}>
                <IconSymbol
                  ios_icon_name="doc.text.fill"
                  android_material_icon_name="description"
                  size={24}
                  color={colors.textSecondary}
                />
                <Text style={styles.settingLabel}>{t('profile.termsOfService')}</Text>
              </View>
              <IconSymbol
                ios_icon_name="chevron.right"
                android_material_icon_name="chevron-right"
                size={20}
                color={colors.textTertiary}
              />
            </TouchableOpacity>
          </Card>

          <Button
            title={t('profile.signOut')}
            onPress={handleSignOut}
            variant="secondary"
            style={styles.signOutButton}
          />

          <Text style={styles.version}>Version 1.0.0</Text>
        </Animated.View>
      </ScrollView>

      <CurrencyPicker
        visible={showCurrencyPicker}
        onClose={() => setShowCurrencyPicker(false)}
        onSelect={handleSelectCurrency}
        selectedCurrency={defaultCurrency}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    ...containerStyles.screen,
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: spacing.lg,
    paddingBottom: spacing.md,
  },
  headerTitle: {
    ...typography.displayLarge,
  },
  userInfo: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  userName: {
    ...typography.headingLarge,
    marginBottom: spacing.xs,
  },
  userEmail: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
  },
  section: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    padding: spacing.lg,
  },
  sectionTitle: {
    ...typography.headingSmall,
    marginBottom: spacing.md,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingLabel: {
    ...typography.bodyMedium,
    marginLeft: spacing.md,
    flex: 1,
  },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingValue: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
    marginRight: spacing.xs,
  },
  signOutButton: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  version: {
    ...typography.bodySmall,
    color: colors.textTertiary,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
});
