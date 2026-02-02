
import React, { useState, useMemo, useEffect } from 'react';
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
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/design-system/Button';
import { Logo } from '@/components/Logo';
import { createColors, createTypography, spacing } from '@/styles/designSystem';
import { useAppTheme } from '@/contexts/ThemeContext';
import { IconSymbol } from '@/components/IconSymbol';
import { useRouter } from 'expo-router';

type Mode = 'signin' | 'signup' | 'forgot-password';

export default function AuthScreen() {
  const { user, signInWithEmail, signUpWithEmail, signInWithGoogle, signInWithApple, resetPassword } = useAuth();
  const { theme } = useAppTheme();
  const colors = useMemo(() => createColors(theme), [theme]);
  const typography = useMemo(() => createTypography(theme), [theme]);
  const router = useRouter();
  
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [confirmationEmailSent, setConfirmationEmailSent] = useState(false);
  const [rateLimitError, setRateLimitError] = useState(false);

  // Redirect to app if user is already logged in
  useEffect(() => {
    if (user) {
      console.log('[AuthScreen] User already logged in, redirecting to app');
      router.replace('/(tabs)/wishlists');
    }
  }, [user, router]);

  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollContent: {
      flexGrow: 1,
      justifyContent: 'center',
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
    },
    logoContainer: {
      alignItems: 'center',
      marginBottom: spacing.lg,
    },
    title: {
      ...typography.displayLarge,
      color: colors.text,
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
      backgroundColor: colors.surface,
      borderWidth: 1.5,
      borderColor: colors.border,
      borderRadius: 12,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.md,
      fontSize: 16,
      color: colors.text,
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
      color: colors.accent,
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
      color: colors.accent,
    },
    backButton: {
      alignSelf: 'center',
      marginTop: spacing.md,
    },
    backButtonText: {
      ...typography.bodyMedium,
      color: colors.accent,
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
    infoMessage: {
      backgroundColor: colors.accentLight,
      borderRadius: 12,
      padding: spacing.lg,
      marginBottom: spacing.lg,
    },
    infoMessageTitle: {
      ...typography.titleMedium,
      color: colors.accent,
      marginBottom: spacing.sm,
      textAlign: 'center',
    },
    infoMessageText: {
      ...typography.bodyMedium,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 22,
    },
    warningMessage: {
      backgroundColor: colors.warningLight,
      borderRadius: 12,
      padding: spacing.lg,
      marginBottom: spacing.lg,
    },
    warningMessageTitle: {
      ...typography.titleMedium,
      color: colors.warning,
      marginBottom: spacing.sm,
      textAlign: 'center',
    },
    warningMessageText: {
      ...typography.bodyMedium,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 22,
    },
    dismissButton: {
      marginTop: spacing.md,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      backgroundColor: colors.accent,
      borderRadius: 8,
      alignSelf: 'center',
    },
    dismissButtonText: {
      ...typography.bodyMedium,
      color: theme.mode === 'dark' ? colors.background : colors.background,
      fontWeight: '600',
    },
    iconContainer: {
      alignItems: 'center',
      marginBottom: spacing.md,
    },
  }), [colors, typography, theme]);

  const handleEmailAuth = async () => {
    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();
    const trimmedName = name.trim();

    if (!trimmedEmail || !trimmedPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (mode === 'signup' && !trimmedName) {
      Alert.alert('Error', 'Please enter your name');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    if (trimmedPassword.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    setConfirmationEmailSent(false);
    setRateLimitError(false);
    
    try {
      if (mode === 'signin') {
        console.log('[AuthScreen] User tapped Sign In button with email:', trimmedEmail);
        await signInWithEmail(trimmedEmail, trimmedPassword);
        console.log('[AuthScreen] Sign in successful');
        // Navigation will be handled by the auth guard in _layout.tsx
      } else {
        console.log('[AuthScreen] User tapped Sign Up button with email:', trimmedEmail);
        await signUpWithEmail(trimmedEmail, trimmedPassword, trimmedName);
        console.log('[AuthScreen] Sign up successful');
        // Navigation will be handled by the auth guard in _layout.tsx
      }
    } catch (error: any) {
      console.error('[AuthScreen] Authentication error:', error);
      
      if (error.code === 'rate_limit_exceeded') {
        setRateLimitError(true);
      } else if (error.code === 'email_confirmation_required') {
        setConfirmationEmailSent(true);
      } else if (error.code === 'email_not_confirmed') {
        // Show a helpful message for email not confirmed error
        Alert.alert(
          'Email Not Confirmed',
          'Please check your email and click the confirmation link before signing in. Check your spam folder if you don\'t see it.',
          [{ text: 'OK' }]
        );
      } else {
        const errorMessage = error.message || 'Authentication failed';
        Alert.alert('Error', errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    const trimmedEmail = email.trim();
    
    if (!trimmedEmail) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    setLoading(true);
    setRateLimitError(false);
    
    try {
      console.log('[AuthScreen] User tapped Reset Password button for:', trimmedEmail);
      await resetPassword(trimmedEmail);
      setResetEmailSent(true);
      console.log('[AuthScreen] Password reset email sent');
      Alert.alert('Success', 'Password reset email sent! Check your inbox.');
    } catch (error: any) {
      console.error('[AuthScreen] Password reset error:', error);
      
      if (error.code === 'rate_limit_exceeded') {
        setRateLimitError(true);
      } else {
        const errorMessage = error.message || 'Failed to send reset email';
        Alert.alert('Error', errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSocialAuth = async (provider: 'google' | 'apple') => {
    setLoading(true);
    setRateLimitError(false);
    
    try {
      console.log(`[AuthScreen] User tapped ${provider} sign in button`);
      if (provider === 'google') {
        await signInWithGoogle();
      } else if (provider === 'apple') {
        await signInWithApple();
      }
      console.log(`[AuthScreen] ${provider} sign in initiated`);
      // Navigation will be handled by the auth callback
    } catch (error: any) {
      console.error(`[AuthScreen] ${provider} sign in error:`, error);
      
      if (error.code === 'rate_limit_exceeded') {
        setRateLimitError(true);
      } else {
        const errorMessage = error.message || `${provider} sign in failed`;
        Alert.alert('Error', errorMessage);
      }
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
      <>
        <View style={styles.logoContainer}>
          <Logo size="large" />
        </View>
        
        <Text style={styles.title}>{titleText}</Text>
        <Text style={styles.subtitle}>{subtitleText}</Text>

        {rateLimitError && (
          <View style={styles.warningMessage}>
            <Text style={styles.warningMessageTitle}>Too Many Attempts</Text>
            <Text style={styles.warningMessageText}>
              You've made too many password reset attempts. Please wait a few minutes before trying again.
            </Text>
            <TouchableOpacity
              style={styles.dismissButton}
              onPress={() => setRateLimitError(false)}
            >
              <Text style={styles.dismissButtonText}>Dismiss</Text>
            </TouchableOpacity>
          </View>
        )}

        {resetEmailSent && !rateLimitError && (
          <View style={styles.successMessage}>
            <Text style={styles.successMessageText}>
              Password reset email sent! Check your inbox.
            </Text>
          </View>
        )}

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor={colors.textSecondary}
          value={email}
          onChangeText={setEmail}
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
          disabled={loading || rateLimitError}
          style={styles.button}
        />

        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            setMode('signin');
            setResetEmailSent(false);
            setRateLimitError(false);
          }}
          disabled={loading}
        >
          <Text style={styles.backButtonText}>{backButtonText}</Text>
        </TouchableOpacity>
      </>
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
      <>
        <View style={styles.logoContainer}>
          <Logo size="large" />
        </View>
        
        <Text style={styles.title}>{titleText}</Text>
        <Text style={styles.subtitle}>{subtitleText}</Text>

        {rateLimitError && (
          <View style={styles.warningMessage}>
            <Text style={styles.warningMessageTitle}>Too Many Attempts</Text>
            <Text style={styles.warningMessageText}>
              You've made too many authentication attempts. Please wait a few minutes before trying again.
            </Text>
            <TouchableOpacity
              style={styles.dismissButton}
              onPress={() => setRateLimitError(false)}
            >
              <Text style={styles.dismissButtonText}>Dismiss</Text>
            </TouchableOpacity>
          </View>
        )}

        {confirmationEmailSent && !rateLimitError && (
          <View style={styles.infoMessage}>
            <View style={styles.iconContainer}>
              <IconSymbol
                ios_icon_name="envelope.fill"
                android_material_icon_name="email"
                size={48}
                color={colors.accent}
              />
            </View>
            <Text style={styles.infoMessageTitle}>Check Your Email</Text>
            <Text style={styles.infoMessageText}>
              We sent a confirmation link to {email}. Please click the link to verify your account, then return here to sign in.
            </Text>
            <Text style={[styles.infoMessageText, { marginTop: spacing.sm, fontWeight: '600' }]}>
              Don't forget to check your spam folder!
            </Text>
            <TouchableOpacity
              style={styles.dismissButton}
              onPress={() => {
                setConfirmationEmailSent(false);
                setMode('signin');
              }}
            >
              <Text style={styles.dismissButtonText}>Got it, take me to sign in</Text>
            </TouchableOpacity>
          </View>
        )}

        {!isSignIn && (
          <TextInput
            style={styles.input}
            placeholder="Name"
            placeholderTextColor={colors.textSecondary}
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
            editable={!loading}
            returnKeyType="next"
          />
        )}

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor={colors.textSecondary}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          editable={!loading}
          returnKeyType="next"
        />

        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor={colors.textSecondary}
          value={password}
          onChangeText={setPassword}
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
              setRateLimitError(false);
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
          disabled={loading || rateLimitError}
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
          disabled={loading || rateLimitError}
          style={styles.socialButton}
        />

        {Platform.OS === 'ios' && (
          <Button
            title="Continue with Apple"
            onPress={() => handleSocialAuth('apple')}
            variant="secondary"
            disabled={loading || rateLimitError}
            style={styles.socialButton}
          />
        )}

        <View style={styles.switchModeContainer}>
          <Text style={styles.switchModeText}>{switchText}</Text>
          <TouchableOpacity 
            onPress={() => {
              setMode(isSignIn ? 'signup' : 'signin');
              setRateLimitError(false);
            }}
            disabled={loading}
          >
            <Text style={styles.switchModeButton}>{switchButtonText}</Text>
          </TouchableOpacity>
        </View>
      </>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {mode === 'forgot-password' ? renderForgotPasswordScreen() : renderAuthScreen()}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
