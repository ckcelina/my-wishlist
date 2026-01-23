
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
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/design-system/Button';
import { Logo } from '@/components/Logo';
import { colors, typography, spacing, inputStyles, containerStyles } from '@/styles/designSystem';

type Mode = 'signin' | 'signup' | 'forgot-password';

export default function AuthScreen() {
  const router = useRouter();
  const { signInWithEmail, signUpWithEmail, signInWithGoogle, signInWithApple, signInWithGitHub, resetPassword } = useAuth();
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);

  const handleEmailAuth = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (mode === 'signup' && !name) {
      Alert.alert('Error', 'Please enter your name');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'signin') {
        console.log('[AuthScreen] User tapped Sign In button');
        await signInWithEmail(email, password);
        console.log('[AuthScreen] Sign in successful, navigating to wishlists');
        router.replace('/wishlists');
      } else {
        console.log('[AuthScreen] User tapped Sign Up button');
        await signUpWithEmail(email, password, name);
        console.log('[AuthScreen] Sign up successful');
      }
    } catch (error: any) {
      console.error('[AuthScreen] Authentication error:', error);
      Alert.alert('Error', error.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }

    setLoading(true);
    try {
      console.log('[AuthScreen] User tapped Reset Password button');
      await resetPassword(email);
      setResetEmailSent(true);
      console.log('[AuthScreen] Password reset email sent');
    } catch (error: any) {
      console.error('[AuthScreen] Password reset error:', error);
      Alert.alert('Error', error.message || 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  };

  const handleSocialAuth = async (provider: 'google' | 'apple' | 'github') => {
    setLoading(true);
    try {
      console.log(`[AuthScreen] User tapped ${provider} sign in button`);
      if (provider === 'google') {
        await signInWithGoogle();
      } else if (provider === 'apple') {
        await signInWithApple();
      } else {
        await signInWithGitHub();
      }
      console.log(`[AuthScreen] ${provider} sign in successful, navigating to wishlists`);
      router.replace('/wishlists');
    } catch (error: any) {
      console.error(`[AuthScreen] ${provider} sign in error:`, error);
      Alert.alert('Error', error.message || `${provider} sign in failed`);
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

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor={colors.textTertiary}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          editable={!loading}
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
          }}
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
      ? 'Sign in to continue to your wishlists'
      : 'Sign up to start saving your wishlist items';
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

        {!isSignIn && (
          <TextInput
            style={styles.input}
            placeholder="Name"
            placeholderTextColor={colors.textTertiary}
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
            editable={!loading}
          />
        )}

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor={colors.textTertiary}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          editable={!loading}
        />

        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor={colors.textTertiary}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          editable={!loading}
        />

        {isSignIn && (
          <TouchableOpacity
            style={styles.forgotPasswordButton}
            onPress={() => setMode('forgot-password')}
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

        <Button
          title="Continue with GitHub"
          onPress={() => handleSocialAuth('github')}
          variant="secondary"
          disabled={loading}
          style={styles.socialButton}
        />

        <View style={styles.switchModeContainer}>
          <Text style={styles.switchModeText}>{switchText}</Text>
          <TouchableOpacity onPress={() => setMode(isSignIn ? 'signup' : 'signin')}>
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
});
