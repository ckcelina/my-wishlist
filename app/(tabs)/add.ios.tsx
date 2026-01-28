
import * as Linking from 'expo-linking';
import React, { useState, useEffect } from 'react';
import { colors } from '@/styles/commonStyles';
import * as Clipboard from 'expo-clipboard';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Image,
  ImageSourcePropType,
  ActivityIndicator,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
  Modal,
  Pressable,
} from 'react-native';
import Constants from 'expo-constants';
import { useAuth } from '@/contexts/AuthContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconSymbol } from '@/components/IconSymbol';
import { extractItem, identifyFromImage, findAlternatives } from '@/utils/supabase-edge-functions';
import { createWishlistItem, fetchWishlists } from '@/lib/supabase-helpers';

type TabType = 'url' | 'camera' | 'upload' | 'search' | 'manual';

interface ExtractedItem {
  title: string;
  imageUrl: string | null;
  price: string | null;
  currency: string;
  originalUrl: string;
  sourceDomain: string;
}

interface Wishlist {
  id: string;
  name: string;
  isDefault: boolean;
}

interface SearchResult {
  title: string;
  imageUrl: string | null;
  storeLink: string | null;
  price: number | null;
  currency: string | null;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: colors.background,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
  wishlistSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    padding: 12,
    marginHorizontal: 20,
    marginTop: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  wishlistSelectorText: {
    fontSize: 15,
    color: colors.text,
    fontWeight: '500',
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
    paddingTop: 12,
    marginTop: 12,
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
  },
  tabText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  tabTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  scrollContent: {
    paddingBottom: 140,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  formCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  tipCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  tipText: {
    fontSize: 13,
    color: colors.textSecondary,
    flex: 1,
    lineHeight: 18,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    color: '#FFFFFF',
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginBottom: 16,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  button: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
    minHeight: 48,
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  buttonText: {
    color: '#3b2a1f',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  secondaryButtonText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  imagePickerButton: {
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
    marginBottom: 16,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  imagePickerText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 8,
  },
  selectedImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginBottom: 16,
  },
  removeImageButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 20,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchResultCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    gap: 12,
  },
  searchResultImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  searchResultInfo: {
    flex: 1,
  },
  searchResultTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  searchResultPrice: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '70%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16,
  },
  wishlistOption: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  wishlistOptionText: {
    fontSize: 16,
    color: colors.text,
  },
  wishlistOptionSelected: {
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
});

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
  const { wishlistId, sharedUrl } = useLocalSearchParams<{ wishlistId?: string; sharedUrl?: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<TabType>('url');
  const [wishlists, setWishlists] = useState<Wishlist[]>([]);
  const [selectedWishlistId, setSelectedWishlistId] = useState<string>(wishlistId || '');
  const [showWishlistPicker, setShowWishlistPicker] = useState(false);

  // URL tab state
  const [urlInput, setUrlInput] = useState('');
  const [extracting, setExtracting] = useState(false);
  const [extractedItem, setExtractedItem] = useState<ExtractedItem | null>(null);

  // Camera tab state
  const [cameraImageUri, setCameraImageUri] = useState<string | null>(null);
  const [identifyingCamera, setIdentifyingCamera] = useState(false);

  // Upload tab state
  const [uploadImageUri, setUploadImageUri] = useState<string | null>(null);
  const [identifyingUpload, setIdentifyingUpload] = useState(false);

  // Search tab state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchBrand, setSearchBrand] = useState('');
  const [searchKeywords, setSearchKeywords] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);

  // Manual tab state
  const [manualTitle, setManualTitle] = useState('');
  const [manualBrand, setManualBrand] = useState('');
  const [manualPrice, setManualPrice] = useState('');
  const [manualCurrency, setManualCurrency] = useState('USD');
  const [manualStoreLink, setManualStoreLink] = useState('');
  const [manualImageUrl, setManualImageUrl] = useState('');
  const [manualNotes, setManualNotes] = useState('');
  const [savingManual, setSavingManual] = useState(false);

  useEffect(() => {
    if (sharedUrl) {
      console.log('Received shared URL:', sharedUrl);
      setUrlInput(sharedUrl);
      setActiveTab('url');
    }
  }, [sharedUrl]);

  useEffect(() => {
    const loadWishlists = async () => {
      if (!user) return;
      
      try {
        const data = await fetchWishlists(user.id);
        setWishlists(data);
        
        if (!selectedWishlistId && data.length > 0) {
          const defaultWishlist = data.find(w => w.isDefault) || data[0];
          setSelectedWishlistId(defaultWishlist.id);
        }
      } catch (error) {
        console.error('Failed to load wishlists:', error);
      }
    };

    loadWishlists();
  }, [user]);

  useEffect(() => {
    const checkClipboard = async () => {
      const clipboardText = await Clipboard.getStringAsync();
      const extractedUrl = extractUrlFromText(clipboardText);
      if (extractedUrl && isValidUrl(extractedUrl)) {
        console.log('Found URL in clipboard:', extractedUrl);
        Alert.alert(
          'URL Found',
          'We found a URL in your clipboard. Would you like to use it?',
          [
            { text: 'No', style: 'cancel' },
            {
              text: 'Yes',
              onPress: () => {
                setUrlInput(extractedUrl);
                setActiveTab('url');
              },
            },
          ]
        );
      }
    };

    checkClipboard();
  }, []);

  const handleExtractItem = async () => {
    if (!urlInput.trim() || !isValidUrl(urlInput)) {
      Alert.alert('Error', 'Please enter a valid URL');
      return;
    }

    console.log('Extracting item from URL:', urlInput);
    setExtracting(true);

    try {
      const result = await extractItem(urlInput);

      if (result.error && !result.title) {
        Alert.alert('Error', result.error || 'Failed to extract item details');
        setExtracting(false);
        return;
      }

      const urlObj = new URL(urlInput);
      const sourceDomain = urlObj.hostname.replace('www.', '');

      setExtractedItem({
        title: result.title || 'Unknown Item',
        imageUrl: result.imageUrl,
        price: result.price !== null ? result.price.toString() : null,
        currency: result.currency || 'USD',
        originalUrl: urlInput,
        sourceDomain,
      });

      console.log('Item extracted successfully');
    } catch (error: any) {
      console.error('Failed to extract item:', error);
      Alert.alert('Error', 'Failed to extract item details. Please try again.');
    } finally {
      setExtracting(false);
    }
  };

  const handleSaveExtractedItem = async () => {
    if (!extractedItem || !selectedWishlistId) {
      Alert.alert('Error', 'Missing item or wishlist information');
      return;
    }

    console.log('Saving extracted item to wishlist:', selectedWishlistId);
    setSavingManual(true);

    try {
      await createWishlistItem({
        wishlist_id: selectedWishlistId,
        title: extractedItem.title,
        image_url: extractedItem.imageUrl,
        current_price: extractedItem.price,
        currency: extractedItem.currency,
        original_url: extractedItem.originalUrl,
        source_domain: extractedItem.sourceDomain,
      });

      console.log('Item saved successfully');
      Alert.alert('Success', 'Item added to your wishlist!', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error: any) {
      console.error('Failed to save item:', error);
      Alert.alert('Error', 'Failed to save item. Please try again.');
    } finally {
      setSavingManual(false);
    }
  };

  const handleTakePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Camera permission is required to take photos.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      console.log('User took photo');
      setCameraImageUri(result.assets[0].uri);
    }
  };

  const handleIdentifyFromCamera = async () => {
    if (!cameraImageUri) return;

    console.log('Identifying product from camera image');
    setIdentifyingCamera(true);

    try {
      const result = await identifyFromImage(cameraImageUri);

      if (result.error && !result.bestGuessTitle) {
        Alert.alert('Error', result.error || 'Failed to identify product');
        setIdentifyingCamera(false);
        return;
      }

      if (result.bestGuessTitle) {
        router.push({
          pathname: '/confirm-product',
          params: {
            imageUrl: cameraImageUri,
            identificationResult: JSON.stringify(result),
            wishlistId: selectedWishlistId,
          },
        });
      } else {
        Alert.alert('No Product Found', 'Could not identify a product in this image.');
      }
    } catch (error: any) {
      console.error('Failed to identify product:', error);
      Alert.alert('Error', 'Failed to identify product. Please try again.');
    } finally {
      setIdentifyingCamera(false);
    }
  };

  const handleUploadImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      console.log('User uploaded image');
      setUploadImageUri(result.assets[0].uri);
    }
  };

  const handleIdentifyFromUpload = async () => {
    if (!uploadImageUri) return;

    console.log('Identifying product from uploaded image');
    setIdentifyingUpload(true);

    try {
      const result = await identifyFromImage(uploadImageUri);

      if (result.error && !result.bestGuessTitle) {
        Alert.alert('Error', result.error || 'Failed to identify product');
        setIdentifyingUpload(false);
        return;
      }

      if (result.bestGuessTitle) {
        router.push({
          pathname: '/confirm-product',
          params: {
            imageUrl: uploadImageUri,
            identificationResult: JSON.stringify(result),
            wishlistId: selectedWishlistId,
          },
        });
      } else {
        Alert.alert('No Product Found', 'Could not identify a product in this image.');
      }
    } catch (error: any) {
      console.error('Failed to identify product:', error);
      Alert.alert('Error', 'Failed to identify product. Please try again.');
    } finally {
      setIdentifyingUpload(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      Alert.alert('Error', 'Please enter a product name');
      return;
    }

    console.log('Searching for products:', searchQuery);
    setSearching(true);
    setSearchResults([]);

    try {
      const searchTitle = [searchQuery, searchBrand, searchKeywords].filter(Boolean).join(' ');
      const result = await findAlternatives(searchTitle);

      if (result.error && result.alternatives.length === 0) {
        Alert.alert('No Results', 'Could not find any products matching your search.');
        setSearching(false);
        return;
      }

      const results: SearchResult[] = result.alternatives.map(alt => ({
        title: alt.storeName + ' - ' + searchTitle,
        imageUrl: null,
        storeLink: alt.url,
        price: alt.price,
        currency: alt.currency,
      }));

      setSearchResults(results);
      console.log('Found', results.length, 'search results');
    } catch (error: any) {
      console.error('Search failed:', error);
      Alert.alert('Error', 'Search failed. Please try again.');
    } finally {
      setSearching(false);
    }
  };

  const handleSelectSearchResult = (result: SearchResult) => {
    router.push({
      pathname: '/confirm-product',
      params: {
        title: result.title,
        price: result.price?.toString() || '',
        currency: result.currency || 'USD',
        storeLink: result.storeLink || '',
        imageUrl: result.imageUrl || '',
        wishlistId: selectedWishlistId,
      },
    });
  };

  const handleSaveManualItem = async () => {
    if (!manualTitle.trim()) {
      Alert.alert('Error', 'Please enter an item title');
      return;
    }

    if (!selectedWishlistId) {
      Alert.alert('Error', 'No wishlist selected');
      return;
    }

    console.log('Saving manual item to wishlist:', selectedWishlistId);
    setSavingManual(true);

    try {
      await createWishlistItem({
        wishlist_id: selectedWishlistId,
        title: manualTitle,
        brand: manualBrand || null,
        image_url: manualImageUrl || null,
        current_price: manualPrice || null,
        currency: manualCurrency,
        original_url: manualStoreLink || null,
        notes: manualNotes || null,
      });

      console.log('Manual item saved successfully');
      Alert.alert('Success', 'Item added to your wishlist!', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error: any) {
      console.error('Failed to save manual item:', error);
      Alert.alert('Error', 'Failed to save item. Please try again.');
    } finally {
      setSavingManual(false);
    }
  };

  const handlePickManualImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      console.log('User picked image for manual entry');
      setManualImageUrl(result.assets[0].uri);
    }
  };

  const selectedWishlist = wishlists.find(w => w.id === selectedWishlistId);
  const placeholderColor = 'rgba(255,255,255,0.55)';

  const renderUrlTab = () => {
    const urlTrimmed = urlInput.trim();
    const isValidHttpUrl = urlTrimmed.startsWith('http://') || urlTrimmed.startsWith('https://');
    const canExtract = isValidHttpUrl && !extracting;
    const canSave = extractedItem !== null && !savingManual;

    return (
      <View style={styles.content}>
        <View style={styles.tipCard}>
          <IconSymbol ios_icon_name="info.circle" android_material_icon_name="info" size={20} color={colors.primary} />
          <Text style={styles.tipText}>
            Tip: Use Share → My Wishlist from any app to add items instantly.
          </Text>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.label}>Product URL</Text>
          <TextInput
            style={styles.input}
            placeholder="https://example.com/product"
            placeholderTextColor={placeholderColor}
            value={urlInput}
            onChangeText={setUrlInput}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            editable={!extracting}
          />

          <TouchableOpacity
            style={[styles.button, !canExtract && styles.buttonDisabled]}
            onPress={handleExtractItem}
            disabled={!canExtract}
          >
            {extracting ? (
              <ActivityIndicator color="#3b2a1f" />
            ) : (
              <Text style={styles.buttonText}>Extract Item Details</Text>
            )}
          </TouchableOpacity>
        </View>

        {extractedItem && (
          <>
            <View style={styles.formCard}>
              {extractedItem.imageUrl && (
                <Image
                  source={resolveImageSource(extractedItem.imageUrl)}
                  style={styles.selectedImage}
                  resizeMode="cover"
                />
              )}

              <Text style={styles.label}>Title</Text>
              <TextInput
                style={styles.input}
                value={extractedItem.title}
                onChangeText={(text) => setExtractedItem({ ...extractedItem, title: text })}
                placeholder="Item title"
                placeholderTextColor={placeholderColor}
              />

              <Text style={styles.label}>Price</Text>
              <TextInput
                style={styles.input}
                value={extractedItem.price || ''}
                onChangeText={(text) => setExtractedItem({ ...extractedItem, price: text })}
                placeholder="0.00"
                placeholderTextColor={placeholderColor}
                keyboardType="decimal-pad"
              />
            </View>

            <TouchableOpacity
              style={[styles.button, !canSave && styles.buttonDisabled]}
              onPress={handleSaveExtractedItem}
              disabled={!canSave}
            >
              {savingManual ? (
                <ActivityIndicator color="#3b2a1f" />
              ) : (
                <Text style={styles.buttonText}>Add to Wishlist</Text>
              )}
            </TouchableOpacity>
          </>
        )}
      </View>
    );
  };

  const renderCameraTab = () => {
    return (
      <View style={styles.content}>
        <View style={styles.formCard}>
          <Text style={styles.label}>Take Photo</Text>

          {cameraImageUri ? (
            <View>
              <Image
                source={resolveImageSource(cameraImageUri)}
                style={styles.selectedImage}
                resizeMode="cover"
              />
              <TouchableOpacity
                style={styles.removeImageButton}
                onPress={() => setCameraImageUri(null)}
              >
                <IconSymbol ios_icon_name="xmark" android_material_icon_name="close" size={16} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.imagePickerButton} onPress={handleTakePhoto}>
              <IconSymbol ios_icon_name="camera" android_material_icon_name="camera" size={32} color={colors.textSecondary} />
              <Text style={styles.imagePickerText}>Tap to take photo</Text>
            </TouchableOpacity>
          )}

          {cameraImageUri && (
            <TouchableOpacity
              style={[styles.button, identifyingCamera && styles.buttonDisabled]}
              onPress={handleIdentifyFromCamera}
              disabled={identifyingCamera}
            >
              {identifyingCamera ? (
                <ActivityIndicator color="#3b2a1f" />
              ) : (
                <Text style={styles.buttonText}>Identify Product</Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  const renderUploadTab = () => {
    return (
      <View style={styles.content}>
        <View style={styles.formCard}>
          <Text style={styles.label}>Upload Image</Text>

          {uploadImageUri ? (
            <View>
              <Image
                source={resolveImageSource(uploadImageUri)}
                style={styles.selectedImage}
                resizeMode="cover"
              />
              <TouchableOpacity
                style={styles.removeImageButton}
                onPress={() => setUploadImageUri(null)}
              >
                <IconSymbol ios_icon_name="xmark" android_material_icon_name="close" size={16} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.imagePickerButton} onPress={handleUploadImage}>
              <IconSymbol ios_icon_name="photo" android_material_icon_name="image" size={32} color={colors.textSecondary} />
              <Text style={styles.imagePickerText}>Tap to select image</Text>
            </TouchableOpacity>
          )}

          {uploadImageUri && (
            <TouchableOpacity
              style={[styles.button, identifyingUpload && styles.buttonDisabled]}
              onPress={handleIdentifyFromUpload}
              disabled={identifyingUpload}
            >
              {identifyingUpload ? (
                <ActivityIndicator color="#3b2a1f" />
              ) : (
                <Text style={styles.buttonText}>Identify Product</Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  const renderSearchTab = () => {
    return (
      <View style={styles.content}>
        <View style={styles.formCard}>
          <Text style={styles.label}>Product Name *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., iPhone 15 Pro"
            placeholderTextColor={placeholderColor}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />

          <Text style={styles.label}>Brand (optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., Apple"
            placeholderTextColor={placeholderColor}
            value={searchBrand}
            onChangeText={setSearchBrand}
          />

          <Text style={styles.label}>Keywords (optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., 256GB, blue"
            placeholderTextColor={placeholderColor}
            value={searchKeywords}
            onChangeText={setSearchKeywords}
          />

          <TouchableOpacity
            style={[styles.button, (!searchQuery.trim() || searching) && styles.buttonDisabled]}
            onPress={handleSearch}
            disabled={!searchQuery.trim() || searching}
          >
            {searching ? (
              <ActivityIndicator color="#3b2a1f" />
            ) : (
              <Text style={styles.buttonText}>Search</Text>
            )}
          </TouchableOpacity>
        </View>

        {searchResults.map((result, index) => (
          <TouchableOpacity
            key={index}
            style={styles.searchResultCard}
            onPress={() => handleSelectSearchResult(result)}
          >
            {result.imageUrl && (
              <Image
                source={resolveImageSource(result.imageUrl)}
                style={styles.searchResultImage}
                resizeMode="cover"
              />
            )}
            <View style={styles.searchResultInfo}>
              <Text style={styles.searchResultTitle}>{result.title}</Text>
              {result.price && (
                <Text style={styles.searchResultPrice}>
                  {result.currency} {result.price.toFixed(2)}
                </Text>
              )}
            </View>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const renderManualTab = () => {
    const canSave = manualTitle.trim().length > 0 && !savingManual;

    return (
      <View style={styles.content}>
        <View style={styles.formCard}>
          <Text style={styles.label}>Name *</Text>
          <TextInput
            style={styles.input}
            placeholder="Item name"
            placeholderTextColor={placeholderColor}
            value={manualTitle}
            onChangeText={setManualTitle}
          />

          <Text style={styles.label}>Brand (optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="Brand name"
            placeholderTextColor={placeholderColor}
            value={manualBrand}
            onChangeText={setManualBrand}
          />

          <Text style={styles.label}>Price (optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="0.00"
            placeholderTextColor={placeholderColor}
            value={manualPrice}
            onChangeText={setManualPrice}
            keyboardType="decimal-pad"
          />

          <Text style={styles.label}>Store Link (optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="https://..."
            placeholderTextColor={placeholderColor}
            value={manualStoreLink}
            onChangeText={setManualStoreLink}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
          />

          <Text style={styles.label}>Image (optional)</Text>
          {manualImageUrl ? (
            <View>
              <Image
                source={resolveImageSource(manualImageUrl)}
                style={styles.selectedImage}
                resizeMode="cover"
              />
              <TouchableOpacity
                style={styles.removeImageButton}
                onPress={() => setManualImageUrl('')}
              >
                <IconSymbol ios_icon_name="xmark" android_material_icon_name="close" size={16} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.imagePickerButton} onPress={handlePickManualImage}>
              <IconSymbol ios_icon_name="photo" android_material_icon_name="image" size={32} color={colors.textSecondary} />
              <Text style={styles.imagePickerText}>Tap to add image</Text>
            </TouchableOpacity>
          )}

          <Text style={styles.label}>Notes (optional)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Add any notes about this item"
            placeholderTextColor={placeholderColor}
            value={manualNotes}
            onChangeText={setManualNotes}
            multiline
          />

          <TouchableOpacity
            style={[styles.button, !canSave && styles.buttonDisabled]}
            onPress={handleSaveManualItem}
            disabled={!canSave}
          >
            {savingManual ? (
              <ActivityIndicator color="#3b2a1f" />
            ) : (
              <Text style={styles.buttonText}>Add to Wishlist</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Add Item',
          headerShown: true,
        }}
      />
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Add Item</Text>
          <Text style={styles.headerSubtitle}>
            Add from a link, photo, search, or enter details manually
          </Text>
        </View>

        <TouchableOpacity
          style={styles.wishlistSelector}
          onPress={() => setShowWishlistPicker(true)}
        >
          <Text style={styles.wishlistSelectorText}>
            {selectedWishlist ? selectedWishlist.name : 'Select Wishlist'}
          </Text>
          <IconSymbol ios_icon_name="chevron.down" android_material_icon_name="arrow-drop-down" size={20} color={colors.text} />
        </TouchableOpacity>

        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'url' && styles.tabActive]}
            onPress={() => setActiveTab('url')}
          >
            <Text style={[styles.tabText, activeTab === 'url' && styles.tabTextActive]}>URL</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'camera' && styles.tabActive]}
            onPress={() => setActiveTab('camera')}
          >
            <Text style={[styles.tabText, activeTab === 'camera' && styles.tabTextActive]}>Camera</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'upload' && styles.tabActive]}
            onPress={() => setActiveTab('upload')}
          >
            <Text style={[styles.tabText, activeTab === 'upload' && styles.tabTextActive]}>Upload</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'search' && styles.tabActive]}
            onPress={() => setActiveTab('search')}
          >
            <Text style={[styles.tabText, activeTab === 'search' && styles.tabTextActive]}>Search</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'manual' && styles.tabActive]}
            onPress={() => setActiveTab('manual')}
          >
            <Text style={[styles.tabText, activeTab === 'manual' && styles.tabTextActive]}>Manual</Text>
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView
          style={styles.container}
          behavior="padding"
          keyboardVerticalOffset={90}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <ScrollView 
              style={styles.container}
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
            >
              {activeTab === 'url' && renderUrlTab()}
              {activeTab === 'camera' && renderCameraTab()}
              {activeTab === 'upload' && renderUploadTab()}
              {activeTab === 'search' && renderSearchTab()}
              {activeTab === 'manual' && renderManualTab()}
            </ScrollView>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>

        <Modal
          visible={showWishlistPicker}
          transparent
          animationType="slide"
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
                      setSelectedWishlistId(wishlist.id);
                      setShowWishlistPicker(false);
                    }}
                  >
                    <Text style={styles.wishlistOptionText}>{wishlist.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </Pressable>
          </Pressable>
        </Modal>
      </View>
    </>
  );
}
