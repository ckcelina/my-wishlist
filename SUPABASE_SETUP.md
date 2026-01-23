
# Supabase Database Setup

This document explains how to set up and use the Supabase database for the My Wishlist app.

## Database Schema

The app uses four main tables:

### 1. `wishlists`
Stores user wishlists.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | User who owns the wishlist |
| name | TEXT | Wishlist name |
| created_at | TIMESTAMP | Creation timestamp |
| updated_at | TIMESTAMP | Last update timestamp |

**Indexes:**
- `idx_wishlists_user_id` on `user_id`

### 2. `wishlist_items`
Stores items in wishlists.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| wishlist_id | UUID | Foreign key to wishlists |
| original_url | TEXT | Original product URL (nullable) |
| source_domain | TEXT | Domain of the source (nullable) |
| title | TEXT | Item title |
| image_url | TEXT | Item image URL (nullable) |
| current_price | NUMERIC | Current price (nullable) |
| currency | TEXT | Currency code (default: 'USD') |
| notes | TEXT | User notes (nullable) |
| last_checked_at | TIMESTAMP | Last price check timestamp (nullable) |
| created_at | TIMESTAMP | Creation timestamp |
| updated_at | TIMESTAMP | Last update timestamp |

**Indexes:**
- `idx_wishlist_items_wishlist_id` on `wishlist_id`

### 3. `price_history`
Tracks price changes over time.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| item_id | UUID | Foreign key to wishlist_items |
| price | NUMERIC | Price at this point in time |
| currency | TEXT | Currency code |
| recorded_at | TIMESTAMP | When this price was recorded |

**Indexes:**
- `idx_price_history_item_id` on `item_id`

### 4. `shared_wishlists`
Manages wishlist sharing.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| wishlist_id | UUID | Foreign key to wishlists |
| share_slug | TEXT | Unique share URL slug |
| visibility | TEXT | 'public' or 'unlisted' |
| created_at | TIMESTAMP | Creation timestamp |

**Indexes:**
- `idx_shared_wishlists_share_slug` on `share_slug`

## Row Level Security (RLS)

All tables have RLS enabled with the following policies:

### `wishlists`
- Users can CRUD their own wishlists (where `user_id = auth.uid()`)

### `wishlist_items`
- Users can CRUD items if the parent wishlist belongs to them

### `price_history`
- Users can read/write only if the parent item belongs to them

### `shared_wishlists`
- Owners can CRUD their shared wishlists
- Anyone can read shared wishlists with a valid `share_slug` (public or unlisted)

## Setup Instructions

### 1. Run the Migration

In your Supabase dashboard:

1. Go to the SQL Editor
2. Copy the contents of `supabase/migrations/20260124_create_wishlist_schema.sql`
3. Paste and run the SQL

Alternatively, if you have the Supabase CLI installed:

```bash
supabase db push
```

### 2. Verify the Setup

After running the migration, verify:

1. All four tables exist
2. RLS is enabled on all tables
3. Policies are created
4. Indexes are created

You can check this in the Supabase dashboard under:
- Database → Tables
- Authentication → Policies
- Database → Indexes

## Usage in the App

### Import the helpers

```typescript
import { supabase } from '@/lib/supabase';
import {
  supabaseWishlists,
  supabaseWishlistItems,
  supabasePriceHistory,
  supabaseSharedWishlists,
} from '@/lib/supabase-helpers';
```

### Example: Create a wishlist

```typescript
const user = await supabaseAuth.getCurrentUser();
if (user) {
  const wishlist = await supabaseWishlists.create({
    user_id: user.id,
    name: 'My Wishlist',
  });
  console.log('Created wishlist:', wishlist.id);
}
```

### Example: Add an item to a wishlist

```typescript
const item = await supabaseWishlistItems.create({
  wishlist_id: wishlistId,
  title: 'iPhone 15 Pro',
  image_url: 'https://example.com/image.jpg',
  current_price: 999.99,
  currency: 'USD',
  original_url: 'https://apple.com/iphone',
  source_domain: 'apple.com',
});
```

### Example: Track price history

```typescript
await supabasePriceHistory.create({
  item_id: itemId,
  price: 899.99,
  currency: 'USD',
});
```

### Example: Share a wishlist

```typescript
import { generateShareSlug } from '@/lib/supabase-helpers';

const shareSlug = generateShareSlug();
const sharedWishlist = await supabaseSharedWishlists.create({
  wishlist_id: wishlistId,
  share_slug: shareSlug,
  visibility: 'unlisted',
});

const shareUrl = `https://yourapp.com/shared/${shareSlug}`;
```

### Example: Get a shared wishlist

```typescript
const { wishlist, items, sharedWishlist } = 
  await supabaseSharedWishlists.getPublicWishlistBySlug(shareSlug);
```

## TypeScript Types

All database types are defined in `lib/supabase-types.ts`:

- `Wishlist`, `WishlistInsert`, `WishlistUpdate`
- `WishlistItem`, `WishlistItemInsert`, `WishlistItemUpdate`
- `PriceHistory`, `PriceHistoryInsert`, `PriceHistoryUpdate`
- `SharedWishlist`, `SharedWishlistInsert`, `SharedWishlistUpdate`

These types provide full type safety when working with the database.

## Automatic Timestamps

The `updated_at` columns on `wishlists` and `wishlist_items` are automatically updated via database triggers whenever a row is updated.

## Cascading Deletes

- Deleting a wishlist will automatically delete all its items, price history, and shared links
- Deleting an item will automatically delete its price history

## Security Notes

1. All database operations are protected by RLS policies
2. Users can only access their own data
3. Shared wishlists are read-only for non-owners
4. Authentication is required for all operations except viewing shared wishlists
