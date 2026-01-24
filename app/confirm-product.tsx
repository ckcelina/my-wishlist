
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
  ImageSourcePropType,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { useAuth } from '@/contexts/AuthContext';
import Constants from 'expo-constants';
import * as ImagePicker from 'expo-image-picker';

interface SuggestedProduct {
  title: string;
  imageUrl: string | null;
  likelyUrl: string | null;
}

interface IdentificationResult {
  bestGuessTitle: string | null;
  bestGuessCategory: string | null;
  keywords: string[];
  confidence: number;
  suggestedProducts: SuggestedProduct[];
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.textSecondary,
  },
  uploadedImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginBottom: 24,
    backgroundColor: colors.cardBackground,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16,
  },
  confidenceContainer: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  confidenceText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  confidenceValue: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.primary,
  },
  productCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedCard: {
    borderColor: colors.primary,
  },
  productCardContent: {
    flexDirection: 'row',
    gap: 12,
  },
  productImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: colors.background,
  },
  productInfo: {
    flex: 1,
  },
  productTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  selectButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  selectButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  noneButton: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.border,
  },
  noneButtonText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  editSection: {
    marginTop: 24,
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
    marginBottom: 16,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  imagePreview: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginTop: 12,
    marginBottom: 16,
    backgroundColor: colors.cardBackground,
  },
  imageButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  secondaryButton: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
  },
  secondaryButtonText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryButtonDisabled: {
    opacity: 0.5,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  linkButton: {
    alignItems: 'center',
    padding: 12,
  },
  linkButtonText: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: '600',
  },
});

function resolveImageSource(source: string | number | ImageSourcePropType | undefined): ImageSourcePropType {
  if (!source) return { uri: '' };
  if (typeof source === 'string') return { uri: source };
  return source as ImageSourcePropType;
}

export default function ConfirmProductScreen() {
  const router = useRouter();
  const { imageUrl, wishlistId, identificationResult } = useLocalSearchParams();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [identifying, setIdentifying] = useState(false);
  const [result, setResult] = useState<IdentificationResult | null>(null);
  const [selectedProductIndex, setSelectedProductIndex] = useState<number | null>(null);
  
  // Editable fields
  const [title, setTitle] = useState('');
  const [imageUri, setImageUri] = useState(imageUrl as string);
  const [price, setPrice] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    console.log('ConfirmProductScreen mounted with imageUrl:', imageUrl);
    
    // Check if we already have identification result from params
    if (identificationResult && typeof identificationResult === 'string') {
      try {
        const parsedResult = JSON.parse(identificationResult);
        console.log('[ConfirmProductScreen] Using pre-identified result:', parsedResult);
        setResult(parsedResult);
        setTitle(parsedResult.bestGuessTitle || '');
        setLoading(false);
      } catch (error) {
        console.error('[ConfirmProductScreen] Failed to parse identification result:', error);
        identifyProduct();
      }
    } else {
      identifyProduct();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageUrl, identificationResult]);

  const identifyProduct = async () => {
    console.log('[ConfirmProductScreen] Calling identify-from-image API');
    setLoading(true);
    setIdentifying(true);

    try {
      const backendUrl = Constants.expoConfig?.extra?.backendUrl;
      
      // Prepare request body
      const requestBody: { imageUrl?: string; imageBase64?: string } = {};
      
      if (typeof imageUrl === 'string') {
        if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
          requestBody.imageUrl = imageUrl;
        } else if (imageUrl.startsWith('file://')) {
          // Upload local file first
          const uploadedUrl = await uploadImage(imageUrl);
          if (uploadedUrl) {
            requestBody.imageUrl = uploadedUrl;
          } else {
            throw new Error('Failed to upload image');
          }
        } else {
          requestBody.imageBase64 = imageUrl;
        }
      }

      console.log('[ConfirmProductScreen] Sending identification request');
      const response = await fetch(`${backendUrl}/api/items/identify-from-image`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[ConfirmProductScreen] Image identification failed:', errorText);
        throw new Error('Failed to identify product');
      }

      const data = await response.json();
      console.log('[ConfirmProductScreen] Image identification result:', data);

      setResult(data);
      setTitle(data.bestGuessTitle || '');
    } catch (error: any) {
      console.error('[ConfirmProductScreen] Failed to identify product:', error);
      Alert.alert('Error', 'Failed to identify product. Please try again.');
    } finally {
      setLoading(false);
      setIdentifying(false);
    }
  };

  const handleSelectProduct = (index: number) => {
    console.log('User selected product at index:', index);
    setSelectedProductIndex(index);
    
    const selectedProduct = result?.suggestedProducts[index];
    if (selectedProduct) {
      setTitle(selectedProduct.title);
      if (selectedProduct.imageUrl) {
        setImageUri(selectedProduct.imageUrl);
      }
    }
  };

  const handleNoneOfThese = () => {
    console.log('User selected None of these');
    router.replace({
      pathname: '/(tabs)/add',
      params: {
        wishlistId: wishlistId as string,
        prefilledImage: imageUri,
      },
    });
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
      setImageUri(result.assets[0].uri);
      console.log('Image selected:', result.assets[0].uri);
    }
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
      return null;
    }
  };

  const handleConfirmAndSave = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a product title');
      return;
    }

    if (!wishlistId) {
      Alert.alert('Error', 'No wishlist selected');
      return;
    }

    console.log('[ConfirmProductScreen] Saving confirmed product to wishlist:', wishlistId);
    setSaving(true);

    try {
      // Check for duplicates before saving
      console.log('[ConfirmProductScreen] Checking for duplicates');
      const backendUrl = Constants.expoConfig?.extra?.backendUrl;
      const duplicateCheckResponse = await fetch(`${backendUrl}/api/items/check-duplicates`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          wishlistId,
          title: title.trim(),
          imageUrl: imageUri || undefined,
        }),
      });

      if (!duplicateCheckResponse.ok) {
        console.error('[ConfirmProductScreen] Duplicate check failed, proceeding anyway');
      } else {
        const duplicateData = await duplicateCheckResponse.json();
        console.log('[ConfirmProductScreen] Duplicate check result:', duplicateData);

        if (duplicateData.duplicates && duplicateData.duplicates.length > 0) {
          console.log('[ConfirmProductScreen] Found duplicates:', duplicateData.duplicates.length);
          
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
                  await saveConfirmedItemToBackend();
                },
              },
            ]
          );
          return;
        }
      }

      // No duplicates found, proceed with saving
      await saveConfirmedItemToBackend();
    } catch (error: any) {
      console.error('[ConfirmProductScreen] Failed to save item:', error);
      Alert.alert('Error', 'Failed to save item. Please try again.');
      setSaving(false);
    }
  };

  const saveConfirmedItemToBackend = async () => {
    try {
      let finalImageUrl = imageUri;
      if (imageUri && imageUri.startsWith('file://')) {
        console.log('[ConfirmProductScreen] Uploading local image to backend');
        const uploadedUrl = await uploadImage(imageUri);
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
          title: title.trim(),
          imageUrl: finalImageUrl || null,
          currentPrice: price ? parseFloat(price) : null,
          currency: currency,
          notes: notes.trim() || null,
          userId: user?.id,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save item');
      }

      const savedItem = await response.json();
      console.log('[ConfirmProductScreen] Item saved successfully:', savedItem);

      Alert.alert('Success', 'Item added to wishlist!', [
        {
          text: 'OK',
          onPress: () => router.back(),
        },
      ]);
    } catch (error: any) {
      console.error('[ConfirmProductScreen] Failed to save item:', error);
      Alert.alert('Error', 'Failed to save item. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleTryAgain = () => {
    console.log('User tapped Try Again');
    identifyProduct();
  };

  const handleReportIssue = () => {
    console.log('User tapped Report an issue');
    router.push({
      pathname: '/report-problem',
      params: {
        context: 'confirm_product',
      },
    });
  };

  const confidencePercentage = result ? Math.round(result.confidence * 100) : 0;

  if (loading || identifying) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <Stack.Screen
          options={{
            title: 'Identify Product',
            headerBackTitle: 'Back',
          }}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Identifying product...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Stack.Screen
        options={{
          title: 'Confirm Product',
          headerBackTitle: 'Back',
        }}
      />
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        <Image
          source={resolveImageSource(imageUri)}
          style={styles.uploadedImage}
          resizeMode="cover"
        />

        {result && (
          <>
            <View style={styles.confidenceContainer}>
              <Text style={styles.confidenceText}>Confidence Score</Text>
              <Text style={styles.confidenceValue}>{confidencePercentage}%</Text>
            </View>

            <Text style={styles.sectionTitle}>We found these matches</Text>

            {result.suggestedProducts.map((product, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.productCard,
                  selectedProductIndex === index && styles.selectedCard,
                ]}
                onPress={() => handleSelectProduct(index)}
              >
                <View style={styles.productCardContent}>
                  {product.imageUrl && (
                    <Image
                      source={resolveImageSource(product.imageUrl)}
                      style={styles.productImage}
                      resizeMode="cover"
                    />
                  )}
                  <View style={styles.productInfo}>
                    <Text style={styles.productTitle}>{product.title}</Text>
                    <TouchableOpacity
                      style={styles.selectButton}
                      onPress={() => handleSelectProduct(index)}
                    >
                      <Text style={styles.selectButtonText}>
                        {selectedProductIndex === index ? 'Selected' : 'This is it'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableOpacity>
            ))}

            <TouchableOpacity style={styles.noneButton} onPress={handleNoneOfThese}>
              <Text style={styles.noneButtonText}>None of these</Text>
            </TouchableOpacity>

            {selectedProductIndex !== null && (
              <View style={styles.editSection}>
                <Text style={styles.sectionTitle}>Edit Details</Text>

                <Text style={styles.label}>Title *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter product title"
                  placeholderTextColor={colors.textSecondary}
                  value={title}
                  onChangeText={setTitle}
                />

                <Text style={styles.label}>Image</Text>
                <View style={styles.imageButtons}>
                  <TouchableOpacity style={styles.secondaryButton} onPress={handlePickImage}>
                    <Text style={styles.secondaryButtonText}>Change Image</Text>
                  </TouchableOpacity>
                </View>
                {imageUri && (
                  <Image
                    source={resolveImageSource(imageUri)}
                    style={styles.imagePreview}
                    resizeMode="cover"
                  />
                )}

                <Text style={styles.label}>Price (Optional)</Text>
                <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
                  <TextInput
                    style={[styles.input, { flex: 1, marginBottom: 0 }]}
                    placeholder="0.00"
                    placeholderTextColor={colors.textSecondary}
                    value={price}
                    onChangeText={setPrice}
                    keyboardType="decimal-pad"
                  />
                  <TextInput
                    style={[styles.input, { width: 80, marginBottom: 0 }]}
                    placeholder="USD"
                    placeholderTextColor={colors.textSecondary}
                    value={currency}
                    onChangeText={setCurrency}
                    autoCapitalize="characters"
                    maxLength={3}
                  />
                </View>

                <Text style={styles.label}>Notes (Optional)</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Add any notes..."
                  placeholderTextColor={colors.textSecondary}
                  value={notes}
                  onChangeText={setNotes}
                  multiline
                />

                <TouchableOpacity
                  style={[
                    styles.primaryButton,
                    (!title.trim() || saving) && styles.primaryButtonDisabled,
                  ]}
                  onPress={handleConfirmAndSave}
                  disabled={!title.trim() || saving}
                >
                  <Text style={styles.primaryButtonText}>
                    {saving ? 'Saving...' : 'Confirm & Save'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.secondaryButton} onPress={handleTryAgain}>
                  <Text style={styles.secondaryButtonText}>Try Again</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.linkButton} onPress={handleReportIssue}>
                  <Text style={styles.linkButtonText}>Report an issue with results</Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
