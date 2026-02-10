
import { useAuth } from '@/contexts/AuthContext';
import { useAppTheme } from '@/contexts/ThemeContext';
import { ConfigurationError } from '@/components/design-system/ConfigurationError';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSmartLocation } from '@/contexts/SmartLocationContext';
import { fetchWishlists } from '@/lib/supabase-helpers';
import * as Clipboard from 'expo-clipboard';
import { IconSymbol } from '@/components/IconSymbol';
import { extractItem, identifyProductFromImage, searchByName } from '@/utils/supabase-edge-functions';
import { takePhoto, pickFromLibrary } from '@/src/lib/imageCapture';
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
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { createColors, createTypography, spacing } from '@/styles/designSystem';
import { isEnvironmentConfigured, getConfigurationErrorMessage } from '@/utils/environmentConfig';
import * as Linking from 'expo-linking';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';

type ModeType = 'share' | 'url' | 'camera' | 'upload' | 'search';

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

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 100,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 16,
    opacity: 0.7,
  },
  modeSelector: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  modeButton: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  modeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: spacing.xs,
  },
  content: {
    paddingHorizontal: spacing.lg,
  },
  inputContainer: {
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: 16,
    minHeight: 50,
  },
  button: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
    borderWidth: 2,
  },
  imagePreview: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginBottom: spacing.md,
  },
  loadingContainer: {
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: 16,
    textAlign: 'center',
  },
  resultCard: {
    padding: spacing.lg,
    borderRadius: 12,
    marginBottom: spacing.md,
    borderWidth: 1,
  },
  resultTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  resultLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  resultValue: {
    fontSize: 14,
    marginBottom: spacing.sm,
  },
  labelChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 8,
    marginRight: spacing.xs,
    marginBottom: spacing.xs,
  },
  labelChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  labelsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: spacing.xs,
  },
  searchResultsContainer: {
    marginTop: spacing.md,
  },
  searchResultItem: {
    flexDirection: 'row',
    padding: spacing.md,
    borderRadius: 12,
    marginBottom: spacing.md,
    borderWidth: 1,
  },
  searchResultImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: spacing.md,
  },
  searchResultInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  searchResultTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  searchResultStore: {
    fontSize: 14,
    opacity: 0.7,
    marginBottom: spacing.xs,
  },
  searchResultPrice: {
    fontSize: 14,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '85%',
    maxWidth: 400,
    borderRadius: 16,
    padding: spacing.lg,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  modalText: {
    fontSize: 16,
    marginBottom: spacing.lg,
    textAlign: 'center',
    lineHeight: 24,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  modalButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

function resolveImageSource(source: string | number | ImageSourcePropType | undefined): ImageSourcePropType {
  if (!source) return { uri: '' };
  if (typeof source === 'string') return { uri: source };
  return source as ImageSourcePropType;
}

function isValidUrl(urlString: string): boolean {
  try {
    const url = new URL(urlString);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export default function AddItemScreen() {
  const { user, authLoading } = useAuth();
  const { theme } = useAppTheme();
  const colors = useMemo(() => createColors(theme), [theme]);
  const typography = useMemo(() => createTypography(theme), [theme]);
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const { userLocation } = useSmartLocation();

  const [mode, setMode] = useState<ModeType>('url');
  const [url, setUrl] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [identificationResult, setIdentificationResult] = useState<{
    brand?: string;
    productName?: string;
    labels: string[];
    confidence?: number;
  } | null>(null);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [wishlists, setWishlists] = useState<Wishlist[]>([]);
  const [showAuthModal, setShowAuthModal] = useState(false);

  const isConfigured = isEnvironmentConfigured();

  // Load wishlists on mount
  useEffect(() => {
    if (user) {
      loadWishlists();
    }
  }, [user]);

  const loadWishlists = async () => {
    if (!user) return;
    try {
      const lists = await fetchWishlists(user.id);
      setWishlists(lists);
    } catch (error) {
      console.error('[AddScreen] Failed to load wishlists:', error);
    }
  };

  // Handle shared URL from params
  useFocusEffect(
    useCallback(() => {
      if (params.url && typeof params.url === 'string') {
        setUrl(params.url);
        setMode('url');
      }
    }, [params.url])
  );

  const handleRetryConfiguration = () => {
    Alert.alert(
      'Configuration Required',
      'Please configure your Supabase credentials in the app settings.',
      [{ text: 'OK' }]
    );
  };

  const handleExtractUrl = async () => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }

    if (!url.trim()) {
      Alert.alert('Error', 'Please enter a URL');
      return;
    }

    if (!isValidUrl(url.trim())) {
      Alert.alert('Error', 'Please enter a valid URL');
      return;
    }

    setLoading(true);
    try {
      const countryCode = userLocation?.countryCode || 'US';
      const result = await extractItem(url.trim(), countryCode);

      if (result.error) {
        Alert.alert('Error', result.error);
        return;
      }

      // Navigate to import preview with extracted data
      router.push({
        pathname: '/import-preview',
        params: {
          data: JSON.stringify({
            itemName: result.title || 'Unknown Item',
            imageUrl: result.images[0] || '',
            extractedImages: JSON.stringify(result.images),
            storeName: result.sourceDomain || '',
            storeDomain: result.sourceDomain || '',
            price: result.price || null,
            currency: result.currency || 'USD',
            countryAvailability: JSON.stringify([countryCode]),
            sourceUrl: url.trim(),
            inputType: 'url',
          }),
        },
      });
    } catch (error: any) {
      console.error('[AddScreen] Extract URL error:', error);
      if (error.message === 'AUTH_REQUIRED') {
        setShowAuthModal(true);
      } else {
        Alert.alert('Error', error.message || 'Failed to extract item from URL');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleTakePhoto = async () => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }

    console.log('[AddScreen] User tapped Take Photo button');
    setLoading(true);
    
    try {
      const img = await takePhoto();
      
      if (!img) {
        console.log('[AddScreen] User cancelled or permission denied');
        return;
      }
      
      console.log('[AddScreen] Photo captured successfully - size:', img.fileSizeBytes, 'bytes');
      
      // Call identifyProductFromImage with the captured image
      console.log('[AddScreen] Calling identifyProductFromImage');
      const result = await identifyProductFromImage(img.imageBase64, {
        mimeType: img.mimeType,
      });
      
      console.log('[AddScreen] identifyProductFromImage result:', result.status);
      
      // Handle AUTH_REQUIRED error
      if (result.status === 'error' && result.error === 'AUTH_REQUIRED') {
        console.log('[AddScreen] AUTH_REQUIRED - redirecting to login');
        Alert.alert('Session Expired', result.message || 'Please sign in again.', [
          { text: 'OK', onPress: () => router.push('/auth') }
        ]);
        return;
      }
      
      // Handle IMAGE_TOO_LARGE error
      if (result.status === 'error' && result.error === 'IMAGE_TOO_LARGE') {
        console.log('[AddScreen] IMAGE_TOO_LARGE');
        Alert.alert('Image Too Large', result.message || 'Image too large. Max 6MB.');
        return;
      }
      
      // Handle VISION_FAILED error
      if (result.status === 'error' && result.error === 'VISION_FAILED') {
        console.log('[AddScreen] VISION_FAILED');
        Alert.alert(
          'Analysis Failed',
          result.message || 'Could not analyze image right now.',
          [
            { text: 'Try Again' },
            { 
              text: 'Add Manually', 
              onPress: () => {
                const countryCode = userLocation?.countryCode || 'US';
                const currencyCode = userLocation?.currencyCode || 'USD';
                router.push({
                  pathname: '/import-preview',
                  params: {
                    data: JSON.stringify({
                      itemName: '',
                      imageUrl: '',
                      extractedImages: JSON.stringify([]),
                      storeName: '',
                      storeDomain: '',
                      price: null,
                      currency: currencyCode,
                      countryAvailability: JSON.stringify([countryCode]),
                      sourceUrl: '',
                      inputType: 'manual',
                    }),
                  },
                });
              }
            },
          ]
        );
        return;
      }
      
      // Handle success
      if (result.status === 'ok' && result.items && result.items.length > 0) {
        console.log('[AddScreen] Success - query:', result.query, 'items:', result.items.length);
        
        // Navigate to import preview with identified product
        const countryCode = userLocation?.countryCode || 'US';
        const currencyCode = userLocation?.currencyCode || 'USD';
        
        router.push({
          pathname: '/import-preview',
          params: {
            data: JSON.stringify({
              itemName: result.query || result.items[0].title,
              imageUrl: result.items[0].imageUrl || '',
              extractedImages: JSON.stringify([result.items[0].imageUrl]),
              storeName: '',
              storeDomain: '',
              price: null,
              currency: currencyCode,
              countryAvailability: JSON.stringify([countryCode]),
              sourceUrl: result.items[0].storeUrl || '',
              inputType: 'camera',
              notes: result.items.map(item => item.title).join(', '),
            }),
          },
        });
        return;
      }
      
      // Handle no results
      if (result.status === 'no_results') {
        console.log('[AddScreen] No results:', result.message);
        Alert.alert(
          'No Products Found',
          result.message || 'No matches found. Try better lighting or add manually.',
          [
            { text: 'Try Again' },
            { 
              text: 'Add Manually', 
              onPress: () => {
                const countryCode = userLocation?.countryCode || 'US';
                const currencyCode = userLocation?.currencyCode || 'USD';
                router.push({
                  pathname: '/import-preview',
                  params: {
                    data: JSON.stringify({
                      itemName: '',
                      imageUrl: '',
                      extractedImages: JSON.stringify([]),
                      storeName: '',
                      storeDomain: '',
                      price: null,
                      currency: currencyCode,
                      countryAvailability: JSON.stringify([countryCode]),
                      sourceUrl: '',
                      inputType: 'manual',
                    }),
                  },
                });
              }
            },
          ]
        );
        return;
      }
      
      // Fallback for unexpected response
      console.warn('[AddScreen] Unexpected response:', result);
      Alert.alert('Error', 'Unexpected response from server. Please try again.');
    } catch (error: any) {
      console.error('[AddScreen] Take photo error:', error);
      if (error.message === 'AUTH_REQUIRED') {
        setShowAuthModal(true);
      } else {
        Alert.alert('Error', error.message || 'Failed to process photo');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleUploadImage = async () => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }

    console.log('[AddScreen] User tapped Upload Photo button');
    setLoading(true);
    
    try {
      const img = await pickFromLibrary();
      
      if (!img) {
        console.log('[AddScreen] User cancelled or permission denied');
        return;
      }
      
      console.log('[AddScreen] Image selected successfully - size:', img.fileSizeBytes, 'bytes');
      
      // Call identifyProductFromImage with the selected image
      console.log('[AddScreen] Calling identifyProductFromImage');
      const result = await identifyProductFromImage(img.imageBase64, {
        mimeType: img.mimeType,
      });
      
      console.log('[AddScreen] identifyProductFromImage result:', result.status);
      
      // Handle AUTH_REQUIRED error
      if (result.status === 'error' && result.error === 'AUTH_REQUIRED') {
        console.log('[AddScreen] AUTH_REQUIRED - redirecting to login');
        Alert.alert('Session Expired', result.message || 'Please sign in again.', [
          { text: 'OK', onPress: () => router.push('/auth') }
        ]);
        return;
      }
      
      // Handle IMAGE_TOO_LARGE error
      if (result.status === 'error' && result.error === 'IMAGE_TOO_LARGE') {
        console.log('[AddScreen] IMAGE_TOO_LARGE');
        Alert.alert('Image Too Large', result.message || 'Image too large. Max 6MB.');
        return;
      }
      
      // Handle VISION_FAILED error
      if (result.status === 'error' && result.error === 'VISION_FAILED') {
        console.log('[AddScreen] VISION_FAILED');
        Alert.alert(
          'Analysis Failed',
          result.message || 'Could not analyze image right now.',
          [
            { text: 'Try Again' },
            { 
              text: 'Add Manually', 
              onPress: () => {
                const countryCode = userLocation?.countryCode || 'US';
                const currencyCode = userLocation?.currencyCode || 'USD';
                router.push({
                  pathname: '/import-preview',
                  params: {
                    data: JSON.stringify({
                      itemName: '',
                      imageUrl: '',
                      extractedImages: JSON.stringify([]),
                      storeName: '',
                      storeDomain: '',
                      price: null,
                      currency: currencyCode,
                      countryAvailability: JSON.stringify([countryCode]),
                      sourceUrl: '',
                      inputType: 'manual',
                    }),
                  },
                });
              }
            },
          ]
        );
        return;
      }
      
      // Handle success
      if (result.status === 'ok' && result.items && result.items.length > 0) {
        console.log('[AddScreen] Success - query:', result.query, 'items:', result.items.length);
        
        // Navigate to import preview with identified product
        const countryCode = userLocation?.countryCode || 'US';
        const currencyCode = userLocation?.currencyCode || 'USD';
        
        router.push({
          pathname: '/import-preview',
          params: {
            data: JSON.stringify({
              itemName: result.query || result.items[0].title,
              imageUrl: result.items[0].imageUrl || '',
              extractedImages: JSON.stringify([result.items[0].imageUrl]),
              storeName: '',
              storeDomain: '',
              price: null,
              currency: currencyCode,
              countryAvailability: JSON.stringify([countryCode]),
              sourceUrl: result.items[0].storeUrl || '',
              inputType: 'upload',
              notes: result.items.map(item => item.title).join(', '),
            }),
          },
        });
        return;
      }
      
      // Handle no results
      if (result.status === 'no_results') {
        console.log('[AddScreen] No results:', result.message);
        Alert.alert(
          'No Products Found',
          result.message || 'No matches found. Try a different image or add manually.',
          [
            { text: 'Try Again' },
            { 
              text: 'Add Manually', 
              onPress: () => {
                const countryCode = userLocation?.countryCode || 'US';
                const currencyCode = userLocation?.currencyCode || 'USD';
                router.push({
                  pathname: '/import-preview',
                  params: {
                    data: JSON.stringify({
                      itemName: '',
                      imageUrl: '',
                      extractedImages: JSON.stringify([]),
                      storeName: '',
                      storeDomain: '',
                      price: null,
                      currency: currencyCode,
                      countryAvailability: JSON.stringify([countryCode]),
                      sourceUrl: '',
                      inputType: 'manual',
                    }),
                  },
                });
              }
            },
          ]
        );
        return;
      }
      
      // Fallback for unexpected response
      console.warn('[AddScreen] Unexpected response:', result);
      Alert.alert('Error', 'Unexpected response from server. Please try again.');
    } catch (error: any) {
      console.error('[AddScreen] Upload image error:', error);
      if (error.message === 'AUTH_REQUIRED') {
        setShowAuthModal(true);
      } else {
        Alert.alert('Error', error.message || 'Failed to process image');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSearchByName = async () => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }

    if (!searchQuery.trim()) {
      Alert.alert('Error', 'Please enter a search query');
      return;
    }

    setLoading(true);
    setSearchResults([]);
    try {
      const countryCode = userLocation?.countryCode || 'US';
      const currencyCode = userLocation?.currencyCode || 'USD';

      const result = await searchByName(searchQuery.trim(), {
        countryCode,
        currency: currencyCode,
        limit: 10,
      });

      if (result.error) {
        if (result.error === 'AUTH_REQUIRED') {
          setShowAuthModal(true);
        } else {
          Alert.alert('Error', result.error);
        }
        return;
      }

      if (result.results.length === 0) {
        Alert.alert('No Results', 'No products found for your search query.');
        return;
      }

      setSearchResults(result.results);
    } catch (error: any) {
      console.error('[AddScreen] Search by name error:', error);
      if (error.message === 'AUTH_REQUIRED') {
        setShowAuthModal(true);
      } else {
        Alert.alert('Error', error.message || 'Failed to search for products');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSelectSearchResult = (result: SearchResult) => {
    router.push({
      pathname: '/import-preview',
      params: {
        data: JSON.stringify({
          itemName: result.title,
          imageUrl: result.imageUrl || '',
          extractedImages: JSON.stringify([result.imageUrl]),
          storeName: result.storeDomain,
          storeDomain: result.storeDomain,
          price: result.price || null,
          currency: result.currency || 'USD',
          countryAvailability: JSON.stringify([userLocation?.countryCode || 'US']),
          sourceUrl: result.productUrl,
          inputType: 'name',
        }),
      },
    });
  };

  const renderUrlMode = () => (
    <View style={styles.content}>
      <View style={styles.inputContainer}>
        <Text style={[styles.label, { color: colors.text }]}>Product URL</Text>
        <TextInput
          style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.card }]}
          placeholder="https://example.com/product"
          placeholderTextColor={colors.textSecondary}
          value={url}
          onChangeText={setUrl}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          editable={!loading}
        />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.text }]}>
            Extracting product details...
          </Text>
        </View>
      ) : (
        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.primary }]}
          onPress={handleExtractUrl}
        >
          <Text style={[styles.buttonText, { color: colors.background }]}>
            Add from URL
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderCameraMode = () => (
    <View style={styles.content}>
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.text }]}>
            Processing photo...
          </Text>
        </View>
      ) : (
        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.primary }, loading && styles.buttonDisabled]}
          onPress={handleTakePhoto}
          disabled={loading}
        >
          <Text style={[styles.buttonText, { color: colors.background }]}>
            Take Photo
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderUploadMode = () => (
    <View style={styles.content}>
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.text }]}>
            Processing image...
          </Text>
        </View>
      ) : (
        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.primary }, loading && styles.buttonDisabled]}
          onPress={handleUploadImage}
          disabled={loading}
        >
          <Text style={[styles.buttonText, { color: colors.background }]}>
            Upload Photo
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderSearchMode = () => (
    <View style={styles.content}>
      <View style={styles.inputContainer}>
        <Text style={[styles.label, { color: colors.text }]}>Search for a product</Text>
        <TextInput
          style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.card }]}
          placeholder="e.g., iPhone 15 Pro"
          placeholderTextColor={colors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="words"
          autoCorrect={false}
          editable={!loading}
        />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.text }]}>
            Searching for products...
          </Text>
        </View>
      ) : (
        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.primary }]}
          onPress={handleSearchByName}
        >
          <Text style={[styles.buttonText, { color: colors.background }]}>
            Search
          </Text>
        </TouchableOpacity>
      )}

      {searchResults.length > 0 && (
        <View style={styles.searchResultsContainer}>
          {searchResults.map((result, index) => (
            <TouchableOpacity
              key={index}
              style={[styles.searchResultItem, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => handleSelectSearchResult(result)}
            >
              {result.imageUrl && (
                <Image
                  source={resolveImageSource(result.imageUrl)}
                  style={styles.searchResultImage}
                />
              )}
              <View style={styles.searchResultInfo}>
                <Text style={[styles.searchResultTitle, { color: colors.text }]} numberOfLines={2}>
                  {result.title}
                </Text>
                <Text style={[styles.searchResultStore, { color: colors.textSecondary }]}>
                  {result.storeDomain}
                </Text>
                {result.price && (
                  <Text style={[styles.searchResultPrice, { color: colors.primary }]}>
                    {result.currency} {result.price.toFixed(2)}
                  </Text>
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );

  if (!isConfigured) {
    return <ConfigurationError onRetry={handleRetryConfiguration} />;
  }

  if (authLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.text }]}>
            Loading...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
      
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView
            style={styles.container}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.header}>
              <Text style={[styles.title, { color: colors.text }]}>Add Item</Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                Add items to your wishlist
              </Text>
            </View>

            <View style={styles.modeSelector}>
              <TouchableOpacity
                style={[
                  styles.modeButton,
                  {
                    backgroundColor: mode === 'url' ? colors.primary : colors.card,
                    borderColor: mode === 'url' ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => setMode('url')}
                disabled={loading}
              >
                <IconSymbol
                  ios_icon_name="link"
                  android_material_icon_name="link"
                  size={24}
                  color={mode === 'url' ? colors.background : colors.text}
                />
                <Text
                  style={[
                    styles.modeButtonText,
                    { color: mode === 'url' ? colors.background : colors.text },
                  ]}
                >
                  URL
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modeButton,
                  {
                    backgroundColor: mode === 'camera' ? colors.primary : colors.card,
                    borderColor: mode === 'camera' ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => setMode('camera')}
                disabled={loading}
              >
                <IconSymbol
                  ios_icon_name="camera"
                  android_material_icon_name="camera"
                  size={24}
                  color={mode === 'camera' ? colors.background : colors.text}
                />
                <Text
                  style={[
                    styles.modeButtonText,
                    { color: mode === 'camera' ? colors.background : colors.text },
                  ]}
                >
                  Camera
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modeButton,
                  {
                    backgroundColor: mode === 'upload' ? colors.primary : colors.card,
                    borderColor: mode === 'upload' ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => setMode('upload')}
                disabled={loading}
              >
                <IconSymbol
                  ios_icon_name="photo"
                  android_material_icon_name="image"
                  size={24}
                  color={mode === 'upload' ? colors.background : colors.text}
                />
                <Text
                  style={[
                    styles.modeButtonText,
                    { color: mode === 'upload' ? colors.background : colors.text },
                  ]}
                >
                  Upload
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modeButton,
                  {
                    backgroundColor: mode === 'search' ? colors.primary : colors.card,
                    borderColor: mode === 'search' ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => setMode('search')}
                disabled={loading}
              >
                <IconSymbol
                  ios_icon_name="magnifyingglass"
                  android_material_icon_name="search"
                  size={24}
                  color={mode === 'search' ? colors.background : colors.text}
                />
                <Text
                  style={[
                    styles.modeButtonText,
                    { color: mode === 'search' ? colors.background : colors.text },
                  ]}
                >
                  Search
                </Text>
              </TouchableOpacity>
            </View>

            {mode === 'url' && renderUrlMode()}
            {mode === 'camera' && renderCameraMode()}
            {mode === 'upload' && renderUploadMode()}
            {mode === 'search' && renderSearchMode()}
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>

      {/* Auth Required Modal */}
      <Modal
        visible={showAuthModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAuthModal(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowAuthModal(false)}>
          <Pressable style={[styles.modalContent, { backgroundColor: colors.card }]} onPress={(e) => e.stopPropagation()}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Sign In Required
            </Text>
            <Text style={[styles.modalText, { color: colors.textSecondary }]}>
              You need to be signed in to add items to your wishlist. Please sign in or create an account to continue.
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: colors.border }]}
                onPress={() => setShowAuthModal(false)}
              >
                <Text style={[styles.modalButtonText, { color: colors.text }]}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: colors.primary }]}
                onPress={() => {
                  setShowAuthModal(false);
                  router.push('/auth');
                }}
              >
                <Text style={[styles.modalButtonText, { color: colors.background }]}>
                  Sign In
                </Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}
