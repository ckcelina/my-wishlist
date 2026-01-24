
# Supabase Database Migration

This app now uses **Supabase** as the primary database instead of the Natively backend (Specular).

## What Changed

### Before
- All data operations went through the Natively backend API (`https://dp5sm9gseg2u24kanaj9us8ayp8awmu3.app.specular.dev`)
- Backend used PostgreSQL with Drizzle ORM
- Frontend made HTTP requests to backend endpoints

### After
- All data operations go directly to Supabase database
- Frontend uses Supabase client library (`@supabase/supabase-js`)
- Row Level Security (RLS) policies protect data
- Authentication still uses Supabase Auth

## Database Schema

The Supabase database has the following tables:

### Core Tables
- **wishlists**: User's wishlists
- **wishlist_items**: Items in wishlists
- **price_history**: Historical price data for items
- **shared_wishlists**: Shared wishlist configurations

### Schema Details
See `supabase/migrations/20260124_create_wishlist_schema.sql` for the complete schema.

## Helper Functions

All database operations are centralized in `lib/supabase-helpers.ts`:

### Wishlists
- `fetchWishlists(userId)` - Get all wishlists for a user
- `fetchWishlistById(wishlistId)` - Get a specific wishlist
- `createWishlist(wishlist)` - Create a new wishlist
- `updateWishlist(wishlistId, updates)` - Update a wishlist
- `deleteWishlist(wishlistId)` - Delete a wishlist
- `getWishlistWithItemCount(userId)` - Get wishlists with item counts

### Wishlist Items
- `fetchWishlistItems(wishlistId)` - Get all items in a wishlist
- `fetchItemById(itemId)` - Get a specific item
- `createWishlistItem(item)` - Create a new item
- `updateWishlistItem(itemId, updates)` - Update an item
- `deleteWishlistItem(itemId)` - Delete an item

### Price History
- `fetchPriceHistory(itemId)` - Get price history for an item
- `addPriceHistory(priceEntry)` - Add a price history entry

### Shared Wishlists
- `fetchSharedWishlist(shareSlug)` - Get a shared wishlist by slug
- `createSharedWishlist(sharedWishlist)` - Create a shared wishlist
- `updateSharedWishlist(wishlistId, updates)` - Update shared wishlist settings
- `deleteSharedWishlist(wishlistId)` - Delete a shared wishlist
- `fetchSharedWishlistByWishlistId(wishlistId)` - Get shared wishlist by wishlist ID

## Security

### Row Level Security (RLS)
All tables have RLS enabled with policies that ensure:
- Users can only access their own wishlists and items
- Shared wishlists are accessible via share_slug
- Price history is only accessible for items the user owns

### Authentication
- Uses Supabase Auth with JWT tokens
- `auth.uid()` in RLS policies identifies the current user
- Session tokens are stored securely using `expo-secure-store`

## Migration Guide

To migrate a screen from backend API to Supabase:

1. **Remove backend API imports**:
   ```typescript
   // Remove this:
   import { authenticatedGet, authenticatedPost } from '@/utils/api';
   ```

2. **Add Supabase helper imports**:
   ```typescript
   // Add this:
   import { fetchWishlists, createWishlist } from '@/lib/supabase-helpers';
   ```

3. **Replace API calls with Supabase helpers**:
   ```typescript
   // Before:
   const data = await authenticatedGet('/api/wishlists');
   
   // After:
   const data = await fetchWishlists(user.id);
   ```

4. **Update error handling**:
   ```typescript
   // Supabase helpers throw errors with descriptive messages
   try {
     const data = await fetchWishlists(user.id);
   } catch (error) {
     console.error('Error:', error.message);
   }
   ```

## Features Not Yet Migrated

The following features still use the Natively backend and need to be migrated:

- [ ] Item extraction from URLs (Supabase Edge Function: `extract-item`)
- [ ] Finding alternative stores (Supabase Edge Function: `find-alternatives`)
- [ ] Image identification (Supabase Edge Function: `identify-from-image`)
- [ ] Wishlist import (Supabase Edge Function: `import-wishlist`)
- [ ] User settings
- [ ] User location
- [ ] Price refresh jobs
- [ ] Notifications
- [ ] Reports
- [ ] Reservations

These will be migrated to Supabase Edge Functions or direct database operations in future updates.

## Supabase Edge Functions

For AI-powered features (item extraction, image identification, etc.), we use Supabase Edge Functions:

- Located in `supabase/functions/`
- Deployed to Supabase
- Called using `supabase.functions.invoke()`

Example:
```typescript
const { data, error } = await supabase.functions.invoke('extract-item', {
  body: { url: 'https://example.com/product' }
});
```

## Configuration

Supabase configuration is in `app.json`:

```json
{
  "extra": {
    "supabaseUrl": "https://dixgmnuayzblwpqyplsi.supabase.co",
    "supabaseAnonKey": "sb_publishable_YouNJ6jKsZgKgdWMpWUL4w_gPqrMNT-"
  }
}
```

## Testing

To test the Supabase integration:

1. Ensure you're logged in (Supabase Auth)
2. Try creating a wishlist
3. Try adding items to the wishlist
4. Check the Supabase dashboard to verify data is being saved

## Troubleshooting

### "Failed to fetch wishlists"
- Check that you're logged in
- Verify Supabase URL and anon key in `app.json`
- Check RLS policies in Supabase dashboard

### "Row Level Security policy violation"
- Ensure you're passing the correct `user_id`
- Check that RLS policies are enabled
- Verify the user is authenticated

### "Invalid API key"
- Ensure the anon key in `app.json` is correct
- The key should start with `sb_publishable_` or be in the legacy format
- Check Supabase project settings for the correct key
