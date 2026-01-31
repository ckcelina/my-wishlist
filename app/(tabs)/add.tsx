
import React, { useState, useEffect, useMemo } from 'react';
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

type TabType = 'share' | 'url' | 'camera' | 'upload' | 'search';

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

  const [activeTab, setActiveTab] = useState<TabType>('url');
  const [urlInput, setUrlInput] = useState('');
  const [extracting, setExtracting] = useState(false);
  const [cameraImage, setCameraImage] = useState<string | null>(null);
  const [uploadImage, setUploadImage] = useState<string | null>(null);
  const [identifying, setIdentifying] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchBrand, setSearchBrand] = useState('');
  const [searchModel, setSearchModel] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);

  // Handle shared URL from other apps
  const sharedUrl = params.url as string | undefined;

  useEffect(() => {
    if (!user) {
      console.log('[AddItem] No user, redirecting to auth');
      router.replace('/auth');
    }
  }, [user, router]);

  useEffect(() => {
    if (sharedUrl) {
      console.log('[AddItem] Received shared URL:', sharedUrl);
      setUrlInput(sharedUrl);
      setActiveTab('url');
    }
  }, [sharedUrl]);

  const styles = useMemo(() => createStyles(colors, typography), [colors, typography]);

  const handleExtractItem = async () => {
    if (!urlInput.trim()) {
      Alert.alert('Missing URL', 'Please enter a product URL');
      return;
    }

    if (!isValidUrl(urlInput.trim())) {
      Alert.alert('Invalid URL', 'Please enter a valid URL starting with http:// or https://');
      return;
    }

    console.log('[AddItem] Extracting item from URL:', urlInput);
    setExtracting(true);

    try {
      // Get user location for shipping context
      let userCountry = 'US'; // Default
      if (user) {
        const locationData = await fetchUserLocation(user.id);
        if (locationData) {
          userCountry = locationData.countryCode;
        }
      }

      const result = await extractItem(urlInput.trim(), userCountry);
      console.log('[AddItem] Extraction result:', result);

      // Navigate to import preview with extracted data
      const productData = {
        itemName: result.title || '',
        imageUrl: result.images?.[0] || '',
        extractedImages: result.images || [],
        storeName: result.storeName || '',
        storeDomain: result.storeDomain || '',
        price: result.price || null,
        currency: result.currency || 'USD',
        countryAvailability: result.availableCountries || [],
        sourceUrl: urlInput.trim(),
        inputType: 'url', // Specify input type for auto-selection
      };

      router.push({
        pathname: '/import-preview',
        params: {
          data: JSON.stringify(productData),
        },
      });
    } catch (error: any) {
      console.error('[AddItem] Error extracting item:', error);
      Alert.alert('Extraction Failed', error.message || 'Failed to extract product information. Please try again.');
    } finally {
      setExtracting(false);
    }
  };

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

    console.log('[AddItem] Identifying product from camera image');
    setIdentifying(true);

    try {
      const result = await identifyFromImage(cameraImage);
      console.log('[AddItem] Identification result:', result);

      // Navigate to import preview with identified data
      const productData = {
        itemName: result.title || '',
        imageUrl: cameraImage,
        extractedImages: [cameraImage],
        storeName: result.storeName || '',
        storeDomain: result.storeDomain || '',
        price: result.price || null,
        currency: result.currency || 'USD',
        countryAvailability: result.availableCountries || [],
        sourceUrl: result.productUrl || '',
        inputType: 'camera', // Specify input type for auto-selection
      };

      router.push({
        pathname: '/import-preview',
        params: {
          data: JSON.stringify(productData),
        },
      });
    } catch (error: any) {
      console.error('[AddItem] Error identifying product:', error);
      Alert.alert('Identification Failed', error.message || 'Failed to identify product. Please try again.');
    } finally {
      setIdentifying(false);
    }
  };

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

    console.log('[AddItem] Identifying product from uploaded image');
    setIdentifying(true);

    try {
      const result = await identifyFromImage(uploadImage);
      console.log('[AddItem] Identification result:', result);

      // Navigate to import preview with identified data
      const productData = {
        itemName: result.title || '',
        imageUrl: uploadImage,
        extractedImages: [uploadImage],
        storeName: result.storeName || '',
        storeDomain: result.storeDomain || '',
        price: result.price || null,
        currency: result.currency || 'USD',
        countryAvailability: result.availableCountries || [],
        sourceUrl: result.productUrl || '',
        inputType: 'image', // Specify input type for auto-selection
      };

      router.push({
        pathname: '/import-preview',
        params: {
          data: JSON.stringify(productData),
        },
      });
    } catch (error: any) {
      console.error('[AddItem] Error identifying product:', error);
      Alert.alert('Identification Failed', error.message || 'Failed to identify product. Please try again.');
    } finally {
      setIdentifying(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      Alert.alert('Missing Query', 'Please enter a product name');
      return;
    }

    console.log('[AddItem] Searching for:', searchQuery);
    setSearching(true);

    try {
      const result = await searchByName(searchQuery.trim(), searchBrand.trim() || undefined, searchModel.trim() || undefined);
      console.log('[AddItem] Search results:', result);

      setSearchResults(result.results || []);
      setShowSearchResults(true);
    } catch (error: any) {
      console.error('[AddItem] Error searching:', error);
      Alert.alert('Search Failed', error.message || 'Failed to search for products. Please try again.');
    } finally {
      setSearching(false);
    }
  };

  const handleSelectSearchResult = (result: SearchResult) => {
    console.log('[AddItem] User selected search result:', result.title);

    // Navigate to import preview with search result data
    const productData = {
      itemName: result.title,
      imageUrl: result.imageUrl || '',
      extractedImages: result.imageUrl ? [result.imageUrl] : [],
      storeName: '',
      storeDomain: result.storeDomain,
      price: result.price,
      currency: result.currency || 'USD',
      countryAvailability: [],
      sourceUrl: result.productUrl,
      inputType: 'name', // Specify input type for auto-selection
    };

    router.push({
      pathname: '/import-preview',
      params: {
        data: JSON.stringify(productData),
      },
    });
  };

  const handleSmartSearch = () => {
    console.log('[AddItem] User tapped Smart Search');
    router.push('/smart-search');
  };

  const renderShareTab = () => {
    const deepLinkUrl = Linking.createURL('add');
    
    return (
      <View style={styles.tabContent}>
        <View style={styles.instructionsCard}>
          <IconSymbol
            ios_icon_name="square.and.arrow.up"
            android_material_icon_name="share"
            size={48}
            color={colors.accent}
          />
          <Text style={styles.instructionsTitle}>Share from any app</Text>
          <Text style={styles.instructionsText}>
            1. Open any shopping app or website{'\n'}
            2. Tap the Share button{'\n'}
            3. Select "My Wishlist"{'\n'}
            4. We'll extract the product details automatically
          </Text>
        </View>

        <View style={styles.deepLinkCard}>
          <Text style={styles.deepLinkLabel}>Deep Link URL:</Text>
          <Text style={styles.deepLinkUrl} numberOfLines={1}>{deepLinkUrl}</Text>
          <TouchableOpacity
            style={styles.copyButton}
            onPress={async () => {
              await Clipboard.setStringAsync(deepLinkUrl);
              Alert.alert('Copied', 'Deep link URL copied to clipboard');
            }}
          >
            <IconSymbol
              ios_icon_name="doc.on.doc"
              android_material_icon_name="content-copy"
              size={16}
              color={colors.accent}
            />
            <Text style={styles.copyButtonText}>Copy</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderUrlTab = () => (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.tabContent}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.urlTabInner}>
          <Text style={styles.tabTitle}>Paste Product URL</Text>
          <Text style={styles.tabSubtitle}>
            Copy a product link from any website and paste it here
          </Text>

          <TextInput
            style={styles.urlInput}
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
            style={[styles.extractButton, extracting && styles.extractButtonDisabled]}
            onPress={handleExtractItem}
            disabled={extracting}
          >
            {extracting ? (
              <ActivityIndicator size="small" color={colors.textInverse} />
            ) : (
              <>
                <IconSymbol
                  ios_icon_name="wand.and.stars"
                  android_material_icon_name="auto-fix-high"
                  size={20}
                  color={colors.textInverse}
                />
                <Text style={styles.extractButtonText}>Extract Product</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );

  const renderCameraTab = () => (
    <View style={styles.tabContent}>
      <Text style={styles.tabTitle}>Take a Photo</Text>
      <Text style={styles.tabSubtitle}>
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
            style={styles.retakeButton}
            onPress={() => setCameraImage(null)}
          >
            <IconSymbol
              ios_icon_name="xmark.circle"
              android_material_icon_name="close"
              size={24}
              color={colors.error}
            />
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity style={styles.cameraButton} onPress={handleTakePhoto}>
          <IconSymbol
            ios_icon_name="camera"
            android_material_icon_name="camera"
            size={64}
            color={colors.accent}
          />
          <Text style={styles.cameraButtonText}>Take Photo</Text>
        </TouchableOpacity>
      )}

      {cameraImage && (
        <TouchableOpacity
          style={[styles.identifyButton, identifying && styles.identifyButtonDisabled]}
          onPress={handleIdentifyFromCamera}
          disabled={identifying}
        >
          {identifying ? (
            <ActivityIndicator size="small" color={colors.textInverse} />
          ) : (
            <>
              <IconSymbol
                ios_icon_name="sparkles"
                android_material_icon_name="auto-fix-high"
                size={20}
                color={colors.textInverse}
              />
              <Text style={styles.identifyButtonText}>Identify Product</Text>
            </>
          )}
        </TouchableOpacity>
      )}
    </View>
  );

  const renderUploadTab = () => (
    <View style={styles.tabContent}>
      <Text style={styles.tabTitle}>Upload Image</Text>
      <Text style={styles.tabSubtitle}>
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
            style={styles.retakeButton}
            onPress={() => setUploadImage(null)}
          >
            <IconSymbol
              ios_icon_name="xmark.circle"
              android_material_icon_name="close"
              size={24}
              color={colors.error}
            />
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity style={styles.uploadButton} onPress={handleUploadImage}>
          <IconSymbol
            ios_icon_name="photo"
            android_material_icon_name="image"
            size={64}
            color={colors.accent}
          />
          <Text style={styles.uploadButtonText}>Choose from Gallery</Text>
        </TouchableOpacity>
      )}

      {uploadImage && (
        <TouchableOpacity
          style={[styles.identifyButton, identifying && styles.identifyButtonDisabled]}
          onPress={handleIdentifyFromUpload}
          disabled={identifying}
        >
          {identifying ? (
            <ActivityIndicator size="small" color={colors.textInverse} />
          ) : (
            <>
              <IconSymbol
                ios_icon_name="sparkles"
                android_material_icon_name="auto-fix-high"
                size={20}
                color={colors.textInverse}
              />
              <Text style={styles.identifyButtonText}>Identify Product</Text>
            </>
          )}
        </TouchableOpacity>
      )}
    </View>
  );

  const renderSearchTab = () => (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.tabContent}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.searchTabInner}>
          <Text style={styles.tabTitle}>Search by Name</Text>
          <Text style={styles.tabSubtitle}>
            Enter the product name and optional details
          </Text>

          <Text style={styles.inputLabel}>Product Name *</Text>
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="e.g., iPhone 15 Pro"
            placeholderTextColor={colors.textTertiary}
          />

          <Text style={styles.inputLabel}>Brand (optional)</Text>
          <TextInput
            style={styles.searchInput}
            value={searchBrand}
            onChangeText={setSearchBrand}
            placeholder="e.g., Apple"
            placeholderTextColor={colors.textTertiary}
          />

          <Text style={styles.inputLabel}>Model (optional)</Text>
          <TextInput
            style={styles.searchInput}
            value={searchModel}
            onChangeText={setSearchModel}
            placeholder="e.g., 256GB"
            placeholderTextColor={colors.textTertiary}
          />

          <TouchableOpacity
            style={[styles.searchButton, searching && styles.searchButtonDisabled]}
            onPress={handleSearch}
            disabled={searching}
          >
            {searching ? (
              <ActivityIndicator size="small" color={colors.textInverse} />
            ) : (
              <>
                <IconSymbol
                  ios_icon_name="magnifyingglass"
                  android_material_icon_name="search"
                  size={20}
                  color={colors.textInverse}
                />
                <Text style={styles.searchButtonText}>Search</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Smart Search Button */}
          <TouchableOpacity
            style={[styles.smartSearchButton, { backgroundColor: colors.accentLight, borderColor: colors.accent }]}
            onPress={handleSmartSearch}
          >
            <IconSymbol
              ios_icon_name="sparkles"
              android_material_icon_name="auto-fix-high"
              size={20}
              color={colors.accent}
            />
            <Text style={[styles.smartSearchButtonText, { color: colors.accent }]}>
              Try Smart Search (AI-Powered)
            </Text>
          </TouchableOpacity>
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );

  return (
    <>
      <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        {/* Tab Selector */}
        <View style={styles.tabSelector}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabScrollContent}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'share' && styles.tabActive]}
              onPress={() => setActiveTab('share')}
            >
              <IconSymbol
                ios_icon_name="square.and.arrow.up"
                android_material_icon_name="share"
                size={20}
                color={activeTab === 'share' ? colors.accent : colors.textSecondary}
              />
              <Text style={[styles.tabText, activeTab === 'share' && styles.tabTextActive]}>Share</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tab, activeTab === 'url' && styles.tabActive]}
              onPress={() => setActiveTab('url')}
            >
              <IconSymbol
                ios_icon_name="link"
                android_material_icon_name="link"
                size={20}
                color={activeTab === 'url' ? colors.accent : colors.textSecondary}
              />
              <Text style={[styles.tabText, activeTab === 'url' && styles.tabTextActive]}>URL</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tab, activeTab === 'camera' && styles.tabActive]}
              onPress={() => setActiveTab('camera')}
            >
              <IconSymbol
                ios_icon_name="camera"
                android_material_icon_name="camera"
                size={20}
                color={activeTab === 'camera' ? colors.accent : colors.textSecondary}
              />
              <Text style={[styles.tabText, activeTab === 'camera' && styles.tabTextActive]}>Camera</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tab, activeTab === 'upload' && styles.tabActive]}
              onPress={() => setActiveTab('upload')}
            >
              <IconSymbol
                ios_icon_name="photo"
                android_material_icon_name="image"
                size={20}
                color={activeTab === 'upload' ? colors.accent : colors.textSecondary}
              />
              <Text style={[styles.tabText, activeTab === 'upload' && styles.tabTextActive]}>Upload</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tab, activeTab === 'search' && styles.tabActive]}
              onPress={() => setActiveTab('search')}
            >
              <IconSymbol
                ios_icon_name="magnifyingglass"
                android_material_icon_name="search"
                size={20}
                color={activeTab === 'search' ? colors.accent : colors.textSecondary}
              />
              <Text style={[styles.tabText, activeTab === 'search' && styles.tabTextActive]}>Search</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* Tab Content */}
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          {activeTab === 'share' && renderShareTab()}
          {activeTab === 'url' && renderUrlTab()}
          {activeTab === 'camera' && renderCameraTab()}
          {activeTab === 'upload' && renderUploadTab()}
          {activeTab === 'search' && renderSearchTab()}
        </ScrollView>

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
              <Text style={styles.modalTitle}>Search Results</Text>
              
              <ScrollView style={styles.resultsList}>
                {searchResults.map((result, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[styles.resultCard, { backgroundColor: colors.background, borderColor: colors.border }]}
                    onPress={() => {
                      setShowSearchResults(false);
                      handleSelectSearchResult(result);
                    }}
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
    tabSelector: {
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    tabScrollContent: {
      paddingHorizontal: spacing.md,
      gap: spacing.xs,
    },
    tab: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      borderRadius: 20,
    },
    tabActive: {
      backgroundColor: colors.accentLight,
    },
    tabText: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    tabTextActive: {
      color: colors.accent,
      fontWeight: '600',
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      padding: spacing.lg,
    },
    tabContent: {
      flex: 1,
    },
    instructionsCard: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: spacing.xl,
      alignItems: 'center',
      marginBottom: spacing.lg,
    },
    instructionsTitle: {
      fontSize: 20,
      fontWeight: '600',
      color: colors.textPrimary,
      marginTop: spacing.md,
      marginBottom: spacing.sm,
    },
    instructionsText: {
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 22,
    },
    deepLinkCard: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: spacing.md,
    },
    deepLinkLabel: {
      fontSize: 12,
      color: colors.textSecondary,
      marginBottom: spacing.xs,
    },
    deepLinkUrl: {
      fontSize: 14,
      color: colors.textPrimary,
      marginBottom: spacing.sm,
    },
    copyButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      alignSelf: 'flex-start',
    },
    copyButtonText: {
      fontSize: 14,
      color: colors.accent,
      fontWeight: '500',
    },
    urlTabInner: {
      flex: 1,
    },
    tabTitle: {
      fontSize: 24,
      fontWeight: '600',
      color: colors.textPrimary,
      marginBottom: spacing.xs,
    },
    tabSubtitle: {
      fontSize: 14,
      color: colors.textSecondary,
      marginBottom: spacing.lg,
    },
    urlInput: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: spacing.md,
      fontSize: 16,
      color: colors.textPrimary,
      borderWidth: 1,
      borderColor: colors.border,
      minHeight: 100,
      textAlignVertical: 'top',
      marginBottom: spacing.lg,
    },
    extractButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.xs,
      backgroundColor: colors.accent,
      borderRadius: 12,
      padding: spacing.md,
    },
    extractButtonDisabled: {
      opacity: 0.5,
    },
    extractButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.textInverse,
    },
    imagePreview: {
      width: '100%',
      height: 300,
      borderRadius: 12,
      backgroundColor: colors.surface,
      marginBottom: spacing.lg,
      position: 'relative',
    },
    previewImage: {
      width: '100%',
      height: '100%',
      borderRadius: 12,
    },
    retakeButton: {
      position: 'absolute',
      top: spacing.sm,
      right: spacing.sm,
      backgroundColor: colors.surface,
      borderRadius: 20,
      padding: spacing.xs,
    },
    cameraButton: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: spacing.xl,
      alignItems: 'center',
      marginBottom: spacing.lg,
      borderWidth: 2,
      borderColor: colors.border,
      borderStyle: 'dashed',
    },
    cameraButtonText: {
      fontSize: 16,
      fontWeight: '500',
      color: colors.accent,
      marginTop: spacing.sm,
    },
    uploadButton: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: spacing.xl,
      alignItems: 'center',
      marginBottom: spacing.lg,
      borderWidth: 2,
      borderColor: colors.border,
      borderStyle: 'dashed',
    },
    uploadButtonText: {
      fontSize: 16,
      fontWeight: '500',
      color: colors.accent,
      marginTop: spacing.sm,
    },
    identifyButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.xs,
      backgroundColor: colors.accent,
      borderRadius: 12,
      padding: spacing.md,
    },
    identifyButtonDisabled: {
      opacity: 0.5,
    },
    identifyButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.textInverse,
    },
    searchTabInner: {
      flex: 1,
    },
    inputLabel: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.textSecondary,
      marginBottom: spacing.xs,
      marginTop: spacing.md,
    },
    searchInput: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: spacing.md,
      fontSize: 16,
      color: colors.textPrimary,
      borderWidth: 1,
      borderColor: colors.border,
    },
    searchButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.xs,
      backgroundColor: colors.accent,
      borderRadius: 12,
      padding: spacing.md,
      marginTop: spacing.lg,
    },
    searchButtonDisabled: {
      opacity: 0.5,
    },
    searchButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.textInverse,
    },
    smartSearchButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.xs,
      borderRadius: 12,
      padding: spacing.md,
      marginTop: spacing.md,
      borderWidth: 2,
    },
    smartSearchButtonText: {
      fontSize: 16,
      fontWeight: '600',
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'flex-end',
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
    modalTitle: {
      fontSize: 20,
      fontWeight: '600',
      color: colors.textPrimary,
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
  });
}
