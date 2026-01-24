
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
  console.log('[Supabase] Creating wishlist:', wishlist.name);
  
  const { data, error } = await supabase
    .from('wishlists')
    .insert(wishlist)
    .select()
    .single();

  if (error) {
    console.error('[Supabase] Error creating wishlist:', error);
    throw new Error(`Failed to create wishlist: ${error.message}`);
  }

  console.log('[Supabase] Created wishlist:', data.id);
  return data as Wishlist;
}

export async function updateWishlist(wishlistId: string, updates: WishlistUpdate) {
  console.log('[Supabase] Updating wishlist:', wishlistId);
  
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

  return data as Wishlist;
}

export async function deleteWishlist(wishlistId: string) {
  console.log('[Supabase] Deleting wishlist:', wishlistId);
  
  const { error } = await supabase
    .from('wishlists')
    .delete()
    .eq('id', wishlistId);

  if (error) {
    console.error('[Supabase] Error deleting wishlist:', error);
    throw new Error(`Failed to delete wishlist: ${error.message}`);
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
    isDefault: false, // Can be determined by checking if it's the first wishlist
  }));

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
