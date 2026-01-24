
import { useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { colors, typography } from '@/styles/designSystem';

export default function AuthPopupScreen() {
  const { provider } = useLocalSearchParams<{ provider?: string }>();

  useEffect(() => {
    console.log('[AuthPopup] Initiating OAuth for provider:', provider);
    handleOAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [provider]);

  const handleOAuth = async () => {
    try {
      if (!provider) {
        console.error('[AuthPopup] No provider specified');
        return;
      }

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: provider as 'google' | 'apple',
        options: {
          redirectTo: window.location.origin + '/auth-callback',
        },
      });

      if (error) {
        console.error('[AuthPopup] OAuth error:', error);
        if (window.opener) {
          window.opener.postMessage({ type: 'oauth-error', error: error.message }, '*');
        }
        window.close();
      }

      // Supabase will redirect to the OAuth provider
      console.log('[AuthPopup] OAuth initiated, redirecting...');
    } catch (error: any) {
      console.error('[AuthPopup] OAuth failed:', error);
      if (window.opener) {
        window.opener.postMessage({ type: 'oauth-error', error: error.message }, '*');
      }
      window.close();
    }
  };

  const loadingText = `Connecting to ${provider || 'provider'}...`;

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={styles.text}>{loadingText}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  text: {
    ...typography.bodyLarge,
    marginTop: 16,
    color: colors.textSecondary,
  },
});
