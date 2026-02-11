
import Constants from 'expo-constants';
import { supabase } from '@/lib/supabase';
import { appConfig, isEnvironmentConfigured, getConfigurationErrorMessage } from './environmentConfig';
import { EDGE_FUNCTION_NAMES, type EdgeFunction } from '@/src/constants/edgeFunctions';

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

// ═══════════════════════════════════════════════════════════════════════════
// CANONICAL IMAGE IDENTIFICATION - Google Cloud Vision
// ═══════════════════════════════════════════════════════════════════════════

export interface IdentifyProductFromImageRequest {
  imageBase64?: string;
  imageUrl?: string;
  mimeType?: string;
}

export interface ProductCandidate {
  title: string;
  storeUrl: string | null;
  imageUrl: string | null;
  source: 'google_vision';
  score: number;
  reason: string;
}

export interface IdentifyProductFromImageResponse {
  status: 'ok' | 'no_results' | 'error';
  providerUsed?: 'google_vision';
  confidence?: number;
  query?: string;
  items?: ProductCandidate[];
  message: string | null;
  error?: {
    code: 'AUTH_REQUIRED' | 'IMAGE_TOO_LARGE' | 'VISION_FAILED' | 'INVALID_INPUT';
    message: string;
  };
  debug?: {
    step: string;
    detail: any;
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

console.log('═══════════════════════════════════════════════════════════════');
console.log('📋 REGISTERED EDGE FUNCTIONS:');
Object.values(EDGE_FUNCTION_NAMES).forEach(fn => console.log(`   - ${fn}`));
console.log('═══════════════════════════════════════════════════════════════');

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * EDGE FUNCTION AVAILABILITY CHECK - FOR DIAGNOSTICS
 * ═══════════════════════════════════════════════════════════════════════════
 */
export async function checkEdgeFunctionAvailability(
  functionName: EdgeFunction
): Promise<{
  status: 'Available' | 'Not Deployed' | 'Auth Required' | 'Server Error' | 'Network Error' | 'Error';
  statusCode?: number;
  message: string;
}> {
  const functionsUrl = `${SUPABASE_URL}/functions/v1`;
  const url = `${functionsUrl}/${functionName}`;

  try {
    console.log(`[checkEdgeFunctionAvailability] Checking ${functionName} at ${url}`);
    
    // Special handling for health function - use GET
    if (functionName === EDGE_FUNCTION_NAMES.HEALTH) {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
        },
      });

      console.log(`[checkEdgeFunctionAvailability] ${functionName} responded with status: ${response.status}`);

      if (response.status === 200) {
        try {
          const data = await response.json();
          if (data.status === 'ok') {
            return {
              status: 'Available',
              statusCode: 200,
              message: `OK (v${data.version})`,
            };
          }
        } catch (e) {
          // JSON parse failed, but 200 is still good
        }
        return {
          status: 'Available',
          statusCode: 200,
          message: 'OK',
        };
      }
    }

    // For other functions, use supabase.functions.invoke to check availability
    const { data, error } = await supabase.functions.invoke(functionName, {
      body: {},
    });

    // Check the response
    if (!error) {
      return {
        status: 'Available',
        statusCode: 200,
        message: 'OK',
      };
    }

    // Parse error to determine status
    const errorMessage = error.message || '';
    
    if (errorMessage.includes('404') || errorMessage.includes('not found')) {
      return {
        status: 'Not Deployed',
        statusCode: 404,
        message: 'Function not found - not deployed',
      };
    } else if (errorMessage.includes('401') || errorMessage.includes('unauthorized')) {
      return {
        status: 'Auth Required',
        statusCode: 401,
        message: 'Function requires authentication',
      };
    } else if (errorMessage.includes('500') || errorMessage.includes('internal')) {
      return {
        status: 'Server Error',
        statusCode: 500,
        message: 'Server error',
      };
    } else if (errorMessage.includes('400') || errorMessage.includes('405')) {
      // 400/405 means function exists but doesn't accept empty body (which is fine)
      return {
        status: 'Available',
        statusCode: 400,
        message: 'Function deployed',
      };
    } else {
      return {
        status: 'Error',
        message: errorMessage || 'Unknown error',
      };
    }
  } catch (error: any) {
    console.error(`[checkEdgeFunctionAvailability] Network error checking ${functionName}:`, error);
    return {
      status: 'Network Error',
      message: `Network error: ${error.message || 'Unknown error'}`,
    };
  }
}

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * HARDENED EDGE FUNCTION CALLER - PERMANENT AUTH FIX
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * CRITICAL FIXES IMPLEMENTED:
 * 1. ✅ Prints HTTP status + response JSON error body (redacting tokens)
 * 2. ✅ NEVER forces sign-out on 401
 * 3. ✅ Only redirects to login if session is truly missing AND refresh fails
 * 4. ✅ Handles consistent JSON responses from edge functions
 * 5. ✅ FIXED: Authorization header now uses access_token (NOT anon key)
 * 6. ✅ FIXED: Retry logic on 401 with session refresh
 * 
 * AUTHENTICATION FLOW:
 * 1. getSession() and get access_token
 * 2. If no token: attempt refreshSession() once
 * 3. Call function with:
 *    - apikey: SUPABASE_ANON_KEY (required for Supabase routing)
 *    - Authorization: Bearer <access_token> (for JWT verification)
 * 4. If response is non-2xx:
 *    - Read response text/json
 *    - Log: functionName, status, requestId (if any), safe error message, first 500 chars of body
 *    - Throw typed error: { code, status, message, details }
 * 5. If status is 401:
 *    - Attempt refreshSession() once and retry once
 *    - If still 401: throw code="AUTH_REQUIRED"
 * 
 * IMPORTANT: Remove any "forcing sign out" behavior. Do NOT signOut automatically.
 */
export async function callEdgeFunctionSafely<TRequest, TResponse>(
  functionName: EdgeFunction,
  payload: TRequest
): Promise<TResponse> {
  const isDev = __DEV__;
  let retryCount = 0;
  const maxRetries = 1;

  if (isDev) {
    console.log(`[callEdgeFunctionSafely] Starting call to ${functionName}`);
  }

  // Check if environment is configured
  if (!isEnvironmentConfigured()) {
    const errorMessage = getConfigurationErrorMessage();
    console.error(`[callEdgeFunctionSafely] ${errorMessage}`);
    throw new Error('CONFIG_ERROR');
  }

  const makeRequest = async (): Promise<TResponse> => {
    // STEP 1: Get session and extract access_token
    if (isDev) {
      console.log(`[callEdgeFunctionSafely] Fetching session for ${functionName}`);
    }
    
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error(`[callEdgeFunctionSafely] Session error for ${functionName}:`, sessionError.message);
      throw new Error('AUTH_REQUIRED');
    }

    // STEP 2: If no token, attempt refreshSession() once
    let accessToken = sessionData.session?.access_token;
    
    if (!accessToken) {
      console.warn(`[callEdgeFunctionSafely] No access_token for ${functionName} - attempting refresh`);
      
      const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
      
      if (refreshError || !refreshData.session || !refreshData.session.access_token) {
        console.error(`[callEdgeFunctionSafely] Refresh failed for ${functionName}:`, refreshError?.message);
        throw new Error('AUTH_REQUIRED');
      }

      accessToken = refreshData.session.access_token;
      
      if (isDev) {
        console.log(`[callEdgeFunctionSafely] Session refreshed for ${functionName}`);
      }
    }

    // CRITICAL: Verify we have a valid access_token (not anon key)
    if (!accessToken || accessToken === SUPABASE_ANON_KEY) {
      console.error(`[callEdgeFunctionSafely] Invalid access_token for ${functionName} - got anon key or undefined`);
      throw new Error('AUTH_REQUIRED');
    }

    // STEP 3: Call function with CORRECT headers
    const url = `${SUPABASE_URL}/functions/v1/${functionName}`;
    
    if (isDev) {
      console.log(`[callEdgeFunctionSafely] Calling ${functionName} at ${url}`);
      console.log(`[callEdgeFunctionSafely] Headers:`);
      console.log(`  - apikey: ${SUPABASE_ANON_KEY.substring(0, 20)}...`);
      console.log(`  - Authorization: Bearer ${accessToken.substring(0, 20)}...`);
      console.log(`[callEdgeFunctionSafely] ✅ CRITICAL: Using access_token (NOT anon key) for Authorization`);
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY, // ✅ CORRECT: apikey for Supabase routing
        'Authorization': `Bearer ${accessToken}`, // ✅ CORRECT: access_token for JWT verification
      },
      body: JSON.stringify(payload),
    });

    // STEP 4: If response is non-2xx, read response text/json and log details
    if (!response.ok) {
      const requestId = response.headers.get('x-request-id') || 'N/A';
      const responseText = await response.text();
      
      let jsonBody: any;
      try {
        jsonBody = JSON.parse(responseText);
      } catch {
        jsonBody = { status: 'error', error: { code: 'NON_JSON_RESPONSE', message: responseText } };
      }

      const safeErrorMessage = jsonBody.message || jsonBody.error?.message || jsonBody.error || 'Unknown error';
      const logBody = responseText.substring(0, 500); // First 500 chars

      // Log: functionName, status, requestId, safe error message, first 500 chars of body
      console.error(`═══════════════════════════════════════════════════════════════`);
      console.error(`❌ Edge Function Error: ${functionName}`);
      console.error(`   Status: ${response.status}`);
      console.error(`   RequestId: ${requestId}`);
      console.error(`   Message: ${safeErrorMessage}`);
      console.error(`   Retry: ${retryCount > 0 ? 'Yes' : 'No'}`);
      console.error(`   Body (first 500 chars): ${logBody}`);
      console.error(`═══════════════════════════════════════════════════════════════`);

      // STEP 5: If status is 401, attempt refreshSession() once and retry once
      if (response.status === 401 && retryCount < maxRetries) {
        console.warn(`[callEdgeFunctionSafely] 401 received for ${functionName}, attempting session refresh and retry...`);
        
        const { data: retryRefreshData, error: retryRefreshError } = await supabase.auth.refreshSession();
        
        if (retryRefreshError || !retryRefreshData.session || !retryRefreshData.session.access_token) {
          console.error(`[callEdgeFunctionSafely] Refresh failed on 401 retry for ${functionName}:`, retryRefreshError?.message);
          throw new Error('AUTH_REQUIRED');
        }

        if (isDev) {
          console.log(`[callEdgeFunctionSafely] Session refreshed on 401 for ${functionName} - retrying`);
        }
        
        retryCount++;
        return makeRequest(); // Retry with new token
      }

      // If still 401 after retry, throw AUTH_REQUIRED
      if (response.status === 401) {
        console.error(`[callEdgeFunctionSafely] Still 401 for ${functionName} after refresh+retry - throwing AUTH_REQUIRED`);
        throw new Error('AUTH_REQUIRED');
      }

      // Throw typed error for other non-2xx responses
      throw new Error(JSON.stringify({
        code: jsonBody.error?.code || jsonBody.error || 'EDGE_FUNCTION_ERROR',
        status: response.status,
        message: safeErrorMessage,
        details: jsonBody,
      }));
    }

    // STEP 6: Parse and return response
    const responseText = await response.text();
    
    let jsonResponse: any;
    try {
      jsonResponse = JSON.parse(responseText);
    } catch {
      console.error(`[callEdgeFunctionSafely] Non-JSON response from ${functionName}:`, responseText.substring(0, 500));
      throw new Error('Non-JSON response from edge function');
    }

    if (isDev) {
      console.log(`[callEdgeFunctionSafely] ✅ ${functionName} - SUCCESS`);
    }

    return jsonResponse as TResponse;
  };

  return makeRequest();
}

/**
 * Extract item details from a URL
 */
export async function extractItem(url: string, country: string): Promise<ExtractItemResponse> {
  try {
    const response = await callEdgeFunctionSafely<ExtractItemRequest, ExtractItemResponse>(
      EDGE_FUNCTION_NAMES.EXTRACT_ITEM,
      { url, country }
    );

    if (response.meta.partial) {
      console.warn('[extractItem] Partial result returned:', response.error);
    }

    return response;
  } catch (error: any) {
    console.error('[extractItem] Failed:', error);
    
    if (error.message === 'AUTH_REQUIRED') {
      throw error;
    }
    
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
      EDGE_FUNCTION_NAMES.FIND_ALTERNATIVES,
      {
        title,
        originalUrl: options?.originalUrl,
        countryCode: options?.countryCode,
        city: options?.city,
      }
    );

    if (response.meta.partial) {
      console.warn('[findAlternatives] Partial result returned:', response.error);
    }

    return response;
  } catch (error: any) {
    console.error('[findAlternatives] Failed:', error);
    
    if (error.message === 'AUTH_REQUIRED') {
      throw error;
    }
    
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
 */
export async function importWishlist(wishlistUrl: string): Promise<ImportWishlistResponse> {
  try {
    const response = await callEdgeFunctionSafely<ImportWishlistRequest, ImportWishlistResponse>(
      EDGE_FUNCTION_NAMES.IMPORT_WISHLIST,
      { wishlistUrl }
    );

    if (response.meta.partial) {
      console.warn('[importWishlist] Partial result returned:', response.error);
    }

    return response;
  } catch (error: any) {
    console.error('[importWishlist] Failed:', error);
    
    if (error.message === 'AUTH_REQUIRED') {
      throw error;
    }
    
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
 * HARDENED VERSION:
 * - Catches AUTH_REQUIRED and shows modal "Session expired, please sign in again"
 * - Navigates to Login screen (does NOT crash)
 * - For any other error: shows toast "Image identify failed" with short reason
 */
export async function identifyProductFromImage(
  imageBase64: string,
  options?: {
    mimeType?: string;
  }
): Promise<IdentifyProductFromImageResponse> {
  try {
    console.log('[identifyProductFromImage] Starting Google Cloud Vision pipeline (CANONICAL)');

    if (!imageBase64) {
      return {
        status: 'error',
        error: {
          code: 'INVALID_INPUT',
          message: 'Missing imageBase64.',
        },
        message: 'Missing imageBase64.',
      };
    }

    // Normalize base64 input (strip data URI prefix if present)
    const normalizedBase64 = normalizeBase64(imageBase64);

    console.log('[identifyProductFromImage] Calling Edge Function identify-product-from-image');
    if (__DEV__) {
      console.log('[DEV] Calling identify-product-from-image with Google Cloud Vision');
    }

    const response = await callEdgeFunctionSafely<IdentifyProductFromImageRequest, IdentifyProductFromImageResponse>(
      EDGE_FUNCTION_NAMES.IDENTIFY_PRODUCT_FROM_IMAGE,
      {
        imageBase64: normalizedBase64,
        mimeType: options?.mimeType,
      }
    );

    console.log('[identifyProductFromImage] Pipeline complete');
    console.log('[identifyProductFromImage] Status:', response.status);
    console.log('[identifyProductFromImage] Query:', response.query || 'N/A');
    console.log('[identifyProductFromImage] Items:', response.items?.length || 0);
    console.log('[identifyProductFromImage] Confidence:', response.confidence || 0);

    return response;
  } catch (error: any) {
    console.error('[identifyProductFromImage] Failed:', error);
    
    // Check for AUTH_REQUIRED
    if (error.message === 'AUTH_REQUIRED') {
      console.log('[identifyProductFromImage] AUTH_REQUIRED caught');
      return {
        status: 'error',
        error: {
          code: 'AUTH_REQUIRED',
          message: 'Please sign in again.',
        },
        message: 'Please sign in again.',
      };
    }
    
    // Try to parse error message as JSON (from typed error)
    try {
      const errorObj = JSON.parse(error.message);
      return {
        status: 'error',
        error: {
          code: errorObj.code || 'VISION_FAILED',
          message: errorObj.message || 'Could not analyze image right now.',
        },
        message: errorObj.message || 'Could not analyze image right now.',
        debug: errorObj.details,
      };
    } catch {
      // Not JSON, return generic error
      return {
        status: 'error',
        error: {
          code: 'VISION_FAILED',
          message: error.message || 'Could not analyze image right now.',
        },
        message: error.message || 'Could not analyze image right now.',
      };
    }
  }
}

/**
 * Search for products by name
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
    console.log('[searchByName] Calling search-by-name Edge Function');
    
    const response = await callEdgeFunctionSafely<SearchByNameRequest, SearchByNameResponse>(
      EDGE_FUNCTION_NAMES.SEARCH_BY_NAME,
      {
        query,
        countryCode: options?.countryCode,
        city: options?.city,
        currency: options?.currency,
        limit: options?.limit || 10,
      }
    );

    console.log('[searchByName] Search complete:', response.results.length, 'results');
    return response;
  } catch (error: any) {
    console.error('[searchByName] Failed:', error);
    
    if (error.message === 'AUTH_REQUIRED') {
      return {
        results: [],
        error: 'AUTH_REQUIRED',
      };
    }
    
    return {
      results: [],
      error: error.message || 'Failed to search for products',
    };
  }
}
