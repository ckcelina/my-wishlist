
import { useAppTheme } from '@/contexts/ThemeContext';
import { useRouter, useLocalSearchParams } from 'expo-router';
import React, { useState, useEffect, useMemo } from 'react';
import { createColors, createTypography, spacing } from '@/styles/designSystem';
import * as ImagePicker from 'expo-image-picker';
import * as Linking from 'expo-linking';
import * as Clipboard from 'expo-clipboard';
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
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { extractItem, identifyFromImage, searchByName } from '@/utils/supabase-edge-functions';
import { fetchWishlists, fetchUserLocation } from '@/lib/supabase-helpers';
import Constants from 'expo-constants';
import { IconSymbol } from '@/components/IconSymbol';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '@/contexts/AuthContext';

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
  const { theme, isDark } = useAppTheme();
  const colors = useMemo(() => createColors(theme), [theme]);
  const typography = useMemo(() => createTypography(theme), [theme]);
  const insets = useSafeAreaInsets();
  
  const [activeTab, setActiveTab] = useState<TabType>('share');
  const [wishlists, setWishlists] = useState<Wishlist[]>([]);
  const [selectedWishlistId, setSelectedWishlistId] = useState<string>(wishlistId || '');
  const [showWishlistPicker, setShowWishlistPicker] = useState(false);

  // User location for filtering
  const [userLocation, setUserLocation] = useState<{ countryCode: string; city: string | null } | null>(null);

  // URL tab state
  const [urlInput, setUrlInput] = useState('');
  const [extracting, setExtracting] = useState(false);

  // Camera tab state
  const [cameraImageUri, setCameraImageUri] = useState<string | null>(null);
  const [identifyingCamera, setIdentifyingCamera] = useState(false);

  // Upload tab state
  const [uploadImageUri, setUploadImageUri] = useState<string | null>(null);
  const [identifyingUpload, setIdentifyingUpload] = useState(false);

  // Search tab state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchBrand, setSearchBrand] = useState('');
  const [searchModel, setSearchModel] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);

  // Calculate bottom padding
  const TAB_BAR_HEIGHT = 64;
  const scrollViewBottomPadding = TAB_BAR_HEIGHT + Math.max(insets.bottom, 20) + 16;

  const styles = useMemo(() => StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.background,
    },
    container: {
      flex: 1,
    },
    header: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.md,
      paddingBottom: spacing.sm,
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
      marginTop: spacing.xs,
    },
    wishlistSelector: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.card,
      padding: spacing.md,
      marginHorizontal: spacing.lg,
      marginTop: spacing.sm,
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
      backgroundColor: colors.card,
      paddingTop: spacing.md,
      marginTop: spacing.md,
    },
    tab: {
      flex: 1,
      paddingVertical: spacing.md,
      alignItems: 'center',
    },
    tabActive: {
      borderBottomWidth: 2,
      borderBottomColor: colors.accent,
    },
    tabText: {
      fontSize: 12,
      color: colors.textSecondary,
      fontWeight: '500',
    },
    tabTextActive: {
      color: colors.accent,
      fontWeight: '700',
    },
    scrollContent: {
      paddingBottom: scrollViewBottomPadding,
    },
    content: {
      padding: spacing.lg,
    },
    formCard: {
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: spacing.lg,
      marginBottom: spacing.md,
      borderWidth: isDark ? 1 : 0,
      borderColor: isDark ? colors.divider : 'transparent',
      ...(theme.mode === 'light' && {
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 2,
      }),
    },
    tipCard: {
      backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : colors.card,
      borderRadius: 12,
      padding: spacing.md,
      marginBottom: spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.sm,
    },
    tipText: {
      fontSize: 13,
      color: colors.textSecondary,
      flex: 1,
      lineHeight: 18,
    },
    instructionCard: {
      backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : colors.card,
      borderRadius: 12,
      padding: spacing.lg,
      marginBottom: spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
    },
    instructionTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
      marginBottom: spacing.md,
    },
    instructionStep: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: spacing.md,
      gap: spacing.sm,
    },
    stepNumber: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
    },
    stepNumberText: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.mode === 'dark' ? '#3b2a1f' : '#FFFFFF',
    },
    stepText: {
      flex: 1,
      fontSize: 14,
      color: colors.text,
      lineHeight: 20,
    },
    label: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
      marginBottom: spacing.sm,
    },
    input: {
      borderWidth: 1.5,
      borderColor: theme.mode === 'dark' ? 'rgba(255,255,255,0.2)' : colors.border,
      borderRadius: 12,
      padding: spacing.md,
      fontSize: 16,
      color: colors.text,
      backgroundColor: theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : colors.background,
      marginBottom: spacing.md,
    },
    button: {
      backgroundColor: colors.accent,
      padding: spacing.md,
      borderRadius: 12,
      alignItems: 'center',
      marginTop: spacing.sm,
      minHeight: 48,
      justifyContent: 'center',
      ...(theme.mode === 'light' && {
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 1,
        shadowRadius: 4,
        elevation: 2,
      }),
    },
    buttonDisabled: {
      opacity: 0.5,
      backgroundColor: theme.mode === 'dark' ? 'rgba(255,255,255,0.15)' : colors.border,
    },
    buttonText: {
      color: theme.mode === 'dark' ? '#3b2a1f' : '#FFFFFF',
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
      marginBottom: spacing.md,
      backgroundColor: theme.mode === 'dark' ? 'rgba(255,255,255,0.03)' : colors.background,
    },
    imagePickerText: {
      fontSize: 14,
      color: colors.textSecondary,
      marginTop: spacing.sm,
    },
    selectedImage: {
      width: '100%',
      height: 200,
      borderRadius: 12,
      marginBottom: spacing.md,
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
      backgroundColor: theme.mode === 'dark' ? 'rgba(255,255,255,0.05)' : colors.background,
      borderRadius: 12,
      padding: spacing.md,
      marginBottom: spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
      flexDirection: 'row',
      gap: spacing.md,
    },
    searchResultImage: {
      width: 80,
      height: 80,
      borderRadius: 8,
      backgroundColor: colors.card,
    },
    searchResultInfo: {
      flex: 1,
    },
    searchResultTitle: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.text,
      marginBottom: spacing.xs,
    },
    searchResultPrice: {
      fontSize: 14,
      color: colors.accent,
      fontWeight: '600',
      marginBottom: spacing.xs,
    },
    searchResultStore: {
      fontSize: 12,
      color: colors.textSecondary,
      marginBottom: spacing.xs,
    },
    confidenceBadge: {
      backgroundColor: theme.mode === 'dark' ? 'rgba(255,255,255,0.1)' : colors.card,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
      alignSelf: 'flex-start',
    },
    confidenceText: {
      fontSize: 11,
      color: colors.textSecondary,
      fontWeight: '600',
    },
    selectButton: {
      backgroundColor: colors.accent,
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 8,
      alignSelf: 'flex-start',
      marginTop: spacing.sm,
    },
    selectButtonText: {
      color: theme.mode === 'dark' ? '#3b2a1f' : '#FFFFFF',
      fontSize: 14,
      fontWeight: '600',
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'flex-end',
    },
    modalContent: {
      backgroundColor: colors.card,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      padding: spacing.lg,
      maxHeight: '70%',
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.text,
      marginBottom: spacing.md,
    },
    wishlistOption: {
      padding: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    wishlistOptionText: {
      fontSize: 16,
      color: colors.text,
    },
    wishlistOptionSelected: {
      backgroundColor: theme.mode === 'dark' ? 'rgba(255,255,255,0.1)' : colors.background,
    },
  }), [colors, typography, theme, scrollViewBottomPadding, isDark]);

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
    const loadUserLocation = async () => {
      if (!user) return;
      
      try {
        const location = await fetchUserLocation(user.id);
        if (location) {
          setUserLocation({
            countryCode: location.countryCode,
            city: location.city,
          });
          console.log('User location loaded:', location.countryCode, location.city);
        }
      } catch (error) {
        console.error('Failed to load user location:', error);
      }
    };

    loadUserLocation();
  }, [user]);

  useEffect(() => {
    const checkClipboard = async () => {
      if (Platform.OS !== 'web') {
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

      // Navigate to import preview screen
      router.push({
        pathname: '/import-preview',
        params: {
          items: JSON.stringify([{
            title: result.title || 'Unknown Item',
            imageUrl: result.imageUrl,
            price: result.price,
            currency: result.currency || 'USD',
            productUrl: urlInput,
          }]),
          storeName: result.sourceDomain || 'Store',
        },
      });

      console.log('Item extracted successfully');
    } catch (error: any) {
      console.error('Failed to extract item:', error);
      Alert.alert('Error', 'Failed to extract item details. Please try again.');
    } finally {
      setExtracting(false);
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
          pathname: '/import-preview',
          params: {
            items: JSON.stringify([{
              title: result.bestGuessTitle,
              imageUrl: cameraImageUri,
              price: null,
              currency: 'USD',
              productUrl: result.suggestedProducts[0]?.likelyUrl || '',
            }]),
            storeName: 'Camera',
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
          pathname: '/import-preview',
          params: {
            items: JSON.stringify([{
              title: result.bestGuessTitle,
              imageUrl: uploadImageUri,
              price: null,
              currency: 'USD',
              productUrl: result.suggestedProducts[0]?.likelyUrl || '',
            }]),
            storeName: 'Gallery',
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
      const fullQuery = [searchQuery, searchBrand, searchModel].filter(Boolean).join(' ');
      
      const result = await searchByName(fullQuery, {
        countryCode: userLocation?.countryCode,
        city: userLocation?.city || undefined,
        limit: 10,
      });

      if (result.error && result.results.length === 0) {
        Alert.alert('No Results', result.error || 'Could not find any products matching your search.');
        setSearching(false);
        return;
      }

      setSearchResults(result.results);
      console.log('Found', result.results.length, 'search results');
    } catch (error: any) {
      console.error('Search failed:', error);
      Alert.alert('Error', 'Search failed. Please try again.');
    } finally {
      setSearching(false);
    }
  };

  const handleSelectSearchResult = (result: SearchResult) => {
    console.log('User selected search result:', result.title);
    router.push({
      pathname: '/import-preview',
      params: {
        items: JSON.stringify([{
          title: result.title,
          imageUrl: result.imageUrl,
          price: result.price,
          currency: result.currency || 'USD',
          productUrl: result.productUrl,
        }]),
        storeName: result.storeDomain,
      },
    });
  };

  const selectedWishlist = wishlists.find(w => w.id === selectedWishlistId);
  const placeholderColor = theme.mode === 'dark' ? 'rgba(255,255,255,0.55)' : colors.textSecondary;

  const renderShareTab = () => {
    return (
      <View style={styles.content}>
        <View style={styles.instructionCard}>
          <Text style={styles.instructionTitle}>How to add items from other apps</Text>
          
          <View style={styles.instructionStep}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>1</Text>
            </View>
            <Text style={styles.stepText}>
              Open any shopping app or website (Amazon, eBay, etc.)
            </Text>
          </View>

          <View style={styles.instructionStep}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>2</Text>
            </View>
            <Text style={styles.stepText}>
              Find the product you want to save
            </Text>
          </View>

          <View style={styles.instructionStep}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>3</Text>
            </View>
            <Text style={styles.stepText}>
              Tap the Share button (usually looks like {Platform.OS === 'ios' ? '⬆️' : '⋮'})
            </Text>
          </View>

          <View style={styles.instructionStep}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>4</Text>
            </View>
            <Text style={styles.stepText}>
              Select "My Wishlist" from the share menu
            </Text>
          </View>

          <View style={styles.instructionStep}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>5</Text>
            </View>
            <Text style={styles.stepText}>
              We'll automatically extract the product details and add it to your wishlist!
            </Text>
          </View>
        </View>

        <View style={styles.tipCard}>
          <IconSymbol ios_icon_name="lightbulb" android_material_icon_name="lightbulb" size={20} color={colors.accent} />
          <Text style={styles.tipText}>
            Tip: This works with most shopping websites and apps. If it doesn't work, try copying the product URL and using the "From URL" tab instead.
          </Text>
        </View>
      </View>
    );
  };

  const renderUrlTab = () => {
    const urlTrimmed = urlInput.trim();
    const isValidHttpUrl = urlTrimmed.startsWith('http://') || urlTrimmed.startsWith('https://');
    const canExtract = isValidHttpUrl && !extracting;

    return (
      <View style={styles.content}>
        <View style={styles.tipCard}>
          <IconSymbol ios_icon_name="info.circle" android_material_icon_name="info" size={20} color={colors.accent} />
          <Text style={styles.tipText}>
            Paste a product URL from any online store and we'll extract the details automatically.
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
              <ActivityIndicator color={theme.mode === 'dark' ? '#3b2a1f' : '#FFFFFF'} />
            ) : (
              <Text style={styles.buttonText}>Extract & Preview</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderCameraTab = () => {
    return (
      <View style={styles.content}>
        <View style={styles.tipCard}>
          <IconSymbol ios_icon_name="info.circle" android_material_icon_name="info" size={20} color={colors.accent} />
          <Text style={styles.tipText}>
            Take a photo of any product and we'll identify it using AI.
          </Text>
        </View>

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
                <ActivityIndicator color={theme.mode === 'dark' ? '#3b2a1f' : '#FFFFFF'} />
              ) : (
                <Text style={styles.buttonText}>Identify & Preview</Text>
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
        <View style={styles.tipCard}>
          <IconSymbol ios_icon_name="info.circle" android_material_icon_name="info" size={20} color={colors.accent} />
          <Text style={styles.tipText}>
            Upload a photo from your gallery and we'll identify the product using AI.
          </Text>
        </View>

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
                <ActivityIndicator color={theme.mode === 'dark' ? '#3b2a1f' : '#FFFFFF'} />
              ) : (
                <Text style={styles.buttonText}>Identify & Preview</Text>
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
        <View style={styles.tipCard}>
          <IconSymbol ios_icon_name="info.circle" android_material_icon_name="info" size={20} color={colors.accent} />
          <Text style={styles.tipText}>
            Search for products by name and we'll find purchasable options in your country.
          </Text>
        </View>

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

          <Text style={styles.label}>Model / Keywords (optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., 256GB, blue"
            placeholderTextColor={placeholderColor}
            value={searchModel}
            onChangeText={setSearchModel}
          />

          {userLocation && (
            <View style={styles.tipCard}>
              <IconSymbol ios_icon_name="location" android_material_icon_name="location-on" size={16} color={colors.accent} />
              <Text style={styles.tipText}>
                Searching for products available in {userLocation.countryCode}
                {userLocation.city ? `, ${userLocation.city}` : ''}
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.button, (!searchQuery.trim() || searching) && styles.buttonDisabled]}
            onPress={handleSearch}
            disabled={!searchQuery.trim() || searching}
          >
            {searching ? (
              <ActivityIndicator color={theme.mode === 'dark' ? '#3b2a1f' : '#FFFFFF'} />
            ) : (
              <Text style={styles.buttonText}>Search Products</Text>
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
              {result.price !== null && (
                <Text style={styles.searchResultPrice}>
                  {result.currency} {result.price.toFixed(2)}
                </Text>
              )}
              <Text style={styles.searchResultStore}>{result.storeDomain}</Text>
              <View style={styles.confidenceBadge}>
                <Text style={styles.confidenceText}>
                  {Math.round(result.confidence * 100)}% match
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} backgroundColor={colors.background} />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Add Item</Text>
          <Text style={styles.headerSubtitle}>
            Choose how you'd like to add items to your wishlist
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
            style={[styles.tab, activeTab === 'share' && styles.tabActive]}
            onPress={() => setActiveTab('share')}
          >
            <Text style={[styles.tabText, activeTab === 'share' && styles.tabTextActive]}>Share</Text>
          </TouchableOpacity>
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
        </View>

        <KeyboardAvoidingView
          style={styles.container}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <ScrollView 
              style={styles.container}
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
            >
              {activeTab === 'share' && renderShareTab()}
              {activeTab === 'url' && renderUrlTab()}
              {activeTab === 'camera' && renderCameraTab()}
              {activeTab === 'upload' && renderUploadTab()}
              {activeTab === 'search' && renderSearchTab()}
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
      </SafeAreaView>
    </>
  );
}
