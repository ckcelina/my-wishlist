
import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  Modal,
  Pressable,
} from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { useAuth } from '@/contexts/AuthContext';
import Constants from 'expo-constants';
import * as ImagePicker from 'expo-image-picker';
import { identifyProductFromImage } from '@/utils/supabase-edge-functions';
import { useSmartLocation } from '@/contexts/SmartLocationContext';
import { useLocation } from '@/contexts/LocationContext';

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
  errorContainer: {
    backgroundColor: colors.errorLight || '#ffebee',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.error,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.error,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: colors.error,
    marginBottom: 12,
  },
  retryButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignSelf: 'flex-start',
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  incompleteWarning: {
    backgroundColor: '#fff3cd',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#ffc107',
  },
  incompleteTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#856404',
    marginBottom: 8,
  },
  incompleteText: {
    fontSize: 14,
    color: '#856404',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.background,
    borderRadius: 16,
    padding: 24,
    width: '80%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  modalText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalButtonPrimary: {
    backgroundColor: colors.primary,
  },
  modalButtonSecondary: {
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  modalButtonTextPrimary: {
    color: '#FFFFFF',
  },
  modalButtonTextSecondary: {
    color: colors.text,
  },
});

function resolveImageSource(source: string | number | ImageSourcePropType | undefined): ImageSourcePropType {
  if (!source) return { uri: '' };
  if (typeof source === 'string') return { uri: source };
  return source as ImageSourcePropType;
}

export default function ConfirmProductScreen() {
  const router = useRouter();
  const { 
    imageUrl, 
    wishlistId, 
    identificationResult,
    title: paramTitle,
    price: paramPrice,
    currency: paramCurrency,
    storeLink: paramStoreLink,
    storeDomain: paramStoreDomain,
    confidence: paramConfidence,
  } = useLocalSearchParams();
  const { user } = useAuth();
  const { settings: smartLocationSettings } = useSmartLocation();
  const { countryCode, currencyCode } = useLocation();

  const [loading, setLoading] = useState(true);
  const [identifying, setIdentifying] = useState(false);
  const [result, setResult] = useState<IdentificationResult | null>(null);
  const [selectedProductIndex, setSelectedProductIndex] = useState<number | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [showSkipModal, setShowSkipModal] = useState(false);
  
  // Editable fields
  const [title, setTitle] = useState('');
  const [imageUri, setImageUri] = useState(imageUrl as string);
  const [price, setPrice] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  // Ref to prevent multiple analysis calls
  const analysisStarted = useRef(false);

  /**
   * CRITICAL: Auto-run image analysis when screen loads with a photo
   * This is the main fix for the bug
   */
  const identifyProduct = useCallback(async () => {
    if (!imageUrl || typeof imageUrl !== 'string') {
      console.log('[ConfirmProduct] No image URL provided, skipping analysis');
      setLoading(false);
      return;
    }

    console.log('[ConfirmProduct] 🔍 Starting automatic image analysis for:', imageUrl);
    setLoading(true);
    setIdentifying(true);
    setAnalysisError(null);

    try {
      // Get location settings from SmartLocationContext (Settings only)
      const effectiveCountryCode = smartLocationSettings?.activeSearchCountry || countryCode || 'US';
      const effectiveCurrencyCode = smartLocationSettings?.currencyCode || currencyCode || 'USD';
      
      console.log('[ConfirmProduct] Using location:', effectiveCountryCode, 'currency:', effectiveCurrencyCode);
      console.log('[ConfirmProduct] Calling identify-product-from-image Edge Function...');

      // Call the Supabase Edge Function
      const response = await identifyProductFromImage(
        undefined, // imageBase64 - not using base64 for now
        imageUrl, // imageUrl
        effectiveCountryCode,
        effectiveCurrencyCode,
        'en' // languageCode - default to English for now
      );

      console.log('[ConfirmProduct] ✅ Analysis complete!');
      console.log('[ConfirmProduct] Detected text:', response.query.detectedText);
      console.log('[ConfirmProduct] Detected brand:', response.query.detectedBrand);
      console.log('[ConfirmProduct] Found', response.matches.length, 'matches');

      // Convert response to IdentificationResult format
      const identResult: IdentificationResult = {
        bestGuessTitle: response.query.detectedText || response.query.detectedBrand || null,
        bestGuessCategory: response.query.guessedCategory || null,
        keywords: response.query.detectedText ? response.query.detectedText.split(' ') : [],
        confidence: response.matches.length > 0 ? response.matches[0].confidence : 0,
        suggestedProducts: response.matches.map(match => ({
          title: match.name,
          imageUrl: match.imageUrl,
          likelyUrl: null, // We don't have URLs in the new format
        })),
      };

      setResult(identResult);

      // Auto-fill Item Name if detected
      if (identResult.bestGuessTitle) {
        console.log('[ConfirmProduct] Auto-filling item name:', identResult.bestGuessTitle);
        setTitle(identResult.bestGuessTitle);
      }

      // If we have matches, auto-select the first one
      if (identResult.suggestedProducts.length > 0) {
        console.log('[ConfirmProduct] Auto-selecting first match');
        setSelectedProductIndex(0);
        const firstMatch = identResult.suggestedProducts[0];
        setTitle(firstMatch.title);
        if (firstMatch.imageUrl) {
          setImageUri(firstMatch.imageUrl);
        }
      }

      // Clear error if successful
      setAnalysisError(null);
    } catch (error: any) {
      console.error('[ConfirmProduct] ❌ Analysis failed:', error.message);
      console.error('[ConfirmProduct] Stack trace:', error.stack);
      
      // Set user-friendly error message
      setAnalysisError("Couldn't analyze photo. Try again or enter details manually.");
      
      // Don't show Alert here - we'll show it in the UI
    } finally {
      setLoading(false);
      setIdentifying(false);
      analysisStarted.current = false; // Allow retry
    }
  }, [imageUrl, smartLocationSettings, countryCode, currencyCode]);

  /**
   * CRITICAL: Run analysis automatically on mount if we have a photo
   * This useEffect ensures analysis ALWAYS runs when entering the screen with a photo
   */
  useEffect(() => {
    console.log('[ConfirmProduct] Component mounted with params:', {
      hasImageUrl: !!imageUrl,
      hasIdentificationResult: !!identificationResult,
      hasParamTitle: !!paramTitle,
    });
    
    // Check if we have direct params from search (not image identification)
    if (paramTitle && typeof paramTitle === 'string') {
      console.log('[ConfirmProduct] Using search result params (skipping analysis)');
      setTitle(paramTitle);
      if (paramPrice && typeof paramPrice === 'string') {
        setPrice(paramPrice);
      }
      if (paramCurrency && typeof paramCurrency === 'string') {
        setCurrency(paramCurrency);
      }
      if (imageUrl && typeof imageUrl === 'string') {
        setImageUri(imageUrl);
      }
      
      // Create a mock result for display
      const mockResult: IdentificationResult = {
        bestGuessTitle: paramTitle,
        bestGuessCategory: null,
        keywords: [],
        confidence: paramConfidence ? parseFloat(paramConfidence as string) : 0.9,
        suggestedProducts: [{
          title: paramTitle,
          imageUrl: imageUrl as string || null,
          likelyUrl: paramStoreLink as string || null,
        }],
      };
      setResult(mockResult);
      setSelectedProductIndex(0);
      setLoading(false);
      return;
    }
    
    // Check if we already have identification result from params
    if (identificationResult && typeof identificationResult === 'string') {
      try {
        const parsedResult = JSON.parse(identificationResult);
        console.log('[ConfirmProduct] Using pre-identified result:', parsedResult);
        setResult(parsedResult);
        setTitle(parsedResult.bestGuessTitle || '');
        setLoading(false);
        return;
      } catch (error) {
        console.error('[ConfirmProduct] Failed to parse identification result:', error);
        // Fall through to auto-analysis
      }
    }

    // CRITICAL: Auto-run analysis if we have a photo and haven't started yet
    if (imageUrl && !analysisStarted.current) {
      console.log('[ConfirmProduct] 🚀 Triggering automatic analysis...');
      analysisStarted.current = true;
      identifyProduct();
    } else if (!imageUrl) {
      console.log('[ConfirmProduct] No image URL, skipping analysis');
      setLoading(false);
    }
  }, [imageUrl, identificationResult, paramTitle, identifyProduct]);

  const handleSelectProduct = (index: number) => {
    console.log('[ConfirmProduct] User selected product at index:', index);
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
    console.log('[ConfirmProduct] User selected None of these');
    router.replace({
      pathname: '/(tabs)/add',
      params: {
        wishlistId: wishlistId as string,
        prefilledImage: imageUri,
      },
    });
  };

  const handlePickImage = async () => {
    console.log('[ConfirmProduct] Opening image picker');
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
      console.log('[ConfirmProduct] Image selected:', result.assets[0].uri);
    }
  };

  const uploadImage = async (imageUri: string): Promise<string | null> => {
    console.log('[ConfirmProduct] Uploading image to backend:', imageUri);
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
      console.log('[ConfirmProduct] Image uploaded successfully:', data.url);
      return data.url;
    } catch (error) {
      console.error('[ConfirmProduct] Error uploading image:', error);
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

    console.log('[ConfirmProduct] Saving confirmed product to wishlist:', wishlistId);
    setSaving(true);

    try {
      // Check for duplicates before saving
      console.log('[ConfirmProduct] Checking for duplicates');
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
        console.error('[ConfirmProduct] Duplicate check failed, proceeding anyway');
      } else {
        const duplicateData = await duplicateCheckResponse.json();
        console.log('[ConfirmProduct] Duplicate check result:', duplicateData);

        if (duplicateData.duplicates && duplicateData.duplicates.length > 0) {
          console.log('[ConfirmProduct] Found duplicates:', duplicateData.duplicates.length);
          
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
      console.error('[ConfirmProduct] Failed to save item:', error);
      Alert.alert('Error', 'Failed to save item. Please try again.');
      setSaving(false);
    }
  };

  const saveConfirmedItemToBackend = async () => {
    try {
      let finalImageUrl = imageUri;
      if (imageUri && imageUri.startsWith('file://')) {
        console.log('[ConfirmProduct] Uploading local image to backend');
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
      console.log('[ConfirmProduct] Item saved successfully:', savedItem);

      Alert.alert('Success', 'Item added to wishlist!', [
        {
          text: 'OK',
          onPress: () => router.back(),
        },
      ]);
    } catch (error: any) {
      console.error('[ConfirmProduct] Failed to save item:', error);
      Alert.alert('Error', 'Failed to save item. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleTryAgain = () => {
    console.log('[ConfirmProduct] User tapped Try Again - restarting analysis');
    analysisStarted.current = false; // Reset the flag
    setAnalysisError(null);
    setResult(null);
    setSelectedProductIndex(null);
    identifyProduct();
  };

  const handleSkipAnalysis = () => {
    console.log('[ConfirmProduct] User chose to skip analysis');
    setShowSkipModal(false);
    setLoading(false);
    setIdentifying(false);
    // Allow manual entry
  };

  const handleReportIssue = () => {
    console.log('[ConfirmProduct] User tapped Report an issue');
    router.push({
      pathname: '/report-problem',
      params: {
        context: 'confirm_product',
      },
    });
  };

  const confidencePercentage = result ? Math.round(result.confidence * 100) : 0;
  const hasIncompleteInfo = !title || !imageUri || !price;

  if (loading || identifying) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <Stack.Screen
          options={{
            title: 'Analyzing Product',
            headerBackTitle: 'Back',
          }}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Analyzing photo...</Text>
          <Text style={[styles.loadingText, { fontSize: 12, marginTop: 8 }]}>
            This may take a few seconds
          </Text>
          
          {/* Skip button after 3 seconds */}
          <TouchableOpacity
            style={[styles.linkButton, { marginTop: 20 }]}
            onPress={() => setShowSkipModal(true)}
          >
            <Text style={styles.linkButtonText}>Skip analysis</Text>
          </TouchableOpacity>
        </View>

        {/* Skip Analysis Modal */}
        <Modal
          visible={showSkipModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowSkipModal(false)}
        >
          <Pressable style={styles.modalOverlay} onPress={() => setShowSkipModal(false)}>
            <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
              <Text style={styles.modalTitle}>Skip Analysis?</Text>
              <Text style={styles.modalText}>
                You can skip the automatic analysis and enter product details manually.
              </Text>
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonSecondary]}
                  onPress={() => setShowSkipModal(false)}
                >
                  <Text style={[styles.modalButtonText, styles.modalButtonTextSecondary]}>
                    Wait
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonPrimary]}
                  onPress={handleSkipAnalysis}
                >
                  <Text style={[styles.modalButtonText, styles.modalButtonTextPrimary]}>
                    Skip
                  </Text>
                </TouchableOpacity>
              </View>
            </Pressable>
          </Pressable>
        </Modal>
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

        {/* Analysis Error */}
        {analysisError && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorTitle}>Analysis Failed</Text>
            <Text style={styles.errorText}>{analysisError}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={handleTryAgain}>
              <Text style={styles.retryButtonText}>Retry Analysis</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Incomplete Information Warning */}
        {hasIncompleteInfo && !analysisError && (
          <View style={styles.incompleteWarning}>
            <Text style={styles.incompleteTitle}>Incomplete Information</Text>
            <Text style={styles.incompleteText}>
              {result && result.suggestedProducts.length > 0
                ? `${result.suggestedProducts.length} suggestion${result.suggestedProducts.length === 1 ? '' : 's'} available below`
                : 'No matches found. You can enter details manually.'}
            </Text>
          </View>
        )}

        {result && (
          <>
            <View style={styles.confidenceContainer}>
              <Text style={styles.confidenceText}>Confidence Score</Text>
              <Text style={styles.confidenceValue}>{confidencePercentage}%</Text>
            </View>

            {result.suggestedProducts.length > 0 ? (
              <>
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
              </>
            ) : (
              <View style={styles.editSection}>
                <Text style={styles.sectionTitle}>No matches found</Text>
                <Text style={[styles.confidenceText, { marginBottom: 16 }]}>
                  Enter product details manually below
                </Text>
              </View>
            )}

            {(selectedProductIndex !== null || result.suggestedProducts.length === 0) && (
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
