
# Full Supabase Migration Complete

## Overview
The app has been fully migrated to Supabase. All AI features and data storage now use Supabase services.

## Architecture

### Before Migration
- **Authentication**: Supabase Auth ✅
- **Wishlist Storage**: Supabase Database ✅
- **AI Features**: Specular Backend API ❌
- **Item Management**: Specular Backend API ❌

### After Migration
- **Authentication**: Supabase Auth ✅
- **Wishlist Storage**: Supabase Database ✅
- **AI Features**: Supabase Edge Functions ✅
- **Item Management**: Supabase Database + Edge Functions ✅

## Supabase Edge Functions

All AI features are now handled by Supabase Edge Functions:

### 1. extract-item
**Location**: `supabase/functions/extract-item/index.ts`
**Purpose**: Extract product details from a URL using OpenAI GPT-4o
**Request**:
```typescript
{
  url: string
}
```
**Response**:
```typescript
{
  title: string | null
  imageUrl: string | null
  price: number | null
  currency: string | null
  sourceDomain: string | null
  meta: {
    requestId: string
    durationMs: number
    partial: boolean
  }
  error?: string
}
```

### 2. find-alternatives
**Location**: `supabase/functions/find-alternatives/index.ts`
**Purpose**: Find alternative stores where a product can be purchased
**Request**:
```typescript
{
  title: string
  originalUrl?: string
  countryCode?: string
  city?: string
}
```
**Response**:
```typescript
{
  alternatives: Array<{
    storeName: string
    domain: string
    price: number
    currency: string
    url: string
  }>
  meta: {
    requestId: string
    durationMs: number
    partial: boolean
  }
  error?: string
}
```

### 3. identify-from-image
**Location**: `supabase/functions/identify-from-image/index.ts`
**Purpose**: Identify a product from an image using OpenAI Vision
**Request**:
```typescript
{
  imageUrl?: string
  imageBase64?: string
}
```
**Response**:
```typescript
{
  bestGuessTitle: string | null
  bestGuessCategory: string | null
  keywords: string[]
  confidence: number
  suggestedProducts: Array<{
    title: string
    imageUrl: string | null
    likelyUrl: string | null
  }>
  meta: {
    requestId: string
    durationMs: number
    partial: boolean
  }
  error?: string
}
```

### 4. import-wishlist
**Location**: `supabase/functions/import-wishlist/index.ts`
**Purpose**: Import items from an external store wishlist
**Request**:
```typescript
{
  wishlistUrl: string
}
```
**Response**:
```typescript
{
  storeName: string | null
  items: Array<{
    title: string
    imageUrl: string | null
    price: number | null
    currency: string | null
    productUrl: string
  }>
  meta: {
    requestId: string
    durationMs: number
    partial: boolean
  }
  error?: string
}
```

## Frontend Integration

### Updated Files
1. **app/(tabs)/add.tsx** - Now uses Supabase Edge Functions for item extraction and image identification
2. **app/(tabs)/add.ios.tsx** - iOS-specific version with same Supabase integration
3. **app/import-wishlist.tsx** - Uses Supabase Edge Function for wishlist import
4. **utils/supabase-edge-functions.ts** - Client functions to call Supabase Edge Functions

### Helper Functions
All Edge Function calls are centralized in `utils/supabase-edge-functions.ts`:

```typescript
// Extract item from URL
const result = await extractItem(url);

// Find alternative stores
const alternatives = await findAlternatives(title, {
  originalUrl,
  countryCode,
  city
});

// Identify product from image
const identification = await identifyFromImage(imageUrl);

// Import wishlist
const imported = await importWishlist(wishlistUrl);
```

## Database Schema

### Supabase Tables
- **wishlists** - User wishlists
- **wishlist_items** - Items in wishlists
- **price_history** - Price tracking history
- **shared_wishlists** - Shared wishlist links

All tables are managed through `lib/supabase-helpers.ts` with type-safe operations.

## Environment Configuration

### Required Environment Variables in Supabase
Set these in your Supabase project settings:

```bash
OPENAI_API_KEY=your_openai_api_key
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### App Configuration (app.json)
```json
{
  "extra": {
    "supabaseUrl": "https://your-project.supabase.co",
    "supabaseAnonKey": "your_anon_key"
  }
}
```

## Deployment

### Deploy Edge Functions
```bash
# Deploy all functions
supabase functions deploy extract-item
supabase functions deploy find-alternatives
supabase functions deploy identify-from-image
supabase functions deploy import-wishlist

# Set environment secrets
supabase secrets set OPENAI_API_KEY=your_key
```

### Database Migrations
All migrations are in `supabase/migrations/`:
- `20260124_create_wishlist_schema.sql` - Creates all necessary tables

Run migrations:
```bash
supabase db push
```

## Benefits of Full Supabase Migration

1. **Unified Platform**: All services (auth, database, AI) in one place
2. **Better Performance**: Edge Functions run globally on Deno Deploy
3. **Cost Efficiency**: No separate backend hosting costs
4. **Simplified Deployment**: Single deployment target
5. **Real-time Capabilities**: Can easily add real-time features with Supabase Realtime
6. **Better Scaling**: Supabase handles scaling automatically

## Removed Dependencies

The following backend API endpoints are no longer needed:
- ❌ POST /api/items/extract
- ❌ POST /api/items/identify-from-image
- ❌ POST /api/items/find-alternatives
- ❌ POST /api/import-wishlist

All functionality is now handled by Supabase Edge Functions.

## Testing

Test each Edge Function:

```bash
# Test extract-item
curl -X POST https://your-project.supabase.co/functions/v1/extract-item \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.amazon.com/dp/B08N5WRWNW"}'

# Test identify-from-image
curl -X POST https://your-project.supabase.co/functions/v1/identify-from-image \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"imageUrl": "https://example.com/product.jpg"}'

# Test import-wishlist
curl -X POST https://your-project.supabase.co/functions/v1/import-wishlist \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"wishlistUrl": "https://www.amazon.com/hz/wishlist/ls/..."}'
```

## Next Steps

1. ✅ Deploy all Edge Functions to Supabase
2. ✅ Set OPENAI_API_KEY secret in Supabase
3. ✅ Test all AI features in the app
4. ✅ Remove Specular backend dependency from app.json (optional)
5. ✅ Monitor Edge Function logs in Supabase Dashboard

## Support

For issues or questions:
- Check Supabase Edge Function logs in Dashboard
- Review OpenAI API usage and limits
- Verify environment variables are set correctly
