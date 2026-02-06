
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  ImageSourcePropType,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useAppTheme } from '@/contexts/ThemeContext';
import { createColors, createTypography, spacing } from '@/styles/designSystem';
import { IconSymbol } from '@/components/IconSymbol';
import { supabase } from '@/lib/supabase';

// Helper to resolve image sources
function resolveImageSource(source: string | number | ImageSourcePropType | undefined): ImageSourcePropType {
  if (!source) return { uri: '' };
  if (typeof source === 'string') return { uri: source };
  return source as ImageSourcePropType;
}

interface ProductData {
  itemName: string;
  imageUrl: string;
  extractedImages: string[];
  storeName: string;
  storeDomain: string;
  price: number | null;
  currency: string;
  countryAvailability: string[];
  sourceUrl: string;
  notes?: string;
  inputType: 'url' | 'camera' | 'image' | 'name' | 'manual';
}

export default function ImportPreviewScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams();
  const { theme } = useAppTheme();
  const colors = createColors(theme);
  const typography = createTypography(theme);

  const [productData, setProductData] = useState<ProductData | null>(null);
  const [editedName, setEditedName] = useState('');
  const [editedPrice, setEditedPrice] = useState('');
  const [editedNotes, setEditedNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (params.data) {
      try {
        const parsed = JSON.parse(params.data as string);
        setProductData(parsed);
        setEditedName(parsed.itemName || '');
        setEditedPrice(parsed.price ? parsed.price.toString() : '');
        setEditedNotes(parsed.notes || '');
      } catch (error) {
        console.error('[ImportPreview] Error parsing data:', error);
        Alert.alert('Error', 'Failed to load product data');
        router.back();
      }
    }
  }, [params.data]);

  const handleSave = async () => {
    if (!editedName.trim()) {
      Alert.alert('Error', 'Please enter an item name');
      return;
    }

    if (!user?.id) {
      Alert.alert('Error', 'You must be logged in to save items');
      return;
    }

    try {
      console.log('[ImportPreview] Saving item:', editedName);
      setSaving(true);

      // Get default wishlist
      const { data: wishlists, error: wishlistError } = await supabase
        .from('wishlists')
        .select('id')
        .eq('user_id', user.id)
        .eq('is_default', true)
        .limit(1);

      if (wishlistError) throw wishlistError;

      if (!wishlists || wishlists.length === 0) {
        Alert.alert('Error', 'No default wishlist found. Please create a wishlist first.');
        return;
      }

      const wishlistId = wishlists[0].id;

      // Save item
      const { error: itemError } = await supabase
        .from('wishlist_items')
        .insert({
          wishlist_id: wishlistId,
          title: editedName.trim(),
          image_url: productData?.imageUrl || null,
          current_price: editedPrice ? parseFloat(editedPrice) : null,
          currency: productData?.currency || 'USD',
          original_url: productData?.sourceUrl || null,
          source_domain: productData?.storeDomain || null,
          notes: editedNotes.trim() || null,
        });

      if (itemError) throw itemError;

      console.log('[ImportPreview] Item saved successfully');
      Alert.alert('Success', 'Item added to your wishlist', [
        {
          text: 'OK',
          onPress: () => router.push('/(tabs)/(home)'),
        },
      ]);
    } catch (error) {
      console.error('[ImportPreview] Error saving item:', error);
      Alert.alert('Error', 'Failed to save item. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollContent: {
      padding: spacing.lg,
    },
    imageContainer: {
      width: '100%',
      height: 300,
      borderRadius: 12,
      overflow: 'hidden',
      marginBottom: spacing.lg,
      backgroundColor: colors.surface,
    },
    image: {
      width: '100%',
      height: '100%',
    },
    label: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textPrimary,
      marginBottom: spacing.xs,
    },
    input: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      padding: spacing.md,
      fontSize: 16,
      color: colors.textPrimary,
      marginBottom: spacing.md,
    },
    notesInput: {
      minHeight: 100,
      textAlignVertical: 'top',
    },
    saveButton: {
      backgroundColor: colors.accent,
      padding: spacing.md,
      borderRadius: 12,
      alignItems: 'center',
      marginTop: spacing.lg,
    },
    saveButtonText: {
      color: colors.textInverse,
      fontSize: 16,
      fontWeight: '600',
    },
    saveButtonDisabled: {
      opacity: 0.5,
    },
  });

  if (!productData) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Review Item',
          headerShown: true,
        }}
      />
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {productData.imageUrl && (
            <View style={styles.imageContainer}>
              <Image
                source={resolveImageSource(productData.imageUrl)}
                style={styles.image}
                resizeMode="contain"
              />
            </View>
          )}

          <Text style={styles.label}>Item Name *</Text>
          <TextInput
            style={styles.input}
            value={editedName}
            onChangeText={setEditedName}
            placeholder="Enter item name"
            placeholderTextColor={colors.textTertiary}
          />

          <Text style={styles.label}>Price (optional)</Text>
          <TextInput
            style={styles.input}
            value={editedPrice}
            onChangeText={setEditedPrice}
            placeholder="0.00"
            placeholderTextColor={colors.textTertiary}
            keyboardType="decimal-pad"
          />

          <Text style={styles.label}>Notes (optional)</Text>
          <TextInput
            style={[styles.input, styles.notesInput]}
            value={editedNotes}
            onChangeText={setEditedNotes}
            placeholder="Add any notes"
            placeholderTextColor={colors.textTertiary}
            multiline
            numberOfLines={4}
          />

          <TouchableOpacity
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color={colors.textInverse} />
            ) : (
              <Text style={styles.saveButtonText}>Save to Wishlist</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
