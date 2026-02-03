
import Constants from 'expo-constants';
import { Alert } from 'react-native';
import { supabase } from '@/lib/supabase';
import { appConfig, isEnvironmentConfigured, getConfigurationErrorMessage } from './environmentConfig';

// Types for Edge Function requests and responses
export interface SearchItemRequest {
  query: string;
  country: string;
  city?: string;
}

export interface Offer {
  storeName: string;
  storeDomain: string;
  productUrl: string;
  price: number;
  currency: string;
  availability: 'in_stock' | 'out_of_stock' | 'limited_stock' | 'pre_order' | 'unknown';
  shippingSupported: boolean;
  shippingCountry: string;
  estimatedDelivery?: string | null;
  originalPrice?: number | null;
  originalCurrency?: string | null;
  shippingCost?: number | null;
  confidenceScore?: number | null;
}

export interface SearchItemResponse {
  canonical: string;
  offers: Offer[];
  images: string[];
  meta: {
    requestId: string;
    durationMs: number;
    partial: boolean;
    cached: boolean;
  };
  error?: string;
}

export interface ExtractItemRequest {
  url: string;
  country: string;
}

export interface ExtractItemResponse {
  title: string | null;
  price: number | null;
  currency: string | null;
  availability: 'in_stock' | 'out_of_stock' | 'pre_order' | 'unknown';
  images: string[];
  shippingSupported: boolean;
  sourceDomain: string | null;
  meta: {
    requestId: string;
    durationMs: number;
    partial: boolean;
  };
  error?: string;
}

export interface FindAlternativesRequest {
  title: string;
  originalUrl?: string;
  countryCode?: string;
  city?: string;
}

export interface Alternative {
  storeName: string;
  domain: string;
  price: number;
  currency: string;
  url: string;
}

export interface FindAlternativesResponse {
  alternatives: Alternative[];
  meta: {
    requestId: string;
    durationMs: number;
    partial: boolean;
  };
  error?: string;
}

export interface ImportWishlistRequest {
  wishlistUrl: string;
}

export interface ImportedItem {
  title: string;
  imageUrl: string | null;
  price: number | null;
  currency: string | null;
  productUrl: string;
}

export interface ImportWishlistResponse {
  storeName: string | null;
  items: ImportedItem[];
  meta: {
    requestId: string;
    durationMs: number;
    partial: boolean;
  };
  error?: string;
}

export interface IdentifyFromImageRequest {
  imageUrl?: string;
  imageBase64?: string;
}

export interface SuggestedProduct {
  title: string;
  imageUrl: string | null;
  likelyUrl: string | null;
}

export interface IdentifyFromImageResponse {
  bestGuessTitle: string | null;
  bestGuessCategory: string | null;
  keywords: string[];
  confidence: number;
  suggestedProducts: SuggestedProduct[];
  meta: {
    requestId: string;
    durationMs: number;
    partial: boolean;
  };
  error?: string;
}

export interface SearchByNameRequest {
  query: string;
  countryCode?: string;
  city?: string;
  currency?: string;
  limit?: number;
}

export interface SearchResult {
  title: string;
  imageUrl: string | null;
  productUrl: string;
  storeDomain: string;
  price: number | null;
  currency: string | null;
  confidence: number;
}

export interface SearchByNameResponse {
  results: SearchResult[];
  meta: {
    requestId: string;
  };
  error?: string;
}

// Get Supabase configuration from appConfig with safe fallbacks
const SUPABASE_URL = appConfig.supabaseUrl || '';
const SUPABASE_ANON_KEY = appConfig.supabaseAnonKey || '';

// List of expected Edge Functions (case-sensitive)
const EXPECTED_EDGE_FUNCTIONS = [
  'search-item',
  'identify-from-image',
  'identify-product-from-image',
  'extract-item',
  'find-alternatives',
  'import-wishlist',
  'search-by-name',
  'price-check',
];

// Log configuration status on module load
if (!isEnvironmentConfigured()) {
  console.warn('[Supabase Edge Functions] Configuration missing - check app.json');
  console.warn('[Supabase Edge Functions] SUPABASE_URL:', SUPABASE_URL ? 'Set' : 'Missing');
  console.warn('[Supabase Edge Functions] SUPABASE_ANON_KEY:', SUPABASE_ANON_KEY ? 'Set' : 'Missing');
}

/**
 * Get the authorization token for Edge Function calls
 * Uses the signed-in user's access token when available, falls back to anon key
 */
async function getAuthToken(): Promise<string> {
  try {
    // Try to get the current session
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.warn('[Edge Function Auth] Error getting session:', error.message);
      console.log('[Edge Function Auth] Falling back to anon key');
      return SUPABASE_ANON_KEY;
    }
    
    if (session?.access_token) {
      console.log('[Edge Function Auth] Using user access token (JWT)');
      return session.access_token;
    }
    
    console.log('[Edge Function Auth] No session found, using anon key');
    return SUPABASE_ANON_KEY;
  } catch (error) {
    console.error('[Edge Function Auth] Unexpected error getting auth token:', error);
    console.log('[Edge Function Auth] Falling back to anon key');
    return SUPABASE_ANON_KEY;
  }
}

/**
 * Call a Supabase Edge Function with proper authentication and error handling
 * Works identically in ALL environments (Expo Go, TestFlight, App Store)
 * 
 * AUTHENTICATION:
 * - Uses signed-in user's JWT access token when available
 * - Falls back to anon key for unauthenticated requests
 * 
 * ERROR HANDLING:
 * - Shows user-friendly alerts on failure
 * - Continues app flow without breaking UI
 * - Returns safe fallback data
 */
async function callEdgeFunction<TRequest, TResponse>(
  functionName: string,
  request: TRequest,
  options?: { showErrorAlert?: boolean }
): Promise<TResponse> {
  const showErrorAlert = options?.showErrorAlert !== false; // Default to true

  // Check if environment is configured
  if (!isEnvironmentConfigured()) {
    const errorMessage = getConfigurationErrorMessage();
    console.error(`[Edge Function] ${errorMessage}`);
    
    if (showErrorAlert) {
      Alert.alert(
        'Configuration Error',
        'The app is not properly configured. Please contact support.',
        [{ text: 'OK' }]
      );
    }
    
    throw new Error(errorMessage);
  }

  // Verify function name is expected (case-sensitive)
  if (!EXPECTED_EDGE_FUNCTIONS.includes(functionName)) {
    console.warn(`[Edge Function] Unknown function '${functionName}' - returning safe fallback`);
    throw new Error(`Edge Function '${functionName}' is not recognized`);
  }

  const url = `${SUPABASE_URL}/functions/v1/${functionName}`;
  console.log(`[Edge Function] Calling ${functionName}:`, request);
  console.log(`[Edge Function] Environment: ${appConfig.environment}`);

  try {
    // Get the appropriate auth token (user JWT or anon key)
    const authToken = await getAuthToken();
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify(request),
    });

    // Handle 401 Unauthorized
    if (response.status === 401) {
      const errorText = await response.text();
      console.error(`[Edge Function] ${functionName} unauthorized (401):`, errorText);
      
      if (showErrorAlert) {
        Alert.alert(
          'Authentication Error',
          'Your session may have expired. Please try signing out and back in.',
          [{ text: 'OK' }]
        );
      }
      
      throw new Error(`Unauthorized: ${errorText}`);
    }

    // Handle 404 - function not deployed
    if (response.status === 404) {
      console.warn(`[Edge Function] ${functionName} not found (404) - function may not be deployed`);
      
      if (showErrorAlert) {
        Alert.alert(
          'Feature Unavailable',
          'This feature is temporarily unavailable. Please try again later.',
          [{ text: 'OK' }]
        );
      }
      
      throw new Error(`Edge Function '${functionName}' not found (404)`);
    }

    // Handle other error status codes
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Edge Function] ${functionName} failed:`, response.status, errorText);
      
      if (showErrorAlert) {
        Alert.alert(
          'Request Failed',
          `Unable to complete the request. Please try again. (Error ${response.status})`,
          [{ text: 'OK' }]
        );
      }
      
      throw new Error(`Edge function failed: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    console.log(`[Edge Function] ${functionName} response:`, data);

    return data as TResponse;
  } catch (error: any) {
    console.error(`[Edge Function] ${functionName} error:`, error);
    
    // Only show alert if we haven't already shown one
    if (showErrorAlert && !error.message.includes('Unauthorized') && !error.message.includes('not found')) {
      Alert.alert(
        'Network Error',
        'Unable to connect to the service. Please check your internet connection and try again.',
        [{ text: 'OK' }]
      );
    }
    
    throw error;
  }
}

/**
 * Search for items across multiple stores using AI
 * Returns canonical product URL, offers, and images
 * Works identically in all environments
 */
export async function searchItem(
  query: string,
  country: string,
  city?: string
): Promise<SearchItemResponse> {
  try {
    const response = await callEdgeFunction<SearchItemRequest, SearchItemResponse>(
      'search-item',
      { query, country, city },
      { showErrorAlert: true }
    );

    // Log warnings for partial results
    if (response.meta.partial) {
      console.warn('[searchItem] Partial result returned:', response.error);
    }

    // Log cache status
    if (response.meta.cached) {
      console.log('[searchItem] Result served from cache');
    }

    return response;
  } catch (error: any) {
    console.error('[searchItem] Failed:', error);
    
    // Check if function is missing (404)
    if (error.message.includes('not found') || error.message.includes('404')) {
      console.warn('[searchItem] Edge Function not deployed - returning safe fallback');
    }
    
    // Return safe fallback
    return {
      canonical: '',
      offers: [],
      images: [],
      meta: {
        requestId: 'error',
        durationMs: 0,
        partial: true,
        cached: false,
      },
      error: error.message || 'Failed to search for item',
    };
  }
}

/**
 * Extract item details from a URL
 * Returns partial data even if extraction fails
 * Works identically in all environments
 */
export async function extractItem(url: string, country: string): Promise<ExtractItemResponse> {
  try {
    const response = await callEdgeFunction<ExtractItemRequest, ExtractItemResponse>(
      'extract-item',
      { url, country },
      { showErrorAlert: true }
    );

    // Log warnings for partial results
    if (response.meta.partial) {
      console.warn('[extractItem] Partial result returned:', response.error);
    }

    return response;
  } catch (error: any) {
    console.error('[extractItem] Failed:', error);
    
    // Check if function is missing (404)
    if (error.message.includes('not found') || error.message.includes('404')) {
      console.warn('[extractItem] Edge Function not deployed - returning safe fallback');
    }
    
    // Return safe fallback
    return {
      title: null,
      price: null,
      currency: null,
      availability: 'unknown',
      images: [],
      shippingSupported: false,
      sourceDomain: null,
      meta: {
        requestId: 'error',
        durationMs: 0,
        partial: true,
      },
      error: error.message || 'Failed to extract item',
    };
  }
}

/**
 * Find alternative stores for a product
 * Filters by user location if provided
 * Works identically in all environments
 */
export async function findAlternatives(
  title: string,
  options?: {
    originalUrl?: string;
    countryCode?: string;
    city?: string;
  }
): Promise<FindAlternativesResponse> {
  try {
    const response = await callEdgeFunction<FindAlternativesRequest, FindAlternativesResponse>(
      'find-alternatives',
      {
        title,
        originalUrl: options?.originalUrl,
        countryCode: options?.countryCode,
        city: options?.city,
      },
      { showErrorAlert: true }
    );

    // Log warnings for partial results
    if (response.meta.partial) {
      console.warn('[findAlternatives] Partial result returned:', response.error);
    }

    return response;
  } catch (error: any) {
    console.error('[findAlternatives] Failed:', error);
    
    // Check if function is missing (404)
    if (error.message.includes('not found') || error.message.includes('404')) {
      console.warn('[findAlternatives] Edge Function not deployed - returning safe fallback');
    }
    
    // Return safe fallback
    return {
      alternatives: [],
      meta: {
        requestId: 'error',
        durationMs: 0,
        partial: true,
      },
      error: error.message || 'Failed to find alternatives',
    };
  }
}

/**
 * Import a wishlist from a store URL
 * Returns as many items as possible even if some fail
 * Works identically in all environments
 */
export async function importWishlist(wishlistUrl: string): Promise<ImportWishlistResponse> {
  try {
    const response = await callEdgeFunction<ImportWishlistRequest, ImportWishlistResponse>(
      'import-wishlist',
      { wishlistUrl },
      { showErrorAlert: true }
    );

    // Log warnings for partial results
    if (response.meta.partial) {
      console.warn('[importWishlist] Partial result returned:', response.error);
    }

    return response;
  } catch (error: any) {
    console.error('[importWishlist] Failed:', error);
    
    // Check if function is missing (404)
    if (error.message.includes('not found') || error.message.includes('404')) {
      console.warn('[importWishlist] Edge Function not deployed - returning safe fallback');
    }
    
    // Return safe fallback
    return {
      storeName: null,
      items: [],
      meta: {
        requestId: 'error',
        durationMs: 0,
        partial: true,
      },
      error: error.message || 'Failed to import wishlist',
    };
  }
}

/**
 * Identify a product from an image
 * Returns best-effort results with confidence score
 * Works identically in all environments
 */
export async function identifyFromImage(
  imageUrl?: string,
  imageBase64?: string
): Promise<IdentifyFromImageResponse> {
  try {
    const response = await callEdgeFunction<IdentifyFromImageRequest, IdentifyFromImageResponse>(
      'identify-from-image',
      { imageUrl, imageBase64 },
      { showErrorAlert: true }
    );

    // Log warnings for partial results
    if (response.meta.partial) {
      console.warn('[identifyFromImage] Partial result returned:', response.error);
    }

    return response;
  } catch (error: any) {
    console.error('[identifyFromImage] Failed:', error);
    
    // Check if function is missing (404)
    if (error.message.includes('not found') || error.message.includes('404')) {
      console.warn('[identifyFromImage] Edge Function not deployed - returning safe fallback');
    }
    
    // Return safe fallback
    return {
      bestGuessTitle: null,
      bestGuessCategory: null,
      keywords: [],
      confidence: 0,
      suggestedProducts: [],
      meta: {
        requestId: 'error',
        durationMs: 0,
        partial: true,
      },
      error: error.message || 'Failed to identify product',
    };
  }
}

/**
 * Search for products by name across multiple stores
 * Filters by user location if provided
 * Returns products with confidence scores
 * Works identically in all environments
 */
export async function searchByName(
  query: string,
  options?: {
    countryCode?: string;
    city?: string;
    currency?: string;
    limit?: number;
  }
): Promise<SearchByNameResponse> {
  try {
    const response = await callEdgeFunction<SearchByNameRequest, SearchByNameResponse>(
      'search-by-name',
      {
        query,
        countryCode: options?.countryCode,
        city: options?.city,
        currency: options?.currency,
        limit: options?.limit,
      },
      { showErrorAlert: true }
    );

    // Log warnings for errors
    if (response.error) {
      console.warn('[searchByName] Error returned:', response.error);
    }

    return response;
  } catch (error: any) {
    console.error('[searchByName] Failed:', error);
    
    // Check if function is missing (404)
    if (error.message.includes('not found') || error.message.includes('404')) {
      console.warn('[searchByName] Edge Function not deployed - returning safe fallback');
    }
    
    // Return safe fallback
    return {
      results: [],
      meta: {
        requestId: 'error',
      },
      error: error.message || 'Failed to search for products',
    };
  }
}

/**
 * NEW: Identify product from image using multi-step AI approach
 * Performs OCR, brand detection, query normalization, product search, and visual fallback
 * Returns product matches with confidence scores
 * Works identically in all environments
 */
export interface IdentifyProductFromImageRequest {
  imageBase64?: string;
  imageUrl?: string;
  countryCode: string;
  currencyCode: string;
  languageCode: string;
}

export interface ProductMatchResult {
  id: string;
  name: string;
  brand: string;
  category: string;
  imageUrl: string;
  confidence: number;
  signals: {
    logo?: string;
    text?: string;
    visual?: string;
  };
}

export interface IdentifyProductFromImageResponse {
  matches: ProductMatchResult[];
  query: {
    detectedText: string;
    detectedBrand: string;
    guessedCategory: string;
  };
  error?: string;
}

export async function identifyProductFromImage(
  imageBase64: string | undefined,
  imageUrl: string | undefined,
  countryCode: string,
  currencyCode: string,
  languageCode: string
): Promise<IdentifyProductFromImageResponse> {
  try {
    console.log('[identifyProductFromImage] Starting multi-step product identification...');
    console.log('[identifyProductFromImage] Country:', countryCode, 'Currency:', currencyCode);
    
    const response = await callEdgeFunction<IdentifyProductFromImageRequest, IdentifyProductFromImageResponse>(
      'identify-product-from-image',
      {
        imageBase64,
        imageUrl,
        countryCode,
        currencyCode,
        languageCode,
      },
      { showErrorAlert: true }
    );

    // Log warnings for errors
    if (response.error) {
      console.warn('[identifyProductFromImage] Error returned:', response.error);
    }

    console.log('[identifyProductFromImage] Found', response.matches.length, 'matches');
    return response;
  } catch (error: any) {
    console.error('[identifyProductFromImage] Failed:', error);
    
    // Check if function is missing (404)
    if (error.message.includes('not found') || error.message.includes('404')) {
      console.warn('[identifyProductFromImage] Edge Function not deployed - returning safe fallback');
    }
    
    // Return safe fallback - must never crash
    return {
      matches: [],
      query: {
        detectedText: '',
        detectedBrand: '',
        guessedCategory: '',
      },
      error: error.message || 'Failed to identify product from image',
    };
  }
}
