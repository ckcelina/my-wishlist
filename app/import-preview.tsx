
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
  Modal,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useAppTheme } from '@/contexts/ThemeContext';
import { createColors, createTypography, spacing } from '@/styles/designSystem';
import { IconSymbol } from '@/components/IconSymbol';
import { ConfirmDialog } from '@/components/design-system/ConfirmDialog';
import { supabase } from '@/lib/supabase';
import { 
  fetchWishlists, 
  fetchWishlistItems, 
  createWishlistItem 
} from '@/lib/supabase-helpers';
import * as FileSystem from 'expo-file-system/legacy';

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

// NEW: Normalized UI model for Import Preview
// Receives data from both identify-product-from-image (primary) and identify-from-image (fallback)
// This interface ensures consistent UI rendering regardless of which pipeline was used
interface IdentifiedItem {
  title: string;
  imageUrl: string;
  originalUrl: string; // product_url from offers
  store: string;
  price: number | null;
  currency: string;
  confidence?: number; // Optional confidence score (0-1)
  brand?: string; // Optional brand from identified product
}

interface Wishlist {
  id: string;
  name: string;
  is_default: boolean;
}

export default function ImportPreviewScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams();
  const { theme } = useAppTheme();
  const colors = createColors(theme);
  const typography = createTypography(theme);

  const [productData, setProductData] = useState<ProductData | null>(null);
  const [identifiedItems, setIdentifiedItems] = useState<IdentifiedItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<IdentifiedItem | null>(null);
  const [editedName, setEditedName] = useState('');
  const [editedPrice, setEditedPrice] = useState('');
  const [editedNotes, setEditedNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [wishlists, setWishlists] = useState<Wishlist[]>([]);
  const [selectedWishlistId, setSelectedWishlistId] = useState<string>('');
  const [showWishlistPicker, setShowWishlistPicker] = useState(false);
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
  const [duplicateMessage, setDuplicateMessage] = useState('');
  const [pendingSave, setPendingSave] = useState(false);

  useEffect(() => {
    console.log('[ImportPreview] Component mounted with params:', Object.keys(params));
    loadWishlists();

    // Handle identified items from image search (NEW: multiple offers)
    if (params.identifiedItems) {
      try {
        const items = JSON.parse(params.identifiedItems as string) as IdentifiedItem[];
        setIdentifiedItems(items);
        console.log('[ImportPreview] Loaded', items.length, 'identified items from image search');
        
        // If wishlistId is provided, use it
        if (params.wishlistId) {
          setSelectedWishlistId(params.wishlistId as string);
        }
      } catch (error) {
        console.error('[ImportPreview] Error parsing identifiedItems:', error);
        Alert.alert('Error', 'Failed to load product offers');
        router.back();
      }
    }
    // Handle legacy single product data
    else if (params.data) {
      try {
        const parsed = JSON.parse(params.data as string);
        setProductData(parsed);
        setEditedName(parsed.itemName || '');
        setEditedPrice(parsed.price ? parsed.price.toString() : '');
        setEditedNotes(parsed.notes || '');
        console.log('[ImportPreview] Loaded single product data');
      } catch (error) {
        console.error('[ImportPreview] Error parsing data:', error);
        Alert.alert('Error', 'Failed to load product data');
        router.back();
      }
    }
  }, [params.data, params.identifiedItems, params.wishlistId]);

  const loadWishlists = async () => {
    if (!user?.id) {
      console.warn('[ImportPreview] No user ID, cannot load wishlists');
      return;
    }

    try {
      console.log('[ImportPreview] Loading wishlists for user:', user.id);
      const lists = await fetchWishlists(user.id);
      setWishlists(lists);

      // Find default wishlist or use first one
      const defaultList = lists.find(w => w.is_default) || lists[0];
      if (defaultList && !selectedWishlistId) {
        setSelectedWishlistId(defaultList.id);
        console.log('[ImportPreview] Selected default wishlist:', defaultList.name);
      }
    } catch (error) {
      console.error('[ImportPreview] Error loading wishlists:', error);
      Alert.alert('Error', 'Failed to load wishlists');
    }
  };

  const handleSelectItem = (item: IdentifiedItem) => {
    console.log('[ImportPreview] User selected item:', item.title);
    setSelectedItem(item);
    setEditedName(item.title);
    setEditedPrice(item.price ? item.price.toString() : '');
  };

  const uploadImageToStorage = async (localUri: string): Promise<string | null> => {
    try {
      console.log('[ImportPreview] Uploading local image to Supabase Storage:', localUri);
      setUploadingImage(true);

      // Read file as base64
      const base64 = await FileSystem.readAsStringAsync(localUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Generate unique filename
      const timestamp = Date.now();
      const randomStr = Math.random().toString(36).substring(7);
      const filename = `item_${timestamp}_${randomStr}.jpg`;
      const filePath = `items/${user?.id}/${filename}`;

      console.log('[ImportPreview] Uploading to path:', filePath);

      // Convert base64 to blob for upload
      const blob = await fetch(`data:image/jpeg;base64,${base64}`).then(r => r.blob());

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('images')
        .upload(filePath, blob, {
          contentType: 'image/jpeg',
          upsert: false,
        });

      if (error) {
        console.error('[ImportPreview] Upload error:', error);
        return null;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('images')
        .getPublicUrl(filePath);

      console.log('[ImportPreview] Image uploaded successfully:', urlData.publicUrl);
      return urlData.publicUrl;
    } catch (error) {
      console.error('[ImportPreview] Error uploading image:', error);
      return null;
    } finally {
      setUploadingImage(false);
    }
  };

  const checkForDuplicates = async (
    wishlistId: string,
    title: string,
    url: string | null
  ): Promise<boolean> => {
    try {
      console.log('[ImportPreview] Checking for duplicates in wishlist:', wishlistId);
      const existingItems = await fetchWishlistItems(wishlistId);

      // Check for duplicate by URL (exact match)
      if (url) {
        const urlDuplicate = existingItems.find(
          item => item.original_url && item.original_url.toLowerCase() === url.toLowerCase()
        );
        if (urlDuplicate) {
          console.log('[ImportPreview] Found duplicate by URL:', urlDuplicate.title);
          setDuplicateMessage(
            `An item with this URL already exists in your wishlist:\n\n"${urlDuplicate.title}"\n\nDo you want to add it anyway?`
          );
          return true;
        }
      }

      // Check for duplicate by title (case-insensitive, trimmed)
      const titleDuplicate = existingItems.find(
        item => item.title.toLowerCase().trim() === title.toLowerCase().trim()
      );
      if (titleDuplicate) {
        console.log('[ImportPreview] Found duplicate by title:', titleDuplicate.title);
        setDuplicateMessage(
          `An item with a similar name already exists in your wishlist:\n\n"${titleDuplicate.title}"\n\nDo you want to add it anyway?`
        );
        return true;
      }

      console.log('[ImportPreview] No duplicates found');
      return false;
    } catch (error) {
      console.error('[ImportPreview] Error checking duplicates:', error);
      // Don't block save if duplicate check fails
      return false;
    }
  };

  const performSave = async (skipDuplicateCheck: boolean = false) => {
    const trimmedName = editedName.trim();
    
    if (!trimmedName) {
      Alert.alert('Error', 'Please enter an item name');
      return;
    }

    if (!user?.id) {
      Alert.alert('Error', 'You must be logged in to save items');
      return;
    }

    if (!selectedWishlistId) {
      Alert.alert('Error', 'Please select a wishlist');
      return;
    }

    try {
      console.log('[ImportPreview] Starting save process for:', trimmedName);
      setSaving(true);

      // Determine image URL
      let finalImageUrl: string | null = null;
      
      // Get the raw image URL from selected item or legacy productData
      const rawImageUrl = selectedItem?.imageUrl || productData?.imageUrl;

      // If image is a local file (starts with file://), upload it to Supabase Storage
      if (rawImageUrl && rawImageUrl.startsWith('file://')) {
        console.log('[ImportPreview] Detected local image, uploading to storage');
        finalImageUrl = await uploadImageToStorage(rawImageUrl);
        
        if (!finalImageUrl) {
          console.warn('[ImportPreview] Image upload failed, continuing without image');
          Alert.alert(
            'Image Upload Failed',
            'The image could not be uploaded. The item will be saved without an image. You can add an image later.',
            [{ text: 'Continue', style: 'default' }]
          );
        }
      } else {
        // Remote URL - use as is
        finalImageUrl = rawImageUrl || null;
      }

      // Get data from selected item or legacy productData
      const sourceUrl = selectedItem?.originalUrl || productData?.sourceUrl || null;
      const sourceDomain = selectedItem?.store || productData?.storeDomain || null;
      const rawCurrency = selectedItem?.currency || productData?.currency || null;
      
      // CRITICAL: Ensure currency is never null (default to 'USD')
      const currency = rawCurrency || 'USD';
      
      const price = editedPrice ? parseFloat(editedPrice) : null;

      // Check for duplicates (unless skipping)
      if (!skipDuplicateCheck) {
        const hasDuplicate = await checkForDuplicates(selectedWishlistId, trimmedName, sourceUrl);
        
        if (hasDuplicate) {
          console.log('[ImportPreview] Duplicate found, showing confirmation dialog');
          setPendingSave(true);
          setShowDuplicateDialog(true);
          setSaving(false);
          return;
        }
      }

      // Save item to database with CORRECT snake_case field names
      console.log('[ImportPreview] Creating wishlist item with fields:', {
        wishlist_id: selectedWishlistId,
        title: trimmedName,
        image_url: finalImageUrl,
        current_price: price,
        currency,
        original_url: sourceUrl,
        source_domain: sourceDomain,
        notes: editedNotes.trim() || null,
      });

      await createWishlistItem({
        wishlist_id: selectedWishlistId,
        title: trimmedName,
        image_url: finalImageUrl,
        current_price: price,
        currency,
        original_url: sourceUrl,
        source_domain: sourceDomain,
        notes: editedNotes.trim() || null,
      });

      console.log('[ImportPreview] Item saved successfully');
      
      // Navigate to the wishlist - item should appear immediately
      router.replace({
        pathname: '/wishlist/[id]',
        params: { id: selectedWishlistId },
      });
    } catch (error) {
      console.error('[ImportPreview] Error saving item:', error);
      Alert.alert('Error', 'Failed to save item. Please try again.');
      setSaving(false);
    }
  };

  const handleSave = async () => {
    await performSave(false);
  };

  const handleConfirmDuplicate = async () => {
    console.log('[ImportPreview] User confirmed adding duplicate');
    setShowDuplicateDialog(false);
    setPendingSave(false);
    
    // Proceed with save, skipping duplicate check
    await performSave(true);
  };

  const handleCancelDuplicate = () => {
    console.log('[ImportPreview] User cancelled adding duplicate');
    setShowDuplicateDialog(false);
    setPendingSave(false);
    setSaving(false);
  };

  const selectedWishlistName = wishlists.find(w => w.id === selectedWishlistId)?.name || 'Select Wishlist';

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollContent: {
      padding: spacing.lg,
    },
    // No Results UI
    noResultsContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: spacing.xl,
    },
    noResultsTitle: {
      fontSize: 24,
      fontWeight: '600',
      marginTop: spacing.lg,
      marginBottom: spacing.sm,
      textAlign: 'center',
    },
    noResultsMessage: {
      fontSize: 16,
      textAlign: 'center',
      marginBottom: spacing.xl,
      lineHeight: 24,
    },
    noResultsActions: {
      width: '100%',
      gap: spacing.md,
    },
    noResultsButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      padding: spacing.md,
      borderRadius: 12,
    },
    noResultsButtonText: {
      fontSize: 16,
      fontWeight: '600',
    },
    // Identified Product Header
    identifiedHeader: {
      marginBottom: spacing.lg,
      paddingBottom: spacing.lg,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    identifiedTitle: {
      fontSize: 22,
      fontWeight: '600',
      marginBottom: spacing.xs,
    },
    identifiedBrand: {
      fontSize: 16,
      fontWeight: '500',
      marginBottom: spacing.sm,
    },
    confidenceBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      marginTop: spacing.xs,
    },
    confidenceDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    confidenceText: {
      fontSize: 14,
      fontWeight: '500',
    },
    // Offers Section
    offersSection: {
      marginBottom: spacing.lg,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '600',
      marginBottom: spacing.xs / 2,
    },
    sectionSubtitle: {
      fontSize: 14,
      marginBottom: spacing.md,
    },
    offerCard: {
      borderRadius: 12,
      marginBottom: spacing.md,
      overflow: 'hidden',
      position: 'relative',
    },
    bestPriceBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs / 2,
      paddingVertical: spacing.xs / 2,
      paddingHorizontal: spacing.sm,
      position: 'absolute',
      top: spacing.sm,
      left: spacing.sm,
      borderRadius: 6,
      zIndex: 1,
    },
    bestPriceText: {
      fontSize: 12,
      fontWeight: '600',
    },
    offerCardContent: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: spacing.md,
    },
    offerImage: {
      width: 80,
      height: 80,
      borderRadius: 8,
      marginRight: spacing.md,
      backgroundColor: colors.border,
    },
    offerInfo: {
      flex: 1,
    },
    offerTitle: {
      fontSize: 15,
      fontWeight: '500',
      marginBottom: spacing.xs / 2,
      lineHeight: 20,
    },
    offerStore: {
      fontSize: 13,
      marginBottom: spacing.xs,
    },
    offerBottomRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: spacing.xs / 2,
    },
    offerPrice: {
      fontSize: 16,
      fontWeight: '600',
    },
    manualButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      padding: spacing.md,
      borderRadius: 12,
      marginTop: spacing.md,
      borderWidth: 1,
    },
    manualButtonText: {
      fontSize: 15,
      fontWeight: '500',
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
    uploadingOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      justifyContent: 'center',
      alignItems: 'center',
      borderRadius: 12,
    },
    uploadingText: {
      color: '#fff',
      fontSize: 14,
      fontWeight: '500',
      marginTop: spacing.sm,
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
    wishlistSelector: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      padding: spacing.md,
      marginBottom: spacing.md,
    },
    wishlistSelectorText: {
      fontSize: 16,
      color: colors.textPrimary,
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
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalContent: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: spacing.lg,
      width: '85%',
      maxWidth: 400,
      maxHeight: '70%',
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.textPrimary,
      marginBottom: spacing.md,
    },
    wishlistOption: {
      padding: spacing.md,
      borderRadius: 8,
      marginBottom: spacing.xs,
    },
    wishlistOptionSelected: {
      backgroundColor: colors.accent + '20',
    },
    wishlistOptionText: {
      fontSize: 16,
      color: colors.textPrimary,
    },
    wishlistOptionTextSelected: {
      fontWeight: '600',
      color: colors.accent,
    },
    modalCloseButton: {
      marginTop: spacing.md,
      padding: spacing.md,
      borderRadius: 8,
      backgroundColor: colors.border,
      alignItems: 'center',
    },
    modalCloseButtonText: {
      fontSize: 16,
      fontWeight: '500',
      color: colors.textPrimary,
    },
  });

  // Show loading if neither format is loaded
  if (!productData && identifiedItems.length === 0) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  // Render Lens-style offer selection UI if we have multiple identified items
  if (identifiedItems.length > 0 && !selectedItem) {
    // Parse identified product details if available
    const identifiedProduct = params.identifiedProduct 
      ? JSON.parse(params.identifiedProduct as string) 
      : null;
    
    // Sort offers by lowest price by default
    const sortedItems = [...identifiedItems].sort((a, b) => {
      const priceA = a.price || Infinity;
      const priceB = b.price || Infinity;
      return priceA - priceB;
    });

    // Check if we have no results
    const hasNoResults = sortedItems.length === 0;
    const statusMessage = params.message as string | undefined;

    return (
      <View style={styles.container}>
        <Stack.Screen
          options={{
            title: 'Product Found',
            headerShown: true,
          }}
        />
        <SafeAreaView style={styles.container} edges={['bottom']}>
          {hasNoResults ? (
            // No results UI
            <View style={styles.noResultsContainer}>
              <IconSymbol
                ios_icon_name="magnifyingglass"
                android_material_icon_name="search-off"
                size={64}
                color={colors.textTertiary}
              />
              <Text style={[styles.noResultsTitle, { color: colors.textPrimary }]}>
                No Products Found
              </Text>
              <Text style={[styles.noResultsMessage, { color: colors.textSecondary }]}>
                {statusMessage || "We couldn't find any products matching your image."}
              </Text>
              
              <View style={styles.noResultsActions}>
                <TouchableOpacity
                  style={[styles.noResultsButton, { backgroundColor: colors.accent }]}
                  onPress={() => router.back()}
                >
                  <IconSymbol
                    ios_icon_name="arrow.clockwise"
                    android_material_icon_name="refresh"
                    size={20}
                    color={colors.textInverse}
                  />
                  <Text style={[styles.noResultsButtonText, { color: colors.textInverse }]}>
                    Try Again
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.noResultsButton, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }]}
                  onPress={() => {
                    console.log('[ImportPreview] User chose manual entry from no results');
                    setSelectedItem({
                      title: '',
                      imageUrl: '',
                      originalUrl: '',
                      store: '',
                      price: null,
                      currency: 'USD',
                    });
                  }}
                >
                  <IconSymbol
                    ios_icon_name="pencil"
                    android_material_icon_name="edit"
                    size={20}
                    color={colors.accent}
                  />
                  <Text style={[styles.noResultsButtonText, { color: colors.accent }]}>
                    Add Manually
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <ScrollView contentContainerStyle={styles.scrollContent}>
              {/* Identified Product Header */}
              {identifiedProduct && (
                <View style={styles.identifiedHeader}>
                  <Text style={[styles.identifiedTitle, { color: colors.textPrimary }]}>
                    {identifiedProduct.title}
                  </Text>
                  {identifiedProduct.brand && (
                    <Text style={[styles.identifiedBrand, { color: colors.textSecondary }]}>
                      {identifiedProduct.brand}
                    </Text>
                  )}
                  {identifiedProduct.confidence !== undefined && (
                    <View style={styles.confidenceBadge}>
                      <View style={[styles.confidenceDot, { 
                        backgroundColor: identifiedProduct.confidence >= 0.7 
                          ? colors.success 
                          : identifiedProduct.confidence >= 0.4 
                          ? colors.warning 
                          : colors.error 
                      }]} />
                      <Text style={[styles.confidenceText, { color: colors.textSecondary }]}>
                        {Math.round(identifiedProduct.confidence * 100)}% match
                      </Text>
                    </View>
                  )}
                </View>
              )}

              {/* Offers Section */}
              <View style={styles.offersSection}>
                <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                  {sortedItems.length === 1 ? 'Found 1 offer' : `Found ${sortedItems.length} offers`}
                </Text>
                <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
                  Sorted by lowest price
                </Text>

                {sortedItems.map((item, index) => {
                  const isLowestPrice = index === 0 && item.price !== null;
                  
                  return (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.offerCard, 
                        { 
                          backgroundColor: colors.surface, 
                          borderColor: isLowestPrice ? colors.accent : colors.border,
                          borderWidth: isLowestPrice ? 2 : 1,
                        }
                      ]}
                      onPress={() => handleSelectItem(item)}
                    >
                      {isLowestPrice && (
                        <View style={[styles.bestPriceBadge, { backgroundColor: colors.accent }]}>
                          <IconSymbol
                            ios_icon_name="star.fill"
                            android_material_icon_name="star"
                            size={12}
                            color={colors.textInverse}
                          />
                          <Text style={[styles.bestPriceText, { color: colors.textInverse }]}>
                            Best Price
                          </Text>
                        </View>
                      )}
                      
                      <View style={styles.offerCardContent}>
                        {item.imageUrl && (
                          <Image
                            source={resolveImageSource(item.imageUrl)}
                            style={styles.offerImage}
                            resizeMode="cover"
                          />
                        )}
                        <View style={styles.offerInfo}>
                          <Text style={[styles.offerTitle, { color: colors.textPrimary }]} numberOfLines={2}>
                            {item.title}
                          </Text>
                          {item.store && (
                            <Text style={[styles.offerStore, { color: colors.textSecondary }]}>
                              {item.store}
                            </Text>
                          )}
                          <View style={styles.offerBottomRow}>
                            {item.price !== null && item.currency && (
                              <Text style={[styles.offerPrice, { color: colors.accent }]}>
                                {item.currency} {item.price.toFixed(2)}
                              </Text>
                            )}
                          </View>
                        </View>
                        <IconSymbol
                          ios_icon_name="chevron.right"
                          android_material_icon_name="chevron-right"
                          size={20}
                          color={colors.textTertiary}
                        />
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Manual Entry Option */}
              <TouchableOpacity
                style={[styles.manualButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={() => {
                  console.log('[ImportPreview] User chose manual entry');
                  setSelectedItem({
                    title: identifiedProduct?.title || '',
                    imageUrl: sortedItems[0]?.imageUrl || '',
                    originalUrl: '',
                    store: '',
                    price: null,
                    currency: 'USD',
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
          )}
        </SafeAreaView>
      </View>
    );
  }

  // Render edit form (either from selected item or legacy productData)
  const displayImageUrl = selectedItem?.imageUrl || productData?.imageUrl;

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
              {uploadingImage && (
                <View style={styles.uploadingOverlay}>
                  <ActivityIndicator size="large" color="#fff" />
                  <Text style={styles.uploadingText}>Uploading image...</Text>
                </View>
              )}
            </View>
          )}

          <Text style={styles.label}>Wishlist</Text>
          <TouchableOpacity
            style={styles.wishlistSelector}
            onPress={() => setShowWishlistPicker(true)}
          >
            <Text style={styles.wishlistSelectorText}>{selectedWishlistName}</Text>
            <IconSymbol
              ios_icon_name="chevron.down"
              android_material_icon_name="arrow-drop-down"
              size={20}
              color={colors.textSecondary}
            />
          </TouchableOpacity>

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
            style={[styles.saveButton, (saving || uploadingImage) && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={saving || uploadingImage}
          >
            {saving || uploadingImage ? (
              <ActivityIndicator size="small" color={colors.textInverse} />
            ) : (
              <Text style={styles.saveButtonText}>Save to Wishlist</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>

      {/* Wishlist Picker Modal */}
      <Modal
        visible={showWishlistPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowWishlistPicker(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowWishlistPicker(false)}>
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>Select Wishlist</Text>
            <ScrollView>
              {wishlists.map((wishlist) => (
                <TouchableOpacity
                  key={wishlist.id}
                  style={[
                    styles.wishlistOption,
                    selectedWishlistId === wishlist.id && styles.wishlistOptionSelected,
                  ]}
                  onPress={() => {
                    console.log('[ImportPreview] Selected wishlist:', wishlist.name);
                    setSelectedWishlistId(wishlist.id);
                    setShowWishlistPicker(false);
                  }}
                >
                  <Text
                    style={[
                      styles.wishlistOptionText,
                      selectedWishlistId === wishlist.id && styles.wishlistOptionTextSelected,
                    ]}
                  >
                    {wishlist.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowWishlistPicker(false)}
            >
              <Text style={styles.modalCloseButtonText}>Cancel</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Duplicate Confirmation Dialog */}
      <ConfirmDialog
        visible={showDuplicateDialog}
        title="Duplicate Item"
        message={duplicateMessage}
        confirmLabel="Add Anyway"
        cancelLabel="Cancel"
        onConfirm={handleConfirmDuplicate}
        onCancel={handleCancelDuplicate}
        icon="warning"
      />
    </View>
  );
}
