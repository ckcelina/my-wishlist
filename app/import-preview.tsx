
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

interface ProductCandidate {
  title: string;
  brand: string | null;
  model: string | null;
  category: string | null;
  imageUrl: string;
  url: string;
  price: number | null;
  currency: string | null;
  store: string | null;
}

export default function ImportPreviewScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams();
  const { theme } = useAppTheme();
  const colors = createColors(theme);
  const typography = createTypography(theme);

  const [productData, setProductData] = useState<ProductData | null>(null);
  const [candidates, setCandidates] = useState<ProductCandidate[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState<ProductCandidate | null>(null);
  const [imageUri, setImageUri] = useState<string>('');
  const [editedName, setEditedName] = useState('');
  const [editedPrice, setEditedPrice] = useState('');
  const [editedNotes, setEditedNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Handle new format with identified items (product candidates)
    if (params.identifiedItems) {
      try {
        const items = JSON.parse(params.identifiedItems as string) as ProductCandidate[];
        setCandidates(items);
        setImageUri(params.imageUri as string || '');
        console.log('[ImportPreview] Loaded', items.length, 'product candidates');
      } catch (error) {
        console.error('[ImportPreview] Error parsing identifiedItems:', error);
        Alert.alert('Error', 'Failed to load product candidates');
        router.back();
      }
    }
    // Handle legacy format with single product data
    else if (params.data) {
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
  }, [params.data, params.identifiedItems]);

  const handleSelectCandidate = (candidate: ProductCandidate) => {
    console.log('[ImportPreview] User selected candidate:', candidate.title);
    setSelectedCandidate(candidate);
    setEditedName(candidate.title);
    setEditedPrice(candidate.price ? candidate.price.toString() : '');
  };

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

      // Determine image URL and source URL
      const imageUrl = selectedCandidate?.imageUrl || productData?.imageUrl || imageUri || null;
      const sourceUrl = selectedCandidate?.url || productData?.sourceUrl || null;
      const sourceDomain = selectedCandidate?.store || productData?.storeDomain || null;
      const currency = selectedCandidate?.currency || productData?.currency || 'USD';

      // Save item
      const { error: itemError } = await supabase
        .from('wishlist_items')
        .insert({
          wishlist_id: wishlistId,
          title: editedName.trim(),
          image_url: imageUrl,
          current_price: editedPrice ? parseFloat(editedPrice) : null,
          currency,
          original_url: sourceUrl,
          source_domain: sourceDomain,
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
    sectionTitle: {
      fontSize: 18,
      fontWeight: '600',
      marginBottom: spacing.md,
    },
    candidateCard: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: spacing.sm,
      borderRadius: 12,
      marginBottom: spacing.sm,
      borderWidth: 1,
    },
    candidateImage: {
      width: 80,
      height: 80,
      borderRadius: 8,
      marginRight: spacing.sm,
    },
    candidateInfo: {
      flex: 1,
    },
    candidateTitle: {
      fontSize: 15,
      fontWeight: '500',
      marginBottom: spacing.xs / 2,
    },
    candidateBrand: {
      fontSize: 13,
      marginBottom: spacing.xs / 2,
    },
    candidateStore: {
      fontSize: 12,
      marginBottom: spacing.xs / 2,
    },
    candidatePrice: {
      fontSize: 15,
      fontWeight: '600',
    },
    manualButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.xs,
      padding: spacing.md,
      borderRadius: 12,
      marginTop: spacing.md,
      borderWidth: 1,
    },
    manualButtonText: {
      fontSize: 15,
      fontWeight: '500',
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

  // Show loading if neither format is loaded
  if (!productData && candidates.length === 0) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  // Render candidate selection UI if we have multiple candidates
  if (candidates.length > 0 && !selectedCandidate) {
    return (
      <View style={styles.container}>
        <Stack.Screen
          options={{
            title: 'Which one is it?',
            headerShown: true,
          }}
        />
        <SafeAreaView style={styles.container} edges={['bottom']}>
          <ScrollView contentContainerStyle={styles.scrollContent}>
            {imageUri && (
              <View style={styles.imageContainer}>
                <Image
                  source={resolveImageSource(imageUri)}
                  style={styles.image}
                  resizeMode="contain"
                />
              </View>
            )}

            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              Select the matching product:
            </Text>

            {candidates.map((candidate, index) => (
              <TouchableOpacity
                key={index}
                style={[styles.candidateCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={() => handleSelectCandidate(candidate)}
              >
                {candidate.imageUrl && (
                  <Image
                    source={resolveImageSource(candidate.imageUrl)}
                    style={styles.candidateImage}
                    resizeMode="cover"
                  />
                )}
                <View style={styles.candidateInfo}>
                  <Text style={[styles.candidateTitle, { color: colors.textPrimary }]} numberOfLines={2}>
                    {candidate.title}
                  </Text>
                  {candidate.brand && (
                    <Text style={[styles.candidateBrand, { color: colors.textSecondary }]}>
                      {candidate.brand}
                    </Text>
                  )}
                  {candidate.store && (
                    <Text style={[styles.candidateStore, { color: colors.textTertiary }]}>
                      {candidate.store}
                    </Text>
                  )}
                  {candidate.price && candidate.currency && (
                    <Text style={[styles.candidatePrice, { color: colors.accent }]}>
                      {candidate.currency} {candidate.price.toFixed(2)}
                    </Text>
                  )}
                </View>
                <IconSymbol
                  ios_icon_name="chevron.right"
                  android_material_icon_name="chevron-right"
                  size={20}
                  color={colors.textTertiary}
                />
              </TouchableOpacity>
            ))}

            <TouchableOpacity
              style={[styles.manualButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => {
                console.log('[ImportPreview] User chose manual entry');
                setSelectedCandidate({
                  title: '',
                  brand: null,
                  model: null,
                  category: null,
                  imageUrl: imageUri,
                  url: '',
                  price: null,
                  currency: null,
                  store: null,
                });
              }}
            >
              <IconSymbol
                ios_icon_name="pencil"
                android_material_icon_name="edit"
                size={20}
                color={colors.accent}
              />
              <Text style={[styles.manualButtonText, { color: colors.accent }]}>
                None of these - Add manually
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </View>
    );
  }

  // Render edit form (either from selected candidate or legacy productData)
  const displayImageUrl = selectedCandidate?.imageUrl || productData?.imageUrl || imageUri;

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
          {displayImageUrl && (
            <View style={styles.imageContainer}>
              <Image
                source={resolveImageSource(displayImageUrl)}
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
