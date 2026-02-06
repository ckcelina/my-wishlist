
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
 * PERMANENT EDGE FUNCTION AUTH FIX (401 Invalid JWT)
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * This is the SINGLE wrapper for ALL Supabase Edge Function calls.
 * NO OTHER FILE is allowed to call fetch(functions/v1/...) directly.
 * 
 * MANDATORY behavior:
 * - Always attach:
 *   - apikey: SUPABASE_ANON_KEY
 *   - Authorization: Bearer <access_token>
 * - Get token via supabase.auth.getSession()
 * - If token missing/expired:
 *   - call supabase.auth.refreshSession() ONCE
 *   - re-read session
 * - Call edge function
 * - If response is 401:
 *   - refreshSession ONCE (if not already)
 *   - retry ONCE
 * - If still 401:
 *   - throw an Error with code/string exactly: "AUTH_REQUIRED"
 * - Add dev-only safe logs (NO TOKENS): functionName, status, retried(true/false)
 */
export async function callEdgeFunctionSafely<TRequest, TResponse>(
  functionName: string,
  payload: TRequest,
  options?: { showErrorAlert?: boolean }
): Promise<TResponse> {
  const showErrorAlert = options?.showErrorAlert !== false; // Default to true

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
  console.log(`[callEdgeFunctionSafely] URL: ${url}`);

  // Maximum 1 retry for 401 errors
  let retryCount = 0;
  const maxRetries = 1;
  let hasRefreshed = false;

  while (retryCount <= maxRetries) {
    try {
      // Step 1: Get the user's access token
      console.log(`[callEdgeFunctionSafely] Step 1: Getting session (attempt ${retryCount + 1})`);
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error(`[callEdgeFunctionSafely] Session error:`, sessionError.message);
        throw new Error('AUTH_REQUIRED');
      }

      let session = sessionData.session;

      // Step 2: Check if session is expired or expiring soon (within 60 seconds)
      if (session) {
        const expiresAt = session.expires_at;
        const now = Math.floor(Date.now() / 1000);
        const isExpired = expiresAt ? expiresAt <= now : false;
        const isExpiringSoon = expiresAt ? expiresAt <= now + 60 : false;

        if ((isExpired || isExpiringSoon) && !hasRefreshed) {
          console.log(`[callEdgeFunctionSafely] Session expired or expiring soon, refreshing proactively`);
          const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
          
          if (refreshError || !refreshData.session) {
            console.error(`[callEdgeFunctionSafely] Failed to refresh session:`, refreshError?.message);
            throw new Error('AUTH_REQUIRED');
          }
          
          session = refreshData.session;
          hasRefreshed = true;
          console.log(`[callEdgeFunctionSafely] Session refreshed successfully`);
        }
      }

      // Step 3: Ensure we have a valid access token
      if (!session || !session.access_token) {
        console.warn(`[callEdgeFunctionSafely] No access token available for ${functionName}`);
        throw new Error('AUTH_REQUIRED');
      }

      // Step 4: Build headers - CRITICAL: apikey is ALWAYS required
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY, // ✅ ALWAYS send anon key as apikey header
        'Authorization': `Bearer ${session.access_token}`, // ✅ Send user JWT for protected functions
      };

      console.log(`[callEdgeFunctionSafely] Headers prepared (token exists: ${!!session.access_token})`);

      // Step 5: Make the request
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      console.log(`[callEdgeFunctionSafely] Response status: ${response.status}, retried: ${retryCount > 0}`);

      // Step 6: Handle 401 Unauthorized - try to refresh session and retry ONCE
      if (response.status === 401 && retryCount < maxRetries) {
        console.warn(`[callEdgeFunctionSafely] 401 Unauthorized for ${functionName}. Attempting refresh and retry...`);
        
        if (!hasRefreshed) {
          const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
          
          if (refreshError || !refreshData.session) {
            console.error(`[callEdgeFunctionSafely] Final 401 - refresh failed:`, refreshError?.message);
            throw new Error('AUTH_REQUIRED');
          }
          
          hasRefreshed = true;
          console.log(`[callEdgeFunctionSafely] Session refreshed, retrying request`);
        }
        
        retryCount++;
        continue; // Retry the request with the new token
      }

      // Step 7: If still 401 after retry, throw AUTH_REQUIRED
      if (response.status === 401) {
        console.error(`[callEdgeFunctionSafely] Final 401 Unauthorized for ${functionName} after retry`);
        throw new Error('AUTH_REQUIRED');
      }

      // Step 8: Handle other errors
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[callEdgeFunctionSafely] ${functionName} failed:`, response.status, errorText);
        
        // Handle 404 - function not deployed
        if (response.status === 404) {
          if (showErrorAlert) {
            Alert.alert(
              'Feature Unavailable',
              'This feature is temporarily unavailable. Please try again later.',
              [{ text: 'OK' }]
            );
          }
          throw new Error(`Edge Function '${functionName}' not found (404)`);
        }
        
        if (showErrorAlert) {
          Alert.alert(
            'Request Failed',
            `Unable to complete the request. Please try again. (Error ${response.status})`,
            [{ text: 'OK' }]
          );
        }
        
        throw new Error(`Edge function failed: ${response.status} ${errorText}`);
      }

      // Step 9: Parse and return response
      const data = await response.json();
      console.log(`[callEdgeFunctionSafely] ${functionName} call successful (retried: ${retryCount > 0})`);
      return data as TResponse;

    } catch (error: any) {
      console.error(`[callEdgeFunctionSafely] Error calling ${functionName}:`, error.message);
      
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
      
      // If it's a 401 and we haven't retried yet, continue to retry
      if (error.message.includes('401') && retryCount < maxRetries) {
        retryCount++;
        continue;
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
  
  // Should never reach here, but TypeScript needs a return
  throw new Error('Maximum retries exceeded');
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
      return {
        status: 'error',
        message: 'You must be logged in to identify images',
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
    const response = await callEdgeFunctionSafely<IdentifyFromImageRequest, IdentifyFromImageResponse>(
      'identify-from-image',
      { imageUrl: signedUrl },
      { showErrorAlert: false } // We'll handle errors ourselves
    );

    console.log('[identifyFromImage] Identification complete');
    console.log('[identifyFromImage] Status:', response.status, 'Provider:', response.providerUsed, 'Items:', response.items.length);

    return response;
  } catch (error: any) {
    console.error('[identifyFromImage] Failed:', error);
    
    // Check for AUTH_REQUIRED
    if (error.message === 'AUTH_REQUIRED') {
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
