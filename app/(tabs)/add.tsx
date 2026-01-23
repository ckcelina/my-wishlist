
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { useAuth } from '@/contexts/AuthContext';

export default function AddItemScreen() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [url, setUrl] = useState('');
  const [extracting, setExtracting] = useState(false);

  React.useEffect(() => {
    console.log('AddItemScreen: Component mounted, user:', user?.email);
    if (!loading && !user) {
      console.log('AddItemScreen: No user found, redirecting to auth');
      router.replace('/auth');
    }
  }, [user, loading]);

  const handleExtractItem = async () => {
    console.log('AddItemScreen: Extracting item from URL:', url);
    if (!url.trim()) {
      Alert.alert('Error', 'Please enter a URL');
      return;
    }

    // Basic URL validation
    try {
      new URL(url);
    } catch (error) {
      Alert.alert('Error', 'Please enter a valid URL');
      return;
    }

    try {
      setExtracting(true);
      const { authenticatedPost } = await import('@/utils/api');
      const itemData = await authenticatedPost('/api/items/extract', { url });
      console.log('AddItemScreen: Item extracted successfully:', itemData);
      
      // Navigate to the default wishlist or show wishlist selector
      // For now, we'll show a success message and clear the input
      Alert.alert(
        'Success',
        'Item extracted! Now select a wishlist to add it to.',
        [
          {
            text: 'Go to Wishlists',
            onPress: () => router.push('/(tabs)/wishlists'),
          },
        ]
      );
      setUrl('');
    } catch (error) {
      console.error('AddItemScreen: Error extracting item:', error);
      Alert.alert('Error', 'Failed to extract item from URL. Please try again.');
    } finally {
      setExtracting(false);
    }
  };

  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyContainer}>
          <IconSymbol
            ios_icon_name="link.slash"
            android_material_icon_name="link-off"
            size={64}
            color={colors.textSecondary}
          />
          <Text style={styles.emptyText}>Please sign in to add items</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Add Item</Text>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.instructionCard}>
          <IconSymbol
            ios_icon_name="info.circle.fill"
            android_material_icon_name="info"
            size={32}
            color={colors.primary}
          />
          <View style={styles.instructionText}>
            <Text style={styles.instructionTitle}>How to add items</Text>
            <Text style={styles.instructionSubtitle}>
              Paste a link from any website or app. Our AI will automatically detect the item name, image, and price.
            </Text>
          </View>
        </View>

        <View style={styles.inputSection}>
          <Text style={styles.label}>Item URL</Text>
          <TextInput
            style={styles.input}
            placeholder="https://example.com/product"
            placeholderTextColor={colors.textSecondary}
            value={url}
            onChangeText={setUrl}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            returnKeyType="done"
            onSubmitEditing={handleExtractItem}
          />
          <Text style={styles.hint}>
            Paste a link to any product from Amazon, eBay, Etsy, or any other website
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.extractButton, extracting && styles.extractButtonDisabled]}
          onPress={handleExtractItem}
          disabled={extracting}
        >
          {extracting ? (
            <>
              <IconSymbol
                ios_icon_name="arrow.clockwise"
                android_material_icon_name="refresh"
                size={20}
                color="#FFFFFF"
              />
              <Text style={styles.extractButtonText}>Extracting...</Text>
            </>
          ) : (
            <>
              <IconSymbol
                ios_icon_name="plus.circle.fill"
                android_material_icon_name="add-circle"
                size={20}
                color="#FFFFFF"
              />
              <Text style={styles.extractButtonText}>Extract Item</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={styles.featuresSection}>
          <Text style={styles.featuresTitle}>What we extract</Text>
          <View style={styles.featureItem}>
            <IconSymbol
              ios_icon_name="photo.fill"
              android_material_icon_name="image"
              size={24}
              color={colors.primary}
            />
            <Text style={styles.featureText}>Best quality product image</Text>
          </View>
          <View style={styles.featureItem}>
            <IconSymbol
              ios_icon_name="tag.fill"
              android_material_icon_name="label"
              size={24}
              color={colors.primary}
            />
            <Text style={styles.featureText}>Item name and description</Text>
          </View>
          <View style={styles.featureItem}>
            <IconSymbol
              ios_icon_name="dollarsign.circle.fill"
              android_material_icon_name="attach-money"
              size={24}
              color={colors.primary}
            />
            <Text style={styles.featureText}>Current price with automatic updates</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: Platform.OS === 'android' ? 48 : 0,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.text,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: 16,
  },
  instructionCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.border,
  },
  instructionText: {
    flex: 1,
    marginLeft: 16,
  },
  instructionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  instructionSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  inputSection: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  hint: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 8,
    lineHeight: 20,
  },
  extractButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    marginBottom: 32,
  },
  extractButtonDisabled: {
    opacity: 0.6,
  },
  extractButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  featuresSection: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  featuresTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 16,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureText: {
    fontSize: 16,
    color: colors.text,
    marginLeft: 12,
    flex: 1,
  },
});
