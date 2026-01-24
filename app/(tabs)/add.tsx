
import { useAuth } from '@/contexts/AuthContext';
import React, { useState, useEffect } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Constants from 'expo-constants';

type TabType = 'url' | 'manual' | 'image';

interface ExtractedItem {
  title: string;
  imageUrl: string | null;
  price: string | null;
  currency: string;
  originalUrl: string;
  sourceDomain: string;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  tabContainer: {
    flexDirection: 'row',
    marginBottom: 24,
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: colors.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  activeTabText: {
    color: '#FFFFFF',
  },
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  secondaryButtonText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  imagePreview: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginTop: 12,
    backgroundColor: colors.cardBackground,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.textSecondary,
  },
  errorText: {
    color: colors.error,
    fontSize: 14,
    marginTop: 8,
  },
  infoText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 16,
  },
  sourceInfo: {
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  sourceLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  sourceValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  importButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 20,
    borderWidth: 1.5,
    borderColor: colors.accent,
    gap: 8,
  },
  importButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.accent,
  },
  imageButtonsContainer: {
    gap: 12,
  },
  imageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
  },
  imageButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  identifyButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 16,
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

function extractUrlFromText(text: string): string | null {
  const urlRegex = /(https?:\/\/[^\s]+)/gi;
  const matches = text.match(urlRegex);
  return matches ? matches[0] : null;
}

export default function AddItemScreen() {
  const router = useRouter();
  const { wishlistId, sharedUrl } = useLocalSearchParams();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<TabType>('url');
  
  // URL extraction state
  const [url, setUrl] = useState('');
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState('');
  
  // Editable extracted fields
  const [extractedTitle, setExtractedTitle] = useState('');
  const [extractedImageUrl, setExtractedImageUrl] = useState('');
  const [extractedPrice, setExtractedPrice] = useState('');
  const [extractedCurrency, setExtractedCurrency] = useState('USD');
  const [extractedNotes, setExtractedNotes] = useState('');
  const [originalUrl, setOriginalUrl] = useState('');
  const [sourceDomain, setSourceDomain] = useState('');
  const [showExtractedForm, setShowExtractedForm] = useState(false);

  // Manual entry state
  const [manualTitle, setManualTitle] = useState('');
  const [manualPrice, setManualPrice] = useState('');
  const [manualCurrency, setManualCurrency] = useState('USD');
  const [manualImageUri, setManualImageUri] = useState('');
  const [manualNotes, setManualNotes] = useState('');
  const [saving, setSaving] = useState(false);

  // Image identification state
  const [imageForIdentification, setImageForIdentification] = useState('');
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [identifying, setIdentifying] = useState(false);

  useEffect(() => {
    console.log('AddItemScreen mounted with wishlistId:', wishlistId);
    console.log('Shared URL from params:', sharedUrl);

    if (sharedUrl && typeof sharedUrl === 'string') {
      const decodedUrl = decodeURIComponent(sharedUrl);
      console.log('Processing shared URL:', decodedUrl);
      setUrl(decodedUrl);
      setActiveTab('url');
      handleExtractItemWithUrl(decodedUrl);
    }
  }, [wishlistId, sharedUrl]);

  useEffect(() => {
    const handleDeepLink = (event: { url: string }) => {
      console.log('Deep link received:', event.url);
      const parsedUrl = Linking.parse(event.url);
      console.log('Parsed deep link:', parsedUrl);

      if (parsedUrl.queryParams?.url) {
        const sharedUrlParam = parsedUrl.queryParams.url as string;
        console.log('URL from deep link query params:', sharedUrlParam);
        setUrl(sharedUrlParam);
        setActiveTab('url');
        handleExtractItemWithUrl(sharedUrlParam);
      } else if (parsedUrl.queryParams?.text) {
        const sharedText = parsedUrl.queryParams.text as string;
        console.log('Text from deep link:', sharedText);
        const extractedUrl = extractUrlFromText(sharedText);
        if (extractedUrl) {
          console.log('Extracted URL from text:', extractedUrl);
          setUrl(extractedUrl);
          setActiveTab('url');
          handleExtractItemWithUrl(extractedUrl);
        }
      }
    };

    const subscription = Linking.addEventListener('url', handleDeepLink);

    Linking.getInitialURL().then((initialUrl) => {
      if (initialUrl) {
        console.log('Initial URL:', initialUrl);
        handleDeepLink({ url: initialUrl });
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  const handleExtractItemWithUrl = async (urlToExtract: string) => {
    if (!urlToExtract || !urlToExtract.trim()) {
      console.log('No URL to extract');
      return;
    }

    let processedUrl = urlToExtract.trim();

    if (!isValidUrl(processedUrl)) {
      console.log('Invalid URL format, attempting to extract URL from text');
      const extracted = extractUrlFromText(processedUrl);
      if (extracted) {
        processedUrl = extracted;
      } else {
        console.log('Could not extract valid URL from text');
        Alert.alert('Invalid URL', 'The shared content does not contain a valid URL.');
        return;
      }
    }

    console.log('Auto-extracting item from URL:', processedUrl);
    setExtracting(true);
    setExtractError('');
    setShowExtractedForm(false);

    try {
      const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl;
      const supabaseAnonKey = Constants.expoConfig?.extra?.supabaseAnonKey;

      if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error('Supabase configuration missing');
      }

      const edgeFunctionUrl = `${supabaseUrl}/functions/v1/extract-item`;
      console.log('Calling Edge Function:', edgeFunctionUrl);

      const response = await fetch(edgeFunctionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseAnonKey}`,
        },
        body: JSON.stringify({ url: processedUrl }),
      });

      const data = await response.json();
      console.log('Edge Function response:', data);

      if (data.error) {
        setExtractError(data.error);
      }

      setExtractedTitle(data.title || '');
      setExtractedImageUrl(data.imageUrl || '');
      setExtractedPrice(data.price ? String(data.price) : '');
      setExtractedCurrency(data.currency || 'USD');
      setExtractedNotes('');
      setOriginalUrl(processedUrl);
      setSourceDomain(data.sourceDomain || '');
      setShowExtractedForm(true);

    } catch (error: any) {
      console.error('Failed to extract item:', error);
      setExtractError(error.message || 'Failed to extract item details');
      Alert.alert('Error', 'Failed to extract item details. You can edit the information manually or try again.');
    } finally {
      setExtracting(false);
    }
  };

  const handleExtractItem = async () => {
    if (!url.trim()) {
      Alert.alert('Error', 'Please enter a URL');
      return;
    }

    await handleExtractItemWithUrl(url);
  };

  const uploadImage = async (imageUri: string): Promise<string | null> => {
    console.log('Uploading image to backend:', imageUri);
    try {
      const backendUrl = Constants.expoConfig?.extra?.backendUrl;
      
      const formData = new FormData();
      const filename = imageUri.split('/').pop() || 'image.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';
      
      formData.append('image', {
        uri: imageUri,
        name: filename,
        type,
      } as any);

      const response = await fetch(`${backendUrl}/api/upload/image`, {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to upload image');
      }

      const data = await response.json();
      console.log('Image uploaded successfully:', data.url);
      return data.url;
    } catch (error) {
      console.error('Error uploading image:', error);
      Alert.alert('Upload Error', 'Failed to upload image. The item will be saved without an image.');
      return null;
    }
  };

  const handlePickExtractedImage = async () => {
    console.log('Opening image picker for extracted item');
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setExtractedImageUrl(result.assets[0].uri);
      console.log('Image selected:', result.assets[0].uri);
    }
  };

  const handleRemoveExtractedImage = () => {
    console.log('Removing extracted image');
    setExtractedImageUrl('');
  };

  const handleSaveExtractedItem = async () => {
    if (!extractedTitle.trim()) {
      Alert.alert('Error', 'Please enter an item title');
      return;
    }

    if (!wishlistId) {
      Alert.alert('Error', 'No wishlist selected');
      return;
    }

    console.log('Saving extracted item to wishlist:', wishlistId);
    setSaving(true);

    try {
      // Check for duplicates before saving
      console.log('[AddItemScreen] Checking for duplicates');
      const backendUrl = Constants.expoConfig?.extra?.backendUrl;
      const duplicateCheckResponse = await fetch(`${backendUrl}/api/items/check-duplicates`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          wishlistId,
          title: extractedTitle.trim(),
          originalUrl: originalUrl || undefined,
          imageUrl: extractedImageUrl || undefined,
        }),
      });

      if (!duplicateCheckResponse.ok) {
        console.error('[AddItemScreen] Duplicate check failed, proceeding anyway');
      } else {
        const duplicateData = await duplicateCheckResponse.json();
        console.log('[AddItemScreen] Duplicate check result:', duplicateData);

        if (duplicateData.duplicates && duplicateData.duplicates.length > 0) {
          console.log('[AddItemScreen] Found duplicates:', duplicateData.duplicates.length);
          
          // Show duplicate detection modal
          const DuplicateDetectionModal = (await import('@/components/DuplicateDetectionModal')).DuplicateDetectionModal;
          
          // For now, show an alert (we'll implement the modal properly later)
          const duplicateTitles = duplicateData.duplicates.map((d: any) => d.title).join('\n');
          Alert.alert(
            'Possible Duplicate',
            `This item looks similar to:\n\n${duplicateTitles}\n\nDo you want to add it anyway?`,
            [
              {
                text: 'Cancel',
                style: 'cancel',
                onPress: () => {
                  setSaving(false);
                },
              },
              {
                text: 'Add Anyway',
                onPress: async () => {
                  await saveItemToBackend();
                },
              },
            ]
          );
          return;
        }
      }

      // No duplicates found, proceed with saving
      await saveItemToBackend();
    } catch (error: any) {
      console.error('Failed to save item:', error);
      Alert.alert('Error', 'Failed to save item. Please try again.');
      setSaving(false);
    }
  };

  const saveItemToBackend = async () => {
    try {
      let finalImageUrl = extractedImageUrl;
      if (extractedImageUrl && extractedImageUrl.startsWith('file://')) {
        console.log('Uploading local image to backend');
        const uploadedUrl = await uploadImage(extractedImageUrl);
        if (uploadedUrl) {
          finalImageUrl = uploadedUrl;
        } else {
          finalImageUrl = null;
        }
      }

      const backendUrl = Constants.expoConfig?.extra?.backendUrl;
      const response = await fetch(`${backendUrl}/api/items`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          wishlistId,
          title: extractedTitle.trim(),
          imageUrl: finalImageUrl || null,
          currentPrice: extractedPrice ? parseFloat(extractedPrice) : null,
          currency: extractedCurrency,
          originalUrl: originalUrl,
          sourceDomain: sourceDomain,
          notes: extractedNotes.trim() || null,
          userId: user?.id,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save item');
      }

      const savedItem = await response.json();
      console.log('Item saved successfully:', savedItem);

      Alert.alert('Success', 'Item added to wishlist!', [
        {
          text: 'OK',
          onPress: () => router.back(),
        },
      ]);
    } catch (error: any) {
      console.error('Failed to save item:', error);
      Alert.alert('Error', 'Failed to save item. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handlePickImage = async () => {
    console.log('Opening image picker');
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setManualImageUri(result.assets[0].uri);
      console.log('Image selected:', result.assets[0].uri);
    }
  };

  const handleRemoveManualImage = () => {
    console.log('Removing manual image');
    setManualImageUri('');
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
    setSaving(true);

    try {
      // Check for duplicates before saving
      console.log('[AddItemScreen] Checking for duplicates (manual)');
      const backendUrl = Constants.expoConfig?.extra?.backendUrl;
      const duplicateCheckResponse = await fetch(`${backendUrl}/api/items/check-duplicates`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          wishlistId,
          title: manualTitle.trim(),
          imageUrl: manualImageUri || undefined,
        }),
      });

      if (!duplicateCheckResponse.ok) {
        console.error('[AddItemScreen] Duplicate check failed, proceeding anyway');
      } else {
        const duplicateData = await duplicateCheckResponse.json();
        console.log('[AddItemScreen] Duplicate check result:', duplicateData);

        if (duplicateData.duplicates && duplicateData.duplicates.length > 0) {
          console.log('[AddItemScreen] Found duplicates:', duplicateData.duplicates.length);
          
          const duplicateTitles = duplicateData.duplicates.map((d: any) => d.title).join('\n');
          Alert.alert(
            'Possible Duplicate',
            `This item looks similar to:\n\n${duplicateTitles}\n\nDo you want to add it anyway?`,
            [
              {
                text: 'Cancel',
                style: 'cancel',
                onPress: () => {
                  setSaving(false);
                },
              },
              {
                text: 'Add Anyway',
                onPress: async () => {
                  await saveManualItemToBackend();
                },
              },
            ]
          );
          return;
        }
      }

      // No duplicates found, proceed with saving
      await saveManualItemToBackend();
    } catch (error: any) {
      console.error('Failed to save manual item:', error);
      Alert.alert('Error', 'Failed to save item. Please try again.');
      setSaving(false);
    }
  };

  const saveManualItemToBackend = async () => {
    try {
      let finalImageUrl = manualImageUri;
      if (manualImageUri && manualImageUri.startsWith('file://')) {
        console.log('Uploading local image to backend');
        const uploadedUrl = await uploadImage(manualImageUri);
        if (uploadedUrl) {
          finalImageUrl = uploadedUrl;
        } else {
          finalImageUrl = null;
        }
      }

      const backendUrl = Constants.expoConfig?.extra?.backendUrl;
      const response = await fetch(`${backendUrl}/api/items`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          wishlistId,
          title: manualTitle.trim(),
          imageUrl: finalImageUrl || null,
          currentPrice: manualPrice ? parseFloat(manualPrice) : null,
          currency: manualCurrency,
          notes: manualNotes.trim() || null,
          userId: user?.id,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save item');
      }

      const savedItem = await response.json();
      console.log('Manual item saved successfully:', savedItem);

      Alert.alert('Success', 'Item added to wishlist!', [
        {
          text: 'OK',
          onPress: () => router.back(),
        },
      ]);
    } catch (error: any) {
      console.error('Failed to save manual item:', error);
      Alert.alert('Error', 'Failed to save item. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleUploadImageForIdentification = async () => {
    console.log('Opening image picker for identification');
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setImageForIdentification(result.assets[0].uri);
      console.log('Image selected for identification:', result.assets[0].uri);
    }
  };

  const handlePasteImageUrl = async () => {
    console.log('User tapped Paste Image URL');
    const clipboardContent = await Clipboard.getStringAsync();
    
    if (clipboardContent && isValidUrl(clipboardContent)) {
      setImageUrlInput(clipboardContent);
      setImageForIdentification(clipboardContent);
      console.log('Pasted image URL from clipboard:', clipboardContent);
    } else {
      Alert.alert('Paste Image URL', 'Please enter an image URL', [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'OK',
          onPress: () => {
            if (imageUrlInput && isValidUrl(imageUrlInput)) {
              setImageForIdentification(imageUrlInput);
            } else {
              Alert.alert('Error', 'Please enter a valid image URL');
            }
          },
        },
      ]);
    }
  };

  const handleIdentifyProduct = async () => {
    if (!imageForIdentification) {
      Alert.alert('Error', 'Please select or paste an image first');
      return;
    }

    console.log('Identifying product from image:', imageForIdentification);
    setIdentifying(true);

    try {
      const backendUrl = Constants.expoConfig?.extra?.backendUrl;
      
      // Prepare request body
      const requestBody: { imageUrl?: string; imageBase64?: string } = {};
      
      if (imageForIdentification.startsWith('http://') || imageForIdentification.startsWith('https://')) {
        // It's a URL
        requestBody.imageUrl = imageForIdentification;
      } else if (imageForIdentification.startsWith('file://')) {
        // It's a local file, we need to convert to base64
        // For now, upload it first and use the URL
        const uploadedUrl = await uploadImage(imageForIdentification);
        if (uploadedUrl) {
          requestBody.imageUrl = uploadedUrl;
        } else {
          throw new Error('Failed to upload image');
        }
      } else {
        // Assume it's already base64
        requestBody.imageBase64 = imageForIdentification;
      }

      console.log('[AddItemScreen] Calling identify-from-image API');
      const response = await fetch(`${backendUrl}/api/items/identify-from-image`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[AddItemScreen] Image identification failed:', errorText);
        throw new Error('Failed to identify product');
      }

      const data = await response.json();
      console.log('[AddItemScreen] Image identification result:', data);
      
      // Navigate to confirmation screen with results
      router.push({
        pathname: '/confirm-product',
        params: {
          imageUrl: imageForIdentification,
          wishlistId: wishlistId as string,
          identificationResult: JSON.stringify(data),
        },
      });
    } catch (error: any) {
      console.error('Failed to identify product:', error);
      Alert.alert('Error', 'Failed to identify product. Please try again.');
    } finally {
      setIdentifying(false);
    }
  };

  const renderUrlTab = () => {
    if (extracting) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Extracting item details...</Text>
        </View>
      );
    }

    if (showExtractedForm) {
      const sourceDisplayText = sourceDomain || 'Unknown source';
      const urlDisplayText = originalUrl;

      return (
        <View>
          <Text style={styles.infoText}>
            Review and edit the extracted details before saving
          </Text>

          {extractError && (
            <Text style={styles.errorText}>Note: {extractError}</Text>
          )}

          <View style={styles.sourceInfo}>
            <Text style={styles.sourceLabel}>Source</Text>
            <Text style={styles.sourceValue}>{sourceDisplayText}</Text>
            <Text style={styles.sourceLabel}>URL</Text>
            <Text style={styles.sourceValue} numberOfLines={2}>{urlDisplayText}</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Item Title *</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter item name"
              placeholderTextColor={colors.textSecondary}
              value={extractedTitle}
              onChangeText={setExtractedTitle}
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Price</Text>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="0.00"
                placeholderTextColor={colors.textSecondary}
                value={extractedPrice}
                onChangeText={setExtractedPrice}
                keyboardType="decimal-pad"
              />
              <TextInput
                style={[styles.input, { width: 80 }]}
                placeholder="USD"
                placeholderTextColor={colors.textSecondary}
                value={extractedCurrency}
                onChangeText={setExtractedCurrency}
                autoCapitalize="characters"
                maxLength={3}
              />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Image</Text>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity 
                style={[styles.secondaryButton, { flex: 1 }]} 
                onPress={handlePickExtractedImage}
              >
                <Text style={styles.secondaryButtonText}>
                  {extractedImageUrl ? 'Change Image' : 'Pick Image'}
                </Text>
              </TouchableOpacity>
              {extractedImageUrl && (
                <TouchableOpacity 
                  style={[styles.secondaryButton, { paddingHorizontal: 16 }]} 
                  onPress={handleRemoveExtractedImage}
                >
                  <Text style={styles.secondaryButtonText}>Remove</Text>
                </TouchableOpacity>
              )}
            </View>
            {extractedImageUrl && (
              <Image 
                source={resolveImageSource(extractedImageUrl)} 
                style={styles.imagePreview}
                resizeMode="cover"
              />
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Notes</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Add any notes about this item..."
              placeholderTextColor={colors.textSecondary}
              value={extractedNotes}
              onChangeText={setExtractedNotes}
              multiline
            />
          </View>

          <TouchableOpacity
            style={[styles.button, (!extractedTitle.trim() || saving) && styles.buttonDisabled]}
            onPress={handleSaveExtractedItem}
            disabled={!extractedTitle.trim() || saving}
          >
            <Text style={styles.buttonText}>
              {saving ? 'Saving...' : 'Save to Wishlist'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => {
              setShowExtractedForm(false);
              setUrl('');
              setExtractError('');
              setExtractedTitle('');
              setExtractedImageUrl('');
              setExtractedPrice('');
              setExtractedCurrency('USD');
              setExtractedNotes('');
              setOriginalUrl('');
              setSourceDomain('');
            }}
          >
            <Text style={styles.secondaryButtonText}>Try Another URL</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View>
        <View style={styles.section}>
          <Text style={styles.label}>Item URL</Text>
          <TextInput
            style={styles.input}
            placeholder="https://example.com/product"
            placeholderTextColor={colors.textSecondary}
            value={url}
            onChangeText={setUrl}
            autoCapitalize="none"
            keyboardType="url"
            autoCorrect={false}
          />
        </View>

        <TouchableOpacity
          style={[styles.button, (!url.trim() || extracting) && styles.buttonDisabled]}
          onPress={handleExtractItem}
          disabled={!url.trim() || extracting}
        >
          <Text style={styles.buttonText}>Fetch Item</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderManualTab = () => {
    return (
      <View>
        <View style={styles.section}>
          <Text style={styles.label}>Item Title *</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter item name"
            placeholderTextColor={colors.textSecondary}
            value={manualTitle}
            onChangeText={setManualTitle}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Price</Text>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="0.00"
              placeholderTextColor={colors.textSecondary}
              value={manualPrice}
              onChangeText={setManualPrice}
              keyboardType="decimal-pad"
            />
            <TextInput
              style={[styles.input, { width: 80 }]}
              placeholder="USD"
              placeholderTextColor={colors.textSecondary}
              value={manualCurrency}
              onChangeText={setManualCurrency}
              autoCapitalize="characters"
              maxLength={3}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Image</Text>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <TouchableOpacity 
              style={[styles.secondaryButton, { flex: 1 }]} 
              onPress={handlePickImage}
            >
              <Text style={styles.secondaryButtonText}>
                {manualImageUri ? 'Change Image' : 'Pick Image'}
              </Text>
            </TouchableOpacity>
            {manualImageUri && (
              <TouchableOpacity 
                style={[styles.secondaryButton, { paddingHorizontal: 16 }]} 
                onPress={handleRemoveManualImage}
              >
                <Text style={styles.secondaryButtonText}>Remove</Text>
              </TouchableOpacity>
            )}
          </View>
          {manualImageUri && (
            <Image 
              source={resolveImageSource(manualImageUri)} 
              style={styles.imagePreview}
              resizeMode="cover"
            />
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Notes</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Add any notes about this item..."
            placeholderTextColor={colors.textSecondary}
            value={manualNotes}
            onChangeText={setManualNotes}
            multiline
          />
        </View>

        <TouchableOpacity
          style={[styles.button, (!manualTitle.trim() || saving) && styles.buttonDisabled]}
          onPress={handleSaveManualItem}
          disabled={!manualTitle.trim() || saving}
        >
          <Text style={styles.buttonText}>
            {saving ? 'Saving...' : 'Add to Wishlist'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderImageTab = () => {
    if (identifying) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Identifying product...</Text>
        </View>
      );
    }

    return (
      <View>
        <Text style={styles.infoText}>
          Upload an image or paste an image URL to identify the product
        </Text>

        <View style={styles.imageButtonsContainer}>
          <TouchableOpacity
            style={styles.imageButton}
            onPress={handleUploadImageForIdentification}
          >
            <IconSymbol
              ios_icon_name="photo"
              android_material_icon_name="photo"
              size={24}
              color={colors.text}
            />
            <Text style={styles.imageButtonText}>Upload Image</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.imageButton}
            onPress={handlePasteImageUrl}
          >
            <IconSymbol
              ios_icon_name="link"
              android_material_icon_name="link"
              size={24}
              color={colors.text}
            />
            <Text style={styles.imageButtonText}>Paste Image URL</Text>
          </TouchableOpacity>
        </View>

        {imageForIdentification && (
          <View style={styles.section}>
            <Text style={styles.label}>Image Preview</Text>
            <Image
              source={resolveImageSource(imageForIdentification)}
              style={styles.imagePreview}
              resizeMode="cover"
            />
            <TouchableOpacity
              style={styles.identifyButton}
              onPress={handleIdentifyProduct}
            >
              <Text style={styles.buttonText}>Identify Product</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        <TouchableOpacity
          style={styles.importButton}
          onPress={() => {
            console.log('[AddItemScreen] User tapped Import from Store button');
            router.push('/import-wishlist');
          }}
          activeOpacity={0.7}
        >
          <IconSymbol
            ios_icon_name="download"
            android_material_icon_name="download"
            size={20}
            color={colors.accent}
          />
          <Text style={styles.importButtonText}>Import from Store</Text>
        </TouchableOpacity>

        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'url' && styles.activeTab]}
            onPress={() => setActiveTab('url')}
          >
            <Text style={[styles.tabText, activeTab === 'url' && styles.activeTabText]}>
              Paste Link
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'manual' && styles.activeTab]}
            onPress={() => setActiveTab('manual')}
          >
            <Text style={[styles.tabText, activeTab === 'manual' && styles.activeTabText]}>
              Manual
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'image' && styles.activeTab]}
            onPress={() => setActiveTab('image')}
          >
            <Text style={[styles.tabText, activeTab === 'image' && styles.activeTabText]}>
              Image
            </Text>
          </TouchableOpacity>
        </View>

        {activeTab === 'url' && renderUrlTab()}
        {activeTab === 'manual' && renderManualTab()}
        {activeTab === 'image' && renderImageTab()}
      </ScrollView>
    </SafeAreaView>
  );
}
