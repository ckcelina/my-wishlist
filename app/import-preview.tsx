
import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
import { useLocation } from '@/contexts/LocationContext';
import { useSmartLocation } from '@/contexts/SmartLocationContext';
import { createColors, createTypography, spacing } from '@/styles/designSystem';
import * as ImagePicker from 'expo-image-picker';
import { fetchWishlists, fetchWishlistItems, fetchUserLocation } from '@/lib/supabase-helpers';
import { createWishlistItem } from '@/lib/supabase-helpers';
import { DuplicateDetectionModal } from '@/components/DuplicateDetectionModal';
import { ProductMatchCard, ProductMatch } from '@/components/ProductMatchCard';
import { supabase } from '@/lib/supabase';
import { authenticatedPost, authenticatedPut } from '@/utils/api';
import { identifyProductFromImage, getProductPrices } from '@/utils/supabase-edge-functions';

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
  const { countryCode, cityId, currencyCode } = useLocation();
  const { settings: smartLocationSettings } = useSmartLocation();
  const colors = createColors(theme);
  const typography = createTypography(theme);
  
  const params = useLocalSearchParams();
  
  // Parse extracted data from params - STABLE reference
  const dataParam = useMemo(() => params.data, [params.data]);
  
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
  
  // Product matching state (NEW)
  const [showProductMatches, setShowProductMatches] = useState(false);
  const [productMatches, setProductMatches] = useState<ProductMatch[]>([]);
  const [loadingMatches, setLoadingMatches] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<ProductMatch | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  
  // Offers state (NEW)
  const [offers, setOffers] = useState<AlternativeStore[]>([]);
  const [offersLoading, setOffersLoading] = useState(false);
  
  // Price tracking state (NEW)
  const [trackPriceDrops, setTrackPriceDrops] = useState(false);
  const [desiredPrice, setDesiredPrice] = useState('');
  const [showPriceTrackingModal, setShowPriceTrackingModal] = useState(false);
  
  // Data
  const [wishlists, setWishlists] = useState<Wishlist[]>([]);
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [alternativeStores, setAlternativeStores] = useState<AlternativeStore[]>([]);
  const [loadingAlternatives, setLoadingAlternatives] = useState(false);
  const [searchStage, setSearchStage] = useState<SearchStage>('idle');
  
  // Warnings
  const [warnings, setWarnings] = useState<string[]>([]);

  // Check if information is incomplete (show Find Matches button)
  const isIncomplete = useMemo(() => {
    return !itemName || !selectedImage || selectedImage === PLACEHOLDER_IMAGE_URL || !price;
  }, [itemName, selectedImage, price]);

  /**
   * Auto-select the best image based on input type
   * Priority:
   * 1. URL: Use extracted og:image or primary product image (highest resolution)
   * 2. Camera/Upload: Use the uploaded image
   * 3. Name search: Use the best search result image
   * 4. Fallback: Use placeholder
   */
  const autoSelectImage = useCallback((data: ExtractedProductData): string => {
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
  }, []);

  const initializeScreen = useCallback(async () => {
    try {
      // Guard: Only run if dataParam exists
      if (!dataParam || typeof dataParam !== 'string') {
        console.log('[ImportPreview] No data param, skipping initialization');
        setLoading(false);
        return;
      }

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
    } catch (error) {
      console.error('[ImportPreview] Error parsing product data:', error);
      Alert.alert('Error', 'Failed to load product data');
      router.back();
    } finally {
      setLoading(false);
    }
  }, [dataParam, autoSelectImage, router]);

  const fetchUserWishlists = useCallback(async () => {
    // Guard: Only run if user exists
    if (!user) {
      console.log('[ImportPreview] No user, skipping wishlist fetch');
      return;
    }
    
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
  }, [user]);

  const fetchUserLocationData = useCallback(async () => {
    // Guard: Only run if user exists
    if (!user) {
      console.log('[ImportPreview] No user, skipping location fetch');
      return;
    }
    
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
  }, [user]);

  // Initialize screen ONCE when dataParam changes
  useEffect(() => {
    console.log('[ImportPreview] Initializing with params:', params);
    initializeScreen();
  }, [initializeScreen]);

  // Fetch wishlists and location ONCE when user changes
  useEffect(() => {
    if (user) {
      fetchUserWishlists();
      fetchUserLocationData();
    }
  }, [user, fetchUserWishlists, fetchUserLocationData]);

  const checkForDuplicates = useCallback(async () => {
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
  }, [selectedWishlistId, itemName, productData]);

  const handleChangeImage = useCallback(async () => {
    console.log('[ImportPreview] User tapped Change Photo');
    setShowImagePicker(true);
  }, []);

  const handleSelectImage = useCallback((imageUrl: string) => {
    console.log('[ImportPreview] Image selected:', imageUrl);
    setSelectedImage(imageUrl);
    setShowImagePicker(false);
    
    // Remove "No image available" warning if it exists
    setWarnings(prev => prev.filter(w => !w.includes('image')));
  }, []);

  const handleUploadImage = useCallback(async () => {
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
  }, []);

  const handleTakePhoto = useCallback(async () => {
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
  }, []);

  const uploadImageToSupabase = useCallback(async (localUri: string) => {
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
  }, [user, suggestedImages]);

  // NEW: Find Similar Products using Supabase Edge Function
  const handleFindMatches = useCallback(async () => {
    console.log('[ImportPreview] User tapped Find Matches');
    
    // CRITICAL: Get location from SmartLocationContext (Settings only)
    const effectiveCountryCode = smartLocationSettings?.activeSearchCountry || userLocation?.countryCode;
    const effectiveCurrencyCode = smartLocationSettings?.currencyCode || currencyCode || currency;
    
    if (!effectiveCountryCode) {
      Alert.alert(
        'Location Required',
        'Please set your country in Settings to find similar products.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Go to Settings', onPress: () => router.push('/location') },
        ]
      );
      return;
    }

    // Validate image exists
    const imageToIdentify = selectedImage && selectedImage !== PLACEHOLDER_IMAGE_URL ? selectedImage : undefined;
    if (!imageToIdentify) {
      Alert.alert(
        'Image Required',
        'Please upload or select an image to find similar products.',
        [{ text: 'OK' }]
      );
      return;
    }

    setLoadingMatches(true);
    setShowProductMatches(true);

    try {
      console.log('[ImportPreview] Calling identify-product-from-image Edge Function');
      console.log('[ImportPreview] Country:', effectiveCountryCode, 'Currency:', effectiveCurrencyCode);
      console.log('[ImportPreview] Image URL:', imageToIdentify);
      
      // Call the new Supabase Edge Function
      const response = await identifyProductFromImage(
        undefined, // imageBase64 - not using base64 for now
        imageToIdentify, // imageUrl
        effectiveCountryCode,
        effectiveCurrencyCode,
        'en' // languageCode - default to English for now
      );

      console.log('[ImportPreview] Edge Function response:', response);
      console.log('[ImportPreview] Detected text:', response.query.detectedText);
      console.log('[ImportPreview] Detected brand:', response.query.detectedBrand);
      console.log('[ImportPreview] Found', response.matches.length, 'matches');

      // Convert ProductMatchResult to ProductMatch format
      const convertedMatches: ProductMatch[] = response.matches.map((match: any) => ({
        id: match.id,
        name: match.name,
        brand: match.brand || null,
        category: match.category || null,
        imageUrl: match.imageUrl,
        topPrice: {
          amount: 0, // Placeholder - will be filled by product-prices call
          currency: effectiveCurrencyCode,
        },
        store: {
          name: 'Unknown Store',
          domain: '',
          logoUrl: null,
        },
        priceRange: null,
        storeSuggestions: [],
        confidenceScore: match.confidence,
      }));

      setProductMatches(convertedMatches);

      if (convertedMatches.length === 0) {
        Alert.alert(
          'No Matches Found',
          response.error || 'We couldn\'t find any similar products. Try manual entry instead.'
        );
        setShowProductMatches(false);
      }
    } catch (error: any) {
      console.error('[ImportPreview] Error finding similar products:', error);
      Alert.alert('Search Failed', error.message || 'Failed to find similar products. Please try again.');
      setShowProductMatches(false);
    } finally {
      setLoadingMatches(false);
    }
  }, [selectedImage, itemName, countryCode, currencyCode, currency, userLocation, smartLocationSettings, router]);

  // NEW: Handle Product Match Selection
  const handleSelectMatch = useCallback(async (match: ProductMatch) => {
    console.log('[ImportPreview] User selected product match:', match.name);
    setSelectedMatch(match);
    setSelectedProductId(match.id); // Save productId to local state
    
    // Auto-fill form with match data
    setItemName(match.name);
    setBrand(match.brand || '');
    if (match.category) {
      // Store category if needed (you may want to add a category field)
      console.log('[ImportPreview] Product category:', match.category);
    }
    setSelectedImage(match.imageUrl);
    
    // Close the matches modal first for better UX
    setShowProductMatches(false);
    
    // IMMEDIATELY call product-prices Edge Function
    setOffersLoading(true);
    try {
      console.log('[ImportPreview] Fetching real-time prices for product:', match.id);
      
      // CRITICAL: Get location from SmartLocationContext (Settings only)
      const effectiveCountryCode = smartLocationSettings?.activeSearchCountry || userLocation?.countryCode || 'US';
      const effectiveCurrencyCode = smartLocationSettings?.currencyCode || currencyCode || currency || 'USD';
      
      console.log('[ImportPreview] Fetching prices for country:', effectiveCountryCode, 'currency:', effectiveCurrencyCode);
      
      const { getProductPrices } = await import('@/utils/supabase-edge-functions');
      const pricesResponse = await getProductPrices(
        match.id,
        effectiveCountryCode,
        effectiveCurrencyCode
      );
      
      console.log('[ImportPreview] Got prices:', pricesResponse.offers.length, 'offers');
      console.log('[ImportPreview] Best price:', pricesResponse.summary.bestOffer?.price, effectiveCurrencyCode);
      
      // Convert offers to AlternativeStore format and set offers state
      if (pricesResponse.offers.length > 0) {
        const alternatives: AlternativeStore[] = pricesResponse.offers.map(offer => ({
          storeName: offer.storeName,
          storeDomain: new URL(offer.storeUrl).hostname.replace('www.', ''),
          price: offer.price,
          currency: offer.currencyCode,
          url: offer.storeUrl,
          availability: offer.availability,
        }));
        
        // Sort by price (cheapest first)
        alternatives.sort((a, b) => a.price - b.price);
        
        setOffers(alternatives);
        setAlternativeStores(alternatives); // Also set alternativeStores for compatibility
        
        // Update price with best offer (cheapest)
        if (pricesResponse.summary.bestOffer) {
          setPrice(pricesResponse.summary.bestOffer.price.toString());
          setCurrency(pricesResponse.summary.bestOffer.currencyCode);
          setStoreName(pricesResponse.summary.bestOffer.storeName);
          setStoreDomain(new URL(pricesResponse.summary.bestOffer.storeUrl).hostname.replace('www.', ''));
        }
      } else {
        // No offers found
        console.log('[ImportPreview] No offers found for this product');
        setOffers([]);
        setAlternativeStores([]);
        
        // Set placeholder price
        setPrice('0');
        setCurrency(effectiveCurrencyCode);
      }
    } catch (error) {
      console.error('[ImportPreview] Error fetching prices:', error);
      // Continue with match data even if price fetch fails
      setOffers([]);
      
      // Fallback: Set alternative stores from match data if available
      if (match.storeSuggestions && match.storeSuggestions.length > 0) {
        const alternatives: AlternativeStore[] = match.storeSuggestions.map(store => ({
          storeName: store.storeName,
          storeDomain: store.storeDomain,
          price: store.price,
          currency: store.currency,
          url: store.url,
          availability: 'in_stock',
        }));
        setOffers(alternatives);
        setAlternativeStores(alternatives);
      }
    } finally {
      setOffersLoading(false);
    }
    
    // Remove warnings since we now have complete data
    setWarnings([]);
    
    // Auto-confirm as correct product
    setIsCorrectProduct(true);
  }, [countryCode, currencyCode, currency, userLocation, smartLocationSettings]);

  // NEW: Handle "None of these" selection
  const handleNoneOfThese = useCallback(() => {
    console.log('[ImportPreview] User selected None of these');
    setShowProductMatches(false);
    setProductMatches([]);
    setSelectedMatch(null);
    
    // User will continue with manual entry
    Alert.alert(
      'Manual Entry',
      'You can continue filling in the details manually.',
      [{ text: 'OK' }]
    );
  }, []);

  const handleRetryExtraction = useCallback(() => {
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
  }, [router]);

  const handleManualEntry = useCallback(() => {
    console.log('[ImportPreview] User tapped Manual Entry');
    // Navigate back to add screen with manual mode selected
    router.back();
  }, [router]);

  const handleReportProblem = useCallback(() => {
    console.log('[ImportPreview] User tapped Report a Problem');
    router.push({
      pathname: '/report-problem',
      params: {
        context: 'import_preview',
        itemName: itemName,
        sourceUrl: productData?.sourceUrl || '',
      },
    });
  }, [router, itemName, productData]);

  const handleConfirmAndAdd = useCallback(async () => {
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
  }, [itemName, isCorrectProduct, selectedWishlistId, checkForDuplicates, duplicates.length]);

  const saveItem = useCallback(async () => {
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
      
      // Create the wishlist item with location data
      const newItem = await createWishlistItem({
        wishlist_id: selectedWishlistId,
        title: itemName.trim(),
        image_url: finalImageUrl,
        current_price: price ? parseFloat(price) : null,
        currency: currency,
        original_url: productData?.sourceUrl || null,
        source_domain: storeDomain || null,
        notes: notes.trim() || null,
        country_code: countryCode || null,
        city_id: cityId || null,
        currency_code: currencyCode || currency,
      });
      
      console.log('[ImportPreview] Item saved successfully:', newItem.id);
      
      // Save offers to database if any exist
      if (alternativeStores.length > 0) {
        console.log('[ImportPreview] Saving', alternativeStores.length, 'offers to database');
        try {
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
      
      // If price tracking is enabled, set up the alert
      if (trackPriceDrops && selectedProductId) {
        console.log('[ImportPreview] Setting up price tracking for item:', newItem.id);
        try {
          const targetPrice = desiredPrice ? parseFloat(desiredPrice) : null;
          const effectiveCountryCode = smartLocationSettings?.activeSearchCountry || userLocation?.countryCode || 'US';
          const effectiveCurrencyCode = smartLocationSettings?.currencyCode || currencyCode || currency || 'USD';
          
          await authenticatedPost(`/api/price-alerts`, {
            itemId: newItem.id,
            productId: selectedProductId,
            countryCode: effectiveCountryCode,
            currencyCode: effectiveCurrencyCode,
            enabled: true,
            desiredPrice: targetPrice,
            thresholdPercent: 10, // Default 10% threshold
          });
          console.log('[ImportPreview] Price tracking enabled with target:', targetPrice);
        } catch (alertError) {
          console.error('[ImportPreview] Error setting up price tracking:', alertError);
          // Don't fail the whole operation if alert setup fails
        }
      }
      
      Alert.alert(
        'Success',
        trackPriceDrops 
          ? 'Item added to your wishlist with price tracking enabled!'
          : 'Item added to your wishlist!',
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
  }, [selectedWishlistId, itemName, selectedImage, price, currency, productData, storeDomain, notes, countryCode, cityId, currencyCode, alternativeStores, userLocation, trackPriceDrops, desiredPrice, selectedProductId, smartLocationSettings, uploadImageToSupabase, router]);

  const handleDuplicateAddAnyway = useCallback(async () => {
    console.log('[ImportPreview] User chose to add anyway despite duplicates');
    setShowDuplicateModal(false);
    await saveItem();
  }, [saveItem]);

  const handleDuplicateReplace = useCallback(async (duplicateId: string) => {
    console.log('[ImportPreview] User chose to replace duplicate:', duplicateId);
    setShowDuplicateModal(false);
    
    Alert.alert(
      'Replace Item',
      'This feature will be available soon. For now, you can delete the old item manually and add the new one.',
      [{ text: 'OK' }]
    );
  }, []);

  const handleDuplicateCancel = useCallback(() => {
    console.log('[ImportPreview] User cancelled duplicate detection');
    setShowDuplicateModal(false);
    setDuplicates([]);
  }, []);

  const handleLoadAlternatives = useCallback(async () => {
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
  }, [itemName, userLocation, selectedImage, productData, router]);

  const getStageLabel = useCallback((stage: SearchStage): string => {
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
  }, []);

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

  return (
    <React.Fragment>
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

            {/* Find Matches Button - Show when info is incomplete OR always available */}
            {(isIncomplete || true) && (
              <TouchableOpacity
                style={[styles.findMatchesButton, { backgroundColor: colors.accent }]}
                onPress={handleFindMatches}
                disabled={loadingMatches}
              >
                {loadingMatches ? (
                  <ActivityIndicator size="small" color={colors.textInverse} />
                ) : (
                  <View style={styles.buttonContent}>
                    <IconSymbol
                      ios_icon_name="sparkles"
                      android_material_icon_name="auto-fix-high"
                      size={20}
                      color={colors.textInverse}
                    />
                    <Text style={[styles.findMatchesText, { color: colors.textInverse }]}>
                      {isIncomplete ? 'Find Matches' : 'Find Better Matches'}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
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
                  <View style={styles.buttonContent}>
                    <IconSymbol
                      ios_icon_name="photo"
                      android_material_icon_name="image"
                      size={16}
                      color={colors.accent}
                    />
                    <Text style={[styles.changeImageText, { color: colors.accent }]}>Change Photo</Text>
                  </View>
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

            {/* Prices near you Section (NEW) */}
            {offersLoading ? (
              <View style={styles.offersLoadingSection}>
                <ActivityIndicator size="large" color={colors.accent} />
                <Text style={[styles.offersLoadingText, { color: colors.textSecondary }]}>
                  Finding best prices...
                </Text>
              </View>
            ) : offers.length > 0 ? (
              <View style={styles.offersSection}>
                <View style={styles.offersHeader}>
                  <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Prices near you</Text>
                  <Text style={[styles.offersCount, { color: colors.textSecondary }]}>
                    {offers.length} {offers.length === 1 ? 'offer' : 'offers'}
                  </Text>
                </View>
                
                {/* Show all offers (sorted cheapest first) */}
                {offers.map((offer, index) => {
                  const offerPrice = `${offer.currency} ${offer.price.toFixed(2)}`;
                  const isCheapest = index === 0;
                  
                  return (
                    <View 
                      key={index} 
                      style={[
                        styles.offerCard, 
                        { backgroundColor: colors.surface, borderColor: isCheapest ? colors.success : colors.border },
                        isCheapest && styles.cheapestOfferCard,
                      ]}
                    >
                      <View style={styles.offerInfo}>
                        <View style={styles.offerHeader}>
                          <Text style={[styles.offerStoreName, { color: colors.textPrimary }]}>
                            {offer.storeName}
                          </Text>
                          {isCheapest && (
                            <View style={[styles.cheapestBadge, { backgroundColor: colors.success }]}>
                              <Text style={[styles.cheapestBadgeText, { color: colors.textInverse }]}>
                                Cheapest
                              </Text>
                            </View>
                          )}
                        </View>
                        <Text style={[styles.offerPrice, { color: isCheapest ? colors.success : colors.accent }]}>
                          {offerPrice}
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={[styles.openLinkButton, { backgroundColor: colors.accent }]}
                        onPress={async () => {
                          const { openStoreLink } = await import('@/utils/openStoreLink');
                          await openStoreLink(offer.url, {
                            source: 'import_preview_offers',
                            storeDomain: offer.storeDomain,
                          });
                        }}
                      >
                        <Text style={[styles.openLinkText, { color: colors.textInverse }]}>Open</Text>
                        <IconSymbol
                          ios_icon_name="arrow.up.forward"
                          android_material_icon_name="open-in-new"
                          size={14}
                          color={colors.textInverse}
                        />
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>
            ) : alternativeStores.length > 0 ? (
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
                    <View style={styles.buttonContent}>
                      <IconSymbol
                        ios_icon_name="magnifyingglass"
                        android_material_icon_name="search"
                        size={20}
                        color={colors.textInverse}
                      />
                      <Text style={[styles.loadAlternativesText, { color: colors.textInverse }]}>Find Prices Online</Text>
                    </View>
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

            {/* Price Tracking Toggle (NEW) */}
            {isCorrectProduct && (
              <View style={[styles.priceTrackingSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={styles.priceTrackingHeader}>
                  <View style={styles.priceTrackingLeft}>
                    <IconSymbol
                      ios_icon_name="bell.fill"
                      android_material_icon_name="notifications"
                      size={20}
                      color={trackPriceDrops ? colors.accent : colors.textTertiary}
                    />
                    <Text style={[styles.priceTrackingTitle, { color: colors.textPrimary }]}>
                      Track price drops for this item?
                    </Text>
                  </View>
                  <Switch
                    value={trackPriceDrops}
                    onValueChange={(value) => {
                      setTrackPriceDrops(value);
                      if (value) {
                        setShowPriceTrackingModal(true);
                      }
                    }}
                    trackColor={{ false: colors.border, true: colors.accent }}
                    thumbColor={colors.surface}
                  />
                </View>
                {trackPriceDrops && (
                  <Text style={[styles.priceTrackingHint, { color: colors.textSecondary }]}>
                    {desiredPrice 
                      ? `You'll be notified when the price drops below ${currency} ${parseFloat(desiredPrice).toFixed(2)}`
                      : 'You\'ll be notified of any price drops (10% threshold)'}
                  </Text>
                )}
              </View>
            )}

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
                <View style={styles.buttonContent}>
                  <IconSymbol
                    ios_icon_name="checkmark"
                    android_material_icon_name="check"
                    size={20}
                    color={colors.textInverse}
                  />
                  <Text style={[styles.primaryButtonText, { color: colors.textInverse }]}>Confirm & Add</Text>
                </View>
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

        {/* Product Matches Modal (NEW) */}
        <Modal
          visible={showProductMatches}
          transparent
          animationType="slide"
          onRequestClose={() => setShowProductMatches(false)}
        >
          <Pressable style={styles.modalOverlay} onPress={() => setShowProductMatches(false)}>
            <Pressable style={[styles.matchesModalContent, { backgroundColor: colors.surface }]} onPress={(e) => e.stopPropagation()}>
              <View style={styles.modalHandle} />
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Which one is it?</Text>
              <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
                Select the product that matches what you're looking for
              </Text>
              
              {loadingMatches ? (
                <View style={styles.loadingMatchesContainer}>
                  <ActivityIndicator size="large" color={colors.accent} />
                  <Text style={[styles.loadingMatchesText, { color: colors.textSecondary }]}>
                    Finding similar products...
                  </Text>
                </View>
              ) : (
                <ScrollView style={styles.matchesList} showsVerticalScrollIndicator={false}>
                  {productMatches.map((match) => (
                    <ProductMatchCard
                      key={match.id}
                      product={match}
                      onSelect={handleSelectMatch}
                      selected={selectedMatch?.id === match.id}
                    />
                  ))}
                  
                  {/* None of these button */}
                  <TouchableOpacity
                    style={[styles.noneOfTheseButton, { backgroundColor: colors.background, borderColor: colors.border }]}
                    onPress={handleNoneOfThese}
                  >
                    <IconSymbol
                      ios_icon_name="xmark.circle"
                      android_material_icon_name="cancel"
                      size={20}
                      color={colors.textSecondary}
                    />
                    <Text style={[styles.noneOfTheseText, { color: colors.textPrimary }]}>
                      None of these
                    </Text>
                  </TouchableOpacity>
                </ScrollView>
              )}
            </Pressable>
          </Pressable>
        </Modal>

        {/* Price Tracking Modal (NEW) */}
        <Modal
          visible={showPriceTrackingModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowPriceTrackingModal(false)}
        >
          <Pressable style={styles.modalOverlay} onPress={() => setShowPriceTrackingModal(false)}>
            <Pressable style={[styles.priceTrackingModalContent, { backgroundColor: colors.surface }]} onPress={(e) => e.stopPropagation()}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Set Target Price</Text>
              <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
                Get notified when the price drops below your target (optional)
              </Text>
              
              <View style={styles.targetPriceInputContainer}>
                <Text style={[styles.targetPriceLabel, { color: colors.textSecondary }]}>
                  Target Price (optional)
                </Text>
                <View style={styles.targetPriceInputRow}>
                  <TextInput
                    style={[styles.targetPriceInput, { backgroundColor: colors.background, color: colors.textPrimary, borderColor: colors.border }]}
                    value={desiredPrice}
                    onChangeText={setDesiredPrice}
                    placeholder="0.00"
                    placeholderTextColor={colors.textTertiary}
                    keyboardType="decimal-pad"
                  />
                  <Text style={[styles.targetPriceCurrency, { color: colors.textPrimary }]}>{currency}</Text>
                </View>
                <Text style={[styles.targetPriceHint, { color: colors.textTertiary }]}>
                  Leave empty to be notified of any price drop (10% threshold)
                </Text>
              </View>
              
              <View style={styles.priceTrackingModalActions}>
                <TouchableOpacity
                  style={[styles.priceTrackingModalButton, { backgroundColor: colors.background, borderColor: colors.border }]}
                  onPress={() => {
                    setDesiredPrice('');
                    setShowPriceTrackingModal(false);
                  }}
                >
                  <Text style={[styles.priceTrackingModalButtonText, { color: colors.textPrimary }]}>
                    Skip
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.priceTrackingModalButton, styles.priceTrackingModalButtonPrimary, { backgroundColor: colors.accent }]}
                  onPress={() => setShowPriceTrackingModal(false)}
                >
                  <Text style={[styles.priceTrackingModalButtonText, { color: colors.textInverse }]}>
                    Done
                  </Text>
                </TouchableOpacity>
              </View>
            </Pressable>
          </Pressable>
        </Modal>

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
                <View>
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
                </View>
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
                    <View style={styles.buttonContent}>
                      <IconSymbol
                        ios_icon_name="photo"
                        android_material_icon_name="image"
                        size={20}
                        color={colors.textInverse}
                      />
                      <Text style={[styles.imageActionText, { color: colors.textInverse }]}>Upload from Gallery</Text>
                    </View>
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
    </React.Fragment>
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
  findMatchesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    padding: spacing.md,
    borderRadius: 12,
    marginBottom: spacing.lg,
  },
  findMatchesText: {
    fontSize: 16,
    fontWeight: '600',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
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
  notesInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  offersLoadingSection: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    marginBottom: spacing.xl,
  },
  offersLoadingText: {
    fontSize: 14,
    marginTop: spacing.md,
  },
  offersSection: {
    marginBottom: spacing.xl,
  },
  offersHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  offersCount: {
    fontSize: 14,
  },
  offerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderRadius: 12,
    borderWidth: 2,
    marginBottom: spacing.sm,
  },
  cheapestOfferCard: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  offerInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  offerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs / 2,
  },
  offerStoreName: {
    fontSize: 16,
    fontWeight: '600',
  },
  cheapestBadge: {
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs / 2,
    borderRadius: 8,
  },
  cheapestBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  offerPrice: {
    fontSize: 18,
    fontWeight: '700',
  },
  openLinkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs / 2,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 20,
  },
  openLinkText: {
    fontSize: 14,
    fontWeight: '600',
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
    marginBottom: spacing.md,
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
  priceTrackingSection: {
    padding: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: spacing.xl,
  },
  priceTrackingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  priceTrackingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  priceTrackingTitle: {
    fontSize: 16,
    fontWeight: '500',
  },
  priceTrackingHint: {
    fontSize: 12,
    marginTop: spacing.sm,
    fontStyle: 'italic',
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
  matchesModalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: spacing.lg,
    maxHeight: '90%',
  },
  priceTrackingModalContent: {
    borderRadius: 16,
    padding: spacing.lg,
    marginHorizontal: spacing.lg,
    maxWidth: 400,
    alignSelf: 'center',
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
    marginBottom: spacing.xs,
  },
  modalSubtitle: {
    fontSize: 14,
    marginBottom: spacing.md,
  },
  loadingMatchesContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  loadingMatchesText: {
    marginTop: spacing.md,
    fontSize: 16,
  },
  matchesList: {
    flex: 1,
  },
  noneOfTheseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  noneOfTheseText: {
    fontSize: 16,
    fontWeight: '500',
  },
  targetPriceInputContainer: {
    marginVertical: spacing.md,
  },
  targetPriceLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: spacing.xs,
  },
  targetPriceInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  targetPriceInput: {
    flex: 1,
    borderRadius: 8,
    padding: spacing.sm,
    fontSize: 16,
    borderWidth: 1,
  },
  targetPriceCurrency: {
    fontSize: 16,
    fontWeight: '600',
  },
  targetPriceHint: {
    fontSize: 12,
    marginTop: spacing.xs,
    fontStyle: 'italic',
  },
  priceTrackingModalActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  priceTrackingModalButton: {
    flex: 1,
    padding: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  priceTrackingModalButtonPrimary: {
    borderWidth: 0,
  },
  priceTrackingModalButtonText: {
    fontSize: 16,
    fontWeight: '600',
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
