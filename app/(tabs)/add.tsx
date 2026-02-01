
import React, { useState, useEffect, useMemo, Fragment, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Platform,
  Image,
  ImageSourcePropType,
  ActivityIndicator,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
  Modal,
  Pressable,
} from 'react-native';
import { useAppTheme } from '@/contexts/ThemeContext';
import * as Clipboard from 'expo-clipboard';
import { StatusBar } from 'expo-status-bar';
import { extractItem, identifyFromImage, searchByName } from '@/utils/supabase-edge-functions';
import { createColors, createTypography, spacing } from '@/styles/designSystem';
import * as Linking from 'expo-linking';
import { IconSymbol } from '@/components/IconSymbol';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import Constants from 'expo-constants';
import { fetchWishlists, fetchUserLocation } from '@/lib/supabase-helpers';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSmartLocation } from '@/contexts/SmartLocationContext';
import { CountrySelector } from '@/components/CountrySelector';
import * as FileSystem from 'expo-file-system/legacy';
import { isEnvironmentConfigured, getConfigurationErrorMessage } from '@/utils/environmentConfig';
import { ConfigurationError } from '@/components/design-system/ConfigurationError';

type ModeType = 'share' | 'url' | 'camera' | 'upload' | 'search' | 'manual';

interface Wishlist {
  id: string;
  name: string;
  isDefault: boolean;
}

interface SearchResult {
  title: string;
  imageUrl: string | null;
  productUrl: string;
  storeDomain: string;
  price: number | null;
  currency: string | null;
  confidence: number;
}

// Helper to resolve image sources (handles both local require() and remote URLs)
function resolveImageSource(source: string | number | ImageSourcePropType | undefined): ImageSourcePropType {
  if (!source) return { uri: '' };
  if (typeof source === 'string') return { uri: source };
  return source as ImageSourcePropType;
}

function isValidUrl(urlString: string): boolean {
  try {
    new URL(urlString);
    return true;
  } catch {
    return false;
  }
}

function extractUrlFromText(text: string): string | null {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const match = text.match(urlRegex);
  return match ? match[0] : null;
}

export default function AddItemScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const { theme } = useAppTheme();
  const colors = createColors(theme);
  const typography = createTypography(theme);
  const router = useRouter();
  const params = useLocalSearchParams();
  const { settings, updateActiveSearchCountry } = useSmartLocation();

  // Check environment configuration
  const [configError, setConfigError] = useState<string | null>(null);

  // Mode selection
  const [selectedMode, setSelectedMode] = useState<ModeType>('share');

  // Wishlist and country selection (always visible at top)
  const [wishlists, setWishlists] = useState<Wishlist[]>([]);
  const [selectedWishlistId, setSelectedWishlistId] = useState('');
  const [selectedCountry, setSelectedCountry] = useState('');
  const [selectedCountryName, setSelectedCountryName] = useState('');
  const [showWishlistPicker, setShowWishlistPicker] = useState(false);

  // Mode 1: Share (instructions only)
  const sharedUrl = params.url as string | undefined;

  // Mode 2: URL
  const [urlInput, setUrlInput] = useState('');
  const [extracting, setExtracting] = useState(false);

  // Mode 3: Camera
  const [cameraImage, setCameraImage] = useState<string | null>(null);
  const [identifyingCamera, setIdentifyingCamera] = useState(false);

  // Mode 4: Upload
  const [uploadImage, setUploadImage] = useState<string | null>(null);
  const [identifyingUpload, setIdentifyingUpload] = useState(false);

  // Mode 5: Search by Name
  const [searchQuery, setSearchQuery] = useState('');
  const [searchBrand, setSearchBrand] = useState('');
  const [searchModel, setSearchModel] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);

  // Mode 6: Manual Entry
  const [manualName, setManualName] = useState('');
  const [manualBrand, setManualBrand] = useState('');
  const [manualNotes, setManualNotes] = useState('');
  const [manualStoreLink, setManualStoreLink] = useState('');
  const [manualPrice, setManualPrice] = useState('');
  const [manualCurrency, setManualCurrency] = useState('USD');
  const [manualImage, setManualImage] = useState<string | null>(null);
  const [savingManual, setSavingManual] = useState(false);
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);

  useEffect(() => {
    if (!user) {
      console.log('[AddItem] No user, redirecting to auth');
      router.replace('/auth');
    }
  }, [user, router]);

  useEffect(() => {
    // Check environment configuration on mount
    if (!isEnvironmentConfigured()) {
      const errorMessage = getConfigurationErrorMessage();
      console.error('[AddItem] Environment not configured:', errorMessage);
      setConfigError(errorMessage);
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchUserWishlists();
    }
  }, [user, fetchUserWishlists]);

  useEffect(() => {
    // Initialize country from SmartLocation settings
    if (settings) {
      setSelectedCountry(settings.activeSearchCountry);
      setSelectedCountryName(settings.activeSearchCountry);
    }
  }, [settings]);

  useEffect(() => {
    // Handle shared URL from other apps
    if (sharedUrl) {
      console.log('[AddItem] Received shared URL:', sharedUrl);
      setUrlInput(sharedUrl);
      setSelectedMode('url');
    }
  }, [sharedUrl]);

  const styles = useMemo(() => createStyles(colors, typography), [colors, typography]);

  const fetchUserWishlists = useCallback(async () => {
    if (!user) return;

    try {
      console.log('[AddItem] Fetching wishlists');
      const data = await fetchWishlists(user.id);
      setWishlists(data);

      // Set default wishlist
      const defaultWishlist = data.find(w => w.isDefault) || data[0];
      if (defaultWishlist) {
        setSelectedWishlistId(defaultWishlist.id);
      }
    } catch (error) {
      console.error('[AddItem] Error fetching wishlists:', error);
    }
  }, [user]);

  const handleCountrySelect = async (country: { countryCode: string; countryName: string }) => {
    console.log('[AddItem] User selected country:', country.countryCode);
    setSelectedCountry(country.countryCode);
    setSelectedCountryName(country.countryName);

    // Update active_search_country in settings
    try {
      await updateActiveSearchCountry(country.countryCode);
    } catch (error) {
      console.error('[AddItem] Failed to update active search country:', error);
    }
  };

  const handleRetryConfiguration = () => {
    console.log('[AddItem] User tapped Retry Configuration');
    // Check configuration again
    if (isEnvironmentConfigured()) {
      setConfigError(null);
    } else {
      const errorMessage = getConfigurationErrorMessage();
      setConfigError(errorMessage);
    }
  };

  // Mode 2: Extract from URL
  const handleExtractUrl = async () => {
    if (!urlInput.trim()) {
      Alert.alert('Missing URL', 'Please enter a product URL');
      return;
    }

    if (!isValidUrl(urlInput.trim())) {
      Alert.alert('Invalid URL', 'Please enter a valid URL starting with http:// or https://');
      return;
    }

    if (!selectedCountry) {
      Alert.alert('Country Required', 'Please select a delivery country first');
      return;
    }

    // Check configuration before making API call
    if (!isEnvironmentConfigured()) {
      Alert.alert('Configuration Error', getConfigurationErrorMessage());
      return;
    }

    console.log('[AddItem] Extracting item from URL:', urlInput);
    setExtracting(true);

    try {
      const result = await extractItem(urlInput.trim(), selectedCountry);
      console.log('[AddItem] Extraction result:', result);

      // Navigate to import preview with extracted data
      const productData = {
        itemName: result.title || '',
        imageUrl: result.images?.[0] || '',
        extractedImages: result.images || [],
        storeName: '',
        storeDomain: result.sourceDomain || '',
        price: result.price || null,
        currency: result.currency || 'USD',
        countryAvailability: [selectedCountry],
        sourceUrl: urlInput.trim(),
        inputType: 'url',
      };

      router.push({
        pathname: '/import-preview',
        params: {
          data: JSON.stringify(productData),
        },
      });
    } catch (error: any) {
      console.error('[AddItem] Error extracting item:', error);
      Alert.alert('Extraction Failed', error.message || 'Failed to extract product information. You can still add it manually.');
    } finally {
      setExtracting(false);
    }
  };

  // Mode 3: Camera
  const handleTakePhoto = async () => {
    console.log('[AddItem] User tapped Take Photo');

    // Check permission status first
    const { status: currentStatus } = await ImagePicker.getCameraPermissionsAsync();

    if (currentStatus === 'undetermined') {
      // Show pre-permission screen
      router.push('/permissions/camera');
      return;
    }

    if (currentStatus !== 'granted') {
      // Permission was denied, show settings prompt
      Alert.alert(
        'Camera Permission Required',
        'Camera access is required to take photos of products. Please enable it in Settings.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: () => Linking.openSettings() },
        ]
      );
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
      base64: true,
    });

    if (!result.canceled && result.assets[0]) {
      setCameraImage(result.assets[0].uri);
      console.log('[AddItem] Photo taken:', result.assets[0].uri);
    }
  };

  const handleIdentifyFromCamera = async () => {
    if (!cameraImage) {
      Alert.alert('No Photo', 'Please take a photo first');
      return;
    }

    if (!selectedCountry) {
      Alert.alert('Country Required', 'Please select a delivery country first');
      return;
    }

    // Check configuration before making API call
    if (!isEnvironmentConfigured()) {
      Alert.alert('Configuration Error', getConfigurationErrorMessage());
      return;
    }

    console.log('[AddItem] Identifying product from camera image');
    setIdentifyingCamera(true);

    try {
      // Convert image to base64
      const base64 = await FileSystem.readAsStringAsync(cameraImage, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const result = await identifyFromImage(undefined, base64);
      console.log('[AddItem] Identification result:', result);

      // Navigate to confirm/preview screen
      const productData = {
        itemName: result.bestGuessTitle || '',
        imageUrl: cameraImage,
        extractedImages: [cameraImage],
        storeName: '',
        storeDomain: '',
        price: null,
        currency: 'USD',
        countryAvailability: [selectedCountry],
        sourceUrl: '',
        inputType: 'camera',
      };

      router.push({
        pathname: '/import-preview',
        params: {
          data: JSON.stringify(productData),
        },
      });
    } catch (error: any) {
      console.error('[AddItem] Error identifying product:', error);
      Alert.alert('Identification Failed', error.message || 'Failed to identify product. You can still add it manually.');
    } finally {
      setIdentifyingCamera(false);
    }
  };

  // Mode 4: Upload
  const handleUploadImage = async () => {
    console.log('[AddItem] User tapped Upload Image');

    // Check permission status first
    const { status: currentStatus } = await ImagePicker.getMediaLibraryPermissionsAsync();

    if (currentStatus === 'undetermined') {
      // Show pre-permission screen
      router.push('/permissions/photos');
      return;
    }

    if (currentStatus !== 'granted') {
      // Permission was denied, show settings prompt
      Alert.alert(
        'Photo Library Permission Required',
        'Photo library access is required to select images. Please enable it in Settings.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: () => Linking.openSettings() },
        ]
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
      base64: true,
    });

    if (!result.canceled && result.assets[0]) {
      setUploadImage(result.assets[0].uri);
      console.log('[AddItem] Image uploaded:', result.assets[0].uri);
    }
  };

  const handleIdentifyFromUpload = async () => {
    if (!uploadImage) {
      Alert.alert('No Image', 'Please upload an image first');
      return;
    }

    if (!selectedCountry) {
      Alert.alert('Country Required', 'Please select a delivery country first');
      return;
    }

    // Check configuration before making API call
    if (!isEnvironmentConfigured()) {
      Alert.alert('Configuration Error', getConfigurationErrorMessage());
      return;
    }

    console.log('[AddItem] Identifying product from uploaded image');
    setIdentifyingUpload(true);

    try {
      // Convert image to base64
      const base64 = await FileSystem.readAsStringAsync(uploadImage, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const result = await identifyFromImage(undefined, base64);
      console.log('[AddItem] Identification result:', result);

      // Navigate to confirm/preview screen
      const productData = {
        itemName: result.bestGuessTitle || '',
        imageUrl: uploadImage,
        extractedImages: [uploadImage],
        storeName: '',
        storeDomain: '',
        price: null,
        currency: 'USD',
        countryAvailability: [selectedCountry],
        sourceUrl: '',
        inputType: 'image',
      };

      router.push({
        pathname: '/import-preview',
        params: {
          data: JSON.stringify(productData),
        },
      });
    } catch (error: any) {
      console.error('[AddItem] Error identifying product:', error);
      Alert.alert('Identification Failed', error.message || 'Failed to identify product. You can still add it manually.');
    } finally {
      setIdentifyingUpload(false);
    }
  };

  // Mode 5: Search by Name
  const handleSearchByName = async () => {
    if (!searchQuery.trim()) {
      Alert.alert('Missing Query', 'Please enter a product name');
      return;
    }

    if (!selectedCountry) {
      Alert.alert('Country Required', 'Please select a delivery country first');
      return;
    }

    // Check configuration before making API call
    if (!isEnvironmentConfigured()) {
      Alert.alert('Configuration Error', getConfigurationErrorMessage());
      return;
    }

    console.log('[AddItem] Searching for:', searchQuery);
    setSearching(true);

    try {
      const result = await searchByName(searchQuery.trim(), {
        countryCode: selectedCountry,
      });
      console.log('[AddItem] Search results:', result);

      if (result.results && result.results.length > 0) {
        setSearchResults(result.results);
        setShowSearchResults(true);
      } else {
        Alert.alert('No Results', 'No products found. Try a different search or add manually.');
      }
    } catch (error: any) {
      console.error('[AddItem] Error searching:', error);
      Alert.alert('Search Failed', error.message || 'Failed to search for products. You can still add it manually.');
    } finally {
      setSearching(false);
    }
  };

  const handleSelectSearchResult = (result: SearchResult) => {
    console.log('[AddItem] User selected search result:', result.title);
    setShowSearchResults(false);

    // Navigate to confirm/preview screen
    const productData = {
      itemName: result.title,
      imageUrl: result.imageUrl || '',
      extractedImages: result.imageUrl ? [result.imageUrl] : [],
      storeName: '',
      storeDomain: result.storeDomain,
      price: result.price,
      currency: result.currency || 'USD',
      countryAvailability: [selectedCountry],
      sourceUrl: result.productUrl,
      inputType: 'name',
    };

    router.push({
      pathname: '/import-preview',
      params: {
        data: JSON.stringify(productData),
      },
    });
  };

  // Mode 6: Manual Entry
  const handleManualImagePick = async () => {
    console.log('[AddItem] User tapped Pick Image for Manual Entry');

    const { status } = await ImagePicker.getMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      const { status: newStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (newStatus !== 'granted') {
        Alert.alert('Permission Required', 'Photo library access is required to select images');
        return;
      }
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setManualImage(result.assets[0].uri);
      console.log('[AddItem] Manual image selected:', result.assets[0].uri);
    }
  };

  const handleSaveManual = async () => {
    if (!manualName.trim()) {
      Alert.alert('Missing Name', 'Please enter an item name');
      return;
    }

    if (!selectedWishlistId) {
      Alert.alert('No Wishlist Selected', 'Please select a wishlist');
      return;
    }

    console.log('[AddItem] Saving manual entry');
    setSavingManual(true);

    try {
      // Navigate to import preview with manual data
      const productData = {
        itemName: manualName.trim(),
        imageUrl: manualImage || '',
        extractedImages: manualImage ? [manualImage] : [],
        storeName: '',
        storeDomain: '',
        price: manualPrice ? parseFloat(manualPrice) : null,
        currency: manualCurrency,
        countryAvailability: selectedCountry ? [selectedCountry] : [],
        sourceUrl: manualStoreLink.trim() || '',
        notes: manualNotes.trim() || '',
        inputType: 'manual',
      };

      router.push({
        pathname: '/import-preview',
        params: {
          data: JSON.stringify(productData),
        },
      });
    } catch (error: any) {
      console.error('[AddItem] Error saving manual entry:', error);
      Alert.alert('Error', 'Failed to save item. Please try again.');
    } finally {
      setSavingManual(false);
    }
  };

  // Show configuration error UI if environment is not configured
  if (configError) {
    return (
      <>
        <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
        <ConfigurationError message={configError} onRetry={handleRetryConfiguration} />
      </>
    );
  }

  const renderShareMode = () => {
    const deepLinkUrl = Linking.createURL('add');

    return (
      <View style={styles.modeContent}>
        <View style={styles.instructionsCard}>
          <IconSymbol
            ios_icon_name="square.and.arrow.up"
            android_material_icon_name="share"
            size={64}
            color={colors.accent}
          />
          <Text style={[styles.instructionsTitle, { color: colors.textPrimary }]}>
            Share from any app
          </Text>
          <Text style={[styles.instructionsText, { color: colors.textSecondary }]}>
            1. Open any shopping app or website{'\n'}
            2. Tap the Share button{'\n'}
            3. Select "My Wishlist"{'\n'}
            4. We'll extract the product details automatically
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.storesNearMeButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={() => router.push('/stores-near-me')}
        >
          <View style={styles.storesNearMeContent}>
            <IconSymbol
              ios_icon_name="map"
              android_material_icon_name="store"
              size={24}
              color={colors.accent}
            />
            <View style={styles.storesNearMeText}>
              <Text style={[styles.storesNearMeTitle, { color: colors.textPrimary }]}>
                Scan Stores Near Me
              </Text>
              <Text style={[styles.storesNearMeSubtitle, { color: colors.textSecondary }]}>
                Find stores that deliver to your location
              </Text>
            </View>
          </View>
          <IconSymbol
            ios_icon_name="chevron.right"
            android_material_icon_name="chevron-right"
            size={20}
            color={colors.textTertiary}
          />
        </TouchableOpacity>

        <View style={[styles.infoCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <IconSymbol
            ios_icon_name="info.circle"
            android_material_icon_name="info"
            size={20}
            color={colors.accent}
          />
          <Text style={[styles.infoText, { color: colors.textSecondary }]}>
            If the app receives a shared link, it will automatically open Add Item with the URL prefilled.
          </Text>
        </View>
      </View>
    );
  };

  const renderUrlMode = () => (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.modeContent}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.modeInner}>
          <Text style={[styles.modeTitle, { color: colors.textPrimary }]}>Paste Product URL</Text>
          <Text style={[styles.modeSubtitle, { color: colors.textSecondary }]}>
            Copy a product link from any website and paste it here
          </Text>

          <TextInput
            style={[styles.urlInput, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.border }]}
            value={urlInput}
            onChangeText={setUrlInput}
            placeholder="https://example.com/product"
            placeholderTextColor={colors.textTertiary}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            multiline
          />

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.accent }, extracting && styles.actionButtonDisabled]}
            onPress={handleExtractUrl}
            disabled={extracting}
          >
            {extracting ? (
              <ActivityIndicator size="small" color={colors.textInverse} />
            ) : (
              <Fragment>
                <IconSymbol
                  ios_icon_name="wand.and.stars"
                  android_material_icon_name="auto-fix-high"
                  size={20}
                  color={colors.textInverse}
                />
                <Text style={[styles.actionButtonText, { color: colors.textInverse }]}>Extract Item Details</Text>
              </Fragment>
            )}
          </TouchableOpacity>

          <View style={[styles.infoCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <IconSymbol
              ios_icon_name="info.circle"
              android_material_icon_name="info"
              size={20}
              color={colors.accent}
            />
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>
              After extraction, you'll be able to review and edit all details before saving.
            </Text>
          </View>
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );

  const renderCameraMode = () => (
    <View style={styles.modeContent}>
      <Text style={[styles.modeTitle, { color: colors.textPrimary }]}>Take a Photo</Text>
      <Text style={[styles.modeSubtitle, { color: colors.textSecondary }]}>
        Take a photo of the product and we'll identify it
      </Text>

      {cameraImage ? (
        <View style={styles.imagePreview}>
          <Image
            source={resolveImageSource(cameraImage)}
            style={styles.previewImage}
            resizeMode="contain"
          />
          <TouchableOpacity
            style={styles.removeImageButton}
            onPress={() => setCameraImage(null)}
          >
            <IconSymbol
              ios_icon_name="xmark.circle.fill"
              android_material_icon_name="cancel"
              size={32}
              color={colors.error}
            />
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity
          style={[styles.uploadArea, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={handleTakePhoto}
        >
          <IconSymbol
            ios_icon_name="camera"
            android_material_icon_name="camera"
            size={64}
            color={colors.accent}
          />
          <Text style={[styles.uploadText, { color: colors.accent }]}>Take Photo</Text>
        </TouchableOpacity>
      )}

      {cameraImage && (
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: colors.accent }, identifyingCamera && styles.actionButtonDisabled]}
          onPress={handleIdentifyFromCamera}
          disabled={identifyingCamera}
        >
          {identifyingCamera ? (
            <ActivityIndicator size="small" color={colors.textInverse} />
          ) : (
            <Fragment>
              <IconSymbol
                ios_icon_name="sparkles"
                android_material_icon_name="auto-fix-high"
                size={20}
                color={colors.textInverse}
              />
              <Text style={[styles.actionButtonText, { color: colors.textInverse }]}>Identify Product</Text>
            </Fragment>
          )}
        </TouchableOpacity>
      )}

      <View style={[styles.infoCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <IconSymbol
          ios_icon_name="info.circle"
          android_material_icon_name="info"
          size={20}
          color={colors.accent}
        />
        <Text style={[styles.infoText, { color: colors.textSecondary }]}>
          After identification, you'll be able to review and edit all details before saving.
        </Text>
      </View>
    </View>
  );

  const renderUploadMode = () => (
    <View style={styles.modeContent}>
      <Text style={[styles.modeTitle, { color: colors.textPrimary }]}>Upload Image</Text>
      <Text style={[styles.modeSubtitle, { color: colors.textSecondary }]}>
        Upload a product image from your gallery
      </Text>

      {uploadImage ? (
        <View style={styles.imagePreview}>
          <Image
            source={resolveImageSource(uploadImage)}
            style={styles.previewImage}
            resizeMode="contain"
          />
          <TouchableOpacity
            style={styles.removeImageButton}
            onPress={() => setUploadImage(null)}
          >
            <IconSymbol
              ios_icon_name="xmark.circle.fill"
              android_material_icon_name="cancel"
              size={32}
              color={colors.error}
            />
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity
          style={[styles.uploadArea, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={handleUploadImage}
        >
          <IconSymbol
            ios_icon_name="photo"
            android_material_icon_name="image"
            size={64}
            color={colors.accent}
          />
          <Text style={[styles.uploadText, { color: colors.accent }]}>Choose from Gallery</Text>
        </TouchableOpacity>
      )}

      {uploadImage && (
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: colors.accent }, identifyingUpload && styles.actionButtonDisabled]}
          onPress={handleIdentifyFromUpload}
          disabled={identifyingUpload}
        >
          {identifyingUpload ? (
            <ActivityIndicator size="small" color={colors.textInverse} />
          ) : (
            <Fragment>
              <IconSymbol
                ios_icon_name="sparkles"
                android_material_icon_name="auto-fix-high"
                size={20}
                color={colors.textInverse}
              />
              <Text style={[styles.actionButtonText, { color: colors.textInverse }]}>Identify Product</Text>
            </Fragment>
          )}
        </TouchableOpacity>
      )}

      <View style={[styles.infoCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <IconSymbol
          ios_icon_name="info.circle"
          android_material_icon_name="info"
          size={20}
          color={colors.accent}
        />
        <Text style={[styles.infoText, { color: colors.textSecondary }]}>
          After identification, you'll be able to review and edit all details before saving.
        </Text>
      </View>
    </View>
  );

  const renderSearchMode = () => (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.modeContent}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.modeInner}>
          <Text style={[styles.modeTitle, { color: colors.textPrimary }]}>Search by Name</Text>
          <Text style={[styles.modeSubtitle, { color: colors.textSecondary }]}>
            Enter the product name and optional details
          </Text>

          <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Product Name *</Text>
          <TextInput
            style={[styles.textInput, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.border }]}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="e.g., iPhone 15 Pro"
            placeholderTextColor={colors.textTertiary}
          />

          <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Brand (optional)</Text>
          <TextInput
            style={[styles.textInput, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.border }]}
            value={searchBrand}
            onChangeText={setSearchBrand}
            placeholder="e.g., Apple"
            placeholderTextColor={colors.textTertiary}
          />

          <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Model (optional)</Text>
          <TextInput
            style={[styles.textInput, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.border }]}
            value={searchModel}
            onChangeText={setSearchModel}
            placeholder="e.g., 256GB"
            placeholderTextColor={colors.textTertiary}
          />

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.accent }, searching && styles.actionButtonDisabled]}
            onPress={handleSearchByName}
            disabled={searching}
          >
            {searching ? (
              <ActivityIndicator size="small" color={colors.textInverse} />
            ) : (
              <Fragment>
                <IconSymbol
                  ios_icon_name="magnifyingglass"
                  android_material_icon_name="search"
                  size={20}
                  color={colors.textInverse}
                />
                <Text style={[styles.actionButtonText, { color: colors.textInverse }]}>Search</Text>
              </Fragment>
            )}
          </TouchableOpacity>

          <View style={[styles.infoCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <IconSymbol
              ios_icon_name="info.circle"
              android_material_icon_name="info"
              size={20}
              color={colors.accent}
            />
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>
              Search respects your "Deliver to" country. Select a result to review before saving.
            </Text>
          </View>
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );

  const renderManualMode = () => (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.modeContent}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.modeInner}>
          <Text style={[styles.modeTitle, { color: colors.textPrimary }]}>Manual Entry</Text>
          <Text style={[styles.modeSubtitle, { color: colors.textSecondary }]}>
            Add all details manually
          </Text>

          <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Name *</Text>
          <TextInput
            style={[styles.textInput, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.border }]}
            value={manualName}
            onChangeText={setManualName}
            placeholder="Product name"
            placeholderTextColor={colors.textTertiary}
          />

          <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Brand (optional)</Text>
          <TextInput
            style={[styles.textInput, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.border }]}
            value={manualBrand}
            onChangeText={setManualBrand}
            placeholder="Brand name"
            placeholderTextColor={colors.textTertiary}
          />

          <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Store Link (optional)</Text>
          <TextInput
            style={[styles.textInput, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.border }]}
            value={manualStoreLink}
            onChangeText={setManualStoreLink}
            placeholder="https://..."
            placeholderTextColor={colors.textTertiary}
            autoCapitalize="none"
            keyboardType="url"
          />

          <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Price & Currency (optional)</Text>
          <View style={styles.priceRow}>
            <TextInput
              style={[styles.textInput, styles.priceInput, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.border }]}
              value={manualPrice}
              onChangeText={setManualPrice}
              placeholder="0.00"
              placeholderTextColor={colors.textTertiary}
              keyboardType="decimal-pad"
            />
            <TouchableOpacity
              style={[styles.currencyButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => setShowCurrencyPicker(true)}
            >
              <Text style={[styles.currencyText, { color: colors.textPrimary }]}>{manualCurrency}</Text>
              <IconSymbol
                ios_icon_name="chevron.down"
                android_material_icon_name="arrow-drop-down"
                size={16}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
          </View>

          <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Image (optional)</Text>
          {manualImage ? (
            <View style={styles.imagePreview}>
              <Image
                source={resolveImageSource(manualImage)}
                style={styles.previewImage}
                resizeMode="contain"
              />
              <TouchableOpacity
                style={styles.removeImageButton}
                onPress={() => setManualImage(null)}
              >
                <IconSymbol
                  ios_icon_name="xmark.circle.fill"
                  android_material_icon_name="cancel"
                  size={32}
                  color={colors.error}
                />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.uploadArea, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={handleManualImagePick}
            >
              <IconSymbol
                ios_icon_name="photo"
                android_material_icon_name="image"
                size={48}
                color={colors.accent}
              />
              <Text style={[styles.uploadText, { color: colors.accent }]}>Add Image</Text>
            </TouchableOpacity>
          )}

          <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Notes (optional)</Text>
          <TextInput
            style={[styles.textInput, styles.notesInput, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.border }]}
            value={manualNotes}
            onChangeText={setManualNotes}
            placeholder="Add any notes"
            placeholderTextColor={colors.textTertiary}
            multiline
            numberOfLines={3}
          />

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.accent }, savingManual && styles.actionButtonDisabled]}
            onPress={handleSaveManual}
            disabled={savingManual}
          >
            {savingManual ? (
              <ActivityIndicator size="small" color={colors.textInverse} />
            ) : (
              <Fragment>
                <IconSymbol
                  ios_icon_name="checkmark"
                  android_material_icon_name="check"
                  size={20}
                  color={colors.textInverse}
                />
                <Text style={[styles.actionButtonText, { color: colors.textInverse }]}>Continue to Preview</Text>
              </Fragment>
            )}
          </TouchableOpacity>

          <View style={[styles.infoCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <IconSymbol
              ios_icon_name="info.circle"
              android_material_icon_name="info"
              size={20}
              color={colors.accent}
            />
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>
              You can save manually even if AI extraction fails. All fields are editable before final save.
            </Text>
          </View>
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );

  const selectedWishlist = wishlists.find(w => w.id === selectedWishlistId);
  const selectedWishlistName = selectedWishlist?.name || 'Select wishlist';
  const currencies = ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD'];

  return (
    <>
      <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        {/* Always-visible header with Wishlist and Country */}
        <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
          <View style={styles.headerRow}>
            <View style={styles.headerItem}>
              <Text style={[styles.headerLabel, { color: colors.textSecondary }]}>Add to:</Text>
              <TouchableOpacity
                style={[styles.headerButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={() => setShowWishlistPicker(true)}
              >
                <Text style={[styles.headerButtonText, { color: colors.textPrimary }]} numberOfLines={1}>
                  {selectedWishlistName}
                </Text>
                <IconSymbol
                  ios_icon_name="chevron.down"
                  android_material_icon_name="arrow-drop-down"
                  size={16}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.headerRow}>
            <View style={[styles.headerItem, { flex: 1 }]}>
              <CountrySelector
                label="Deliver to:"
                selectedCountryCode={selectedCountry}
                selectedCountryName={selectedCountryName}
                onSelect={handleCountrySelect}
              />
            </View>
          </View>
        </View>

        {/* Mode Tabs */}
        <View style={[styles.tabBar, { borderBottomColor: colors.border }]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabScrollContent}>
            <TouchableOpacity
              style={[styles.tab, selectedMode === 'share' && { borderBottomColor: colors.accent }]}
              onPress={() => setSelectedMode('share')}
            >
              <IconSymbol
                ios_icon_name="square.and.arrow.up"
                android_material_icon_name="share"
                size={20}
                color={selectedMode === 'share' ? colors.accent : colors.textSecondary}
              />
              <Text style={[styles.tabText, { color: selectedMode === 'share' ? colors.accent : colors.textSecondary }]}>
                Share
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tab, selectedMode === 'url' && { borderBottomColor: colors.accent }]}
              onPress={() => setSelectedMode('url')}
            >
              <IconSymbol
                ios_icon_name="link"
                android_material_icon_name="link"
                size={20}
                color={selectedMode === 'url' ? colors.accent : colors.textSecondary}
              />
              <Text style={[styles.tabText, { color: selectedMode === 'url' ? colors.accent : colors.textSecondary }]}>
                URL
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tab, selectedMode === 'camera' && { borderBottomColor: colors.accent }]}
              onPress={() => setSelectedMode('camera')}
            >
              <IconSymbol
                ios_icon_name="camera"
                android_material_icon_name="camera"
                size={20}
                color={selectedMode === 'camera' ? colors.accent : colors.textSecondary}
              />
              <Text style={[styles.tabText, { color: selectedMode === 'camera' ? colors.accent : colors.textSecondary }]}>
                Camera
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tab, selectedMode === 'upload' && { borderBottomColor: colors.accent }]}
              onPress={() => setSelectedMode('upload')}
            >
              <IconSymbol
                ios_icon_name="photo"
                android_material_icon_name="image"
                size={20}
                color={selectedMode === 'upload' ? colors.accent : colors.textSecondary}
              />
              <Text style={[styles.tabText, { color: selectedMode === 'upload' ? colors.accent : colors.textSecondary }]}>
                Upload
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tab, selectedMode === 'search' && { borderBottomColor: colors.accent }]}
              onPress={() => setSelectedMode('search')}
            >
              <IconSymbol
                ios_icon_name="magnifyingglass"
                android_material_icon_name="search"
                size={20}
                color={selectedMode === 'search' ? colors.accent : colors.textSecondary}
              />
              <Text style={[styles.tabText, { color: selectedMode === 'search' ? colors.accent : colors.textSecondary }]}>
                Search
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tab, selectedMode === 'manual' && { borderBottomColor: colors.accent }]}
              onPress={() => setSelectedMode('manual')}
            >
              <IconSymbol
                ios_icon_name="pencil"
                android_material_icon_name="edit"
                size={20}
                color={selectedMode === 'manual' ? colors.accent : colors.textSecondary}
              />
              <Text style={[styles.tabText, { color: selectedMode === 'manual' ? colors.accent : colors.textSecondary }]}>
                Manual
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* Mode Content */}
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          {selectedMode === 'share' && renderShareMode()}
          {selectedMode === 'url' && renderUrlMode()}
          {selectedMode === 'camera' && renderCameraMode()}
          {selectedMode === 'upload' && renderUploadMode()}
          {selectedMode === 'search' && renderSearchMode()}
          {selectedMode === 'manual' && renderManualMode()}
        </ScrollView>

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
                      { backgroundColor: manualCurrency === curr ? colors.accentLight : 'transparent' },
                    ]}
                    onPress={() => {
                      setManualCurrency(curr);
                      setShowCurrencyPicker(false);
                    }}
                  >
                    <Text style={[styles.pickerOptionText, { color: colors.textPrimary }]}>{curr}</Text>
                    {manualCurrency === curr && (
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

        {/* Search Results Modal */}
        <Modal
          visible={showSearchResults}
          transparent
          animationType="slide"
          onRequestClose={() => setShowSearchResults(false)}
        >
          <Pressable style={styles.modalOverlay} onPress={() => setShowSearchResults(false)}>
            <Pressable style={[styles.resultsModal, { backgroundColor: colors.surface }]} onPress={(e) => e.stopPropagation()}>
              <View style={styles.modalHandle} />
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Search Results</Text>

              <ScrollView style={styles.resultsList}>
                {searchResults.map((result, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[styles.resultCard, { backgroundColor: colors.background, borderColor: colors.border }]}
                    onPress={() => handleSelectSearchResult(result)}
                  >
                    {result.imageUrl && (
                      <Image
                        source={resolveImageSource(result.imageUrl)}
                        style={styles.resultImage}
                        resizeMode="cover"
                      />
                    )}
                    <View style={styles.resultInfo}>
                      <Text style={[styles.resultTitle, { color: colors.textPrimary }]} numberOfLines={2}>
                        {result.title}
                      </Text>
                      <Text style={[styles.resultDomain, { color: colors.textSecondary }]}>
                        {result.storeDomain}
                      </Text>
                      {result.price && (
                        <Text style={[styles.resultPrice, { color: colors.accent }]}>
                          {result.currency} {result.price.toFixed(2)}
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
              </ScrollView>
            </Pressable>
          </Pressable>
        </Modal>
      </SafeAreaView>
    </>
  );
}

function createStyles(colors: ReturnType<typeof createColors>, typography: ReturnType<typeof createTypography>) {
  return StyleSheet.create({
    container: {
      flex: 1,
    },
    header: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderBottomWidth: 1,
    },
    headerRow: {
      flexDirection: 'row',
      gap: spacing.sm,
      marginBottom: spacing.sm,
    },
    headerItem: {
      flex: 1,
    },
    headerLabel: {
      fontSize: 12,
      fontWeight: '500',
      marginBottom: spacing.xs / 2,
    },
    headerButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: spacing.xs,
      paddingHorizontal: spacing.sm,
      borderRadius: 8,
      borderWidth: 1,
    },
    headerButtonText: {
      fontSize: 14,
      flex: 1,
      marginRight: spacing.xs,
    },
    tabBar: {
      borderBottomWidth: 1,
    },
    tabScrollContent: {
      paddingHorizontal: spacing.sm,
      gap: spacing.xs,
    },
    tab: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      borderBottomWidth: 3,
      borderBottomColor: 'transparent',
    },
    tabText: {
      fontSize: 14,
      fontWeight: '500',
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      padding: spacing.lg,
    },
    modeContent: {
      flex: 1,
    },
    modeInner: {
      flex: 1,
    },
    modeTitle: {
      fontSize: 24,
      fontWeight: '600',
      marginBottom: spacing.xs,
    },
    modeSubtitle: {
      fontSize: 14,
      marginBottom: spacing.lg,
    },
    instructionsCard: {
      alignItems: 'center',
      padding: spacing.xl,
      marginBottom: spacing.lg,
    },
    instructionsTitle: {
      fontSize: 20,
      fontWeight: '600',
      marginTop: spacing.md,
      marginBottom: spacing.sm,
    },
    instructionsText: {
      fontSize: 14,
      textAlign: 'center',
      lineHeight: 22,
    },
    infoCard: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.sm,
      padding: spacing.md,
      borderRadius: 12,
      borderWidth: 1,
      marginTop: spacing.md,
    },
    infoText: {
      fontSize: 13,
      flex: 1,
      lineHeight: 18,
    },
    urlInput: {
      borderRadius: 12,
      padding: spacing.md,
      fontSize: 16,
      borderWidth: 1,
      minHeight: 100,
      textAlignVertical: 'top',
      marginBottom: spacing.lg,
    },
    inputLabel: {
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
    imagePreview: {
      width: '100%',
      height: 250,
      borderRadius: 12,
      marginBottom: spacing.lg,
      position: 'relative',
    },
    previewImage: {
      width: '100%',
      height: '100%',
      borderRadius: 12,
    },
    removeImageButton: {
      position: 'absolute',
      top: spacing.sm,
      right: spacing.sm,
    },
    uploadArea: {
      alignItems: 'center',
      justifyContent: 'center',
      padding: spacing.xl,
      borderRadius: 12,
      borderWidth: 2,
      borderStyle: 'dashed',
      marginBottom: spacing.lg,
      minHeight: 200,
    },
    uploadText: {
      fontSize: 16,
      fontWeight: '500',
      marginTop: spacing.sm,
    },
    actionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.xs,
      padding: spacing.md,
      borderRadius: 12,
      marginTop: spacing.md,
    },
    actionButtonDisabled: {
      opacity: 0.5,
    },
    actionButtonText: {
      fontSize: 16,
      fontWeight: '600',
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'flex-end',
    },
    pickerModal: {
      marginHorizontal: spacing.lg,
      marginVertical: 'auto',
      borderRadius: 16,
      padding: spacing.lg,
      maxHeight: '60%',
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: '600',
      marginBottom: spacing.md,
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
    resultsModal: {
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
    resultsList: {
      flex: 1,
    },
    resultCard: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: spacing.sm,
      borderRadius: 12,
      marginBottom: spacing.sm,
      borderWidth: 1,
    },
    resultImage: {
      width: 60,
      height: 60,
      borderRadius: 8,
      marginRight: spacing.sm,
    },
    resultInfo: {
      flex: 1,
    },
    resultTitle: {
      fontSize: 14,
      fontWeight: '500',
      marginBottom: spacing.xs / 2,
    },
    resultDomain: {
      fontSize: 12,
      marginBottom: spacing.xs / 2,
    },
    resultPrice: {
      fontSize: 14,
      fontWeight: '600',
    },
    storesNearMeButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: spacing.md,
      borderRadius: 12,
      borderWidth: 1,
      marginBottom: spacing.md,
    },
    storesNearMeContent: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      flex: 1,
    },
    storesNearMeText: {
      flex: 1,
    },
    storesNearMeTitle: {
      fontSize: 16,
      fontWeight: '600',
      marginBottom: spacing.xs / 2,
    },
    storesNearMeSubtitle: {
      fontSize: 13,
    },
  });
}
