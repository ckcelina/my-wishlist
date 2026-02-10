
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
  country_code?: string;
  currency_code?: string;
}

export interface IdentifyProductFromImageResponse {
  status: 'ok' | 'no_results' | 'error';
  identified: IdentifiedProduct | null;
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

export interface SearchByNameResponse {
  results: SearchResult[];
  error: string | null;
}

// Get Supabase configuration from appConfig with safe fallbacks
const SUPABASE_URL = appConfig.supabaseUrl || '';
const SUPABASE_ANON_KEY = appConfig.supabaseAnonKey || '';

// List of expected Edge Functions (case-sensitive, exact names deployed in Supabase)
const EXPECTED_EDGE_FUNCTIONS = [
  'extract-item',
  'find-alternatives',
  'import-wishlist',
  'identify-product-from-image', // CANONICAL: OpenAI Lens pipeline with offers
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

// Check BACKEND_URL configuration (for diagnostics)
const BACKEND_URL = appConfig.backendUrl || '';
console.log('   BACKEND_URL:', BACKEND_URL ? `✅ Set (${BACKEND_URL})` : '⚠️ Not set (optional)');

console.log('═══════════════════════════════════════════════════════════════');
console.log('📋 REGISTERED EDGE FUNCTIONS:');
EXPECTED_EDGE_FUNCTIONS.forEach(fn => console.log(`   - ${fn}`));
console.log('═══════════════════════════════════════════════════════════════');

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * SHARED HELPER: assertSupabaseSession
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Used before AI calls to ensure valid session exists.
 * Throws AUTH_REQUIRED if session is missing or invalid.
 * Returns the valid access token if successful.
 */
export async function assertSupabaseSession(): Promise<string> {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  
  if (sessionError) {
    console.error('[assertSupabaseSession] Session error:', sessionError.message);
    throw new Error('AUTH_REQUIRED');
  }

  if (!sessionData.session || !sessionData.session.access_token) {
    console.warn('[assertSupabaseSession] No valid session found');
    throw new Error('AUTH_REQUIRED');
  }

  const expiresAt = sessionData.session.expires_at;
  const now = Math.floor(Date.now() / 1000);

  // If token is near expiry, refresh it
  if (expiresAt && expiresAt <= now + 60) {
    console.log('[assertSupabaseSession] Token expiring soon, refreshing...');
    const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
    
    if (refreshError || !refreshData.session || !refreshData.session.access_token) {
      console.error('[assertSupabaseSession] Refresh failed:', refreshError?.message);
      throw new Error('AUTH_REQUIRED');
    }

    return refreshData.session.access_token;
  }

  return sessionData.session.access_token;
}

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CENTRALIZED EDGE FUNCTION CALLER - USES SUPABASE CLIENT'S INVOKE METHOD
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * CRITICAL: This is the SINGLE wrapper for ALL Supabase Edge Function calls.
 * Uses supabase.functions.invoke() for correct URL resolution and auth handling.
 * 
 * REQUIREMENTS:
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
    
    throw new Error('CONFIG_ERROR');
  }

  // Verify function name is expected (case-sensitive)
  if (!EXPECTED_EDGE_FUNCTIONS.includes(functionName)) {
    console.warn(`[callEdgeFunctionSafely] Unknown function '${functionName}' - returning safe fallback`);
    throw new Error(`Edge Function '${functionName}' is not recognized`);
  }

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

  // STEP 4: Make the edge call using Supabase client's invoke method
  const makeRequest = async (token: string): Promise<{ data: any; error: any; status?: number }> => {
    if (isDev) {
      console.log(`[callEdgeFunctionSafely] Calling supabase.functions.invoke('${functionName}') with token length: ${token.length}`);
    }

    // Use Supabase client's invoke method for correct URL resolution and auth handling
    const result = await supabase.functions.invoke(functionName, {
      body: payload,
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY, // Always include anon key
        'Authorization': `Bearer ${token}`, // User access token
      },
    });

    return result;
  };

  try {
    // First attempt
    let result = await makeRequest(currentAccessToken);
    finalStatus = result.error ? (result.error.message?.includes('401') ? 401 : 'error') : 200;

    if (isDev) {
      console.log(`[callEdgeFunctionSafely] ${functionName} - initial response status: ${finalStatus}`);
    }

    // STEP 5: If response is 401 → attempt refresh ONCE and retry ONCE
    if (result.error && result.error.message?.includes('401') && !didRetry) {
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

      // Retry with new token
      didRetry = true;
      result = await makeRequest(currentAccessToken);
      finalStatus = result.error ? (result.error.message?.includes('401') ? 401 : 'error') : 200;
      
      if (isDev) {
        console.log(`[callEdgeFunctionSafely] ${functionName} - retry response status: ${finalStatus}`);
      }
    }

    // STEP 6: If still 401 → throw AUTH_REQUIRED (do NOT sign out)
    if (result.error && result.error.message?.includes('401')) {
      console.error(`[callEdgeFunctionSafely] Still 401 for ${functionName} after refresh+retry - throwing AUTH_REQUIRED`);
      finalStatus = '401_after_retry';
      if (isDev) {
        console.log(`[callEdgeFunctionSafely] ${functionName} - status=${finalStatus}, didRefresh=${didRefresh}, didRetry=${didRetry}`);
      }
      throw new Error('AUTH_REQUIRED');
    }

    // STEP 7: Handle other errors
    if (result.error) {
      console.error(`[callEdgeFunctionSafely] ${functionName} failed:`, result.error.message);
      
      // Handle 404 - function not deployed
      if (result.error.message?.includes('404') || result.error.message?.includes('not found')) {
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
      
      // Handle 400 - check for CONFIG_ERROR in response body
      if (result.error.message?.includes('400') && result.error.message?.toLowerCase().includes('config')) {
        finalStatus = '400_config';
        if (isDev) {
          console.log(`[callEdgeFunctionSafely] ${functionName} - status=${finalStatus}, didRefresh=${didRefresh}, didRetry=${didRetry}`);
        }
        throw new Error('CONFIG_ERROR');
      }
      
      if (isDev) {
        console.log(`[callEdgeFunctionSafely] ${functionName} - status=${finalStatus}, didRefresh=${didRefresh}, didRetry=${didRetry}`);
      }
      
      if (showErrorAlert) {
        Alert.alert(
          'Request Failed',
          `Unable to complete the request. Please try again. (Error: ${result.error.message})`,
          [{ text: 'OK' }]
        );
      }
      
      throw new Error(`Edge function failed: ${result.error.message}`);
    }

    // STEP 8: Return response data
    if (isDev) {
      console.log(`[callEdgeFunctionSafely] ${functionName} - status=${finalStatus}, didRefresh=${didRefresh}, didRetry=${didRetry} - SUCCESS`);
    }
    return result.data as TResponse;

  } catch (error: any) {
    console.error(`[callEdgeFunctionSafely] Error calling ${functionName}:`, error.message);
    if (isDev) {
      console.log(`[callEdgeFunctionSafely] ${functionName} - status=${finalStatus}, didRefresh=${didRefresh}, didRetry=${didRetry} - ERROR`);
    }
    
    // If it's a specific error code, propagate it (do NOT show alert here - let UI handle it)
    if (error.message === 'AUTH_REQUIRED' || error.message === 'CONFIG_ERROR') {
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
 * Normalize base64 input by stripping data URI prefix
 * Ensures clean base64 string is sent to edge functions
 */
function normalizeBase64(base64String: string): string {
  if (base64String.startsWith('data:image')) {
    const parts = base64String.split(',');
    if (parts.length > 1) {
      if (__DEV__) {
        console.log('[normalizeBase64] Stripped data URI prefix, original length:', base64String.length, 'new length:', parts[1].length);
      }
      return parts[1];
    }
  }
  return base64String;
}

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CANONICAL IMAGE IDENTIFICATION FUNCTION - identify-product-from-image
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * This is the PRIMARY and ONLY image identification function.
 * Uses OpenAI Lens pipeline with store search to return offers.
 * 
 * PIPELINE:
 * 1. OpenAI Vision analyzes the image and returns structured product data
 * 2. Performs store search based on the identified product
 * 3. Returns identified product details and shopping offers
 * 
 * Returns:
 * - status: 'ok' | 'no_results' | 'error'
 * - identified: { title, brand, category, attributes, search_query, confidence } | null
 * - offers: [{ store, title, price, currency, product_url, image_url, score }]
 * - message: Optional error/info message
 * - code: Optional error code (e.g., 'AUTH_REQUIRED')
 * - debug: Optional debug info (provider, query_used)
 * 
 * PAYLOAD FORMAT (snake_case):
 * - image_base64 (not imageBase64)
 * - image_url (not imageUrl)
 * - crop_box (not cropBox)
 * - country_code (not countryCode)
 * - currency_code (not currency)
 * 
 * ALWAYS returns a response with standardized structure - never silently fails
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
    console.log('[identifyProductFromImage] Starting OpenAI Lens pipeline (CANONICAL)');

    // GUARD: Check auth state BEFORE calling edge function
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session || !session.access_token) {
      console.error('[identifyProductFromImage] Invalid auth state');
      return {
        status: 'error',
        message: 'AUTH_REQUIRED',
        code: 'AUTH_REQUIRED',
        identified: null,
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
        identified: null,
        offers: [],
      };
    }

    if (!imageBase64 && !options?.imageUrl) {
      return {
        status: 'error',
        message: 'Either imageBase64 or imageUrl is required',
        identified: null,
        offers: [],
      };
    }

    // Normalize base64 input (strip data URI prefix if present)
    const normalizedBase64 = imageBase64 ? normalizeBase64(imageBase64) : undefined;

    console.log('[identifyProductFromImage] Calling Edge Function');
    if (__DEV__) {
      const payloadKeys = [
        normalizedBase64 ? 'image_base64' : null,
        options?.imageUrl ? 'image_url' : null,
        options?.cropBox ? 'crop_box' : null,
        options?.countryCode ? 'country_code' : null,
        options?.currency ? 'currency_code' : null,
      ].filter(Boolean);
      console.log('[DEV] Calling identify-product-from-image with keys:', payloadKeys.join(', '));
    }

    // CRITICAL: Use snake_case keys for identify-product-from-image
    const response = await callEdgeFunctionSafely<IdentifyProductFromImageRequest, IdentifyProductFromImageResponse>(
      'identify-product-from-image',
      {
        image_base64: normalizedBase64, // snake_case
        image_url: options?.imageUrl, // snake_case
        crop_box: options?.cropBox, // snake_case
        country_code: options?.countryCode, // snake_case (converted from countryCode)
        currency_code: options?.currency, // snake_case (converted from currency)
      },
      { showErrorAlert: false }
    );

    console.log('[identifyProductFromImage] Pipeline complete');
    console.log('[identifyProductFromImage] Status:', response.status);
    console.log('[identifyProductFromImage] Identified:', response.identified?.title || 'N/A');
    console.log('[identifyProductFromImage] Brand:', response.identified?.brand || 'N/A');
    console.log('[identifyProductFromImage] Confidence:', response.identified?.confidence || 0);
    console.log('[identifyProductFromImage] Offers:', response.offers?.length || 0);

    // Ensure standardized response structure
    return {
      status: response.status,
      identified: response.status === 'ok' ? response.identified : null,
      offers: response.offers || [],
      message: response.message,
      code: response.code,
      debug: response.debug,
    };
  } catch (error: any) {
    console.error('[identifyProductFromImage] Failed:', error);
    
    // Check for AUTH_REQUIRED
    if (error.message === 'AUTH_REQUIRED') {
      console.log('[identifyProductFromImage] AUTH_REQUIRED caught');
      return {
        status: 'error',
        message: 'AUTH_REQUIRED',
        code: 'AUTH_REQUIRED',
        identified: null,
        offers: [],
      };
    }
    
    // Return safe fallback with standardized structure
    return {
      status: 'error',
      message: error.message || 'Failed to identify product',
      identified: null,
      offers: [],
    };
  }
}

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * DEPRECATED: identifyFromImage - DO NOT USE
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * This function has been DEPRECATED and removed.
 * Use identifyProductFromImage() instead.
 * 
 * The old identify-from-image Edge Function is no longer supported.
 * All image identification should use identify-product-from-image.
 */
export async function identifyFromImage(): Promise<never> {
  console.error(
    '❌ identifyFromImage() is DEPRECATED and has been removed. ' +
    'Use identifyProductFromImage() instead. ' +
    'The identify-from-image Edge Function is no longer supported.'
  );
  throw new Error(
    'DEPRECATED: identifyFromImage() has been removed. Use identifyProductFromImage() instead.'
  );
}

/**
 * Search for products by name across multiple stores
 * Filters by user location if provided
 * Returns products with confidence scores
 * Works identically in all environments
 * 
 * NOTE: This function is currently NOT in the EXPECTED_EDGE_FUNCTIONS list
 * because search-by-name is not deployed. If you need this functionality,
 * deploy the search-by-name Edge Function and add it to EXPECTED_EDGE_FUNCTIONS.
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
  console.warn('[searchByName] This function requires the search-by-name Edge Function to be deployed');
  
  // Return safe fallback since function is not deployed
  return {
    results: [],
    error: 'search-by-name Edge Function is not deployed. Please deploy it to use this feature.',
  };
}
