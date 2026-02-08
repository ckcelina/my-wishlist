
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
  imageBase64?: string;
  imageUrl?: string;
  countryCode?: string;
  currencyCode?: string;
  locale?: string;
  hints?: string[];
}

export interface ProductCandidate {
  title: string;
  brand?: string | null;
  model?: string | null;
  category?: string | null;
  imageUrl?: string;
  storeUrl?: string;
  price?: number | null;
  currency?: string | null;
  storeName?: string | null;
  source?: string;
  score?: number;
  reason?: string;
}

export interface IdentifyFromImageResponse {
  status: 'ok' | 'no_results' | 'error';
  providerUsed: 'openai_vision' | 'serpapi_google_lens' | 'bing_visual_search' | 'none';
  confidence: number; // 0.0 - 1.0
  query: string;
  items: ProductCandidate[];
  message?: string;
  code?: string;
}

export interface IdentifiedProduct {
  title: string;
  brand?: string;
  category?: string;
  attributes?: {
    color?: string;
    material?: string;
    model?: string;
    keywords?: string[];
  };
  search_query: string;
  confidence: number;
}

export interface ProductOffer {
  store: string;
  title: string;
  price: number;
  currency: string;
  product_url: string;
  image_url: string;
  score: number;
}

export interface IdentifyProductFromImageRequest {
  image_base64?: string;
  image_url?: string;
  crop_box?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  countryCode?: string;
  currency?: string;
}

export interface IdentifyProductFromImageResponse {
  status: 'ok' | 'no_results' | 'error';
  identified?: IdentifiedProduct;
  offers: ProductOffer[];
  message?: string;
  code?: string;
  debug?: {
    provider: string;
    query_used: string;
  };
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
  'identify-product-from-image', // NEW: OpenAI Lens pipeline with offers
  'extract-item',
  'find-alternatives',
  'import-wishlist',
  'search-by-name',
  'price-check',
  'product-prices',
  'auth-ping',
];

// ═══════════════════════════════════════════════════════════════════════════
// 🔧 CONFIGURATION VERIFICATION - Log configuration status on module load
// ═══════════════════════════════════════════════════════════════════════════
console.log('═══════════════════════════════════════════════════════════════');
console.log('🔧 SUPABASE EDGE FUNCTIONS CONFIGURATION');
console.log('═══════════════════════════════════════════════════════════════');

if (!isEnvironmentConfigured()) {
  console.error('❌ [Supabase Edge Functions] Configuration MISSING - check app.config.js');
  console.error('   SUPABASE_URL:', SUPABASE_URL ? '✅ Set' : '❌ Missing');
  console.error('   SUPABASE_ANON_KEY:', SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing');
} else {
  console.log('✅ [Supabase Edge Functions] Configuration OK');
  console.log('   SUPABASE_URL:', SUPABASE_URL ? '✅ Set' : '❌ Missing');
  console.log('   SUPABASE_ANON_KEY:', SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing');
}

// Check BACKEND_URL configuration (for global search)
const BACKEND_URL = appConfig.backendUrl || '';
console.log('   BACKEND_URL:', BACKEND_URL ? `✅ Set (${BACKEND_URL})` : '❌ Missing');

if (!BACKEND_URL) {
  console.error('❌ [Backend] BACKEND_URL is NOT configured in app.config.js');
  console.error('   Global search and other backend features will NOT work.');
  console.error('   Please set BACKEND_URL in app.config.js or .env file.');
}

console.log('═══════════════════════════════════════════════════════════════');

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PRODUCTION AUTH FIX - NO FORCED SIGN-OUTS
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * This is the SINGLE wrapper for ALL Supabase Edge Function calls.
 * NO OTHER FILE is allowed to call fetch(functions/v1/...) directly.
 * 
 * CRITICAL REQUIREMENTS:
 * 1. Always send header: apikey: SUPABASE_ANON_KEY
 * 2. Authorization header MUST be: Bearer <USER_ACCESS_TOKEN>
 * 3. Never set Authorization to the anon key
 * 4. If no session or no access_token:
 *    - throw AUTH_REQUIRED immediately (do NOT call the edge function)
 * 5. If token exists but is near expiry (expires_at <= now+60s):
 *    - attempt supabase.auth.refreshSession() ONCE
 *    - re-read session/token
 *    - if still missing => throw AUTH_REQUIRED
 * 6. Call edge function once
 * 7. If response is 401:
 *    - attempt refreshSession() ONCE (if not already attempted)
 *    - retry the edge call ONCE with the NEW access token
 * 8. If still 401:
 *    - throw AUTH_REQUIRED (do NOT sign out; do NOT clear storage)
 * 
 * SAFE LOGGING (no tokens):
 * - function name
 * - status
 * - didRefresh (true/false)
 * - didRetry (true/false)
 */
export async function callEdgeFunctionSafely<TRequest, TResponse>(
  functionName: string,
  payload: TRequest,
  options?: { showErrorAlert?: boolean }
): Promise<TResponse> {
  const showErrorAlert = options?.showErrorAlert !== false; // Default to true
  const isDev = __DEV__;
  let didRefresh = false;
  let didRetry = false;
  let finalStatus: number | string = 'UNKNOWN';

  if (isDev) {
    console.log(`[callEdgeFunctionSafely] Starting call to ${functionName}`);
  }

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
  if (isDev) {
    console.log(`[callEdgeFunctionSafely] Fetching session for ${functionName}`);
  }
  
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  
  if (sessionError) {
    console.error(`[callEdgeFunctionSafely] Session error for ${functionName}:`, sessionError.message);
    finalStatus = 'session_error';
    if (isDev) {
      console.log(`[callEdgeFunctionSafely] ${functionName} - status=${finalStatus}, didRefresh=${didRefresh}, didRetry=${didRetry}`);
    }
    throw new Error('AUTH_REQUIRED');
  }

  // STEP 2: If no access_token → throw AUTH_REQUIRED immediately (NO edge call)
  if (!sessionData.session || !sessionData.session.access_token) {
    console.warn(`[callEdgeFunctionSafely] No access_token for ${functionName} - throwing AUTH_REQUIRED immediately`);
    finalStatus = 'no_token';
    if (isDev) {
      console.log(`[callEdgeFunctionSafely] ${functionName} - status=${finalStatus}, didRefresh=${didRefresh}, didRetry=${didRetry}`);
    }
    throw new Error('AUTH_REQUIRED');
  }

  let currentAccessToken = sessionData.session.access_token;
  const expiresAt = sessionData.session.expires_at;
  const now = Math.floor(Date.now() / 1000);

  // Safe logging (no tokens)
  if (isDev) {
    console.log(`[callEdgeFunctionSafely] ${functionName} - hasSession=true, tokenLength=${currentAccessToken.length}, expiresAt=${expiresAt}, now=${now}`);
  }

  // STEP 3: If token exists but is near expiry (expires_at <= now+60s), refresh once
  if (expiresAt && expiresAt <= now + 60) {
    if (isDev) {
      console.log(`[callEdgeFunctionSafely] Token for ${functionName} expiring soon (${expiresAt} vs ${now + 60}). Refreshing session.`);
    }
    
    const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
    
    if (refreshError || !refreshData.session || !refreshData.session.access_token) {
      console.error(`[callEdgeFunctionSafely] Proactive refresh failed for ${functionName}:`, refreshError?.message);
      finalStatus = 'refresh_failed';
      didRefresh = true;
      if (isDev) {
        console.log(`[callEdgeFunctionSafely] ${functionName} - status=${finalStatus}, didRefresh=${didRefresh}, didRetry=${didRetry}`);
      }
      throw new Error('AUTH_REQUIRED');
    }

    if (isDev) {
      console.log(`[callEdgeFunctionSafely] Session refreshed for ${functionName} - new token length: ${refreshData.session.access_token.length}`);
    }
    didRefresh = true;
    currentAccessToken = refreshData.session.access_token;
  }

  // STEP 4: Make the edge call with token
  const makeRequest = async (token: string): Promise<Response> => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${token}`,
    };

    if (isDev) {
      console.log(`[callEdgeFunctionSafely] Making request to ${functionName} (token length: ${token.length})`);
    }

    return await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
  };

  try {
    // First attempt
    let response = await makeRequest(currentAccessToken);
    finalStatus = response.status;

    if (isDev) {
      console.log(`[callEdgeFunctionSafely] ${functionName} - initial response status: ${finalStatus}`);
    }

    // STEP 5: If response is 401 → attempt refresh ONCE and retry ONCE
    if (response.status === 401 && !didRetry) {
      console.warn(`[callEdgeFunctionSafely] 401 for ${functionName} - attempting session refresh and retry`);
      
      // Attempt refresh (if not already done)
      if (!didRefresh) {
        const { data: retryRefreshData, error: retryRefreshError } = await supabase.auth.refreshSession();
        
        if (retryRefreshError || !retryRefreshData.session || !retryRefreshData.session.access_token) {
          console.error(`[callEdgeFunctionSafely] Refresh failed on 401 retry for ${functionName}:`, retryRefreshError?.message);
          finalStatus = '401_refresh_failed';
          didRefresh = true;
          didRetry = true;
          if (isDev) {
            console.log(`[callEdgeFunctionSafely] ${functionName} - status=${finalStatus}, didRefresh=${didRefresh}, didRetry=${didRetry}`);
          }
          throw new Error('AUTH_REQUIRED');
        }

        if (isDev) {
          console.log(`[callEdgeFunctionSafely] Session refreshed on 401 for ${functionName} - new token length: ${retryRefreshData.session.access_token.length}`);
        }
        didRefresh = true;
        currentAccessToken = retryRefreshData.session.access_token;
      }

      // Retry with new token (rebuild headers)
      didRetry = true;
      response = await makeRequest(currentAccessToken);
      finalStatus = response.status;
      
      if (isDev) {
        console.log(`[callEdgeFunctionSafely] ${functionName} - retry response status: ${finalStatus}`);
      }
    }

    // STEP 6: If still 401 → throw AUTH_REQUIRED (do NOT sign out)
    if (response.status === 401) {
      console.error(`[callEdgeFunctionSafely] Still 401 for ${functionName} after refresh+retry - throwing AUTH_REQUIRED`);
      finalStatus = '401_after_retry';
      if (isDev) {
        console.log(`[callEdgeFunctionSafely] ${functionName} - status=${finalStatus}, didRefresh=${didRefresh}, didRetry=${didRetry}`);
      }
      throw new Error('AUTH_REQUIRED');
    }

    // STEP 7: Handle other errors
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[callEdgeFunctionSafely] ${functionName} failed:`, response.status, errorText);
      
      // Handle 404 - function not deployed
      if (response.status === 404) {
        finalStatus = '404';
        if (isDev) {
          console.log(`[callEdgeFunctionSafely] ${functionName} - status=${finalStatus}, didRefresh=${didRefresh}, didRetry=${didRetry}`);
        }
        
        if (showErrorAlert) {
          Alert.alert(
            'Feature Unavailable',
            'This feature is temporarily unavailable. Please try again later.',
            [{ text: 'OK' }]
          );
        }
        throw new Error(`Edge Function '${functionName}' not found (404)`);
      }
      
      if (isDev) {
        console.log(`[callEdgeFunctionSafely] ${functionName} - status=${finalStatus}, didRefresh=${didRefresh}, didRetry=${didRetry}`);
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

    // STEP 8: Parse and return response
    const data = await response.json();
    if (isDev) {
      console.log(`[callEdgeFunctionSafely] ${functionName} - status=${finalStatus}, didRefresh=${didRefresh}, didRetry=${didRetry} - SUCCESS`);
    }
    return data as TResponse;

  } catch (error: any) {
    console.error(`[callEdgeFunctionSafely] Error calling ${functionName}:`, error.message);
    if (isDev) {
      console.log(`[callEdgeFunctionSafely] ${functionName} - status=${finalStatus}, didRefresh=${didRefresh}, didRetry=${didRetry} - ERROR`);
    }
    
    // If it's AUTH_REQUIRED, propagate it (do NOT show alert here - let UI handle it)
    if (error.message === 'AUTH_REQUIRED') {
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
      { showErrorAlert: false } // Let UI handle errors
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
 * 1. Send image (base64 or URL) directly to Edge Function
 * 2. Edge Function runs pipeline:
 *    a) Validate auth (verify_jwt=true), reject images > 6MB
 *    b) Check rate limit (20 searches/day per user)
 *    c) FIRST TRY (optional): OpenAI Vision for high-confidence identification
 *    d) FALLBACK: Visual search provider (SerpAPI Google Lens / Bing Visual Search)
 *    e) Fetch product pages and extract schema.org / OpenGraph data
 *    f) Score, dedupe, and return top 5-8 candidates
 * 3. Returns structured JSON with status, items, and metadata
 * 
 * ALWAYS returns a response - never silently fails
 * 
 * GUARDS:
 * - Prevents multiple parallel identify calls
 * - Checks auth state before calling edge function
 * - If AUTH_REQUIRED is thrown → stops and returns error (no retry loops)
 */
export async function identifyFromImage(
  imageBase64?: string,
  options?: {
    countryCode?: string;
    currencyCode?: string;
    locale?: string;
    hints?: string[];
  }
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
        code: 'AUTH_REQUIRED',
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
        code: 'AUTH_REQUIRED',
        providerUsed: 'none',
        confidence: 0,
        query: '',
        items: [],
      };
    }

    if (!imageBase64) {
      identifyInProgress = false;
      return {
        status: 'error',
        message: 'imageBase64 is required',
        providerUsed: 'none',
        confidence: 0,
        query: '',
        items: [],
      };
    }

    console.log('[identifyFromImage] Calling Edge Function with image data');

    // Call Edge Function with image data using the safe wrapper
    // This will throw AUTH_REQUIRED if auth fails - we catch it below
    const response = await callEdgeFunctionSafely<IdentifyFromImageRequest, IdentifyFromImageResponse>(
      'identify-from-image',
      {
        imageBase64,
        countryCode: options?.countryCode,
        currencyCode: options?.currencyCode,
        locale: options?.locale,
        hints: options?.hints,
      },
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
        code: 'AUTH_REQUIRED',
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

/**
 * Identify a product from an image using OpenAI Lens pipeline
 * 
 * PIPELINE:
 * 1. OpenAI Vision analyzes the image and returns structured product data
 * 2. Performs store search based on the identified product (placeholder for now)
 * 3. Returns identified product details and shopping offers
 * 
 * This is the NEW implementation that returns offers list (Lyst-style)
 * Use this for the enhanced product discovery flow
 */
export async function identifyProductFromImage(
  imageBase64?: string,
  options?: {
    imageUrl?: string;
    cropBox?: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
    countryCode?: string;
    currency?: string;
  }
): Promise<IdentifyProductFromImageResponse> {
  try {
    console.log('[identifyProductFromImage] Starting OpenAI Lens pipeline');

    // GUARD: Check auth state BEFORE calling edge function
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session || !session.access_token) {
      console.error('[identifyProductFromImage] Invalid auth state');
      return {
        status: 'error',
        message: 'AUTH_REQUIRED',
        code: 'AUTH_REQUIRED',
        offers: [],
      };
    }

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error('[identifyProductFromImage] User not authenticated');
      return {
        status: 'error',
        message: 'AUTH_REQUIRED',
        code: 'AUTH_REQUIRED',
        offers: [],
      };
    }

    if (!imageBase64 && !options?.imageUrl) {
      return {
        status: 'error',
        message: 'Either imageBase64 or imageUrl is required',
        offers: [],
      };
    }

    console.log('[identifyProductFromImage] Calling Edge Function');

    const response = await callEdgeFunctionSafely<IdentifyProductFromImageRequest, IdentifyProductFromImageResponse>(
      'identify-product-from-image',
      {
        image_base64: imageBase64,
        image_url: options?.imageUrl,
        crop_box: options?.cropBox,
        countryCode: options?.countryCode,
        currency: options?.currency,
      },
      { showErrorAlert: false }
    );

    console.log('[identifyProductFromImage] Pipeline complete');
    console.log('[identifyProductFromImage] Status:', response.status, 'Offers:', response.offers.length);

    return response;
  } catch (error: any) {
    console.error('[identifyProductFromImage] Failed:', error);
    
    // Check for AUTH_REQUIRED
    if (error.message === 'AUTH_REQUIRED') {
      console.log('[identifyProductFromImage] AUTH_REQUIRED caught');
      return {
        status: 'error',
        message: 'AUTH_REQUIRED',
        code: 'AUTH_REQUIRED',
        offers: [],
      };
    }
    
    // Return safe fallback
    return {
      status: 'error',
      message: error.message || 'Failed to identify product',
      offers: [],
    };
  }
}
