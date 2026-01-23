
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconSymbol } from '@/components/IconSymbol';
import { colors, typography, spacing, containerStyles, inputStyles } from '@/styles/designSystem';
import Constants from 'expo-constants';

export default function ImportWishlistScreen() {
  const router = useRouter();
  const [wishlistUrl, setWishlistUrl] = useState('');
  const [loading, setLoading] = useState(false);

  const handlePreviewItems = async () => {
    if (!wishlistUrl.trim()) {
      Alert.alert('Error', 'Please enter a wishlist URL');
      return;
    }

    console.log('[ImportWishlist] User tapped Preview Items with URL:', wishlistUrl);
    setLoading(true);

    try {
      const backendUrl = Constants.expoConfig?.extra?.backendUrl;
      const response = await fetch(`${backendUrl}/api/import-wishlist`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          wishlistUrl: wishlistUrl.trim(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to import wishlist');
      }

      const data = await response.json();
      console.log('[ImportWishlist] Successfully fetched items:', data.items.length);

      router.push({
        pathname: '/import-preview',
        params: {
          storeName: data.storeName,
          items: JSON.stringify(data.items),
        },
      });
    } catch (error: any) {
      console.error('[ImportWishlist] Error importing wishlist:', error);
      Alert.alert(
        'Import Failed',
        error.message || 'Failed to import wishlist. Please check the URL and try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Import Wishlist',
          headerBackTitle: 'Back',
        }}
      />
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.iconContainer}>
            <View style={styles.iconCircle}>
              <IconSymbol
                ios_icon_name="download"
                android_material_icon_name="download"
                size={32}
                color={colors.accent}
              />
            </View>
          </View>

          <Text style={styles.title}>Import Wishlist</Text>
          
          <Text style={styles.description}>
            Paste a link to a wishlist from any store. We&apos;ll bring everything into My Wishlist.
          </Text>

          <View style={styles.inputSection}>
            <Text style={styles.label}>Wishlist URL</Text>
            <TextInput
              style={styles.input}
              placeholder="https://www.amazon.com/hz/wishlist/ls/..."
              placeholderTextColor={colors.textTertiary}
              value={wishlistUrl}
              onChangeText={setWishlistUrl}
              autoCapitalize="none"
              keyboardType="url"
              autoCorrect={false}
              editable={!loading}
              multiline
              numberOfLines={3}
            />
            <Text style={styles.hint}>
              Supported stores: Amazon, Etsy, Target, and more
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.button, (!wishlistUrl.trim() || loading) && styles.buttonDisabled]}
            onPress={handlePreviewItems}
            disabled={!wishlistUrl.trim() || loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <View style={styles.buttonContent}>
                <ActivityIndicator size="small" color={colors.textInverse} />
                <Text style={styles.buttonText}>Analyzing...</Text>
              </View>
            ) : (
              <Text style={styles.buttonText}>Preview Items</Text>
            )}
          </TouchableOpacity>

          {loading && (
            <View style={styles.loadingInfo}>
              <Text style={styles.loadingText}>
                Analyzing the wishlist and extracting items...
              </Text>
              <Text style={styles.loadingSubtext}>
                This may take a few moments
              </Text>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    ...containerStyles.screen,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingTop: spacing.xl,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...typography.displayMedium,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  description: {
    ...typography.bodyLarge,
    textAlign: 'center',
    color: colors.textSecondary,
    marginBottom: spacing.xl,
    lineHeight: 24,
  },
  inputSection: {
    marginBottom: spacing.lg,
  },
  label: {
    ...typography.labelLarge,
    marginBottom: spacing.sm,
  },
  input: {
    ...inputStyles.base,
    minHeight: 80,
    textAlignVertical: 'top',
    paddingTop: spacing.md,
  },
  hint: {
    ...typography.bodySmall,
    color: colors.textTertiary,
    marginTop: spacing.xs,
  },
  button: {
    backgroundColor: colors.accent,
    borderRadius: 12,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.shadowMedium,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 2,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  buttonText: {
    ...typography.buttonLarge,
    color: colors.textInverse,
  },
  loadingInfo: {
    marginTop: spacing.xl,
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  loadingText: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  loadingSubtext: {
    ...typography.bodySmall,
    color: colors.textTertiary,
    textAlign: 'center',
  },
});
