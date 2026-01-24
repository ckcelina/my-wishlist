
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

// Get Supabase configuration
const SUPABASE_URL = Constants.expoConfig?.extra?.supabaseUrl;
const SUPABASE_ANON_KEY = Constants.expoConfig?.extra?.supabaseAnonKey;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn('[Supabase Edge Functions] Configuration missing');
}

/**
 * Call a Supabase Edge Function with proper error handling
 */
async function callEdgeFunction<TRequest, TResponse>(
  functionName: string,
  request: TRequest
): Promise<TResponse> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error('Supabase configuration is missing');
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
