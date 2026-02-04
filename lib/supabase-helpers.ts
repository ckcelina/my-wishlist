
import { supabase } from './supabase';
import type { 
  Wishlist, 
  WishlistInsert, 
  WishlistUpdate,
  WishlistItem,
  WishlistItemInsert,
  WishlistItemUpdate,
  PriceHistory,
  PriceHistoryInsert,
  SharedWishlist,
  SharedWishlistInsert,
  SharedWishlistUpdate
} from './supabase-types';

// ============================================================================
// WISHLISTS
// ============================================================================

export async function fetchWishlists(userId: string) {
  console.log('[Supabase] Fetching wishlists for user:', userId);
  
  const { data, error } = await supabase
    .from('wishlists')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[Supabase] Error fetching wishlists:', error);
    throw new Error(`Failed to fetch wishlists: ${error.message}`);
  }

  console.log('[Supabase] Fetched wishlists:', data?.length);
  return data as Wishlist[];
}

export async function fetchWishlistById(wishlistId: string) {
  console.log('[Supabase] Fetching wishlist:', wishlistId);
  
  const { data, error } = await supabase
    .from('wishlists')
    .select('*')
    .eq('id', wishlistId)
    .single();

  if (error) {
    console.error('[Supabase] Error fetching wishlist:', error);
    throw new Error(`Failed to fetch wishlist: ${error.message}`);
  }

  return data as Wishlist;
}

export async function createWishlist(wishlist: WishlistInsert) {
  console.log('[Supabase] Creating wishlist:', wishlist.name, 'explicit is_default:', wishlist.is_default);
  
  // Check if this is the user's first wishlist
  const { data: existingWishlists, error: checkError } = await supabase
    .from('wishlists')
    .select('id')
    .eq('user_id', wishlist.user_id);

  if (checkError) {
    console.error('[Supabase] Error checking existing wishlists:', checkError);
  }

  const isFirstWishlist = !existingWishlists || existingWishlists.length === 0;
  
  // CRITICAL FIX: Wishlist Default Logic
  // A) Creating a new wishlist MUST NOT set it as Default (unless it's the first one)
  // B) Default wishlist changes ONLY when user explicitly selects "Set as default"
  // Rules:
  // 1. First wishlist → ALWAYS default (automatic)
  // 2. Subsequent wishlists → NEVER default (unless user explicitly sets is_default: true)
  const shouldBeDefault = isFirstWishlist ? true : (wishlist.is_default === true);

  console.log('[Supabase] isFirstWishlist:', isFirstWishlist, 'shouldBeDefault:', shouldBeDefault);

  // If setting as default, unset all other defaults first
  if (shouldBeDefault) {
    console.log('[Supabase] Unsetting all other defaults for user:', wishlist.user_id);
    const { error: updateError } = await supabase
      .from('wishlists')
      .update({ is_default: false })
      .eq('user_id', wishlist.user_id)
      .eq('is_default', true);

    if (updateError) {
      console.error('[Supabase] Error unsetting defaults:', updateError);
    }
  }

  const { data, error } = await supabase
    .from('wishlists')
    .insert({
      ...wishlist,
      is_default: shouldBeDefault,
    })
    .select()
    .single();

  if (error) {
    console.error('[Supabase] Error creating wishlist:', error);
    throw new Error(`Failed to create wishlist: ${error.message}`);
  }

  console.log('[Supabase] Created wishlist:', data.id, 'is_default:', data.is_default);
  return data as Wishlist;
}

export async function updateWishlist(wishlistId: string, updates: WishlistUpdate) {
  console.log('[Supabase] Updating wishlist:', wishlistId, 'updates:', updates);
  
  // If setting as default, unset all other defaults first
  if (updates.is_default === true) {
    // Get the wishlist to find the user_id
    const { data: wishlist, error: fetchError } = await supabase
      .from('wishlists')
      .select('user_id')
      .eq('id', wishlistId)
      .single();

    if (fetchError) {
      console.error('[Supabase] Error fetching wishlist for update:', fetchError);
      throw new Error(`Failed to fetch wishlist: ${fetchError.message}`);
    }

    console.log('[Supabase] Unsetting all other defaults for user:', wishlist.user_id);
    const { error: updateError } = await supabase
      .from('wishlists')
      .update({ is_default: false })
      .eq('user_id', wishlist.user_id)
      .eq('is_default', true)
      .neq('id', wishlistId);

    if (updateError) {
      console.error('[Supabase] Error unsetting defaults:', updateError);
    }
  }

  const { data, error } = await supabase
    .from('wishlists')
    .update(updates)
    .eq('id', wishlistId)
    .select()
    .single();

  if (error) {
    console.error('[Supabase] Error updating wishlist:', error);
    throw new Error(`Failed to update wishlist: ${error.message}`);
  }

  console.log('[Supabase] Updated wishlist:', data.id, 'is_default:', data.is_default);
  return data as Wishlist;
}

export async function deleteWishlist(wishlistId: string) {
  console.log('[Supabase] Deleting wishlist:', wishlistId);
  
  // Check if this is the default wishlist
  const { data: wishlist, error: fetchError } = await supabase
    .from('wishlists')
    .select('user_id, is_default')
    .eq('id', wishlistId)
    .single();

  if (fetchError) {
    console.error('[Supabase] Error fetching wishlist for deletion:', fetchError);
    throw new Error(`Failed to fetch wishlist: ${fetchError.message}`);
  }

  const { error } = await supabase
    .from('wishlists')
    .delete()
    .eq('id', wishlistId);

  if (error) {
    console.error('[Supabase] Error deleting wishlist:', error);
    throw new Error(`Failed to delete wishlist: ${error.message}`);
  }

  // If we deleted the default wishlist, set another one as default
  if (wishlist.is_default) {
    console.log('[Supabase] Deleted default wishlist, setting another as default');
    const { data: remainingWishlists, error: fetchRemainingError } = await supabase
      .from('wishlists')
      .select('id')
      .eq('user_id', wishlist.user_id)
      .order('created_at', { ascending: true })
      .limit(1);

    if (fetchRemainingError) {
      console.error('[Supabase] Error fetching remaining wishlists:', fetchRemainingError);
    } else if (remainingWishlists && remainingWishlists.length > 0) {
      const { error: updateError } = await supabase
        .from('wishlists')
        .update({ is_default: true })
        .eq('id', remainingWishlists[0].id);

      if (updateError) {
        console.error('[Supabase] Error setting new default:', updateError);
      } else {
        console.log('[Supabase] Set new default wishlist:', remainingWishlists[0].id);
      }
    }
  }

  console.log('[Supabase] Deleted wishlist:', wishlistId);
}

// ============================================================================
// WISHLIST ITEMS
// ============================================================================

export async function fetchWishlistItems(wishlistId: string) {
  console.log('[Supabase] Fetching items for wishlist:', wishlistId);
  
  const { data, error } = await supabase
    .from('wishlist_items')
    .select('*')
    .eq('wishlist_id', wishlistId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[Supabase] Error fetching items:', error);
    throw new Error(`Failed to fetch items: ${error.message}`);
  }

  console.log('[Supabase] Fetched items:', data?.length);
  return data as WishlistItem[];
}

export async function fetchItemById(itemId: string) {
  console.log('[Supabase] Fetching item:', itemId);
  
  const { data, error } = await supabase
    .from('wishlist_items')
    .select('*')
    .eq('id', itemId)
    .single();

  if (error) {
    console.error('[Supabase] Error fetching item:', error);
    throw new Error(`Failed to fetch item: ${error.message}`);
  }

  return data as WishlistItem;
}

export async function createWishlistItem(item: WishlistItemInsert) {
  console.log('[Supabase] Creating item:', item.title);
  
  const { data, error } = await supabase
    .from('wishlist_items')
    .insert(item)
    .select()
    .single();

  if (error) {
    console.error('[Supabase] Error creating item:', error);
    throw new Error(`Failed to create item: ${error.message}`);
  }

  console.log('[Supabase] Created item:', data.id);
  return data as WishlistItem;
}

export async function updateWishlistItem(itemId: string, updates: WishlistItemUpdate) {
  console.log('[Supabase] Updating item:', itemId);
  
  const { data, error } = await supabase
    .from('wishlist_items')
    .update(updates)
    .eq('id', itemId)
    .select()
    .single();

  if (error) {
    console.error('[Supabase] Error updating item:', error);
    throw new Error(`Failed to update item: ${error.message}`);
  }

  return data as WishlistItem;
}

export async function deleteWishlistItem(itemId: string) {
  console.log('[Supabase] Deleting item:', itemId);
  
  const { error } = await supabase
    .from('wishlist_items')
    .delete()
    .eq('id', itemId);

  if (error) {
    console.error('[Supabase] Error deleting item:', error);
    throw new Error(`Failed to delete item: ${error.message}`);
  }

  console.log('[Supabase] Deleted item:', itemId);
}

// ============================================================================
// PRICE HISTORY
// ============================================================================

export async function fetchPriceHistory(itemId: string) {
  console.log('[Supabase] Fetching price history for item:', itemId);
  
  const { data, error } = await supabase
    .from('price_history')
    .select('*')
    .eq('item_id', itemId)
    .order('recorded_at', { ascending: true });

  if (error) {
    console.error('[Supabase] Error fetching price history:', error);
    throw new Error(`Failed to fetch price history: ${error.message}`);
  }

  return data as PriceHistory[];
}

export async function addPriceHistory(priceEntry: PriceHistoryInsert) {
  console.log('[Supabase] Adding price history for item:', priceEntry.item_id);
  
  const { data, error } = await supabase
    .from('price_history')
    .insert(priceEntry)
    .select()
    .single();

  if (error) {
    console.error('[Supabase] Error adding price history:', error);
    throw new Error(`Failed to add price history: ${error.message}`);
  }

  return data as PriceHistory;
}

// ============================================================================
// SHARED WISHLISTS
// ============================================================================

export async function fetchSharedWishlist(shareSlug: string) {
  console.log('[Supabase] Fetching shared wishlist:', shareSlug);
  
  const { data, error } = await supabase
    .from('shared_wishlists')
    .select(`
      *,
      wishlists (
        id,
        name,
        user_id,
        created_at
      )
    `)
    .eq('share_slug', shareSlug)
    .single();

  if (error) {
    console.error('[Supabase] Error fetching shared wishlist:', error);
    throw new Error(`Failed to fetch shared wishlist: ${error.message}`);
  }

  return data;
}

export async function createSharedWishlist(sharedWishlist: SharedWishlistInsert) {
  console.log('[Supabase] Creating shared wishlist for:', sharedWishlist.wishlist_id);
  
  const { data, error } = await supabase
    .from('shared_wishlists')
    .insert(sharedWishlist)
    .select()
    .single();

  if (error) {
    console.error('[Supabase] Error creating shared wishlist:', error);
    throw new Error(`Failed to create shared wishlist: ${error.message}`);
  }

  return data as SharedWishlist;
}

export async function updateSharedWishlist(wishlistId: string, updates: SharedWishlistUpdate) {
  console.log('[Supabase] Updating shared wishlist:', wishlistId);
  
  const { data, error } = await supabase
    .from('shared_wishlists')
    .update(updates)
    .eq('wishlist_id', wishlistId)
    .select()
    .single();

  if (error) {
    console.error('[Supabase] Error updating shared wishlist:', error);
    throw new Error(`Failed to update shared wishlist: ${error.message}`);
  }

  return data as SharedWishlist;
}

export async function deleteSharedWishlist(wishlistId: string) {
  console.log('[Supabase] Deleting shared wishlist:', wishlistId);
  
  const { error } = await supabase
    .from('shared_wishlists')
    .delete()
    .eq('wishlist_id', wishlistId);

  if (error) {
    console.error('[Supabase] Error deleting shared wishlist:', error);
    throw new Error(`Failed to delete shared wishlist: ${error.message}`);
  }

  console.log('[Supabase] Deleted shared wishlist:', wishlistId);
}

export async function fetchSharedWishlistByWishlistId(wishlistId: string) {
  console.log('[Supabase] Fetching shared wishlist by wishlist ID:', wishlistId);
  
  const { data, error } = await supabase
    .from('shared_wishlists')
    .select('*')
    .eq('wishlist_id', wishlistId)
    .maybeSingle();

  if (error) {
    console.error('[Supabase] Error fetching shared wishlist:', error);
    throw new Error(`Failed to fetch shared wishlist: ${error.message}`);
  }

  return data as SharedWishlist | null;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

export async function getWishlistWithItemCount(userId: string) {
  console.log('[Supabase] Fetching wishlists with item counts for user:', userId);
  
  const { data, error } = await supabase
    .from('wishlists')
    .select(`
      *,
      wishlist_items (count)
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[Supabase] Error fetching wishlists with counts:', error);
    throw new Error(`Failed to fetch wishlists: ${error.message}`);
  }

  const wishlistsWithCounts = data.map((wishlist: any) => ({
    id: wishlist.id,
    name: wishlist.name,
    userId: wishlist.user_id,
    createdAt: wishlist.created_at,
    updatedAt: wishlist.updated_at,
    itemCount: wishlist.wishlist_items?.[0]?.count || 0,
    isDefault: wishlist.is_default || false,
  }));

  console.log('[Supabase] Fetched wishlists with counts:', wishlistsWithCounts.length);
  return wishlistsWithCounts;
}

export function generateShareSlug(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let slug = '';
  for (let i = 0; i < 8; i++) {
    slug += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return slug;
}

// ============================================================================
// USER SETTINGS (using RPC functions)
// ============================================================================

export interface UserSettings {
  userId: string;
  priceDropAlertsEnabled: boolean;
  weeklyDigestEnabled: boolean;
  defaultCurrency: string;
  country: string | null;
  city: string | null;
  currency: string | null;
  updatedAt: string;
}

// Default settings to return when no user_settings row exists
const DEFAULT_USER_SETTINGS: Omit<UserSettings, 'userId' | 'updatedAt'> = {
  priceDropAlertsEnabled: false,
  weeklyDigestEnabled: false,
  defaultCurrency: 'USD',
  country: null,
  city: null,
  currency: 'USD',
};

export async function fetchUserSettings(userId: string): Promise<UserSettings> {
  console.log('[Supabase] Fetching user settings via RPC for:', userId);
  
  try {
    const { data, error } = await supabase.rpc('get_user_settings');

    if (error) {
      console.error('[Supabase] Error fetching user settings:', error);
      console.warn('[Supabase] Returning default settings due to error');
      return {
        userId,
        ...DEFAULT_USER_SETTINGS,
        updatedAt: new Date().toISOString(),
      };
    }

    if (!data || data.length === 0) {
      console.log('[Supabase] No user settings found for:', userId);
      console.log('[Supabase] Returning default settings');
      return {
        userId,
        ...DEFAULT_USER_SETTINGS,
        updatedAt: new Date().toISOString(),
      };
    }

    const settings = data[0];
    console.log('[Supabase] User settings found:', settings);
    
    return {
      userId: settings.user_id,
      priceDropAlertsEnabled: settings.price_drop_alerts_enabled ?? false,
      weeklyDigestEnabled: settings.weekly_digest_enabled ?? false,
      defaultCurrency: settings.currency ?? 'USD',
      country: settings.country,
      city: settings.city,
      currency: settings.currency ?? 'USD',
      updatedAt: settings.updated_at,
    };
  } catch (err) {
    console.error('[Supabase] Exception fetching user settings:', err);
    console.warn('[Supabase] Returning default settings due to exception');
    return {
      userId,
      ...DEFAULT_USER_SETTINGS,
      updatedAt: new Date().toISOString(),
    };
  }
}

export async function updateUserSettings(
  userId: string,
  updates: {
    priceDropAlertsEnabled?: boolean;
    weeklyDigestEnabled?: boolean;
    defaultCurrency?: string;
    country?: string | null;
    city?: string | null;
    currency?: string | null;
  }
): Promise<UserSettings> {
  console.log('[Supabase] Updating user settings via RPC:', updates);
  
  try {
    // Map frontend field names to database field names
    const _country = updates.country !== undefined ? updates.country : undefined;
    const _city = updates.city !== undefined ? updates.city : undefined;
    const _currency = updates.defaultCurrency || updates.currency || undefined;
    
    const { error } = await supabase.rpc('upsert_user_settings', {
      _country,
      _city,
      _currency,
    });

    if (error) {
      console.error('[Supabase] Error updating user settings:', error);
      throw new Error(`Failed to update user settings: ${error.message}`);
    }

    console.log('[Supabase] User settings updated successfully');
    
    // Fetch and return the updated settings
    return await fetchUserSettings(userId);
  } catch (err) {
    console.error('[Supabase] Exception updating user settings:', err);
    throw err;
  }
}

// ============================================================================
// SEARCH CACHE
// ============================================================================

export interface SearchCacheEntry {
  id: number;
  userId: string | null;
  query: string;
  country: string | null;
  currency: string | null;
  results: any;
  createdAt: string;
}

export async function fetchSearchCache(
  query: string,
  country: string | null,
  currency: string | null,
  userId: string | null = null
): Promise<SearchCacheEntry | null> {
  console.log('[Supabase] Fetching search cache for:', { query, country, currency, userId });
  
  try {
    let queryBuilder = supabase
      .from('search_cache')
      .select('*')
      .eq('query', query);

    if (country) {
      queryBuilder = queryBuilder.eq('country', country);
    } else {
      queryBuilder = queryBuilder.is('country', null);
    }

    if (currency) {
      queryBuilder = queryBuilder.eq('currency', currency);
    } else {
      queryBuilder = queryBuilder.is('currency', null);
    }

    if (userId) {
      queryBuilder = queryBuilder.eq('user_id', userId);
    } else {
      queryBuilder = queryBuilder.is('user_id', null);
    }

    const { data, error } = await queryBuilder.maybeSingle();

    if (error) {
      console.error('[Supabase] Error fetching search cache:', error);
      return null;
    }

    if (!data) {
      console.log('[Supabase] No search cache found');
      return null;
    }

    console.log('[Supabase] Search cache found:', data.id);
    
    return {
      id: data.id,
      userId: data.user_id,
      query: data.query,
      country: data.country,
      currency: data.currency,
      results: data.results,
      createdAt: data.created_at,
    };
  } catch (err) {
    console.error('[Supabase] Exception fetching search cache:', err);
    return null;
  }
}

export async function createSearchCache(
  query: string,
  country: string | null,
  currency: string | null,
  results: any,
  userId: string | null = null
): Promise<SearchCacheEntry | null> {
  console.log('[Supabase] Creating search cache for:', { query, country, currency, userId });
  
  try {
    const { data, error } = await supabase
      .from('search_cache')
      .insert({
        user_id: userId,
        query,
        country,
        currency,
        results,
      })
      .select()
      .single();

    if (error) {
      console.error('[Supabase] Error creating search cache:', error);
      return null;
    }

    console.log('[Supabase] Search cache created:', data.id);
    
    return {
      id: data.id,
      userId: data.user_id,
      query: data.query,
      country: data.country,
      currency: data.currency,
      results: data.results,
      createdAt: data.created_at,
    };
  } catch (err) {
    console.error('[Supabase] Exception creating search cache:', err);
    return null;
  }
}

// ============================================================================
// IMAGE ANALYSIS CACHE
// ============================================================================

export interface ImageAnalysisCacheEntry {
  id: number;
  userId: string | null;
  imageHash: string;
  results: any;
  createdAt: string;
}

export async function fetchImageAnalysisCache(
  imageHash: string,
  userId: string | null = null
): Promise<ImageAnalysisCacheEntry | null> {
  console.log('[Supabase] Fetching image analysis cache for:', { imageHash, userId });
  
  try {
    let queryBuilder = supabase
      .from('image_analysis_cache')
      .select('*')
      .eq('image_hash', imageHash);

    if (userId) {
      queryBuilder = queryBuilder.eq('user_id', userId);
    } else {
      queryBuilder = queryBuilder.is('user_id', null);
    }

    const { data, error } = await queryBuilder.maybeSingle();

    if (error) {
      console.error('[Supabase] Error fetching image analysis cache:', error);
      return null;
    }

    if (!data) {
      console.log('[Supabase] No image analysis cache found');
      return null;
    }

    console.log('[Supabase] Image analysis cache found:', data.id);
    
    return {
      id: data.id,
      userId: data.user_id,
      imageHash: data.image_hash,
      results: data.results,
      createdAt: data.created_at,
    };
  } catch (err) {
    console.error('[Supabase] Exception fetching image analysis cache:', err);
    return null;
  }
}

export async function createImageAnalysisCache(
  imageHash: string,
  results: any,
  userId: string | null = null
): Promise<ImageAnalysisCacheEntry | null> {
  console.log('[Supabase] Creating image analysis cache for:', { imageHash, userId });
  
  try {
    const { data, error } = await supabase
      .from('image_analysis_cache')
      .insert({
        user_id: userId,
        image_hash: imageHash,
        results,
      })
      .select()
      .single();

    if (error) {
      console.error('[Supabase] Error creating image analysis cache:', error);
      return null;
    }

    console.log('[Supabase] Image analysis cache created:', data.id);
    
    return {
      id: data.id,
      userId: data.user_id,
      imageHash: data.image_hash,
      results: data.results,
      createdAt: data.created_at,
    };
  } catch (err) {
    console.error('[Supabase] Exception creating image analysis cache:', err);
    return null;
  }
}

// ============================================================================
// USER LOCATION
// ============================================================================

export interface UserLocation {
  id: string;
  userId: string;
  countryCode: string;
  countryName: string;
  city: string | null;
  region: string | null;
  postalCode: string | null;
  geonameId?: string | null;
  lat?: number | null;
  lng?: number | null;
  area?: string | null;
  addressLine?: string | null;
  updatedAt: string;
}

export async function fetchUserLocation(userId: string): Promise<UserLocation | null> {
  console.log('[Supabase] Fetching user location for:', userId);
  
  try {
    const { data, error } = await supabase
      .from('user_location')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('[Supabase] Error fetching user location:', error);
      return null;
    }

    if (!data) {
      console.log('[Supabase] No location found for user:', userId);
      return null;
    }

    console.log('[Supabase] User location found:', data.country_code, data.city);
    
    return {
      id: data.id,
      userId: data.user_id,
      countryCode: data.country_code,
      countryName: data.country_name,
      city: data.city,
      region: data.region,
      postalCode: data.postal_code,
      geonameId: data.geoname_id,
      lat: data.lat ? parseFloat(data.lat) : null,
      lng: data.lng ? parseFloat(data.lng) : null,
      area: data.area,
      addressLine: data.address_line,
      updatedAt: data.updated_at,
    };
  } catch (err) {
    console.error('[Supabase] Exception fetching user location:', err);
    return null;
  }
}

export async function updateUserLocation(userId: string, location: Partial<UserLocation>): Promise<UserLocation | null> {
  console.log('[Supabase] Updating user location for:', userId, location);
  
  try {
    // Convert camelCase to snake_case for database
    const dbLocation: any = {
      user_id: userId,
    };
    
    if (location.countryCode !== undefined) dbLocation.country_code = location.countryCode;
    if (location.countryName !== undefined) dbLocation.country_name = location.countryName;
    if (location.city !== undefined) dbLocation.city = location.city;
    if (location.region !== undefined) dbLocation.region = location.region;
    if (location.postalCode !== undefined) dbLocation.postal_code = location.postalCode;
    if (location.geonameId !== undefined) dbLocation.geoname_id = location.geonameId;
    if (location.lat !== undefined) dbLocation.lat = location.lat;
    if (location.lng !== undefined) dbLocation.lng = location.lng;
    if (location.area !== undefined) dbLocation.area = location.area;
    if (location.addressLine !== undefined) dbLocation.address_line = location.addressLine;

    // Try to update first
    const { data: existingData } = await supabase
      .from('user_location')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    if (existingData) {
      // Update existing record
      const { data, error } = await supabase
        .from('user_location')
        .update(dbLocation)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        console.error('[Supabase] Error updating user location:', error);
        return null;
      }

      console.log('[Supabase] User location updated successfully');
      
      return {
        id: data.id,
        userId: data.user_id,
        countryCode: data.country_code,
        countryName: data.country_name,
        city: data.city,
        region: data.region,
        postalCode: data.postal_code,
        geonameId: data.geoname_id,
        lat: data.lat ? parseFloat(data.lat) : null,
        lng: data.lng ? parseFloat(data.lng) : null,
        area: data.area,
        addressLine: data.address_line,
        updatedAt: data.updated_at,
      };
    } else {
      // Insert new record
      const { data, error } = await supabase
        .from('user_location')
        .insert(dbLocation)
        .select()
        .single();

      if (error) {
        console.error('[Supabase] Error inserting user location:', error);
        return null;
      }

      console.log('[Supabase] User location created successfully');
      
      return {
        id: data.id,
        userId: data.user_id,
        countryCode: data.country_code,
        countryName: data.country_name,
        city: data.city,
        region: data.region,
        postalCode: data.postal_code,
        geonameId: data.geoname_id,
        lat: data.lat ? parseFloat(data.lat) : null,
        lng: data.lng ? parseFloat(data.lng) : null,
        area: data.area,
        addressLine: data.address_line,
        updatedAt: data.updated_at,
      };
    }
  } catch (err) {
    console.error('[Supabase] Exception updating user location:', err);
    return null;
  }
}

// ============================================================================
// PREMIUM STATUS
// ============================================================================

export interface PremiumStatus {
  isPremium: boolean;
  planName: string | null;
}

export async function fetchPremiumStatus(userId: string): Promise<PremiumStatus> {
  console.log('[Supabase] Fetching premium status for:', userId);
  
  // For now, return free tier
  // This can be extended when the backend adds premium support
  return {
    isPremium: false,
    planName: null,
  };
}

// ============================================================================
// LANGUAGE PREFERENCES
// ============================================================================

export interface LanguagePreferences {
  languageMode: 'system' | 'manual';
  languageCode: string;
}

export async function fetchLanguagePreferences(userId: string): Promise<LanguagePreferences> {
  console.log('[Supabase] Fetching language preferences for:', userId);
  
  // For now, return system default
  // This can be extended when the backend adds language preferences support
  return {
    languageMode: 'system',
    languageCode: 'en',
  };
}

export async function updateLanguagePreferences(userId: string, preferences: LanguagePreferences): Promise<LanguagePreferences> {
  console.log('[Supabase] Updating language preferences for:', userId, preferences);
  
  // For now, just return the preferences
  // This can be extended when the backend adds language preferences support
  return preferences;
}

// ============================================================================
// PERMISSION CONSENT
// ============================================================================

export interface PermissionConsent {
  notifications: boolean;
  camera: boolean;
  photos: boolean;
  location: boolean;
  notificationsAskedAt: string | null;
  cameraAskedAt: string | null;
  photosAskedAt: string | null;
  locationAskedAt: string | null;
}

export async function fetchPermissionConsent(userId: string): Promise<PermissionConsent> {
  console.log('[Supabase] Fetching permission consent for:', userId);
  
  try {
    // Query the user_permission_consent table
    const { data, error } = await supabase
      .from('user_permission_consent')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('[Supabase] Error fetching permission consent:', error);
      // Return defaults if error
      return {
        notifications: false,
        camera: false,
        photos: false,
        location: false,
        notificationsAskedAt: null,
        cameraAskedAt: null,
        photosAskedAt: null,
        locationAskedAt: null,
      };
    }

    if (!data) {
      // No consent record exists yet, return defaults
      return {
        notifications: false,
        camera: false,
        photos: false,
        location: false,
        notificationsAskedAt: null,
        cameraAskedAt: null,
        photosAskedAt: null,
        locationAskedAt: null,
      };
    }

    return {
      notifications: data.notifications,
      camera: data.camera,
      photos: data.photos,
      location: data.location,
      notificationsAskedAt: data.notifications_asked_at,
      cameraAskedAt: data.camera_asked_at,
      photosAskedAt: data.photos_asked_at,
      locationAskedAt: data.location_asked_at,
    };
  } catch (error) {
    console.error('[Supabase] Exception fetching permission consent:', error);
    return {
      notifications: false,
      camera: false,
      photos: false,
      location: false,
      notificationsAskedAt: null,
      cameraAskedAt: null,
      photosAskedAt: null,
      locationAskedAt: null,
    };
  }
}

export async function updatePermissionConsent(
  userId: string,
  updates: Partial<PermissionConsent>
): Promise<PermissionConsent> {
  console.log('[Supabase] Updating permission consent for:', userId, updates);
  
  try {
    // Convert camelCase to snake_case for database
    const dbUpdates: any = {};
    if (updates.notifications !== undefined) dbUpdates.notifications = updates.notifications;
    if (updates.camera !== undefined) dbUpdates.camera = updates.camera;
    if (updates.photos !== undefined) dbUpdates.photos = updates.photos;
    if (updates.location !== undefined) dbUpdates.location = updates.location;
    if (updates.notificationsAskedAt !== undefined) dbUpdates.notifications_asked_at = updates.notificationsAskedAt;
    if (updates.cameraAskedAt !== undefined) dbUpdates.camera_asked_at = updates.cameraAskedAt;
    if (updates.photosAskedAt !== undefined) dbUpdates.photos_asked_at = updates.photosAskedAt;
    if (updates.locationAskedAt !== undefined) dbUpdates.location_asked_at = updates.locationAskedAt;

    // Try to update first
    const { data: existingData } = await supabase
      .from('user_permission_consent')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    if (existingData) {
      // Update existing record
      const { data, error } = await supabase
        .from('user_permission_consent')
        .update(dbUpdates)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        console.error('[Supabase] Error updating permission consent:', error);
        throw error;
      }

      return {
        notifications: data.notifications,
        camera: data.camera,
        photos: data.photos,
        location: data.location,
        notificationsAskedAt: data.notifications_asked_at,
        cameraAskedAt: data.camera_asked_at,
        photosAskedAt: data.photos_asked_at,
        locationAskedAt: data.location_asked_at,
      };
    } else {
      // Insert new record
      const { data, error } = await supabase
        .from('user_permission_consent')
        .insert({
          user_id: userId,
          ...dbUpdates,
        })
        .select()
        .single();

      if (error) {
        console.error('[Supabase] Error inserting permission consent:', error);
        throw error;
      }

      return {
        notifications: data.notifications,
        camera: data.camera,
        photos: data.photos,
        location: data.location,
        notificationsAskedAt: data.notifications_asked_at,
        cameraAskedAt: data.camera_asked_at,
        photosAskedAt: data.photos_asked_at,
        locationAskedAt: data.location_asked_at,
      };
    }
  } catch (error) {
    console.error('[Supabase] Exception updating permission consent:', error);
    // Return current state on error
    return await fetchPermissionConsent(userId);
  }
}

export async function recordPermissionAsk(
  userId: string,
  permissionType: 'notifications' | 'camera' | 'photos' | 'location'
): Promise<void> {
  console.log('[Supabase] Recording permission ask for:', userId, permissionType);
  
  const askedAtField = `${permissionType}AskedAt` as keyof PermissionConsent;
  const updates = {
    [askedAtField]: new Date().toISOString(),
  };
  
  await updatePermissionConsent(userId, updates);
}
