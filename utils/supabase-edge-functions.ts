
import Constants from 'expo-constants';

// Types for Edge Function requests and responses
export interface ExtractItemRequest {
  url: string;
}

export interface ExtractItemResponse {
  title: string | null;
  imageUrl: string | null;
  price: number | null;
  currency: string | null;
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

// Get Supabase configuration
const SUPABASE_URL = Constants.expoConfig?.extra?.supabaseUrl;
const SUPABASE_ANON_KEY = Constants.expoConfig?.extra?.supabaseAnonKey;

// List of expected Edge Functions (case-sensitive)
const EXPECTED_EDGE_FUNCTIONS = [
  'identify-from-image',
  'extract-item',
  'find-alternatives',
  'import-wishlist',
  'search-by-name',
];

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn('[Supabase Edge Functions] Configuration missing');
}

/**
 * Call a Supabase Edge Function with proper error handling
 * Returns safe fallback on 404 or missing function
 */
async function callEdgeFunction<TRequest, TResponse>(
  functionName: string,
  request: TRequest
): Promise<TResponse> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error('Supabase configuration is missing');
  }

  // Verify function name is expected (case-sensitive)
  if (!EXPECTED_EDGE_FUNCTIONS.includes(functionName)) {
    console.warn(`[Edge Function] Unknown function '${functionName}' - returning safe fallback`);
    throw new Error(`Edge Function '${functionName}' is not recognized`);
  }

  const url = `${SUPABASE_URL}/functions/v1/${functionName}`;
  console.log(`[Edge Function] Calling ${functionName}:`, request);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify(request),
    });

    // Handle 404 - function not deployed
    if (response.status === 404) {
      console.warn(`[Edge Function] ${functionName} not found (404) - function may not be deployed`);
      throw new Error(`Edge Function '${functionName}' not found (404)`);
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Edge Function] ${functionName} failed:`, response.status, errorText);
      throw new Error(`Edge function failed: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    console.log(`[Edge Function] ${functionName} response:`, data);

    return data as TResponse;
  } catch (error: any) {
    console.error(`[Edge Function] ${functionName} error:`, error);
    throw error;
  }
}

/**
 * Extract item details from a URL
 * Returns partial data even if extraction fails
 */
export async function extractItem(url: string): Promise<ExtractItemResponse> {
  try {
    const response = await callEdgeFunction<ExtractItemRequest, ExtractItemResponse>(
      'extract-item',
      { url }
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
      imageUrl: null,
      price: null,
      currency: null,
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
      }
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
 */
export async function importWishlist(wishlistUrl: string): Promise<ImportWishlistResponse> {
  try {
    const response = await callEdgeFunction<ImportWishlistRequest, ImportWishlistResponse>(
      'import-wishlist',
      { wishlistUrl }
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
 */
export async function identifyFromImage(
  imageUrl?: string,
  imageBase64?: string
): Promise<IdentifyFromImageResponse> {
  try {
    const response = await callEdgeFunction<IdentifyFromImageRequest, IdentifyFromImageResponse>(
      'identify-from-image',
      { imageUrl, imageBase64 }
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
      }
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
