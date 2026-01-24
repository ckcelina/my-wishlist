
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { colors, typography, spacing, inputStyles } from '@/styles/designSystem';
import { useAuth } from '@/contexts/AuthContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconSymbol } from '@/components/IconSymbol';
import { importWishlist } from '@/utils/supabase-edge-functions';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
  },
  title: {
    ...typography.h2,
    color: colors.text,
    marginBottom: spacing.md,
  },
  description: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.xl,
  },
  label: {
    ...typography.label,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  input: {
    ...inputStyles.base,
    marginBottom: spacing.lg,
  },
  button: {
    backgroundColor: colors.primary,
    padding: spacing.md,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  buttonDisabled: {
    backgroundColor: colors.border,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  exampleContainer: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: 8,
    marginTop: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  exampleTitle: {
    ...typography.label,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  exampleText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  loadingContainer: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  loadingText: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
});

export default function ImportWishlistScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [wishlistUrl, setWishlistUrl] = useState('');
  const [importing, setImporting] = useState(false);

  const handleImport = async () => {
    if (!wishlistUrl.trim()) {
      Alert.alert('Error', 'Please enter a wishlist URL');
      return;
    }

    try {
      new URL(wishlistUrl);
    } catch {
      Alert.alert('Error', 'Please enter a valid URL');
      return;
    }

    console.log('Importing wishlist from URL:', wishlistUrl);
    setImporting(true);

    try {
      const result = await importWishlist(wishlistUrl);

      if (result.error && result.items.length === 0) {
        Alert.alert('Error', result.error || 'Failed to import wishlist');
        setImporting(false);
        return;
      }

      if (result.items.length === 0) {
        Alert.alert('No Items Found', 'Could not find any items in this wishlist. Please check the URL and try again.');
        setImporting(false);
        return;
      }

      console.log('Wishlist imported successfully:', result.items.length, 'items');

      // Navigate to import preview screen
      router.push({
        pathname: '/import-preview',
        params: {
          items: JSON.stringify(result.items),
          storeName: result.storeName || 'Unknown Store',
        },
      });
    } catch (error: any) {
      console.error('Failed to import wishlist:', error);
      Alert.alert('Error', 'Failed to import wishlist. Please try again.');
    } finally {
      setImporting(false);
    }
  };

  const canImport = wishlistUrl.trim().length > 0 && !importing;

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Import Wishlist',
          headerShown: true,
        }}
      />
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <ScrollView style={styles.container}>
          <View style={styles.content}>
            <Text style={styles.title}>Import from Another Store</Text>
            <Text style={styles.description}>
              Paste a link to your wishlist from Amazon, Etsy, Target, or any other online store. We'll extract all the items for you.
            </Text>

            <Text style={styles.label}>Wishlist URL</Text>
            <TextInput
              style={styles.input}
              placeholder="https://www.amazon.com/hz/wishlist/ls/..."
              placeholderTextColor={colors.textSecondary}
              value={wishlistUrl}
              onChangeText={setWishlistUrl}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              editable={!importing}
            />

            <TouchableOpacity
              style={[styles.button, !canImport && styles.buttonDisabled]}
              onPress={handleImport}
              disabled={!canImport}
            >
              {importing ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.buttonText}>Import Wishlist</Text>
              )}
            </TouchableOpacity>

            {importing && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.loadingText}>Importing your wishlist...</Text>
                <Text style={styles.loadingText}>This may take a moment</Text>
              </View>
            )}

            <View style={styles.exampleContainer}>
              <Text style={styles.exampleTitle}>Supported Stores</Text>
              <Text style={styles.exampleText}>
                Amazon, Etsy, Target, Walmart, Best Buy, eBay, Pinterest, and many more
              </Text>
            </View>

            <View style={styles.exampleContainer}>
              <Text style={styles.exampleTitle}>Example URLs</Text>
              <Text style={styles.exampleText}>
                • Amazon: https://www.amazon.com/hz/wishlist/ls/...{'\n'}
                • Etsy: https://www.etsy.com/people/.../favorites{'\n'}
                • Target: https://www.target.com/gift-registry/...
              </Text>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}
