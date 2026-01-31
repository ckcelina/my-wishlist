
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
import { fetchWishlists, fetchWishlistItems, fetchUserLocation } from '@/lib/supabase-helpers';
import { createWishlistItem } from '@/lib/supabase-helpers';
import { DuplicateDetectionModal } from '@/components/DuplicateDetectionModal';
import { supabase } from '@/lib/supabase';

// Placeholder image URL for fallback
const PLACEHOLDER_IMAGE_URL = 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80';

// Helper to resolve image sources (handles both local require() and remote URLs)
function resolveImageSource(source: string | number | ImageSourcePropType | undefined): ImageSourcePropType {
  if (!source) return { uri: PLACEHOLDER_IMAGE_URL };
  if (typeof source === 'string') return { uri: source };
  return source as ImageSourcePropType;
}

interface ExtractedProductData {
  itemName: string;
  imageUrl: string;
  extractedImages: string[]; // Top 5 suggested images
  storeName: string;
  storeDomain: string;
  price: number | null;
  currency: string;
  countryAvailability: string[];
  alternativeStores?: AlternativeStore[];
  sourceUrl?: string;
  notes?: string;
  inputType?: 'url' | 'image' | 'camera' | 'name' | 'manual';
}

interface AlternativeStore {
  storeName: string;
  storeDomain: string;
  price: number;
  currency: string;
  originalPrice?: number;
  originalCurrency?: string;
  shippingCost?: number;
  deliveryTime?: string;
  availability?: 'in_stock' | 'out_of_stock' | 'limited_stock' | 'unknown';
  confidenceScore?: number;
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

type SearchStage = 'idle' | 'finding_stores' | 'checking_prices' | 'verifying_shipping' | 'choosing_photo' | 'complete';

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
  const [uploadingImage, setUploadingImage] = useState(false);
  
  // Editable fields
  const [itemName, setItemName] = useState('');
  const [brand, setBrand] = useState('');
  const [selectedImage, setSelectedImage] = useState('');
  const [suggestedImages, setSuggestedImages] = useState<string[]>([]); // Top 5 images
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
  const [isCorrectProduct, setIsCorrectProduct] = useState(false);
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
  const [searchStage, setSearchStage] = useState<SearchStage>('idle');
  
  // Warnings
  const [warnings, setWarnings] = useState<string[]>([]);

  useEffect(() => {
    console.log('[ImportPreview] Initializing with params:', params);
    initializeScreen();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  useEffect(() => {
    if (user) {
      fetchUserWishlists();
      fetchUserLocationData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        setBrand(parsed.brand || '');
        
        // Set suggested images (top 5)
        const images = parsed.extractedImages || [];
        setSuggestedImages(images.slice(0, 5));
        console.log('[ImportPreview] Suggested images:', images.slice(0, 5));
        
        // Auto-select image based on input type
        const autoSelectedImage = autoSelectImage(parsed);
        setSelectedImage(autoSelectedImage);
        console.log('[ImportPreview] Auto-selected image:', autoSelectedImage);
        
        setStoreName(parsed.storeName || '');
        setStoreDomain(parsed.storeDomain || '');
        setPrice(parsed.price?.toString() || '');
        setCurrency(parsed.currency || 'USD');
        setNotes(parsed.notes || '');
        
        // Check for warnings
        const newWarnings: string[] = [];
        if (!parsed.itemName) newWarnings.push('Item name is missing');
        if (!autoSelectedImage || autoSelectedImage === PLACEHOLDER_IMAGE_URL) {
          newWarnings.push('No image available - using placeholder');
        }
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

  /**
   * Auto-select the best image based on input type
   * Priority:
   * 1. URL: Use extracted og:image or primary product image (highest resolution)
   * 2. Camera/Upload: Use the uploaded image
   * 3. Name search: Use the best search result image
   * 4. Fallback: Use placeholder
   */
  const autoSelectImage = (data: ExtractedProductData): string => {
    const inputType = data.inputType || 'manual';
    
    console.log('[ImportPreview] Auto-selecting image for input type:', inputType);
    
    // For URL input: prefer extracted image (highest resolution, non-logo)
    if (inputType === 'url') {
      if (data.extractedImages && data.extractedImages.length > 0) {
        // Return the first extracted image (should be highest quality, non-logo)
        return data.extractedImages[0];
      }
      if (data.imageUrl) {
        return data.imageUrl;
      }
    }
    
    // For camera/upload: use the uploaded image
    if (inputType === 'camera' || inputType === 'image') {
      if (data.imageUrl) {
        return data.imageUrl;
      }
    }
    
    // For name search: use the best result image (high-res, clean)
    if (inputType === 'name') {
      if (data.imageUrl) {
        return data.imageUrl;
      }
    }
    
    // Fallback to placeholder
    console.log('[ImportPreview] No suitable image found, using placeholder');
    return PLACEHOLDER_IMAGE_URL;
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
      const locationData = await fetchUserLocation(user.id);
      
      if (locationData) {
        setUserLocation({
          countryCode: locationData.countryCode,
          city: locationData.city,
        });
        console.log('[ImportPreview] User location:', locationData);
      }
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
    console.log('[ImportPreview] User tapped Change Photo');
    setShowImagePicker(true);
  };

  const handleSelectImage = (imageUrl: string) => {
    console.log('[ImportPreview] Image selected:', imageUrl);
    setSelectedImage(imageUrl);
    setShowImagePicker(false);
    
    // Remove "No image available" warning if it exists
    setWarnings(prev => prev.filter(w => !w.includes('image')));
  };

  const handleUploadImage = async () => {
    console.log('[ImportPreview] User tapped Upload from Gallery');
    
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
    });
    
    if (!result.canceled && result.assets[0]) {
      const localUri = result.assets[0].uri;
      console.log('[ImportPreview] Image selected from gallery:', localUri);
      
      // Upload to Supabase Storage
      await uploadImageToSupabase(localUri);
    }
  };

  const handleTakePhoto = async () => {
    console.log('[ImportPreview] User tapped Take Photo');
    
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Camera permission is required to take photos');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const localUri = result.assets[0].uri;
      console.log('[ImportPreview] Photo taken:', localUri);
      
      // Upload to Supabase Storage
      await uploadImageToSupabase(localUri);
    }
  };

  const uploadImageToSupabase = async (localUri: string) => {
    if (!user) {
      Alert.alert('Error', 'You must be logged in to upload images');
      return;
    }

    setUploadingImage(true);
    console.log('[ImportPreview] Uploading image to Supabase Storage:', localUri);

    try {
      // Generate unique filename
      const fileExt = localUri.split('.').pop() || 'jpg';
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      
      // Fetch the image as a blob
      const response = await fetch(localUri);
      const blob = await response.blob();
      
      // Upload to Supabase Storage (item-images bucket)
      const { data, error } = await supabase.storage
        .from('item-images')
        .upload(fileName, blob, {
          contentType: `image/${fileExt}`,
          upsert: false,
        });

      if (error) {
        console.error('[ImportPreview] Error uploading image:', error);
        Alert.alert('Upload Failed', 'Failed to upload image. Please try again.');
        return;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('item-images')
        .getPublicUrl(fileName);

      const publicUrl = urlData.publicUrl;
      console.log('[ImportPreview] Image uploaded successfully:', publicUrl);

      // Update selected image
      setSelectedImage(publicUrl);
      
      // Add to suggested images if not already there
      if (!suggestedImages.includes(publicUrl)) {
        setSuggestedImages(prev => [publicUrl, ...prev].slice(0, 5));
      }
      
      setShowImagePicker(false);
      
      // Remove "No image available" warning if it exists
      setWarnings(prev => prev.filter(w => !w.includes('image')));
    } catch (error) {
      console.error('[ImportPreview] Error uploading image:', error);
      Alert.alert('Upload Failed', 'Failed to upload image. Please try again.');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleRetryExtraction = () => {
    console.log('[ImportPreview] User tapped Retry');
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

  const handleManualEntry = () => {
    console.log('[ImportPreview] User tapped Manual Entry');
    // Navigate back to add screen with manual mode selected
    router.back();
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
    
    if (!isCorrectProduct) {
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
      
      // Determine final image URL
      let finalImageUrl = selectedImage;
      
      // If image is a local file URI, upload it first
      if (finalImageUrl && finalImageUrl.startsWith('file://')) {
        console.log('[ImportPreview] Uploading local image before saving');
        await uploadImageToSupabase(finalImageUrl);
        finalImageUrl = selectedImage; // Use the updated selectedImage after upload
      }
      
      // Fallback to placeholder if no image
      if (!finalImageUrl || finalImageUrl === '') {
        finalImageUrl = PLACEHOLDER_IMAGE_URL;
        console.log('[ImportPreview] No image provided, using placeholder');
      }
      
      // Create the wishlist item
      const newItem = await createWishlistItem({
        wishlist_id: selectedWishlistId,
        title: itemName.trim(),
        image_url: finalImageUrl,
        current_price: price ? parseFloat(price) : null,
        currency: currency,
        original_url: productData?.sourceUrl || null,
        source_domain: storeDomain || null,
        notes: notes.trim() || null,
      });
      
      console.log('[ImportPreview] Item saved successfully:', newItem.id);
      
      // Save offers to database if any exist
      if (alternativeStores.length > 0) {
        console.log('[ImportPreview] Saving', alternativeStores.length, 'offers to database');
        try {
          const { authenticatedPost } = await import('@/utils/api');
          await authenticatedPost(`/api/items/${newItem.id}/save-offers`, {
            offers: alternativeStores.map(store => ({
              storeName: store.storeName,
              storeDomain: store.storeDomain,
              productUrl: store.url,
              price: store.price,
              currency: store.currency,
              originalPrice: store.originalPrice || null,
              originalCurrency: store.originalCurrency || null,
              shippingCost: store.shippingCost || null,
              deliveryTime: store.deliveryTime || null,
              availability: store.availability || 'in_stock',
              confidenceScore: store.confidenceScore || null,
              countryCode: userLocation?.countryCode || null,
              city: userLocation?.city || null,
            })),
          });
          console.log('[ImportPreview] Offers saved successfully');
        } catch (offerError) {
          console.error('[ImportPreview] Error saving offers:', offerError);
          // Don't fail the whole operation if offers fail to save
        }
      }
      
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
    if (!itemName) {
      Alert.alert('Missing Information', 'Please enter an item name first');
      return;
    }
    
    // Check if user has set their shipping location
    if (!userLocation || !userLocation.countryCode) {
      console.log('[ImportPreview] User location not set, showing location modal');
      Alert.alert(
        'Shipping Location Required',
        'To find prices online, we need to know where you want items shipped. Please set your shipping location first.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Set Location',
            onPress: () => {
              router.push('/location');
            },
          },
        ]
      );
      return;
    }
    
    console.log('[ImportPreview] Loading AI Price Search results for location:', userLocation.countryCode, userLocation.city);
    setLoadingAlternatives(true);
    setSearchStage('finding_stores');
    
    try {
      // Simulate stage progression for better UX
      setTimeout(() => setSearchStage('checking_prices'), 1000);
      setTimeout(() => setSearchStage('verifying_shipping'), 2000);
      setTimeout(() => setSearchStage('choosing_photo'), 3000);
      
      // Call backend AI Price Search endpoint
      const { authenticatedPost } = await import('@/utils/api');
      const response = await authenticatedPost<{
        offers: AlternativeStore[];
        message?: string;
      }>('/api/items/find-prices-online', {
        productName: itemName,
        imageUrl: selectedImage || null,
        originalUrl: productData?.sourceUrl || null,
        countryCode: userLocation.countryCode,
        city: userLocation.city || null,
      });
      
      setSearchStage('complete');
      console.log('[ImportPreview] AI Price Search results:', response.offers.length, 'offers');
      
      if (response.offers && response.offers.length > 0) {
        setAlternativeStores(response.offers);
        setShowAlternatives(true);
      } else {
        const message = response.message || 'No offers found for this product in your location';
        Alert.alert('No Results', message);
      }
    } catch (error) {
      console.error('[ImportPreview] Error loading AI Price Search:', error);
      Alert.alert('Error', 'Failed to search for prices. Please try again.');
    } finally {
      setLoadingAlternatives(false);
      setSearchStage('idle');
    }
  };

  const getStageLabel = (stage: SearchStage): string => {
    switch (stage) {
      case 'finding_stores':
        return 'Finding stores...';
      case 'checking_prices':
        return 'Checking prices...';
      case 'verifying_shipping':
        return 'Verifying shipping...';
      case 'choosing_photo':
        return 'Choosing best photo...';
      case 'complete':
        return 'Complete!';
      default:
        return '';
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

  // Determine if we're showing placeholder
  const isPlaceholderImage = !selectedImage || selectedImage === PLACEHOLDER_IMAGE_URL;

  // Determine delivery country display
  const deliveryCountryDisplay = userLocation ? userLocation.countryCode : 'Not set';

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

            {/* Product Image + Change Photo */}
            <View style={styles.imageSection}>
              {selectedImage && !isPlaceholderImage ? (
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
                disabled={uploadingImage}
              >
                {uploadingImage ? (
                  <ActivityIndicator size="small" color={colors.accent} />
                ) : (
                  <>
                    <IconSymbol
                      ios_icon_name="photo"
                      android_material_icon_name="image"
                      size={16}
                      color={colors.accent}
                    />
                    <Text style={[styles.changeImageText, { color: colors.accent }]}>Change Photo</Text>
                  </>
                )}
              </TouchableOpacity>
              
              {/* Show count of suggested images */}
              {suggestedImages.length > 0 && (
                <Text style={[styles.imageCountText, { color: colors.textTertiary }]}>
                  {suggestedImages.length} {suggestedImages.length === 1 ? 'suggestion' : 'suggestions'} available
                </Text>
              )}
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

              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Brand (optional)</Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.border }]}
                value={brand}
                onChangeText={setBrand}
                placeholder="Enter brand name"
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

              {/* Deliver to: Country */}
              <View style={styles.deliverySection}>
                <Text style={[styles.deliveryLabel, { color: colors.textSecondary }]}>Deliver to:</Text>
                <Text style={[styles.deliveryCountry, { color: colors.textPrimary }]}>{deliveryCountryDisplay}</Text>
              </View>

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

            {/* Other Stores & Prices Section */}
            {alternativeStores.length > 0 ? (
              <View style={styles.alternativesSection}>
                <View style={styles.alternativesHeader}>
                  <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Other Stores & Prices</Text>
                  <Text style={[styles.alternativesCount, { color: colors.textSecondary }]}>
                    {alternativeStores.length} {alternativeStores.length === 1 ? 'offer' : 'offers'}
                  </Text>
                </View>
                
                {alternativeStores.slice(0, 3).map((store, index) => {
                  const storePrice = `${store.currency} ${store.price.toFixed(2)}`;
                  const hasShipping = store.shippingCost !== undefined && store.shippingCost !== null;
                  const shippingText = hasShipping 
                    ? store.shippingCost === 0 
                      ? 'Free shipping' 
                      : `+${store.currency} ${store.shippingCost.toFixed(2)} shipping`
                    : null;
                  
                  return (
                    <View key={index} style={[styles.alternativeCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                      <View style={styles.alternativeInfo}>
                        <Text style={[styles.alternativeStoreName, { color: colors.textPrimary }]}>{store.storeName}</Text>
                        <Text style={[styles.alternativeDomain, { color: colors.textSecondary }]}>{store.storeDomain}</Text>
                        {shippingText && (
                          <Text style={[styles.alternativeShipping, { color: colors.textTertiary }]}>{shippingText}</Text>
                        )}
                        {store.deliveryTime && (
                          <Text style={[styles.alternativeDelivery, { color: colors.textTertiary }]}>
                            Delivery: {store.deliveryTime}
                          </Text>
                        )}
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
                
                {alternativeStores.length > 3 && (
                  <Text style={[styles.moreOffersText, { color: colors.textSecondary }]}>
                    +{alternativeStores.length - 3} more {alternativeStores.length - 3 === 1 ? 'offer' : 'offers'} will be saved
                  </Text>
                )}
              </View>
            ) : (
              <View style={styles.findPricesSection}>
                <TouchableOpacity
                  style={[styles.loadAlternativesButton, { backgroundColor: colors.accent }]}
                  onPress={handleLoadAlternatives}
                  disabled={loadingAlternatives}
                >
                  {loadingAlternatives ? (
                    <View style={styles.loadingContainer}>
                      <ActivityIndicator size="small" color={colors.textInverse} />
                      <Text style={[styles.loadingStageText, { color: colors.textInverse }]}>
                        {getStageLabel(searchStage)}
                      </Text>
                    </View>
                  ) : (
                    <>
                      <IconSymbol
                        ios_icon_name="magnifyingglass"
                        android_material_icon_name="search"
                        size={20}
                        color={colors.textInverse}
                      />
                      <Text style={[styles.loadAlternativesText, { color: colors.textInverse }]}>Find Prices Online</Text>
                    </>
                  )}
                </TouchableOpacity>
                <Text style={[styles.findPricesHint, { color: colors.textTertiary }]}>
                  Search 10+ stores for the best price
                </Text>
              </View>
            )}

            {/* "This is the correct product" Confirmation */}
            <View style={[styles.confirmationSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.confirmationLeft}>
                <IconSymbol
                  ios_icon_name="checkmark.circle"
                  android_material_icon_name="check-circle"
                  size={24}
                  color={isCorrectProduct ? colors.success : colors.textTertiary}
                />
                <Text style={[styles.confirmationText, { color: colors.textPrimary }]}>
                  This is the correct product
                </Text>
              </View>
              <Switch
                value={isCorrectProduct}
                onValueChange={setIsCorrectProduct}
                trackColor={{ false: colors.border, true: colors.success }}
                thumbColor={colors.surface}
              />
            </View>

            {/* Spacer for footer */}
            <View style={{ height: 180 }} />
          </ScrollView>

          {/* Footer Actions */}
          <View style={[styles.footer, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
            <TouchableOpacity
              style={[
                styles.primaryButton,
                { backgroundColor: colors.accent },
                (!isCorrectProduct || !itemName.trim() || saving || checkingDuplicates) && styles.primaryButtonDisabled,
              ]}
              onPress={handleConfirmAndAdd}
              disabled={!isCorrectProduct || !itemName.trim() || saving || checkingDuplicates}
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

            <View style={styles.secondaryActions}>
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
                <Text style={[styles.secondaryButtonText, { color: colors.textPrimary }]}>Retry</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.secondaryButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={handleManualEntry}
              >
                <IconSymbol
                  ios_icon_name="pencil"
                  android_material_icon_name="edit"
                  size={16}
                  color={colors.textPrimary}
                />
                <Text style={[styles.secondaryButtonText, { color: colors.textPrimary }]}>Manual Entry</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.secondaryButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={handleReportProblem}
              >
                <IconSymbol
                  ios_icon_name="exclamationmark.triangle"
                  android_material_icon_name="report"
                  size={16}
                  color={colors.textSecondary}
                />
                <Text style={[styles.secondaryButtonText, { color: colors.textSecondary }]}>Report</Text>
              </TouchableOpacity>
            </View>
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

        {/* Image Picker Modal - Shows top 5 suggestions + upload/camera options */}
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
              
              {/* Show suggested images (top 5) */}
              {suggestedImages.length > 0 && (
                <>
                  <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
                    Suggested Images ({suggestedImages.length})
                  </Text>
                  <ScrollView style={styles.imageGrid} horizontal={false}>
                    {suggestedImages.map((imageUrl, index) => (
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
                        <View style={[styles.imageIndexBadge, { backgroundColor: colors.surface }]}>
                          <Text style={[styles.imageIndexText, { color: colors.textPrimary }]}>
                            {index + 1}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </>
              )}

              {/* Upload and Camera Options */}
              <View style={styles.imageActions}>
                <TouchableOpacity
                  style={[styles.imageActionButton, { backgroundColor: colors.accent }]}
                  onPress={handleUploadImage}
                  disabled={uploadingImage}
                >
                  {uploadingImage ? (
                    <ActivityIndicator size="small" color={colors.textInverse} />
                  ) : (
                    <>
                      <IconSymbol
                        ios_icon_name="photo"
                        android_material_icon_name="image"
                        size={20}
                        color={colors.textInverse}
                      />
                      <Text style={[styles.imageActionText, { color: colors.textInverse }]}>Upload from Gallery</Text>
                    </>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.imageActionButton, { backgroundColor: colors.accent }]}
                  onPress={handleTakePhoto}
                  disabled={uploadingImage}
                >
                  <IconSymbol
                    ios_icon_name="camera"
                    android_material_icon_name="camera"
                    size={20}
                    color={colors.textInverse}
                  />
                  <Text style={[styles.imageActionText, { color: colors.textInverse }]}>Take Photo</Text>
                </TouchableOpacity>
              </View>
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
    marginBottom: spacing.xs,
  },
  changeImageText: {
    fontSize: 14,
    fontWeight: '500',
  },
  imageCountText: {
    fontSize: 12,
    marginTop: spacing.xs / 2,
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
  deliverySection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  deliveryLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  deliveryCountry: {
    fontSize: 14,
    fontWeight: '600',
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
    marginBottom: spacing.xs / 2,
  },
  alternativeShipping: {
    fontSize: 12,
    marginBottom: spacing.xs / 2,
  },
  alternativeDelivery: {
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
  moreOffersText: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: spacing.sm,
    fontStyle: 'italic',
  },
  findPricesSection: {
    marginBottom: spacing.xl,
    alignItems: 'center',
  },
  loadAlternativesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    padding: spacing.md,
    borderRadius: 12,
    width: '100%',
    minHeight: 48,
  },
  loadAlternativesText: {
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  loadingStageText: {
    fontSize: 14,
    fontWeight: '500',
  },
  findPricesHint: {
    fontSize: 12,
    marginTop: spacing.xs,
    textAlign: 'center',
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
  secondaryActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  secondaryButton: {
    flex: 1,
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
  modalSubtitle: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: spacing.sm,
  },
  imageGrid: {
    marginBottom: spacing.md,
    maxHeight: 400,
  },
  imageOption: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginBottom: spacing.sm,
    borderWidth: 3,
    overflow: 'hidden',
    position: 'relative',
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
  imageIndexBadge: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageIndexText: {
    fontSize: 12,
    fontWeight: '600',
  },
  imageActions: {
    gap: spacing.sm,
  },
  imageActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    padding: spacing.md,
    borderRadius: 12,
  },
  imageActionText: {
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
