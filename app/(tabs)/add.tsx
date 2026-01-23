
import React, { useState, useEffect } from 'react';
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
import { useRouter, useLocalSearchParams } from 'expo-router';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { useAuth } from '@/contexts/AuthContext';

export default function AddItemScreen() {
  const router = useRouter();
  const { wishlistId } = useLocalSearchParams();
  const { user } = useAuth();
  const [itemUrl, setItemUrl] = useState('');
  const [extracting, setExtracting] = useState(false);
  const [selectedWishlistId, setSelectedWishlistId] = useState<string>('');

  useEffect(() => {
    console.log('AddItemScreen: Component mounted');
    if (wishlistId && typeof wishlistId === 'string') {
      console.log('AddItemScreen: Pre-selected wishlist ID:', wishlistId);
      setSelectedWishlistId(wishlistId);
    }
  }, [wishlistId]);

  const handleExtractItem = async () => {
    console.log('AddItemScreen: Extracting item from URL:', itemUrl);
    if (!itemUrl.trim()) {
      Alert.alert('Error', 'Please enter a product URL');
      return;
    }

    if (!selectedWishlistId) {
      Alert.alert('Error', 'Please select a wishlist first');
      return;
    }

    try {
      setExtracting(true);
      const { authenticatedPost } = await import('@/utils/api');
      
      // Extract item data from URL using AI
      const extractedData = await authenticatedPost<{
        name: string;
        imageUrl: string;
        price: string;
        currency: string;
        sourceUrl: string;
      }>('/api/items/extract', { url: itemUrl });
      console.log('AddItemScreen: Extracted item data:', extractedData);

      // Create the item in the wishlist
      await authenticatedPost('/api/items', {
        wishlistId: selectedWishlistId,
        name: extractedData.name,
        imageUrl: extractedData.imageUrl,
        currentPrice: extractedData.price,
        currency: extractedData.currency,
        sourceUrl: extractedData.sourceUrl,
      });
      
      console.log('AddItemScreen: Item added successfully');
      Alert.alert('Success', 'Item added to wishlist!', [
        {
          text: 'OK',
          onPress: () => {
            setItemUrl('');
            router.back();
          },
        },
      ]);
    } catch (error) {
      console.error('AddItemScreen: Error adding item:', error);
      Alert.alert('Error', 'Failed to add item. Please try again.');
    } finally {
      setExtracting(false);
    }
  };

  const extractButtonText = extracting ? 'Extracting...' : 'Add Item';

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.header}>
          <IconSymbol
            ios_icon_name="link"
            android_material_icon_name="link"
            size={48}
            color={colors.primary}
          />
          <Text style={styles.title}>Add Item</Text>
          <Text style={styles.subtitle}>
            Paste a product link from any website
          </Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>Product URL</Text>
          <TextInput
            style={styles.input}
            placeholder="https://example.com/product"
            placeholderTextColor={colors.textSecondary}
            value={itemUrl}
            onChangeText={setItemUrl}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            multiline
          />

          <TouchableOpacity
            style={[styles.button, extracting && styles.buttonDisabled]}
            onPress={handleExtractItem}
            disabled={extracting}
          >
            <Text style={styles.buttonText}>{extractButtonText}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.infoBox}>
          <IconSymbol
            ios_icon_name="info.circle"
            android_material_icon_name="info"
            size={20}
            color={colors.primary}
          />
          <Text style={styles.infoText}>
            Our AI will automatically extract the product name, image, and price
            from the URL
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 32,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  form: {
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
    padding: 12,
    fontSize: 16,
    color: colors.text,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  button: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.backgroundAlt,
    padding: 16,
    borderRadius: 8,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
});
