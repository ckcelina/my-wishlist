
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
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { extractItem, identifyFromImage } from '@/utils/supabase-edge-functions';
import { createWishlistItem } from '@/lib/supabase-helpers';
import Constants from 'expo-constants';
import { IconSymbol } from '@/components/IconSymbol';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '@/contexts/AuthContext';

type TabType = 'url' | 'manual' | 'image';

interface ExtractedItem {
  title: string;
  imageUrl: string | null;
  price: string | null;
  currency: string;
  originalUrl: string;
  sourceDomain: string;
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
  
  const [activeTab, setActiveTab] = useState<TabType>('url');

  // URL tab state
  const [urlInput, setUrlInput] = useState('');
  const [extracting, setExtracting] = useState(false);
  const [extractedItem, setExtractedItem] = useState<ExtractedItem | null>(null);

  // Manual tab state
  const [manualTitle, setManualTitle] = useState('');
  const [manualPrice, setManualPrice] = useState('');
  const [manualImageUrl, setManualImageUrl] = useState('');
  const [manualNotes, setManualNotes] = useState('');
  const [savingManual, setSavingManual] = useState(false);

  // Image tab state
  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null);
  const [identifyingImage, setIdentifyingImage] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Calculate bottom padding: tab bar height (64) + bottom safe area + extra spacing
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
    tabBar: {
      flexDirection: 'row',
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      backgroundColor: colors.card,
      paddingTop: spacing.md,
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
      fontSize: 15,
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
    inputFocused: {
      borderColor: colors.accent,
      borderWidth: 2,
    },
    textArea: {
      height: 100,
      textAlignVertical: 'top',
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
    secondaryButton: {
      backgroundColor: theme.mode === 'dark' 
        ? 'rgba(255,255,255,0.12)' 
        : colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.md,
      borderRadius: 12,
      alignItems: 'center',
      marginTop: spacing.sm,
    },
    secondaryButtonText: {
      color: colors.text,
      fontSize: 16,
      fontWeight: '600',
    },
    previewCard: {
      backgroundColor: theme.mode === 'dark' ? 'rgba(255,255,255,0.05)' : colors.background,
      borderRadius: 12,
      padding: spacing.md,
      marginBottom: spacing.md,
      borderWidth: 1,
      borderColor: theme.mode === 'dark' ? colors.divider : colors.border,
    },
    previewImage: {
      width: '100%',
      height: 200,
      borderRadius: 12,
      marginBottom: spacing.md,
    },
    previewTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.text,
      marginBottom: spacing.sm,
    },
    previewPrice: {
      fontSize: 16,
      color: colors.accent,
      fontWeight: '600',
      marginBottom: spacing.xs,
    },
    previewUrl: {
      fontSize: 12,
      color: colors.textSecondary,
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
    loadingContainer: {
      padding: 40,
      alignItems: 'center',
    },
    loadingText: {
      marginTop: spacing.md,
      fontSize: 14,
      color: colors.textSecondary,
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

  const handleExtractItemWithUrl = async (urlToExtract: string) => {
    if (!urlToExtract.trim()) {
      Alert.alert('Error', 'Please enter a URL');
      return;
    }

    if (!isValidUrl(urlToExtract)) {
      Alert.alert('Error', 'Please enter a valid URL');
      return;
    }

    console.log('Extracting item from URL:', urlToExtract);
    setExtracting(true);

    try {
      const result = await extractItem(urlToExtract);

      if (result.error && !result.title) {
        Alert.alert('Error', result.error || 'Failed to extract item details');
        setExtracting(false);
        return;
      }

      const urlObj = new URL(urlToExtract);
      const sourceDomain = urlObj.hostname.replace('www.', '');

      setExtractedItem({
        title: result.title || 'Unknown Item',
        imageUrl: result.imageUrl,
        price: result.price !== null ? result.price.toString() : null,
        currency: result.currency || 'USD',
        originalUrl: urlToExtract,
        sourceDomain,
      });

      console.log('Item extracted successfully:', result.title);
    } catch (error: any) {
      console.error('Failed to extract item:', error);
      Alert.alert('Error', 'Failed to extract item details. Please try again.');
    } finally {
      setExtracting(false);
    }
  };

  const handleExtractItem = () => {
    handleExtractItemWithUrl(urlInput);
  };

  const uploadImage = async (imageUri: string): Promise<string | null> => {
    console.log('Uploading image to Supabase Storage...');
    // TODO: Implement Supabase Storage upload
    // For now, return the local URI
    return imageUri;
  };

  const handlePickExtractedImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      console.log('User picked new image for extracted item');
      const uploadedUrl = await uploadImage(result.assets[0].uri);
      if (uploadedUrl && extractedItem) {
        setExtractedItem({
          ...extractedItem,
          imageUrl: uploadedUrl,
        });
      }
    }
  };

  const handleRemoveExtractedImage = () => {
    if (extractedItem) {
      console.log('User removed extracted item image');
      setExtractedItem({
        ...extractedItem,
        imageUrl: null,
      });
    }
  };

  const handleSaveExtractedItem = async () => {
    if (!extractedItem || !wishlistId) {
      Alert.alert('Error', 'Missing item or wishlist information');
      return;
    }

    console.log('Saving extracted item to wishlist:', wishlistId);
    setSavingManual(true);

    try {
      await createWishlistItem({
        wishlist_id: wishlistId,
        title: extractedItem.title,
        image_url: extractedItem.imageUrl,
        current_price: extractedItem.price,
        currency: extractedItem.currency,
        original_url: extractedItem.originalUrl,
        source_domain: extractedItem.sourceDomain,
      });

      console.log('Item saved successfully');
      Alert.alert('Success', 'Item added to your wishlist!', [
        {
          text: 'OK',
          onPress: () => router.back(),
        },
      ]);
    } catch (error: any) {
      console.error('Failed to save item:', error);
      Alert.alert('Error', 'Failed to save item. Please try again.');
    } finally {
      setSavingManual(false);
    }
  };

  const handlePickImage = async () => {
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

  const handleRemoveManualImage = () => {
    console.log('User removed manual image');
    setManualImageUrl('');
  };

  const handleSaveManualItem = async () => {
    if (!manualTitle.trim()) {
      Alert.alert('Error', 'Please enter an item title');
      return;
    }

    if (!wishlistId) {
      Alert.alert('Error', 'No wishlist selected');
      return;
    }

    console.log('Saving manual item to wishlist:', wishlistId);
    setSavingManual(true);

    try {
      let uploadedImageUrl = manualImageUrl;
      if (manualImageUrl && !manualImageUrl.startsWith('http')) {
        uploadedImageUrl = await uploadImage(manualImageUrl) || manualImageUrl;
      }

      await createWishlistItem({
        wishlist_id: wishlistId,
        title: manualTitle,
        image_url: uploadedImageUrl || null,
        current_price: manualPrice || null,
        currency: 'USD',
        notes: manualNotes || null,
      });

      console.log('Manual item saved successfully');
      Alert.alert('Success', 'Item added to your wishlist!', [
        {
          text: 'OK',
          onPress: () => router.back(),
        },
      ]);
    } catch (error: any) {
      console.error('Failed to save manual item:', error);
      Alert.alert('Error', 'Failed to save item. Please try again.');
    } finally {
      setSavingManual(false);
    }
  };

  const handleUploadImageForIdentification = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      console.log('User picked image for identification');
      setSelectedImageUri(result.assets[0].uri);
    }
  };

  const handlePasteImageUrl = async () => {
    const clipboardText = await Clipboard.getStringAsync();
    if (isValidUrl(clipboardText)) {
      console.log('Pasted image URL from clipboard');
      setSelectedImageUri(clipboardText);
    } else {
      Alert.alert('Error', 'Clipboard does not contain a valid URL');
    }
  };

  const handleIdentifyProduct = async () => {
    if (!selectedImageUri) {
      Alert.alert('Error', 'Please select an image first');
      return;
    }

    console.log('Identifying product from image');
    setIdentifyingImage(true);

    try {
      const result = await identifyFromImage(selectedImageUri);

      if (result.error && !result.bestGuessTitle) {
        Alert.alert('Error', result.error || 'Failed to identify product');
        setIdentifyingImage(false);
        return;
      }

      if (result.bestGuessTitle) {
        router.push({
          pathname: '/confirm-product',
          params: {
            imageUrl: selectedImageUri,
            identificationResult: JSON.stringify(result),
            wishlistId: wishlistId || '',
          },
        });
      } else {
        Alert.alert('No Product Found', 'Could not identify a product in this image. Please try a different image or add the item manually.');
      }
    } catch (error: any) {
      console.error('Failed to identify product:', error);
      Alert.alert('Error', 'Failed to identify product. Please try again.');
    } finally {
      setIdentifyingImage(false);
    }
  };

  const renderUrlTab = () => {
    const urlTrimmed = urlInput.trim();
    const isValidHttpUrl = urlTrimmed.startsWith('http://') || urlTrimmed.startsWith('https://');
    const canExtract = isValidHttpUrl && !extracting;
    const canSave = extractedItem !== null && !savingManual;
    const placeholderColor = theme.mode === 'dark' ? 'rgba(255,255,255,0.55)' : colors.textSecondary;

    return (
      <View style={styles.content}>
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
              <Text style={styles.buttonText}>Extract Item Details</Text>
            )}
          </TouchableOpacity>
        </View>

        {extractedItem && (
          <>
            <View style={styles.previewCard}>
              {extractedItem.imageUrl && (
                <View>
                  <Image
                    source={resolveImageSource(extractedItem.imageUrl)}
                    style={styles.previewImage}
                    resizeMode="cover"
                  />
                  <TouchableOpacity
                    style={styles.removeImageButton}
                    onPress={handleRemoveExtractedImage}
                  >
                    <IconSymbol
                      ios_icon_name="xmark"
                      android_material_icon_name="close"
                      size={16}
                      color="#FFFFFF"
                    />
                  </TouchableOpacity>
                </View>
              )}

              <Text style={styles.label}>Title</Text>
              <TextInput
                style={styles.input}
                value={extractedItem.title}
                onChangeText={(text) =>
                  setExtractedItem({ ...extractedItem, title: text })
                }
                placeholder="Item title"
                placeholderTextColor={placeholderColor}
              />

              <Text style={styles.label}>Price</Text>
              <TextInput
                style={styles.input}
                value={extractedItem.price || ''}
                onChangeText={(text) =>
                  setExtractedItem({ ...extractedItem, price: text })
                }
                placeholder="0.00"
                placeholderTextColor={placeholderColor}
                keyboardType="decimal-pad"
              />

              <Text style={styles.previewUrl}>{extractedItem.originalUrl}</Text>
            </View>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={handlePickExtractedImage}
            >
              <Text style={styles.secondaryButtonText}>Change Image</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, !canSave && styles.buttonDisabled]}
              onPress={handleSaveExtractedItem}
              disabled={!canSave}
            >
              {savingManual ? (
                <ActivityIndicator color={theme.mode === 'dark' ? '#3b2a1f' : '#FFFFFF'} />
              ) : (
                <Text style={styles.buttonText}>Add to Wishlist</Text>
              )}
            </TouchableOpacity>
          </>
        )}
      </View>
    );
  };

  const renderManualTab = () => {
    const canSave = manualTitle.trim().length > 0 && !savingManual;
    const placeholderColor = theme.mode === 'dark' ? 'rgba(255,255,255,0.55)' : colors.textSecondary;

    return (
      <View style={styles.content}>
        <View style={styles.formCard}>
          <Text style={styles.label}>Title *</Text>
          <TextInput
            style={styles.input}
            placeholder="Item name"
            placeholderTextColor={placeholderColor}
            value={manualTitle}
            onChangeText={setManualTitle}
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
                onPress={handleRemoveManualImage}
              >
                <IconSymbol
                  ios_icon_name="xmark"
                  android_material_icon_name="close"
                  size={16}
                  color="#FFFFFF"
                />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.imagePickerButton} onPress={handlePickImage}>
              <IconSymbol
                ios_icon_name="photo"
                android_material_icon_name="image"
                size={32}
                color={colors.textSecondary}
              />
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
              <ActivityIndicator color={theme.mode === 'dark' ? '#3b2a1f' : '#FFFFFF'} />
            ) : (
              <Text style={styles.buttonText}>Add to Wishlist</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderImageTab = () => {
    const placeholderColor = theme.mode === 'dark' ? 'rgba(255,255,255,0.55)' : colors.textSecondary;

    return (
      <View style={styles.content}>
        <View style={styles.formCard}>
          <Text style={styles.label}>Upload or Paste Image</Text>

          {selectedImageUri ? (
            <View>
              <Image
                source={resolveImageSource(selectedImageUri)}
                style={styles.selectedImage}
                resizeMode="cover"
              />
              <TouchableOpacity
                style={styles.removeImageButton}
                onPress={() => setSelectedImageUri(null)}
              >
                <IconSymbol
                  ios_icon_name="xmark"
                  android_material_icon_name="close"
                  size={16}
                  color="#FFFFFF"
                />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.imagePickerButton}
              onPress={handleUploadImageForIdentification}
            >
              <IconSymbol
                ios_icon_name="camera"
                android_material_icon_name="camera"
                size={32}
                color={colors.textSecondary}
              />
              <Text style={styles.imagePickerText}>Tap to select image</Text>
            </TouchableOpacity>
          )}

          {!selectedImageUri && (
            <TouchableOpacity style={styles.secondaryButton} onPress={handlePasteImageUrl}>
              <Text style={styles.secondaryButtonText}>Paste Image URL</Text>
            </TouchableOpacity>
          )}

          {selectedImageUri && (
            <TouchableOpacity
              style={[styles.button, identifyingImage && styles.buttonDisabled]}
              onPress={handleIdentifyProduct}
              disabled={identifyingImage}
            >
              {identifyingImage ? (
                <ActivityIndicator color={theme.mode === 'dark' ? '#3b2a1f' : '#FFFFFF'} />
              ) : (
                <Text style={styles.buttonText}>Identify Product</Text>
              )}
            </TouchableOpacity>
          )}

          {identifyingImage && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.accent} />
              <Text style={styles.loadingText}>Analyzing image...</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} backgroundColor={colors.background} />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Add Item</Text>
        </View>

        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'url' && styles.tabActive]}
            onPress={() => setActiveTab('url')}
          >
            <Text style={[styles.tabText, activeTab === 'url' && styles.tabTextActive]}>
              From URL
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'manual' && styles.tabActive]}
            onPress={() => setActiveTab('manual')}
          >
            <Text style={[styles.tabText, activeTab === 'manual' && styles.tabTextActive]}>
              Manual
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'image' && styles.tabActive]}
            onPress={() => setActiveTab('image')}
          >
            <Text style={[styles.tabText, activeTab === 'image' && styles.tabTextActive]}>
              From Image
            </Text>
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
              {activeTab === 'url' && renderUrlTab()}
              {activeTab === 'manual' && renderManualTab()}
              {activeTab === 'image' && renderImageTab()}
            </ScrollView>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </>
  );
}
