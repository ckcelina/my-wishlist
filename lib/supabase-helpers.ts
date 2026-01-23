
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
} from './supabase-types';

// ============================================
// WISHLIST OPERATIONS
// ============================================

export const supabaseWishlists = {
  // Get all wishlists for the current user
  getAll: async (): Promise<Wishlist[]> => {
    console.log('[Supabase] Fetching all wishlists');
    const { data, error } = await supabase
      .from('wishlists')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[Supabase] Error fetching wishlists:', error);
      throw error;
    }

    console.log('[Supabase] Fetched wishlists:', data?.length);
    return data || [];
  },

  // Get a single wishlist by ID
  getById: async (id: string): Promise<Wishlist | null> => {
    console.log('[Supabase] Fetching wishlist:', id);
    const { data, error } = await supabase
      .from('wishlists')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('[Supabase] Error fetching wishlist:', error);
      throw error;
    }

    console.log('[Supabase] Fetched wishlist:', data?.name);
    return data;
  },

  // Create a new wishlist
  create: async (wishlist: WishlistInsert): Promise<Wishlist> => {
    console.log('[Supabase] Creating wishlist:', wishlist.name);
    const { data, error } = await supabase
      .from('wishlists')
      .insert(wishlist)
      .select()
      .single();

    if (error) {
      console.error('[Supabase] Error creating wishlist:', error);
      throw error;
    }

    console.log('[Supabase] Created wishlist:', data.id);
    return data;
  },

  // Update a wishlist
  update: async (id: string, updates: WishlistUpdate): Promise<Wishlist> => {
    console.log('[Supabase] Updating wishlist:', id);
    const { data, error } = await supabase
      .from('wishlists')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[Supabase] Error updating wishlist:', error);
      throw error;
    }

    console.log('[Supabase] Updated wishlist:', data.id);
    return data;
  },

  // Delete a wishlist
  delete: async (id: string): Promise<void> => {
    console.log('[Supabase] Deleting wishlist:', id);
    const { error } = await supabase
      .from('wishlists')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[Supabase] Error deleting wishlist:', error);
      throw error;
    }

    console.log('[Supabase] Deleted wishlist:', id);
  },
};

// ============================================
// WISHLIST ITEM OPERATIONS
// ============================================

export const supabaseWishlistItems = {
  // Get all items for a wishlist
  getByWishlistId: async (wishlistId: string): Promise<WishlistItem[]> => {
    console.log('[Supabase] Fetching items for wishlist:', wishlistId);
    const { data, error } = await supabase
      .from('wishlist_items')
      .select('*')
      .eq('wishlist_id', wishlistId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[Supabase] Error fetching wishlist items:', error);
      throw error;
    }

    console.log('[Supabase] Fetched items:', data?.length);
    return data || [];
  },

  // Get a single item by ID
  getById: async (id: string): Promise<WishlistItem | null> => {
    console.log('[Supabase] Fetching item:', id);
    const { data, error } = await supabase
      .from('wishlist_items')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('[Supabase] Error fetching item:', error);
      throw error;
    }

    console.log('[Supabase] Fetched item:', data?.title);
    return data;
  },

  // Create a new item
  create: async (item: WishlistItemInsert): Promise<WishlistItem> => {
    console.log('[Supabase] Creating item:', item.title);
    const { data, error } = await supabase
      .from('wishlist_items')
      .insert(item)
      .select()
      .single();

    if (error) {
      console.error('[Supabase] Error creating item:', error);
      throw error;
    }

    console.log('[Supabase] Created item:', data.id);
    return data;
  },

  // Update an item
  update: async (id: string, updates: WishlistItemUpdate): Promise<WishlistItem> => {
    console.log('[Supabase] Updating item:', id);
    const { data, error } = await supabase
      .from('wishlist_items')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[Supabase] Error updating item:', error);
      throw error;
    }

    console.log('[Supabase] Updated item:', data.id);
    return data;
  },

  // Delete an item
  delete: async (id: string): Promise<void> => {
    console.log('[Supabase] Deleting item:', id);
    const { error } = await supabase
      .from('wishlist_items')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[Supabase] Error deleting item:', error);
      throw error;
    }

    console.log('[Supabase] Deleted item:', id);
  },
};

// ============================================
// PRICE HISTORY OPERATIONS
// ============================================

export const supabasePriceHistory = {
  // Get price history for an item
  getByItemId: async (itemId: string): Promise<PriceHistory[]> => {
    console.log('[Supabase] Fetching price history for item:', itemId);
    const { data, error } = await supabase
      .from('price_history')
      .select('*')
      .eq('item_id', itemId)
      .order('recorded_at', { ascending: true });

    if (error) {
      console.error('[Supabase] Error fetching price history:', error);
      throw error;
    }

    console.log('[Supabase] Fetched price history entries:', data?.length);
    return data || [];
  },

  // Add a price history entry
  create: async (entry: PriceHistoryInsert): Promise<PriceHistory> => {
    console.log('[Supabase] Creating price history entry for item:', entry.item_id);
    const { data, error } = await supabase
      .from('price_history')
      .insert(entry)
      .select()
      .single();

    if (error) {
      console.error('[Supabase] Error creating price history:', error);
      throw error;
    }

    console.log('[Supabase] Created price history entry:', data.id);
    return data;
  },
};

// ============================================
// SHARED WISHLIST OPERATIONS
// ============================================

export const supabaseSharedWishlists = {
  // Get shared wishlist by share slug
  getByShareSlug: async (shareSlug: string): Promise<SharedWishlist | null> => {
    console.log('[Supabase] Fetching shared wishlist by slug:', shareSlug);
    const { data, error } = await supabase
      .from('shared_wishlists')
      .select('*')
      .eq('share_slug', shareSlug)
      .single();

    if (error) {
      console.error('[Supabase] Error fetching shared wishlist:', error);
      throw error;
    }

    console.log('[Supabase] Fetched shared wishlist:', data?.id);
    return data;
  },

  // Get shared wishlist by wishlist ID
  getByWishlistId: async (wishlistId: string): Promise<SharedWishlist | null> => {
    console.log('[Supabase] Fetching shared wishlist for wishlist:', wishlistId);
    const { data, error } = await supabase
      .from('shared_wishlists')
      .select('*')
      .eq('wishlist_id', wishlistId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        console.log('[Supabase] No shared wishlist found');
        return null;
      }
      console.error('[Supabase] Error fetching shared wishlist:', error);
      throw error;
    }

    console.log('[Supabase] Fetched shared wishlist:', data?.share_slug);
    return data;
  },

  // Create a shared wishlist
  create: async (sharedWishlist: SharedWishlistInsert): Promise<SharedWishlist> => {
    console.log('[Supabase] Creating shared wishlist for:', sharedWishlist.wishlist_id);
    const { data, error } = await supabase
      .from('shared_wishlists')
      .insert(sharedWishlist)
      .select()
      .single();

    if (error) {
      console.error('[Supabase] Error creating shared wishlist:', error);
      throw error;
    }

    console.log('[Supabase] Created shared wishlist:', data.share_slug);
    return data;
  },

  // Delete a shared wishlist
  delete: async (id: string): Promise<void> => {
    console.log('[Supabase] Deleting shared wishlist:', id);
    const { error } = await supabase
      .from('shared_wishlists')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[Supabase] Error deleting shared wishlist:', error);
      throw error;
    }

    console.log('[Supabase] Deleted shared wishlist:', id);
  },

  // Get wishlist with items by share slug (for public viewing)
  getPublicWishlistBySlug: async (shareSlug: string) => {
    console.log('[Supabase] Fetching public wishlist by slug:', shareSlug);
    
    const sharedWishlist = await supabaseSharedWishlists.getByShareSlug(shareSlug);
    if (!sharedWishlist) {
      throw new Error('Shared wishlist not found');
    }

    const wishlist = await supabaseWishlists.getById(sharedWishlist.wishlist_id);
    if (!wishlist) {
      throw new Error('Wishlist not found');
    }

    const items = await supabaseWishlistItems.getByWishlistId(wishlist.id);

    console.log('[Supabase] Fetched public wishlist with items:', items.length);
    return {
      wishlist,
      items,
      sharedWishlist,
    };
  },
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

// Generate a random share slug
export function generateShareSlug(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let slug = '';
  for (let i = 0; i < 8; i++) {
    slug += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return slug;
}

// Check if a price has dropped
export function checkPriceDrop(currentPrice: number | null, priceHistory: PriceHistory[]): {
  priceDropped: boolean;
  originalPrice: number | null;
  currentPrice: number | null;
  percentageChange: number | null;
} {
  if (!currentPrice || priceHistory.length === 0) {
    return {
      priceDropped: false,
      originalPrice: null,
      currentPrice: null,
      percentageChange: null,
    };
  }

  const originalPrice = priceHistory[0].price;
  const priceDropped = currentPrice < originalPrice;
  const percentageChange = ((currentPrice - originalPrice) / originalPrice) * 100;

  return {
    priceDropped,
    originalPrice,
    currentPrice,
    percentageChange,
  };
}
