
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
  imageUrl: string; // Signed URL from Supabase Storage
}

export interface IdentifyFromImageResponse {
  itemName: string | null;
  brand: string | null;
  confidence: number; // 0.0 - 1.0
  extractedText: string;
  suggestedQueries: string[];
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

// Updated to match the new Edge Function response format
export interface SearchByNameResponse {
  results: SearchResult[];
  error: string | null;
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
  'product-prices',
];

// Log configuration status on module load
if (!isEnvironmentConfigured()) {
  console.warn('[Supabase Edge Functions] Configuration missing - check app.json');
  console.warn('[Supabase Edge Functions] SUPABASE_URL:', SUPABASE_URL ? 'Set' : 'Missing');
  console.warn('[Supabase Edge Functions] SUPABASE_ANON_KEY:', SUPABASE_ANON_KEY ? 'Set' : 'Missing');
}

/**
 * Get the authorization token for Edge Function calls
 * Returns the user's access_token if logged in, null otherwise
 */
async function getAuthToken(): Promise<string | null> {
  try {
    // Try to get the current session
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.warn('[Edge Function Auth] Error getting session:', error.message);
      console.log('[Edge Function Auth] No session available');
      return null;
    }
    
    if (session?.access_token) {
      console.log('[Edge Function Auth] ✅ User session found - using access_token');
      return session.access_token;
    }
    
    console.log('[Edge Function Auth] No session found - user not logged in');
    return null;
  } catch (error) {
    console.error('[Edge Function Auth] Unexpected error getting auth token:', error);
    return null;
  }
}

/**
 * Call a Supabase Edge Function with proper authentication and error handling
 * 
 * CRITICAL AUTH RULES:
 * - ALWAYS send apikey header with SUPABASE_ANON_KEY
 * - If user is logged in, ALSO send Authorization header with Bearer <access_token>
 * - NEVER put anon key in Authorization header
 * 
 * Works identically in ALL environments (Expo Go, TestFlight, App Store)
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
    // Get the user's access token (null if not logged in)
    const accessToken = await getAuthToken();
    
    // Build headers - CRITICAL: apikey is ALWAYS required
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_ANON_KEY, // ✅ ALWAYS send anon key as apikey header
    };

    // If user is logged in, ALSO send Authorization header with access_token
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`; // ✅ Send user JWT for protected functions
      console.log('[Edge Function Auth] ✅ Sending authenticated request (session exists)');
    } else {
      console.log('[Edge Function Auth] ⚠️ Sending unauthenticated request (no session)');
    }

    // Log headers for debugging (but never log token values)
    console.log('[Edge Function Auth] Headers:', {
      'Content-Type': 'application/json',
      'apikey': '[ANON_KEY_EXISTS]',
      'Authorization': accessToken ? 'Bearer [ACCESS_TOKEN_EXISTS]' : '[NO_TOKEN]',
    });
    
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(request),
    });

    // Handle 401 Unauthorized
    if (response.status === 401) {
      const errorText = await response.text();
      console.error(`[Edge Function] ${functionName} unauthorized (401):`, errorText);
      console.error('[Edge Function Auth] ❌ Invalid JWT - user session may be expired');
      
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
 * Upload image to Supabase Storage and generate a signed URL
 * Returns the signed URL with 5-minute expiry
 */
async function uploadImageAndGetSignedUrl(imageBase64: string, userId: string): Promise<string> {
  console.log('[uploadImageAndGetSignedUrl] Starting upload for user:', userId);
  
  // Convert base64 to Uint8Array
  const binaryString = atob(imageBase64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  // Generate unique filename
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;
  const filePath = `${userId}/${fileName}`;

  console.log('[uploadImageAndGetSignedUrl] Uploading to path:', filePath);

  // Upload to Supabase Storage (private bucket)
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('product-images')
    .upload(filePath, bytes, {
      contentType: 'image/jpeg',
      upsert: false,
    });

  if (uploadError) {
    console.error('[uploadImageAndGetSignedUrl] Upload error:', uploadError);
    throw new Error(`Failed to upload image: ${uploadError.message}`);
  }

  console.log('[uploadImageAndGetSignedUrl] Upload successful:', uploadData.path);

  // Generate signed URL with 5-minute expiry
  const { data: signedUrlData, error: signedUrlError } = await supabase.storage
    .from('product-images')
    .createSignedUrl(uploadData.path, 300); // 300 seconds = 5 minutes

  if (signedUrlError) {
    console.error('[uploadImageAndGetSignedUrl] Signed URL error:', signedUrlError);
    throw new Error(`Failed to generate signed URL: ${signedUrlError.message}`);
  }

  console.log('[uploadImageAndGetSignedUrl] Signed URL generated successfully');
  return signedUrlData.signedUrl;
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
 * 
 * NEW FLOW:
 * 1. Upload image to Supabase Storage (private bucket)
 * 2. Generate signed URL (5-minute expiry)
 * 3. Send signed URL to Edge Function
 * 4. Edge Function validates JWT, fetches image, calls OpenAI Vision
 * 5. Returns structured JSON with item name, brand, extracted text, confidence
 * 
 * Works identically in all environments
 */
export async function identifyFromImage(
  imageUrl?: string,
  imageBase64?: string
): Promise<IdentifyFromImageResponse> {
  try {
    console.log('[identifyFromImage] Starting image identification');

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error('[identifyFromImage] User not authenticated');
      throw new Error('You must be logged in to identify images');
    }

    let signedUrl: string;

    // If base64 is provided, upload to Supabase Storage and get signed URL
    if (imageBase64) {
      console.log('[identifyFromImage] Uploading image to Supabase Storage');
      signedUrl = await uploadImageAndGetSignedUrl(imageBase64, user.id);
    } else if (imageUrl) {
      // If URL is provided, use it directly (assuming it's already a signed URL)
      signedUrl = imageUrl;
    } else {
      throw new Error('Either imageUrl or imageBase64 must be provided');
    }

    console.log('[identifyFromImage] Calling Edge Function with signed URL');

    // Call Edge Function with signed URL
    const response = await callEdgeFunction<IdentifyFromImageRequest, IdentifyFromImageResponse>(
      'identify-from-image',
      { imageUrl: signedUrl },
      { showErrorAlert: true }
    );

    console.log('[identifyFromImage] Identification complete');
    console.log('[identifyFromImage] Item:', response.itemName, 'Brand:', response.brand, 'Confidence:', response.confidence);

    return response;
  } catch (error: any) {
    console.error('[identifyFromImage] Failed:', error);
    
    // Check if function is missing (404)
    if (error.message.includes('not found') || error.message.includes('404')) {
      console.warn('[identifyFromImage] Edge Function not deployed - returning safe fallback');
    }
    
    // Return safe fallback
    return {
      itemName: null,
      brand: null,
      confidence: 0,
      extractedText: '',
      suggestedQueries: [],
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
    console.log('[searchByName] Searching for:', query);
    console.log('[searchByName] Options:', options);
    
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

    console.log('[searchByName] Found', response.results.length, 'results');
    return response;
  } catch (error: any) {
    console.error('[searchByName] Failed:', error);
    
    // Check if function is missing (404)
    if (error.message.includes('not found') || error.message.includes('404')) {
      console.warn('[searchByName] Edge Function not deployed - returning safe fallback');
    }
    
    // Return safe fallback with error message
    return {
      results: [],
      error: error.message || 'Failed to search for products',
    };
  }
}
