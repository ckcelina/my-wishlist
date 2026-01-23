
// Supabase Database Types
export interface Database {
  public: {
    Tables: {
      wishlists: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      wishlist_items: {
        Row: {
          id: string;
          wishlist_id: string;
          original_url: string | null;
          source_domain: string | null;
          title: string;
          image_url: string | null;
          current_price: number | null;
          currency: string;
          notes: string | null;
          last_checked_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          wishlist_id: string;
          original_url?: string | null;
          source_domain?: string | null;
          title: string;
          image_url?: string | null;
          current_price?: number | null;
          currency?: string;
          notes?: string | null;
          last_checked_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          wishlist_id?: string;
          original_url?: string | null;
          source_domain?: string | null;
          title?: string;
          image_url?: string | null;
          current_price?: number | null;
          currency?: string;
          notes?: string | null;
          last_checked_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      price_history: {
        Row: {
          id: string;
          item_id: string;
          price: number;
          currency: string;
          recorded_at: string;
        };
        Insert: {
          id?: string;
          item_id: string;
          price: number;
          currency: string;
          recorded_at?: string;
        };
        Update: {
          id?: string;
          item_id?: string;
          price?: number;
          currency?: string;
          recorded_at?: string;
        };
      };
      shared_wishlists: {
        Row: {
          id: string;
          wishlist_id: string;
          share_slug: string;
          visibility: 'public' | 'unlisted';
          created_at: string;
        };
        Insert: {
          id?: string;
          wishlist_id: string;
          share_slug: string;
          visibility?: 'public' | 'unlisted';
          created_at?: string;
        };
        Update: {
          id?: string;
          wishlist_id?: string;
          share_slug?: string;
          visibility?: 'public' | 'unlisted';
          created_at?: string;
        };
      };
    };
  };
}

// Helper types for easier usage
export type Wishlist = Database['public']['Tables']['wishlists']['Row'];
export type WishlistInsert = Database['public']['Tables']['wishlists']['Insert'];
export type WishlistUpdate = Database['public']['Tables']['wishlists']['Update'];

export type WishlistItem = Database['public']['Tables']['wishlist_items']['Row'];
export type WishlistItemInsert = Database['public']['Tables']['wishlist_items']['Insert'];
export type WishlistItemUpdate = Database['public']['Tables']['wishlist_items']['Update'];

export type PriceHistory = Database['public']['Tables']['price_history']['Row'];
export type PriceHistoryInsert = Database['public']['Tables']['price_history']['Insert'];
export type PriceHistoryUpdate = Database['public']['Tables']['price_history']['Update'];

export type SharedWishlist = Database['public']['Tables']['shared_wishlists']['Row'];
export type SharedWishlistInsert = Database['public']['Tables']['shared_wishlists']['Insert'];
export type SharedWishlistUpdate = Database['public']['Tables']['shared_wishlists']['Update'];
