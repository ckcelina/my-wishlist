
import React, { useState, useEffect, Fragment } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Image,
  ImageSourcePropType,
  ActivityIndicator,
  Modal,
  Pressable,
  Switch,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconSymbol } from '@/components/IconSymbol';
import { useAuth } from '@/contexts/AuthContext';
import { useAppTheme } from '@/contexts/ThemeContext';
import { createColors, createTypography, spacing } from '@/styles/designSystem';
import * as ImagePicker from 'expo-image-picker';
import { authenticatedPost, authenticatedGet } from '@/utils/api';
import { fetchWishlists, fetchWishlistItems } from '@/lib/supabase-helpers';
import { createWishlistItem } from '@/lib/supabase-helpers';
import { DuplicateDetectionModal } from '@/components/DuplicateDetectionModal';

// Helper to resolve image sources (handles both local require() and remote URLs)
function resolveImageSource(source: string | number | ImageSourcePropType | undefined): ImageSourcePropType {
  if (!source) return { uri: '' };
  if (typeof source === 'string') return { uri: source };
  return source as ImageSourcePropType;
}

interface ExtractedProductData {
  itemName: string;
  imageUrl: string;
  extractedImages: string[];
  storeName: string;
  storeDomain: string;
  price: number | null;
  currency: string;
  countryAvailability: string[];
  alternativeStores?: AlternativeStore[];
  sourceUrl?: string;
  notes?: string;
}

interface AlternativeStore {
  storeName: string;
  storeDomain: string;
  price: number;
  currency: string;
  shippingCountries: string[];
  url: string;
}

interface Wishlist {
  id: string;
  name: string;
  isDefault?: boolean;
}

interface UserLocation {
  countryCode: string;
  city: string | null;
}

interface DuplicateItem {
  id: string;
  title: string;
  imageUrl: string | null;
  currentPrice: number | null;
  currency: string;
  originalUrl: string | null;
  similarity: number;
}

export default function ImportPreviewScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { theme } = useAppTheme();
  const colors = createColors(theme);
  const typography = createTypography(theme);
  
  const params = useLocalSearchParams();
  
  // Parse extracted data from params
  const [productData, setProductData] = useState<ExtractedProductData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Editable fields
  const [itemName, setItemName] = useState('');
  const [selectedImage, setSelectedImage] = useState('');
  const [storeName, setStoreName] = useState('');
  const [storeDomain, setStoreDomain] = useState('');
  const [price, setPrice] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [notes, setNotes] = useState('');
  const [selectedWishlistId, setSelectedWishlistId] = useState('');
  
  // UI state
  const [showImagePicker, setShowImagePicker] = useState(false);
  const [showWishlistPicker, setShowWishlistPicker] = useState(false);
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);
  const [isProductCorrect, setIsProductCorrect] = useState(false);
  const [showAlternatives, setShowAlternatives] = useState(false);
  
  // Duplicate detection state
  const [checkingDuplicates, setCheckingDuplicates] = useState(false);
  const [duplicates, setDuplicates] = useState<DuplicateItem[]>([]);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  
  // Data
  const [wishlists, setWishlists] = useState<Wishlist[]>([]);
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [alternativeStores, setAlternativeStores] = useState<AlternativeStore[]>([]);
  const [loadingAlternatives, setLoadingAlternatives] = useState(false);
  
  // Warnings
  const [warnings, setWarnings] = useState<string[]>([]);

  useEffect(() => {
    console.log('[ImportPreview] Initializing with params:', params);
    initializeScreen();
  }, [params]);

  useEffect(() => {
    if (user) {
      fetchUserWishlists();
      fetchUserLocationData();
    }
  }, [user]);

  const initializeScreen = async () => {
    try {
      // Parse product data from params
      const dataParam = params.data;
      if (dataParam && typeof dataParam === 'string') {
        const parsed = JSON.parse(dataParam);
        console.log('[ImportPreview] Parsed product data:', parsed);
        
        setProductData(parsed);
        setItemName(parsed.itemName || '');
        setSelectedImage(parsed.imageUrl || '');
        setStoreName(parsed.storeName || '');
        setStoreDomain(parsed.storeDomain || '');
        setPrice(parsed.price?.toString() || '');
        setCurrency(parsed.currency || 'USD');
        setNotes(parsed.notes || '');
        
        // Check for warnings
        const newWarnings: string[] = [];
        if (!parsed.itemName) newWarnings.push('Item name is missing');
        if (!parsed.imageUrl) newWarnings.push('No image available');
        if (!parsed.price) newWarnings.push('Price not detected');
        if (!parsed.storeName) newWarnings.push('Store name not detected');
        
        setWarnings(newWarnings);
        
        // Load alternatives if available
        if (parsed.alternativeStores && parsed.alternativeStores.length > 0) {
          setAlternativeStores(parsed.alternativeStores);
        }
      }
    } catch (error) {
      console.error('[ImportPreview] Error parsing product data:', error);
      Alert.alert('Error', 'Failed to load product data');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const fetchUserWishlists = async () => {
    if (!user) return;
    
    try {
      console.log('[ImportPreview] Fetching wishlists');
      const data = await fetchWishlists(user.id);
      setWishlists(data);
      
      // Set default wishlist
      const defaultWishlist = data.find(w => w.isDefault) || data[0];
      if (defaultWishlist) {
        setSelectedWishlistId(defaultWishlist.id);
      }
    } catch (error) {
      console.error('[ImportPreview] Error fetching wishlists:', error);
    }
  };

  const fetchUserLocationData = async () => {
    if (!user) return;
    
    try {
      console.log('[ImportPreview] Fetching user location');
      const response = await authenticatedGet<{
        countryCode: string;
        city: string | null;
      }>('/api/users/location');
      
      setUserLocation(response);
      console.log('[ImportPreview] User location:', response);
    } catch (error) {
      console.error('[ImportPreview] Error fetching location:', error);
      // Location is optional, continue without it
    }
  };

  const checkForDuplicates = async () => {
    if (!selectedWishlistId || !itemName.trim()) {
      console.log('[ImportPreview] Skipping duplicate check - missing data');
      return;
    }

    console.log('[ImportPreview] Checking for duplicates in wishlist:', selectedWishlistId);
    setCheckingDuplicates(true);

    try {
      // Fetch existing items in the selected wishlist
      const existingItems = await fetchWishlistItems(selectedWishlistId);
      console.log('[ImportPreview] Found existing items:', existingItems.length);

      if (existingItems.length === 0) {
        console.log('[ImportPreview] No existing items, skipping duplicate check');
        setCheckingDuplicates(false);
        return;
      }

      // Simple client-side duplicate detection
      const potentialDuplicates: DuplicateItem[] = [];
      const normalizedNewTitle = itemName.toLowerCase().trim();
      const newUrl = productData?.sourceUrl?.toLowerCase();

      for (const item of existingItems) {
        const normalizedExistingTitle = item.title.toLowerCase().trim();
        let similarity = 0;

        // Rule 1: Exact URL match
        if (newUrl && item.original_url && newUrl === item.original_url.toLowerCase()) {
          similarity = 1.0;
        }
        // Rule 2: Very similar titles (simple word overlap)
        else {
          const newWords = new Set(normalizedNewTitle.split(/\s+/));
          const existingWords = new Set(normalizedExistingTitle.split(/\s+/));
          const intersection = new Set([...newWords].filter(x => existingWords.has(x)));
          const union = new Set([...newWords, ...existingWords]);
          
          if (union.size > 0) {
            similarity = intersection.size / union.size;
          }
        }

        // Only consider items with high similarity (>70%)
        if (similarity > 0.7) {
          potentialDuplicates.push({
            id: item.id,
            title: item.title,
            imageUrl: item.image_url,
            currentPrice: item.current_price ? parseFloat(item.current_price) : null,
            currency: item.currency,
            originalUrl: item.original_url,
            similarity,
          });
        }
      }

      console.log('[ImportPreview] Found potential duplicates:', potentialDuplicates.length);

      if (potentialDuplicates.length > 0) {
        // Sort by similarity (highest first)
        potentialDuplicates.sort((a, b) => b.similarity - a.similarity);
        setDuplicates(potentialDuplicates);
        setShowDuplicateModal(true);
      }
    } catch (error) {
      console.error('[ImportPreview] Error checking duplicates:', error);
      // Continue without duplicate check
    } finally {
      setCheckingDuplicates(false);
    }
  };

  const handleChangeImage = async () => {
    console.log('[ImportPreview] User tapped Change Image');
    
    if (productData && productData.extractedImages.length > 1) {
      // Show picker with extracted images
      setShowImagePicker(true);
    } else {
      // Allow upload from gallery
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
      });
      
      if (!result.canceled && result.assets[0]) {
        setSelectedImage(result.assets[0].uri);
        console.log('[ImportPreview] Image changed to:', result.assets[0].uri);
      }
    }
  };

  const handleSelectImage = (imageUrl: string) => {
    console.log('[ImportPreview] Image selected:', imageUrl);
    setSelectedImage(imageUrl);
    setShowImagePicker(false);
  };

  const handleUploadImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
    });
    
    if (!result.canceled && result.assets[0]) {
      setSelectedImage(result.assets[0].uri);
      setShowImagePicker(false);
      console.log('[ImportPreview] Custom image uploaded:', result.assets[0].uri);
    }
  };

  const handleRetryExtraction = () => {
    console.log('[ImportPreview] User tapped Retry Extraction');
    Alert.alert(
      'Retry Extraction',
      'Would you like to try extracting the product information again?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Retry',
          onPress: () => {
            // Navigate back to add screen to retry
            router.back();
          },
        },
      ]
    );
  };

  const handleReportProblem = () => {
    console.log('[ImportPreview] User tapped Report a Problem');
    router.push({
      pathname: '/report-problem',
      params: {
        context: 'import_preview',
        itemName: itemName,
        sourceUrl: productData?.sourceUrl || '',
      },
    });
  };

  const handleConfirmAndAdd = async () => {
    console.log('[ImportPreview] User tapped Confirm & Add');
    
    // Validation
    if (!itemName.trim()) {
      Alert.alert('Missing Information', 'Please enter an item name');
      return;
    }
    
    if (!isProductCorrect) {
      Alert.alert(
        'Confirm Product',
        'Please confirm that this is the correct product before adding it to your wishlist',
        [{ text: 'OK' }]
      );
      return;
    }
    
    if (!selectedWishlistId) {
      Alert.alert('No Wishlist Selected', 'Please select a wishlist');
      return;
    }

    // Check for duplicates before saving
    await checkForDuplicates();
    
    // If duplicates were found, the modal will handle the next steps
    if (duplicates.length > 0) {
      return;
    }

    // No duplicates, proceed with saving
    await saveItem();
  };

  const saveItem = async () => {
    setSaving(true);
    
    try {
      console.log('[ImportPreview] Saving item to wishlist:', selectedWishlistId);
      
      // Create the wishlist item
      const newItem = await createWishlistItem({
        wishlist_id: selectedWishlistId,
        title: itemName.trim(),
        image_url: selectedImage || null,
        current_price: price ? parseFloat(price) : null,
        currency: currency,
        original_url: productData?.sourceUrl || null,
        source_domain: storeDomain || null,
        notes: notes.trim() || null,
      });
      
      console.log('[ImportPreview] Item saved successfully:', newItem.id);
      
      Alert.alert(
        'Success',
        'Item added to your wishlist!',
        [
          {
            text: 'View Wishlist',
            onPress: () => {
              router.replace(`/wishlist/${selectedWishlistId}`);
            },
          },
        ]
      );
    } catch (error) {
      console.error('[ImportPreview] Error saving item:', error);
      Alert.alert('Error', 'Failed to add item. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDuplicateAddAnyway = async () => {
    console.log('[ImportPreview] User chose to add anyway despite duplicates');
    setShowDuplicateModal(false);
    await saveItem();
  };

  const handleDuplicateReplace = async (duplicateId: string) => {
    console.log('[ImportPreview] User chose to replace duplicate:', duplicateId);
    setShowDuplicateModal(false);
    
    Alert.alert(
      'Replace Item',
      'This feature will be available soon. For now, you can delete the old item manually and add the new one.',
      [{ text: 'OK' }]
    );
  };

  const handleDuplicateCancel = () => {
    console.log('[ImportPreview] User cancelled duplicate detection');
    setShowDuplicateModal(false);
    setDuplicates([]);
  };

  const handleLoadAlternatives = async () => {
    if (!itemName || !userLocation) return;
    
    console.log('[ImportPreview] Loading alternative stores');
    setLoadingAlternatives(true);
    
    try {
      // Call find-alternatives edge function
      const response = await authenticatedPost<{
        alternatives: AlternativeStore[];
      }>('/api/find-alternatives', {
        productName: itemName,
        countryCode: userLocation.countryCode,
        city: userLocation.city,
      });
      
      // Filter to stores that ship to user's location
      const filtered = response.alternatives.filter(store =>
        store.shippingCountries.includes(userLocation.countryCode)
      );
      
      setAlternativeStores(filtered);
      setShowAlternatives(true);
      console.log('[ImportPreview] Loaded alternatives:', filtered.length);
    } catch (error) {
      console.error('[ImportPreview] Error loading alternatives:', error);
      Alert.alert('Error', 'Failed to load alternative stores');
    } finally {
      setLoadingAlternatives(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  const selectedWishlist = wishlists.find(w => w.id === selectedWishlistId);
  const selectedWishlistName = selectedWishlist?.name || 'Select wishlist';
  
  const availableInUserCountry = userLocation && productData?.countryAvailability?.includes(userLocation.countryCode);
  const priceDisplay = price ? `${currency} ${parseFloat(price).toFixed(2)}` : 'Price not available';

  const currencies = ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD'];

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Confirm Product',
          headerBackTitle: 'Back',
        }}
      />
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            {/* Warnings Section */}
            {warnings.length > 0 && (
              <View style={[styles.warningCard, { backgroundColor: colors.errorLight, borderColor: colors.error }]}>
                <View style={styles.warningHeader}>
                  <IconSymbol
                    ios_icon_name="exclamationmark.triangle"
                    android_material_icon_name="warning"
                    size={20}
                    color={colors.error}
                  />
                  <Text style={[styles.warningTitle, { color: colors.error }]}>Incomplete Information</Text>
                </View>
                {warnings.map((warning, index) => (
                  <Text key={index} style={[styles.warningText, { color: colors.error }]}>
                    • {warning}
                  </Text>
                ))}
                <Text style={[styles.warningSubtext, { color: colors.textSecondary }]}>
                  You can still add this item by filling in the missing details manually
                </Text>
              </View>
            )}

            {/* Product Image */}
            <View style={styles.imageSection}>
              {selectedImage ? (
                <Image
                  source={resolveImageSource(selectedImage)}
                  style={styles.productImage}
                  resizeMode="contain"
                />
              ) : (
                <View style={[styles.imagePlaceholder, { backgroundColor: colors.surface }]}>
                  <IconSymbol
                    ios_icon_name="photo"
                    android_material_icon_name="image"
                    size={48}
                    color={colors.textTertiary}
                  />
                  <Text style={[styles.placeholderText, { color: colors.textTertiary }]}>No image</Text>
                </View>
              )}
              
              <TouchableOpacity
                style={[styles.changeImageButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={handleChangeImage}
              >
                <IconSymbol
                  ios_icon_name="photo"
                  android_material_icon_name="image"
                  size={16}
                  color={colors.accent}
                />
                <Text style={[styles.changeImageText, { color: colors.accent }]}>Change Image</Text>
              </TouchableOpacity>
            </View>

            {/* Editable Fields */}
            <View style={styles.fieldsSection}>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Item Name *</Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.border }]}
                value={itemName}
                onChangeText={setItemName}
                placeholder="Enter item name"
                placeholderTextColor={colors.textTertiary}
              />

              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Store</Text>
              <View style={styles.storeRow}>
                <TextInput
                  style={[styles.textInput, styles.storeNameInput, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.border }]}
                  value={storeName}
                  onChangeText={setStoreName}
                  placeholder="Store name"
                  placeholderTextColor={colors.textTertiary}
                />
                <TextInput
                  style={[styles.textInput, styles.storeDomainInput, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.border }]}
                  value={storeDomain}
                  onChangeText={setStoreDomain}
                  placeholder="domain.com"
                  placeholderTextColor={colors.textTertiary}
                  autoCapitalize="none"
                />
              </View>

              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Price & Currency</Text>
              <View style={styles.priceRow}>
                <TextInput
                  style={[styles.textInput, styles.priceInput, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.border }]}
                  value={price}
                  onChangeText={setPrice}
                  placeholder="0.00"
                  placeholderTextColor={colors.textTertiary}
                  keyboardType="decimal-pad"
                />
                <TouchableOpacity
                  style={[styles.currencyButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
                  onPress={() => setShowCurrencyPicker(true)}
                >
                  <Text style={[styles.currencyText, { color: colors.textPrimary }]}>{currency}</Text>
                  <IconSymbol
                    ios_icon_name="chevron.down"
                    android_material_icon_name="arrow-drop-down"
                    size={16}
                    color={colors.textSecondary}
                  />
                </TouchableOpacity>
              </View>

              {/* Country Availability */}
              {userLocation && (
                <View style={styles.availabilitySection}>
                  <View style={styles.availabilityRow}>
                    <IconSymbol
                      ios_icon_name={availableInUserCountry ? 'checkmark.circle' : 'info.circle'}
                      android_material_icon_name={availableInUserCountry ? 'check-circle' : 'info'}
                      size={20}
                      color={availableInUserCountry ? colors.success : colors.warning}
                    />
                    <Text style={[styles.availabilityText, { color: colors.textPrimary }]}>
                      {availableInUserCountry
                        ? `Available in ${userLocation.countryCode}`
                        : `May not be available in ${userLocation.countryCode}`}
                    </Text>
                  </View>
                </View>
              )}

              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Wishlist</Text>
              <TouchableOpacity
                style={[styles.wishlistButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={() => setShowWishlistPicker(true)}
              >
                <Text style={[styles.wishlistButtonText, { color: colors.textPrimary }]}>{selectedWishlistName}</Text>
                <IconSymbol
                  ios_icon_name="chevron.down"
                  android_material_icon_name="arrow-drop-down"
                  size={20}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>

              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Notes (optional)</Text>
              <TextInput
                style={[styles.textInput, styles.notesInput, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.border }]}
                value={notes}
                onChangeText={setNotes}
                placeholder="Add any notes about this item"
                placeholderTextColor={colors.textTertiary}
                multiline
                numberOfLines={3}
              />
            </View>

            {/* Other Stores & Prices */}
            {alternativeStores.length > 0 && (
              <View style={styles.alternativesSection}>
                <View style={styles.alternativesHeader}>
                  <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Other stores & prices</Text>
                  <Text style={[styles.alternativesCount, { color: colors.textSecondary }]}>
                    {alternativeStores.length} {alternativeStores.length === 1 ? 'store' : 'stores'}
                  </Text>
                </View>
                
                {alternativeStores.map((store, index) => {
                  const storePrice = `${store.currency} ${store.price.toFixed(2)}`;
                  return (
                    <View key={index} style={[styles.alternativeCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                      <View style={styles.alternativeInfo}>
                        <Text style={[styles.alternativeStoreName, { color: colors.textPrimary }]}>{store.storeName}</Text>
                        <Text style={[styles.alternativeDomain, { color: colors.textSecondary }]}>{store.storeDomain}</Text>
                      </View>
                      <View style={styles.alternativeRight}>
                        <Text style={[styles.alternativePrice, { color: colors.accent }]}>{storePrice}</Text>
                        <TouchableOpacity
                          onPress={async () => {
                            const { openStoreLink } = await import('@/utils/openStoreLink');
                            await openStoreLink(store.url, {
                              source: 'import_preview_alternatives',
                              storeDomain: store.storeDomain,
                            });
                          }}
                        >
                          <IconSymbol
                            ios_icon_name="arrow.up.forward"
                            android_material_icon_name="open-in-new"
                            size={16}
                            color={colors.accent}
                          />
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}

            {/* Load Alternatives Button */}
            {alternativeStores.length === 0 && itemName && userLocation && (
              <TouchableOpacity
                style={[styles.loadAlternativesButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={handleLoadAlternatives}
                disabled={loadingAlternatives}
              >
                {loadingAlternatives ? (
                  <ActivityIndicator size="small" color={colors.accent} />
                ) : (
                  <>
                    <IconSymbol
                      ios_icon_name="magnifyingglass"
                      android_material_icon_name="search"
                      size={20}
                      color={colors.accent}
                    />
                    <Text style={[styles.loadAlternativesText, { color: colors.accent }]}>Find other stores</Text>
                  </>
                )}
              </TouchableOpacity>
            )}

            {/* Confirmation Toggle */}
            <View style={[styles.confirmationSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.confirmationLeft}>
                <IconSymbol
                  ios_icon_name="checkmark.circle"
                  android_material_icon_name="check-circle"
                  size={24}
                  color={isProductCorrect ? colors.success : colors.textTertiary}
                />
                <Text style={[styles.confirmationText, { color: colors.textPrimary }]}>
                  This is the correct product
                </Text>
              </View>
              <Switch
                value={isProductCorrect}
                onValueChange={setIsProductCorrect}
                trackColor={{ false: colors.border, true: colors.success }}
                thumbColor={colors.surface}
              />
            </View>

            {/* Spacer for footer */}
            <View style={{ height: 120 }} />
          </ScrollView>

          {/* Footer Actions */}
          <View style={[styles.footer, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
            <TouchableOpacity
              style={[styles.secondaryButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={handleRetryExtraction}
            >
              <IconSymbol
                ios_icon_name="arrow.clockwise"
                android_material_icon_name="refresh"
                size={16}
                color={colors.textPrimary}
              />
              <Text style={[styles.secondaryButtonText, { color: colors.textPrimary }]}>Retry Extraction</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tertiaryButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={handleReportProblem}
            >
              <IconSymbol
                ios_icon_name="exclamationmark.triangle"
                android_material_icon_name="report"
                size={16}
                color={colors.textSecondary}
              />
              <Text style={[styles.tertiaryButtonText, { color: colors.textSecondary }]}>Report Problem</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.primaryButton,
                { backgroundColor: colors.accent },
                (!isProductCorrect || !itemName.trim() || saving || checkingDuplicates) && styles.primaryButtonDisabled,
              ]}
              onPress={handleConfirmAndAdd}
              disabled={!isProductCorrect || !itemName.trim() || saving || checkingDuplicates}
            >
              {saving || checkingDuplicates ? (
                <ActivityIndicator size="small" color={colors.textInverse} />
              ) : (
                <>
                  <IconSymbol
                    ios_icon_name="checkmark"
                    android_material_icon_name="check"
                    size={20}
                    color={colors.textInverse}
                  />
                  <Text style={[styles.primaryButtonText, { color: colors.textInverse }]}>Confirm & Add</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>

        {/* Duplicate Detection Modal */}
        <DuplicateDetectionModal
          visible={showDuplicateModal}
          newItem={{
            title: itemName,
            imageUrl: selectedImage,
            currentPrice: price ? parseFloat(price) : null,
            currency: currency,
          }}
          duplicates={duplicates}
          onAddAnyway={handleDuplicateAddAnyway}
          onReplace={handleDuplicateReplace}
          onCancel={handleDuplicateCancel}
        />

        {/* Image Picker Modal */}
        <Modal
          visible={showImagePicker}
          transparent
          animationType="slide"
          onRequestClose={() => setShowImagePicker(false)}
        >
          <Pressable style={styles.modalOverlay} onPress={() => setShowImagePicker(false)}>
            <Pressable style={[styles.modalContent, { backgroundColor: colors.surface }]} onPress={(e) => e.stopPropagation()}>
              <View style={styles.modalHandle} />
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Choose Image</Text>
              
              <ScrollView style={styles.imageGrid}>
                {productData?.extractedImages.map((imageUrl, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.imageOption,
                      { borderColor: selectedImage === imageUrl ? colors.accent : colors.border },
                    ]}
                    onPress={() => handleSelectImage(imageUrl)}
                  >
                    <Image
                      source={resolveImageSource(imageUrl)}
                      style={styles.imageOptionImage}
                      resizeMode="cover"
                    />
                    {selectedImage === imageUrl && (
                      <View style={[styles.imageSelectedBadge, { backgroundColor: colors.accent }]}>
                        <IconSymbol
                          ios_icon_name="checkmark"
                          android_material_icon_name="check"
                          size={16}
                          color={colors.textInverse}
                        />
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <TouchableOpacity
                style={[styles.uploadButton, { backgroundColor: colors.accent }]}
                onPress={handleUploadImage}
              >
                <IconSymbol
                  ios_icon_name="photo"
                  android_material_icon_name="image"
                  size={20}
                  color={colors.textInverse}
                />
                <Text style={[styles.uploadButtonText, { color: colors.textInverse }]}>Upload from Gallery</Text>
              </TouchableOpacity>
            </Pressable>
          </Pressable>
        </Modal>

        {/* Wishlist Picker Modal */}
        <Modal
          visible={showWishlistPicker}
          transparent
          animationType="fade"
          onRequestClose={() => setShowWishlistPicker(false)}
        >
          <Pressable style={styles.modalOverlay} onPress={() => setShowWishlistPicker(false)}>
            <Pressable style={[styles.pickerModal, { backgroundColor: colors.surface }]} onPress={(e) => e.stopPropagation()}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Select Wishlist</Text>
              <ScrollView style={styles.pickerList}>
                {wishlists.map((wishlist) => (
                  <TouchableOpacity
                    key={wishlist.id}
                    style={[
                      styles.pickerOption,
                      { backgroundColor: selectedWishlistId === wishlist.id ? colors.accentLight : 'transparent' },
                    ]}
                    onPress={() => {
                      setSelectedWishlistId(wishlist.id);
                      setShowWishlistPicker(false);
                    }}
                  >
                    <Text style={[styles.pickerOptionText, { color: colors.textPrimary }]}>{wishlist.name}</Text>
                    {selectedWishlistId === wishlist.id && (
                      <IconSymbol
                        ios_icon_name="checkmark"
                        android_material_icon_name="check"
                        size={20}
                        color={colors.accent}
                      />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </Pressable>
          </Pressable>
        </Modal>

        {/* Currency Picker Modal */}
        <Modal
          visible={showCurrencyPicker}
          transparent
          animationType="fade"
          onRequestClose={() => setShowCurrencyPicker(false)}
        >
          <Pressable style={styles.modalOverlay} onPress={() => setShowCurrencyPicker(false)}>
            <Pressable style={[styles.pickerModal, { backgroundColor: colors.surface }]} onPress={(e) => e.stopPropagation()}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Select Currency</Text>
              <ScrollView style={styles.pickerList}>
                {currencies.map((curr) => (
                  <TouchableOpacity
                    key={curr}
                    style={[
                      styles.pickerOption,
                      { backgroundColor: currency === curr ? colors.accentLight : 'transparent' },
                    ]}
                    onPress={() => {
                      setCurrency(curr);
                      setShowCurrencyPicker(false);
                    }}
                  >
                    <Text style={[styles.pickerOptionText, { color: colors.textPrimary }]}>{curr}</Text>
                    {currency === curr && (
                      <IconSymbol
                        ios_icon_name="checkmark"
                        android_material_icon_name="check"
                        size={20}
                        color={colors.accent}
                      />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </Pressable>
          </Pressable>
        </Modal>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
  },
  warningCard: {
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
  },
  warningHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  warningText: {
    fontSize: 14,
    marginBottom: spacing.xs / 2,
  },
  warningSubtext: {
    fontSize: 12,
    marginTop: spacing.xs,
    fontStyle: 'italic',
  },
  imageSection: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  productImage: {
    width: '100%',
    height: 300,
    borderRadius: 12,
    marginBottom: spacing.md,
  },
  imagePlaceholder: {
    width: '100%',
    height: 300,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  placeholderText: {
    fontSize: 14,
    marginTop: spacing.sm,
  },
  changeImageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 20,
    borderWidth: 1,
  },
  changeImageText: {
    fontSize: 14,
    fontWeight: '500',
  },
  fieldsSection: {
    marginBottom: spacing.xl,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: spacing.xs,
    marginTop: spacing.md,
  },
  textInput: {
    borderRadius: 8,
    padding: spacing.sm,
    fontSize: 16,
    borderWidth: 1,
  },
  storeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  storeNameInput: {
    flex: 2,
  },
  storeDomainInput: {
    flex: 1,
  },
  priceRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  priceInput: {
    flex: 1,
  },
  currencyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: 8,
    borderWidth: 1,
    minWidth: 100,
    justifyContent: 'center',
  },
  currencyText: {
    fontSize: 16,
    fontWeight: '500',
  },
  availabilitySection: {
    marginTop: spacing.md,
  },
  availabilityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  availabilityText: {
    fontSize: 14,
  },
  wishlistButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.sm,
    borderRadius: 8,
    borderWidth: 1,
  },
  wishlistButtonText: {
    fontSize: 16,
  },
  notesInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  alternativesSection: {
    marginBottom: spacing.xl,
  },
  alternativesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  alternativesCount: {
    fontSize: 14,
  },
  alternativeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: spacing.sm,
  },
  alternativeInfo: {
    flex: 1,
  },
  alternativeStoreName: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: spacing.xs / 2,
  },
  alternativeDomain: {
    fontSize: 12,
  },
  alternativeRight: {
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  alternativePrice: {
    fontSize: 16,
    fontWeight: '600',
  },
  loadAlternativesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    padding: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: spacing.xl,
  },
  loadAlternativesText: {
    fontSize: 16,
    fontWeight: '500',
  },
  confirmationSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: spacing.xl,
  },
  confirmationLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  confirmationText: {
    fontSize: 16,
    fontWeight: '500',
  },
  footer: {
    padding: spacing.md,
    borderTopWidth: 1,
    gap: spacing.sm,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    padding: spacing.md,
    borderRadius: 12,
  },
  primaryButtonDisabled: {
    opacity: 0.5,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    padding: spacing.sm,
    borderRadius: 12,
    borderWidth: 1,
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  tertiaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    padding: spacing.sm,
    borderRadius: 12,
    borderWidth: 1,
  },
  tertiaryButtonText: {
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: spacing.lg,
    maxHeight: '80%',
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#ccc',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  imageGrid: {
    marginBottom: spacing.md,
  },
  imageOption: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginBottom: spacing.sm,
    borderWidth: 3,
    overflow: 'hidden',
  },
  imageOptionImage: {
    width: '100%',
    height: '100%',
  },
  imageSelectedBadge: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    padding: spacing.md,
    borderRadius: 12,
  },
  uploadButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  pickerModal: {
    marginHorizontal: spacing.lg,
    marginVertical: 'auto',
    borderRadius: 16,
    padding: spacing.lg,
    maxHeight: '60%',
  },
  pickerList: {
    maxHeight: 400,
  },
  pickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderRadius: 8,
    marginBottom: spacing.xs,
  },
  pickerOptionText: {
    fontSize: 16,
  },
});
