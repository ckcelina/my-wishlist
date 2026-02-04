
import Constants from 'expo-constants';
import { Alert } from 'react-native';
import { supabase } from '@/lib/supabase';

// Get Supabase configuration from app.config.js extra section
// Support both naming conventions for maximum compatibility
const getEnvVar = (key: string, fallback: string = ''): string => {
  const extra = Constants.expoConfig?.extra || {};
  
  // Try multiple naming conventions
  const value = extra[key] || extra[key.toLowerCase()] || extra[key.replace(/_/g, '')];
  
  if (value && typeof value === 'string') {
    return value;
  }
  
  return fallback;
};

const SUPABASE_URL = getEnvVar('SUPABASE_URL', 'https://dixgmnuayzblwpqyplsi.supabase.co');
const SUPABASE_ANON_KEY = getEnvVar('SUPABASE_ANON_KEY', 'sb_publishable_YouNJ6jKsZgKgdWMpWUL4w_gPqrMNT-');

console.log('[Supabase Edge Functions] Configuration loaded');
console.log('[Supabase Edge Functions] URL:', SUPABASE_URL);
console.log('[Supabase Edge Functions] Anon Key configured:', !!SUPABASE_ANON_KEY);

// Expected Edge Functions for this app
const EXPECTED_EDGE_FUNCTIONS = [
  'extract-item',
  'identify-from-image',
  'search-by-name',
  'find-alternatives',
  'import-wishlist',
  'location-smart-settings',
];

console.log('[Supabase Edge Functions] Expected functions:', EXPECTED_EDGE_FUNCTIONS.join(', '));

/**
 * Get authentication token from Supabase session
 */
async function getAuthToken(): Promise<string | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || null;
  } catch (error) {
    console.error('[Supabase Edge Functions] Error getting auth token:', error);
    return null;
  }
}

/**
 * Call a Supabase Edge Function
 */
async function callEdgeFunction<TRequest = any, TResponse = any>(
  functionName: string,
  request: TRequest
): Promise<TResponse> {
  console.log(`[Supabase Edge Functions] Calling ${functionName} with request:`, request);

  try {
    // Get auth token
    const token = await getAuthToken();
    console.log(`[Supabase Edge Functions] Auth token available:`, !!token);

    // Call the Edge Function using Supabase client
    const { data, error } = await supabase.functions.invoke(functionName, {
      body: request,
    });

    if (error) {
      console.error(`[Supabase Edge Functions] Error calling ${functionName}:`, error);
      throw new Error(error.message || `Failed to call ${functionName}`);
    }

    console.log(`[Supabase Edge Functions] ${functionName} response:`, data);
    return data as TResponse;
  } catch (error: any) {
    console.error(`[Supabase Edge Functions] Exception calling ${functionName}:`, error);
    throw error;
  }
}

/**
 * Search for items by query
 */
export async function searchItem(query: string, country: string): Promise<any> {
  console.log('[Supabase Edge Functions] searchItem called with query:', query, 'country:', country);
  
  return callEdgeFunction('search-by-name', {
    query,
    countryCode: country,
  });
}

/**
 * Extract item details from URL
 */
export async function extractItem(url: string, country: string): Promise<any> {
  console.log('[Supabase Edge Functions] extractItem called with url:', url, 'country:', country);
  
  return callEdgeFunction('extract-item', {
    url,
    countryCode: country,
  });
}

/**
 * Find alternative stores for a product
 */
export async function findAlternatives(title: string): Promise<any> {
  console.log('[Supabase Edge Functions] findAlternatives called with title:', title);
  
  return callEdgeFunction('find-alternatives', {
    title,
  });
}

/**
 * Import wishlist from URL
 */
export async function importWishlist(wishlistUrl: string): Promise<any> {
  console.log('[Supabase Edge Functions] importWishlist called with url:', wishlistUrl);
  
  return callEdgeFunction('import-wishlist', {
    url: wishlistUrl,
  });
}

/**
 * Identify product from image (base64 or URL)
 */
export async function identifyFromImage(
  imageUrl?: string,
  imageBase64?: string
): Promise<any> {
  console.log('[Supabase Edge Functions] identifyFromImage called');
  console.log('[Supabase Edge Functions] imageUrl provided:', !!imageUrl);
  console.log('[Supabase Edge Functions] imageBase64 provided:', !!imageBase64);
  
  return callEdgeFunction('identify-from-image', {
    imageUrl,
    imageBase64,
  });
}

/**
 * Search by product name
 */
export async function searchByName(
  query: string,
  options?: {
    countryCode?: string;
    brand?: string;
    model?: string;
  }
): Promise<any> {
  console.log('[Supabase Edge Functions] searchByName called with query:', query, 'options:', options);
  
  return callEdgeFunction('search-by-name', {
    query,
    countryCode: options?.countryCode,
    brand: options?.brand,
    model: options?.model,
  });
}

/**
 * Identify product from image with full context
 * This is the main function used by the app for image-based product identification
 */
export async function identifyProductFromImage(
  imageBase64: string | undefined,
  imageUrl: string | undefined,
  countryCode: string,
  currencyCode: string,
  languageCode: string
): Promise<any> {
  console.log('[Supabase Edge Functions] identifyProductFromImage called');
  console.log('[Supabase Edge Functions] imageBase64 provided:', !!imageBase64);
  console.log('[Supabase Edge Functions] imageUrl provided:', !!imageUrl);
  console.log('[Supabase Edge Functions] countryCode:', countryCode);
  console.log('[Supabase Edge Functions] currencyCode:', currencyCode);
  console.log('[Supabase Edge Functions] languageCode:', languageCode);
  
  return callEdgeFunction('identify-from-image', {
    imageBase64,
    imageUrl,
    countryCode,
    currencyCode,
    languageCode,
  });
}

/**
 * Get product prices from multiple stores
 */
export async function getProductPrices(
  productId: string,
  countryCode: string,
  currencyCode: string
): Promise<any> {
  console.log('[Supabase Edge Functions] getProductPrices called');
  console.log('[Supabase Edge Functions] productId:', productId);
  console.log('[Supabase Edge Functions] countryCode:', countryCode);
  console.log('[Supabase Edge Functions] currencyCode:', currencyCode);
  
  return callEdgeFunction('find-alternatives', {
    productId,
    countryCode,
    currencyCode,
  });
}
