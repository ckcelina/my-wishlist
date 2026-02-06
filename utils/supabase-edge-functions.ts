
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

export interface ProductCandidate {
  title: string;
  brand: string | null;
  model: string | null;
  category: string | null;
  imageUrl: string;
  url: string;
  price: number | null;
  currency: string | null;
  store: string | null;
}

export interface IdentifyFromImageResponse {
  status: 'ok' | 'no_results' | 'error';
  providerUsed: 'openai_vision' | 'serpapi_google_lens' | 'bing_visual_search' | 'none';
  confidence: number; // 0.0 - 1.0
  query: string;
  items: ProductCandidate[];
  message?: string;
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
 * ═══════════════════════════════════════════════════════════════════════════
 * CENTRALIZED EDGE FUNCTION AUTH (CLIENT) - HARDENED
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * This is the SINGLE wrapper for ALL Supabase Edge Function calls.
 * NO OTHER FILE is allowed to call fetch(functions/v1/...) directly.
 * 
 * MANDATORY behavior:
 * - Always fetch session via supabase.auth.getSession()
 * - If no access_token → throw AUTH_REQUIRED immediately (NO edge call)
 * - If token exists → attach headers:
 *   - Authorization: Bearer <access_token>
 *   - apikey: SUPABASE_ANON_KEY
 * - If response is 401:
 *   - Attempt supabase.auth.refreshSession() ONCE
 *   - Retry edge call ONCE
 * - If still 401 → throw AUTH_REQUIRED
 * - Never allow identify-from-image to be called without a token
 * 
 * Safe logs:
 * - function name
 * - retry attempted (true/false)
 * - final status
 * (NO TOKENS)
 */
export async function callEdgeFunctionSafely<TRequest, TResponse>(
  functionName: string,
  payload: TRequest,
  options?: { showErrorAlert?: boolean }
): Promise<TResponse> {
  const showErrorAlert = options?.showErrorAlert !== false; // Default to true
  let retryAttempted = false;
  let finalStatus = 'unknown';

  console.log(`[callEdgeFunctionSafely] Calling ${functionName}`);

  // Check if environment is configured
  if (!isEnvironmentConfigured()) {
    const errorMessage = getConfigurationErrorMessage();
    console.error(`[callEdgeFunctionSafely] ${errorMessage}`);
    
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
    console.warn(`[callEdgeFunctionSafely] Unknown function '${functionName}' - returning safe fallback`);
    throw new Error(`Edge Function '${functionName}' is not recognized`);
  }

  const url = `${SUPABASE_URL}/functions/v1/${functionName}`;

  // STEP 1: Always fetch session FIRST
  console.log(`[callEdgeFunctionSafely] Step 1: Fetching session`);
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  
  if (sessionError) {
    console.error(`[callEdgeFunctionSafely] Session error for ${functionName}:`, sessionError.message);
    finalStatus = 'session_error';
    console.log(`[callEdgeFunctionSafely] ${functionName} - status: ${finalStatus}, retry: ${retryAttempted}`);
    throw new Error('AUTH_REQUIRED');
  }

  // STEP 2: If no access_token → throw AUTH_REQUIRED immediately (NO edge call)
  if (!sessionData.session || !sessionData.session.access_token) {
    console.warn(`[callEdgeFunctionSafely] No access_token for ${functionName} - throwing AUTH_REQUIRED immediately`);
    finalStatus = 'no_token';
    console.log(`[callEdgeFunctionSafely] ${functionName} - status: ${finalStatus}, retry: ${retryAttempted}`);
    throw new Error('AUTH_REQUIRED');
  }

  let session = sessionData.session;

  // STEP 3: Make the edge call with token
  const makeRequest = async (accessToken: string): Promise<Response> => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${accessToken}`,
    };

    console.log(`[callEdgeFunctionSafely] Making request to ${functionName} (token exists: ${!!accessToken})`);

    return await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
  };

  try {
    // First attempt
    let response = await makeRequest(session.access_token);
    finalStatus = response.status.toString();

    console.log(`[callEdgeFunctionSafely] ${functionName} - initial response status: ${finalStatus}`);

    // STEP 4: If response is 401 → attempt refresh ONCE and retry ONCE
    if (response.status === 401) {
      console.warn(`[callEdgeFunctionSafely] 401 for ${functionName} - attempting session refresh`);
      
      const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
      
      if (refreshError || !refreshData.session || !refreshData.session.access_token) {
        console.error(`[callEdgeFunctionSafely] Refresh failed for ${functionName}:`, refreshError?.message);
        finalStatus = '401_refresh_failed';
        retryAttempted = true;
        console.log(`[callEdgeFunctionSafely] ${functionName} - status: ${finalStatus}, retry: ${retryAttempted}`);
        throw new Error('AUTH_REQUIRED');
      }

      console.log(`[callEdgeFunctionSafely] Session refreshed for ${functionName} - retrying request`);
      retryAttempted = true;
      
      // Retry with new token
      response = await makeRequest(refreshData.session.access_token);
      finalStatus = response.status.toString();
      
      console.log(`[callEdgeFunctionSafely] ${functionName} - retry response status: ${finalStatus}`);

      // STEP 5: If still 401 → throw AUTH_REQUIRED
      if (response.status === 401) {
        console.error(`[callEdgeFunctionSafely] Still 401 for ${functionName} after refresh - throwing AUTH_REQUIRED`);
        finalStatus = '401_after_retry';
        console.log(`[callEdgeFunctionSafely] ${functionName} - status: ${finalStatus}, retry: ${retryAttempted}`);
        throw new Error('AUTH_REQUIRED');
      }
    }

    // STEP 6: Handle other errors
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[callEdgeFunctionSafely] ${functionName} failed:`, response.status, errorText);
      
      // Handle 404 - function not deployed
      if (response.status === 404) {
        finalStatus = '404';
        console.log(`[callEdgeFunctionSafely] ${functionName} - status: ${finalStatus}, retry: ${retryAttempted}`);
        
        if (showErrorAlert) {
          Alert.alert(
            'Feature Unavailable',
            'This feature is temporarily unavailable. Please try again later.',
            [{ text: 'OK' }]
          );
        }
        throw new Error(`Edge Function '${functionName}' not found (404)`);
      }
      
      console.log(`[callEdgeFunctionSafely] ${functionName} - status: ${finalStatus}, retry: ${retryAttempted}`);
      
      if (showErrorAlert) {
        Alert.alert(
          'Request Failed',
          `Unable to complete the request. Please try again. (Error ${response.status})`,
          [{ text: 'OK' }]
        );
      }
      
      throw new Error(`Edge function failed: ${response.status} ${errorText}`);
    }

    // STEP 7: Parse and return response
    const data = await response.json();
    console.log(`[callEdgeFunctionSafely] ${functionName} - status: ${finalStatus}, retry: ${retryAttempted} - SUCCESS`);
    return data as TResponse;

  } catch (error: any) {
    console.error(`[callEdgeFunctionSafely] Error calling ${functionName}:`, error.message);
    console.log(`[callEdgeFunctionSafely] ${functionName} - status: ${finalStatus}, retry: ${retryAttempted} - ERROR`);
    
    // If it's AUTH_REQUIRED, propagate it
    if (error.message === 'AUTH_REQUIRED') {
      if (showErrorAlert) {
        Alert.alert(
          'Session Expired',
          'Your session has expired. Please sign in again.',
          [{ text: 'OK' }]
        );
      }
      throw error;
    }
    
    // Only show alert if we haven't already shown one
    if (showErrorAlert && !error.message.includes('Session expired') && !error.message.includes('not found')) {
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
    const response = await callEdgeFunctionSafely<SearchItemRequest, SearchItemResponse>(
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
    const response = await callEdgeFunctionSafely<ExtractItemRequest, ExtractItemResponse>(
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
    const response = await callEdgeFunctionSafely<FindAlternativesRequest, FindAlternativesResponse>(
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
    const response = await callEdgeFunctionSafely<ImportWishlistRequest, ImportWishlistResponse>(
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

// Track if identify-from-image is currently running to prevent parallel calls
let identifyInProgress = false;

/**
 * Identify a product from an image using a robust Google Lens-style pipeline
 * 
 * PIPELINE:
 * 1. Upload image to Supabase Storage (private bucket)
 * 2. Generate signed URL (5-minute expiry)
 * 3. Send signed URL to Edge Function
 * 4. Edge Function runs pipeline:
 *    a) FIRST TRY (optional): OpenAI Vision for high-confidence identification
 *    b) FALLBACK: Visual search provider (SerpAPI Google Lens / Bing Visual Search)
 *    c) Fetch product pages and extract schema.org / OpenGraph data
 *    d) Score, dedupe, and return top 5-8 candidates
 * 5. Returns structured JSON with status, items, and metadata
 * 
 * ALWAYS returns a response - never silently fails
 * 
 * GUARDS:
 * - Prevents multiple parallel identify calls
 * - Checks auth state before calling edge function
 * - If AUTH_REQUIRED is thrown → stops and returns error (no retry loops)
 */
export async function identifyFromImage(
  imageUrl?: string,
  imageBase64?: string
): Promise<IdentifyFromImageResponse> {
  try {
    console.log('[identifyFromImage] Starting image identification');

    // GUARD: Prevent multiple parallel identify calls
    if (identifyInProgress) {
      console.warn('[identifyFromImage] Identify already in progress - blocking parallel call');
      return {
        status: 'error',
        message: 'Image identification already in progress. Please wait.',
        providerUsed: 'none',
        confidence: 0,
        query: '',
        items: [],
      };
    }

    identifyInProgress = true;

    // GUARD: Check auth state BEFORE calling edge function
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session || !session.access_token) {
      console.error('[identifyFromImage] Invalid auth state - redirecting to login');
      identifyInProgress = false;
      return {
        status: 'error',
        message: 'AUTH_REQUIRED',
        providerUsed: 'none',
        confidence: 0,
        query: '',
        items: [],
      };
    }

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error('[identifyFromImage] User not authenticated');
      identifyInProgress = false;
      return {
        status: 'error',
        message: 'AUTH_REQUIRED',
        providerUsed: 'none',
        confidence: 0,
        query: '',
        items: [],
      };
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
      identifyInProgress = false;
      return {
        status: 'error',
        message: 'Either imageUrl or imageBase64 must be provided',
        providerUsed: 'none',
        confidence: 0,
        query: '',
        items: [],
      };
    }

    console.log('[identifyFromImage] Calling Edge Function with signed URL');

    // Call Edge Function with signed URL using the safe wrapper
    // This will throw AUTH_REQUIRED if auth fails - we catch it below
    const response = await callEdgeFunctionSafely<IdentifyFromImageRequest, IdentifyFromImageResponse>(
      'identify-from-image',
      { imageUrl: signedUrl },
      { showErrorAlert: false } // We'll handle errors ourselves
    );

    console.log('[identifyFromImage] Identification complete');
    console.log('[identifyFromImage] Status:', response.status, 'Provider:', response.providerUsed, 'Items:', response.items.length);

    identifyInProgress = false;
    return response;
  } catch (error: any) {
    console.error('[identifyFromImage] Failed:', error);
    identifyInProgress = false;
    
    // Check for AUTH_REQUIRED - stop and redirect (no retry loops)
    if (error.message === 'AUTH_REQUIRED') {
      console.log('[identifyFromImage] AUTH_REQUIRED caught - returning error status');
      return {
        status: 'error',
        message: 'AUTH_REQUIRED',
        providerUsed: 'none',
        confidence: 0,
        query: '',
        items: [],
      };
    }
    
    // Return safe fallback
    return {
      status: 'error',
      message: error.message || 'Failed to identify product',
      providerUsed: 'none',
      confidence: 0,
      query: '',
      items: [],
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
    
    const response = await callEdgeFunctionSafely<SearchByNameRequest, SearchByNameResponse>(
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
