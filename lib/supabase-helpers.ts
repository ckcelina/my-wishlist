
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
  console.log('[Supabase] Creating wishlist:', wishlist.name, 'is_default:', wishlist.is_default);
  
  // Check if this is the user's first wishlist
  const { data: existingWishlists, error: checkError } = await supabase
    .from('wishlists')
    .select('id')
    .eq('user_id', wishlist.user_id);

  if (checkError) {
    console.error('[Supabase] Error checking existing wishlists:', checkError);
  }

  const isFirstWishlist = !existingWishlists || existingWishlists.length === 0;
  const shouldBeDefault = isFirstWishlist || wishlist.is_default === true;

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
// USER SETTINGS
// ============================================================================

export interface UserSettings {
  priceDropAlertsEnabled: boolean;
  weeklyDigestEnabled: boolean;
  defaultCurrency: string;
}

export async function fetchUserSettings(userId: string): Promise<UserSettings> {
  console.log('[Supabase] Fetching user settings for:', userId);
  
  // For now, return default settings since we don't have a user_settings table yet
  // This can be extended when the backend adds user settings support
  return {
    priceDropAlertsEnabled: false,
    weeklyDigestEnabled: false,
    defaultCurrency: 'USD',
  };
}

export async function updateUserSettings(userId: string, settings: Partial<UserSettings>): Promise<UserSettings> {
  console.log('[Supabase] Updating user settings for:', userId, settings);
  
  // For now, just return the updated settings
  // This can be extended when the backend adds user settings support
  const currentSettings = await fetchUserSettings(userId);
  return {
    ...currentSettings,
    ...settings,
  };
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
  updatedAt: string;
}

export async function fetchUserLocation(userId: string): Promise<UserLocation | null> {
  console.log('[Supabase] Fetching user location for:', userId);
  
  // For now, return null since we don't have a user_locations table yet
  // This can be extended when the backend adds location support
  return null;
}

export async function updateUserLocation(userId: string, location: Partial<UserLocation>): Promise<UserLocation> {
  console.log('[Supabase] Updating user location for:', userId, location);
  
  // For now, just return a mock location
  // This can be extended when the backend adds location support
  return {
    id: 'mock-id',
    userId,
    countryCode: location.countryCode || 'US',
    countryName: location.countryName || 'United States',
    city: location.city || null,
    region: location.region || null,
    postalCode: location.postalCode || null,
    updatedAt: new Date().toISOString(),
  };
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
