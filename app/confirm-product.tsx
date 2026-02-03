
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

// Brand keywords for local detection (expandable)
const BRAND_KEYWORDS = [
  'kerastase',
  'loreal',
  'dior',
  'chanel',
  'nike',
  'adidas',
  'apple',
  'samsung',
  'sony',
  'gucci',
  'prada',
  'versace',
  'armani',
  'burberry',
  'hermes',
  'cartier',
  'rolex',
  'omega',
  'tissot',
  'seiko',
  'casio',
  'fossil',
  'michael kors',
  'coach',
  'kate spade',
  'tory burch',
  'ralph lauren',
  'tommy hilfiger',
  'calvin klein',
  'hugo boss',
  'lacoste',
  'polo',
  'zara',
  'h&m',
  'uniqlo',
  'gap',
  'old navy',
  'banana republic',
  'j.crew',
  'anthropologie',
  'urban outfitters',
  'forever 21',
  'topshop',
  'asos',
  'boohoo',
  'prettylittlething',
  'missguided',
  'nasty gal',
  'revolve',
  'nordstrom',
  'macys',
  'bloomingdales',
  'saks',
  'neiman marcus',
  'bergdorf goodman',
  'barneys',
  'sephora',
  'ulta',
  'mac',
  'nars',
  'urban decay',
  'too faced',
  'benefit',
  'clinique',
  'estee lauder',
  'lancome',
  'ysl',
  'tom ford',
  'charlotte tilbury',
  'fenty beauty',
  'kylie cosmetics',
  'anastasia beverly hills',
  'tarte',
  'smashbox',
  'bobbi brown',
  'laura mercier',
  'nyx',
  'maybelline',
  'revlon',
  'covergirl',
  'neutrogena',
  'cetaphil',
  'cerave',
  'la roche posay',
  'vichy',
  'avene',
  'bioderma',
  'eucerin',
  'nivea',
  'dove',
  'olay',
  'garnier',
  'pantene',
  'head & shoulders',
  'herbal essences',
  'tresemme',
  'aussie',
  'ogx',
  'redken',
  'matrix',
  'paul mitchell',
  'sebastian',
  'aveda',
  'bumble and bumble',
  'living proof',
  'ouai',
  'briogeo',
  'olaplex',
  'moroccanoil',
  'argan oil',
];

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
  noMatchesContainer: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    alignItems: 'center',
  },
  noMatchesTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  noMatchesText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 16,
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
  detectedTextContainer: {
    backgroundColor: '#e8f5e9',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#4caf50',
  },
  detectedTextTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2e7d32',
    marginBottom: 8,
  },
  detectedTextContent: {
    fontSize: 14,
    color: '#1b5e20',
    lineHeight: 20,
  },
  editHint: {
    fontSize: 12,
    color: colors.textSecondary,
    fontStyle: 'italic',
    marginTop: 4,
    marginBottom: 8,
  },
  countryWarning: {
    backgroundColor: '#fff3cd',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#ffc107',
  },
  countryWarningTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#856404',
    marginBottom: 8,
  },
  countryWarningText: {
    fontSize: 14,
    color: '#856404',
    marginBottom: 12,
  },
  settingsButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignSelf: 'flex-start',
  },
  settingsButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});

function resolveImageSource(source: string | number | ImageSourcePropType | undefined): ImageSourcePropType {
  if (!source) return { uri: '' };
  if (typeof source === 'string') return { uri: source };
  return source as ImageSourcePropType;
}

/**
 * Clean and normalize text for processing
 */
function cleanAndNormalizeText(text: string): string {
  return text
    .replace(/[^a-zA-Z0-9\s&]/g, ' ') // Keep alphanumeric, spaces, and &
    .replace(/\s+/g, ' ') // Collapse multiple spaces
    .toLowerCase()
    .trim();
}

/**
 * Find brand keyword in text
 */
function findBrandKeyword(text: string, keywords: string[]): string | null {
  const normalizedText = text.toLowerCase();
  
  // Sort keywords by length (longest first) to match multi-word brands first
  const sortedKeywords = [...keywords].sort((a, b) => b.length - a.length);
  
  for (const keyword of sortedKeywords) {
    if (normalizedText.includes(keyword.toLowerCase())) {
      // Capitalize first letter of each word
      return keyword
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    }
  }
  
  return null;
}

/**
 * Extract meaningful words from text
 */
function getMeaningfulWords(text: string, min: number, max: number): string | null {
  // Common stop words to filter out
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'be',
    'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will',
    'would', 'should', 'could', 'may', 'might', 'must', 'can', 'this',
    'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they',
    'ml', 'oz', 'g', 'kg', 'lb', 'size', 'color', 'new', 'used',
  ]);
  
  const words = text
    .split(/\s+/)
    .filter(word => {
      // Filter out very short words, numbers only, and stop words
      return (
        word.length > 2 &&
        !/^\d+$/.test(word) &&
        !stopWords.has(word.toLowerCase())
      );
    });
  
  if (words.length === 0) return null;
  
  // Take between min and max words
  const selectedWords = words.slice(0, Math.min(words.length, max));
  
  if (selectedWords.length < min) {
    // If we don't have enough meaningful words, return what we have
    return selectedWords.length > 0 ? selectedWords.join(' ') : null;
  }
  
  // Capitalize first letter of each word
  return selectedWords
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Perform local OCR/text extraction fallback
 * This is a placeholder - in production, you would integrate a local OCR library
 * For now, we'll extract text from the API response's detectedText field
 */
async function performLocalOcr(imageUri: string, apiDetectedText?: string): Promise<string | null> {
  console.log('[LocalOCR] Starting local text extraction fallback');
  
  // If we have detected text from the API, use that as our "local OCR"
  if (apiDetectedText && apiDetectedText.trim()) {
    console.log('[LocalOCR] Using API detected text as fallback:', apiDetectedText);
    return apiDetectedText.trim();
  }
  
  // TODO: Integrate actual local OCR library here
  // Options:
  // 1. react-native-text-detector (iOS/Android native OCR)
  // 2. expo-ml-kit (Google ML Kit for text recognition)
  // 3. tesseract.js (JavaScript OCR, works on web too)
  
  console.warn('[LocalOCR] No local OCR library integrated yet. Returning null.');
  return null;
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

  const [loading, setLoading] = useState(true);
  const [identifying, setIdentifying] = useState(false);
  const [result, setResult] = useState<IdentificationResult | null>(null);
  const [selectedProductIndex, setSelectedProductIndex] = useState<number | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [showSkipModal, setShowSkipModal] = useState(false);
  const [detectedText, setDetectedText] = useState<string | null>(null);
  
  // Editable fields
  const [title, setTitle] = useState('');
  const [imageUri, setImageUri] = useState(imageUrl as string);
  const [price, setPrice] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  // Ref to prevent multiple analysis calls
  const analysisStarted = useRef(false);

  // Get country from Settings - NEVER reset or remove it
  const currentCountry = smartLocationSettings?.activeSearchCountry;
  const currentCurrency = smartLocationSettings?.currencyCode || currency;

  /**
   * CRITICAL: Auto-run image analysis when screen loads with a photo
   * This is the main fix for the bug
   */
  const identifyProduct = useCallback(async () => {
    // CRITICAL GUARD: Prevent multiple simultaneous calls
    if (analysisStarted.current) {
      console.log('[ConfirmProduct] Analysis already in progress, skipping');
      return;
    }

    if (!imageUrl || typeof imageUrl !== 'string') {
      console.log('[ConfirmProduct] No image URL provided, skipping analysis');
      setLoading(false);
      return;
    }

    // Check if country is set in Settings
    if (!currentCountry) {
      console.log('[ConfirmProduct] Country not set in Settings, skipping analysis');
      setLoading(false);
      setAnalysisError('Please set your country in Settings to enable product identification.');
      return;
    }

    console.log('[ConfirmProduct] 🔍 Starting automatic image analysis for:', imageUrl);
    analysisStarted.current = true; // Mark as started IMMEDIATELY
    setLoading(true);
    setIdentifying(true);
    setAnalysisError(null);
    setDetectedText(null); // Reset detected text for retry
    setResult(null); // CRITICAL: Reset result to clear any stale suggestions

    try {
      // Get location settings from SmartLocationContext (Settings only)
      const effectiveCountryCode = currentCountry;
      const effectiveCurrencyCode = currentCurrency;
      
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

      // Store raw detected text for UI display
      const rawDetectedText = response.query.detectedText || '';
      setDetectedText(rawDetectedText);

      // PRIMARY ANALYSIS SUCCESS - Use API matches
      if (response.matches.length > 0) {
        console.log('[ConfirmProduct] ✅ Primary analysis succeeded with', response.matches.length, 'matches');
        
        // Convert response to IdentificationResult format
        const identResult: IdentificationResult = {
          bestGuessTitle: response.query.detectedText || response.query.detectedBrand || null,
          bestGuessCategory: response.query.guessedCategory || null,
          keywords: response.query.detectedText ? response.query.detectedText.split(' ') : [],
          confidence: response.matches[0].confidence,
          suggestedProducts: response.matches.map(match => ({
            title: match.name,
            imageUrl: match.imageUrl,
            likelyUrl: null,
          })),
        };

        setResult(identResult);

        // Auto-fill Item Name from first match
        const firstMatch = response.matches[0];
        console.log('[ConfirmProduct] Auto-filling item name from first match:', firstMatch.name);
        setTitle(firstMatch.name);

        // Auto-select the first match
        console.log('[ConfirmProduct] Auto-selecting first match');
        setSelectedProductIndex(0);
        if (firstMatch.imageUrl) {
          setImageUri(firstMatch.imageUrl);
        }

        // Clear error if successful
        setAnalysisError(null);
      } else {
        // FALLBACK: Primary analysis returned no matches
        console.log('[ConfirmProduct] ⚠️ Primary analysis returned no matches - activating fallback');
        await activateLocalFallback(rawDetectedText);
      }
    } catch (error: any) {
      console.error('[ConfirmProduct] ❌ Analysis failed:', error.message);
      console.error('[ConfirmProduct] Stack trace:', error.stack);
      
      // Set user-friendly error message
      setAnalysisError("Couldn't analyze photo. Using local detection.");
      
      // FALLBACK: API call failed - try local OCR
      console.log('[ConfirmProduct] 🔄 API failed - activating local fallback');
      await activateLocalFallback();
    } finally {
      setLoading(false);
      setIdentifying(false);
      analysisStarted.current = false; // Allow retry
    }
  }, [imageUrl, currentCountry, currentCurrency]);

  /**
   * LOCAL FALLBACK: Extract text locally and generate item name
   */
  const activateLocalFallback = async (apiDetectedText?: string) => {
    console.log('[LocalFallback] 🔄 Activating local fallback mechanism');
    
    try {
      // Step 1: Run local OCR (or use API detected text if available)
      const localOcrText = await performLocalOcr(imageUrl as string, apiDetectedText);
      console.log('[LocalFallback] Local OCR result:', localOcrText);
      
      if (localOcrText) {
        // Store raw detected text for UI display
        setDetectedText(localOcrText);
        
        // Step 2: Clean and normalize the text
        const cleanedText = cleanAndNormalizeText(localOcrText);
        console.log('[LocalFallback] Cleaned text:', cleanedText);
        
        // Step 3: Try to find a brand keyword
        const brandKeyword = findBrandKeyword(cleanedText, BRAND_KEYWORDS);
        console.log('[LocalFallback] Brand keyword found:', brandKeyword);
        
        if (brandKeyword) {
          // Step 4a: Brand detected - use brand name with hint
          const fallbackTitle = `${brandKeyword} (detected) - Please specify product`;
          console.log('[LocalFallback] ✅ Setting item name with brand:', fallbackTitle);
          setTitle(fallbackTitle);
        } else {
          // Step 4b: No brand - extract meaningful words
          const meaningfulWords = getMeaningfulWords(cleanedText, 2, 6);
          console.log('[LocalFallback] Meaningful words extracted:', meaningfulWords);
          
          if (meaningfulWords) {
            console.log('[LocalFallback] ✅ Setting item name from meaningful words:', meaningfulWords);
            setTitle(meaningfulWords);
          } else {
            // Step 4c: No meaningful words - generic fallback
            console.log('[LocalFallback] ⚠️ No meaningful words found - using generic fallback');
            setTitle('Product (detected) - Please specify');
          }
        }
        
        // CRITICAL: Create result with EMPTY suggestedProducts array
        setResult({
          bestGuessTitle: localOcrText,
          bestGuessCategory: null,
          keywords: cleanedText.split(' '),
          confidence: 0.5, // Low confidence for local fallback
          suggestedProducts: [], // EMPTY - no matches
        });
      } else {
        // Step 5: Truly no readable text detected
        console.log('[LocalFallback] ⚠️ No readable text detected in image');
        setDetectedText('No readable text detected');
        setTitle('Product - Please specify');
        
        // CRITICAL: Create result with EMPTY suggestedProducts array
        setResult({
          bestGuessTitle: null,
          bestGuessCategory: null,
          keywords: [],
          confidence: 0,
          suggestedProducts: [], // EMPTY - no matches
        });
      }
    } catch (fallbackError: any) {
      console.error('[LocalFallback] ❌ Fallback failed:', fallbackError);
      // Even if fallback fails, set a generic title
      setTitle('Product - Please specify');
      setDetectedText('Error detecting text');
      
      // CRITICAL: Create result with EMPTY suggestedProducts array
      setResult({
        bestGuessTitle: null,
        bestGuessCategory: null,
        keywords: [],
        confidence: 0,
        suggestedProducts: [], // EMPTY - no matches
      });
    }
  };

  /**
   * CRITICAL: Run analysis automatically on mount if we have a photo
   * This useEffect ensures analysis ALWAYS runs when entering the screen with a photo
   */
  useEffect(() => {
    console.log('[ConfirmProduct] Component mounted with params:', {
      hasImageUrl: !!imageUrl,
      hasIdentificationResult: !!identificationResult,
      hasParamTitle: !!paramTitle,
      hasCountry: !!currentCountry,
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
      identifyProduct();
    } else if (!imageUrl) {
      console.log('[ConfirmProduct] No image URL, skipping analysis');
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // CRITICAL: Empty deps - run ONLY on mount

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
          countryCode: currentCountry || null,
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

  const handleTryAgain = useCallback(() => {
    console.log('[ConfirmProduct] User tapped Try Again - restarting analysis');
    analysisStarted.current = false; // Reset the flag
    setAnalysisError(null);
    setResult(null);
    setSelectedProductIndex(null);
    setDetectedText(null);
    setTitle(''); // Clear title for fresh analysis
    identifyProduct();
  }, [identifyProduct]);

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

  // CRITICAL: Calculate suggestion count from actual array length
  const suggestionCount = result?.suggestedProducts?.length || 0;
  const hasSuggestions = suggestionCount > 0;
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

        {/* Country Warning - Show if not set in Settings */}
        {!currentCountry && (
          <View style={styles.countryWarning}>
            <Text style={styles.countryWarningTitle}>Country Not Set</Text>
            <Text style={styles.countryWarningText}>
              Please set your country in Settings to enable product identification and price tracking.
            </Text>
            <TouchableOpacity
              style={styles.settingsButton}
              onPress={() => router.push('/location')}
            >
              <Text style={styles.settingsButtonText}>Go to Settings</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Detected Text Display */}
        {detectedText && detectedText !== 'No readable text detected' && (
          <View style={styles.detectedTextContainer}>
            <Text style={styles.detectedTextTitle}>Detected from photo:</Text>
            <Text style={styles.detectedTextContent}>{detectedText}</Text>
          </View>
        )}

        {/* Analysis Error */}
        {analysisError && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorTitle}>Analysis Issue</Text>
            <Text style={styles.errorText}>{analysisError}</Text>
            {currentCountry ? (
              <TouchableOpacity style={styles.retryButton} onPress={handleTryAgain}>
                <Text style={styles.retryButtonText}>Retry Analysis</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.settingsButton}
                onPress={() => router.push('/location')}
              >
                <Text style={styles.settingsButtonText}>Go to Settings</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* CRITICAL FIX: Only show suggestion count when suggestions.length > 0 */}
        {hasIncompleteInfo && !analysisError && hasSuggestions && (
          <View style={styles.incompleteWarning}>
            <Text style={styles.incompleteTitle}>Incomplete Information</Text>
            <Text style={styles.incompleteText}>
              {suggestionCount} suggestion{suggestionCount === 1 ? '' : 's'} available below
            </Text>
          </View>
        )}

        {result && (
          <>
            <View style={styles.confidenceContainer}>
              <Text style={styles.confidenceText}>Confidence Score</Text>
              <Text style={styles.confidenceValue}>{confidencePercentage}%</Text>
            </View>

            {/* CRITICAL FIX: Only show matches section when suggestions.length > 0 */}
            {hasSuggestions ? (
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
              /* CRITICAL FIX: Show "No matches found" with Retry button when suggestions.length === 0 */
              <View style={styles.noMatchesContainer}>
                <Text style={styles.noMatchesTitle}>No matches found</Text>
                <Text style={styles.noMatchesText}>
                  We couldn't find any matching products. You can enter details manually below or try analyzing again.
                </Text>
                {currentCountry && (
                  <TouchableOpacity style={styles.retryButton} onPress={handleTryAgain}>
                    <Text style={styles.retryButtonText}>Retry Analysis</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {(selectedProductIndex !== null || !hasSuggestions) && (
              <View style={styles.editSection}>
                <Text style={styles.sectionTitle}>Edit Details</Text>

                <Text style={styles.label}>Title *</Text>
                <Text style={styles.editHint}>
                  Tap to edit and correct the detected product name
                </Text>
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

                {currentCountry && (
                  <TouchableOpacity style={styles.secondaryButton} onPress={handleTryAgain}>
                    <Text style={styles.secondaryButtonText}>Try Again</Text>
                  </TouchableOpacity>
                )}

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
