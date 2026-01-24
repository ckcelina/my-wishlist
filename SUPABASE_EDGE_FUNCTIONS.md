
# Supabase Edge Functions Documentation

This document describes the Supabase Edge Functions for the My Wishlist app, their contracts, and how to use them.

## Overview

All edge functions follow these strict standards:

- ✅ Support OPTIONS preflight + CORS headers
- ✅ Validate input JSON and return 400 only for invalid payloads
- ✅ Return 200 with partial data + error object for extraction failures/timeouts
- ✅ Include meta: { requestId, durationMs, partial }
- ✅ Use AbortController timeouts (8s fetch, 12s OpenAI)
- ✅ NEVER expose OPENAI_API_KEY to the client
- ✅ Read OPENAI_API_KEY from Deno.env
- ✅ Use strict JSON output from OpenAI (json_object) and robust parsing
- ✅ If upstream fails, return best-effort partial output

## Functions

### 1. extract-item

Extracts product details from a URL using AI.

**Endpoint:** `POST /functions/v1/extract-item`

**Request:**
```typescript
{
  url: string  // Product URL to extract from
}
```

**Response:**
```typescript
{
  title: string | null,           // Product title
  imageUrl: string | null,        // Best quality product image URL
  price: number | null,           // Numeric price value
  currency: string | null,        // Currency code (USD, EUR, etc.)
  sourceDomain: string | null,    // Domain extracted from URL
  meta: {
    requestId: string,            // Unique request ID for tracking
    durationMs: number,           // Request duration in milliseconds
    partial: boolean              // True if extraction had errors
  },
  error?: string                  // Error message if partial result
}
```

**Example:**
```typescript
import { extractItem } from '@/utils/supabase-edge-functions';

const result = await extractItem('https://example.com/product');

if (result.meta.partial) {
  console.warn('Partial result:', result.error);
}

console.log('Title:', result.title);
console.log('Price:', result.price, result.currency);
```

**Error Handling:**
- Returns 400 for invalid JSON or missing URL
- Returns 200 with partial data if fetch or OpenAI fails
- Client wrapper returns safe fallback on network errors

---

### 2. find-alternatives

Finds alternative stores where a product can be purchased, filtered by user location.

**Endpoint:** `POST /functions/v1/find-alternatives`

**Request:**
```typescript
{
  title: string,              // Product title (required)
  originalUrl?: string,       // Original product URL (optional)
  countryCode?: string,       // User's country code (e.g., "US", "JO")
  city?: string               // User's city (optional)
}
```

**Response:**
```typescript
{
  alternatives: [
    {
      storeName: string,      // Store name (e.g., "Amazon")
      domain: string,         // Store domain (e.g., "amazon.com")
      price: number,          // Estimated price
      currency: string,       // Currency code
      url: string             // Product URL at this store
    }
  ],
  meta: {
    requestId: string,
    durationMs: number,
    partial: boolean
  },
  error?: string
}
```

**Location Filtering:**
If `countryCode` is provided, the function:
1. Queries the `stores` table to check if store ships to country
2. Checks `store_shipping_rules` for city-level restrictions
3. Filters out stores that don't ship to user's location
4. Returns only available stores

**Example:**
```typescript
import { findAlternatives } from '@/utils/supabase-edge-functions';

const result = await findAlternatives('iPhone 15 Pro', {
  originalUrl: 'https://apple.com/iphone-15-pro',
  countryCode: 'JO',
  city: 'Amman'
});

console.log(`Found ${result.alternatives.length} alternatives`);
result.alternatives.forEach(alt => {
  console.log(`${alt.storeName}: ${alt.price} ${alt.currency}`);
});
```

**Error Handling:**
- Returns 400 for invalid JSON or missing title
- Returns 200 with empty array if AI fails
- Continues with unfiltered results if database filtering fails

---

### 3. import-wishlist

Imports items from a store wishlist URL.

**Endpoint:** `POST /functions/v1/import-wishlist`

**Request:**
```typescript
{
  wishlistUrl: string  // URL of the wishlist to import
}
```

**Response:**
```typescript
{
  storeName: string | null,     // Detected store name
  items: [
    {
      title: string,            // Product title
      imageUrl: string | null,  // Product image URL
      price: number | null,     // Product price
      currency: string | null,  // Currency code
      productUrl: string        // Link to product page
    }
  ],
  meta: {
    requestId: string,
    durationMs: number,
    partial: boolean
  },
  error?: string
}
```

**Example:**
```typescript
import { importWishlist } from '@/utils/supabase-edge-functions';

const result = await importWishlist('https://amazon.com/wishlist/ABC123');

console.log(`Importing from ${result.storeName}`);
console.log(`Found ${result.items.length} items`);

if (result.meta.partial) {
  console.warn('Some items may have failed:', result.error);
}
```

**Error Handling:**
- Returns 400 for invalid JSON or missing URL
- Returns 200 with partial items if some fail to extract
- Returns empty array if fetch or AI completely fails

---

### 4. identify-from-image

Identifies a product from an image using AI vision.

**Endpoint:** `POST /functions/v1/identify-from-image`

**Request:**
```typescript
{
  imageUrl?: string,      // URL of the image (either this or imageBase64)
  imageBase64?: string    // Base64-encoded image data
}
```

**Response:**
```typescript
{
  bestGuessTitle: string | null,        // Best guess for product name
  bestGuessCategory: string | null,     // Product category
  keywords: string[],                   // Search keywords
  confidence: number,                   // Confidence score (0-1)
  suggestedProducts: [
    {
      title: string,                    // Similar product name
      imageUrl: string | null,          // Product image (if available)
      likelyUrl: string | null          // Product URL (if available)
    }
  ],
  meta: {
    requestId: string,
    durationMs: number,
    partial: boolean
  },
  error?: string
}
```

**Example:**
```typescript
import { identifyFromImage } from '@/utils/supabase-edge-functions';

// From URL
const result = await identifyFromImage('https://example.com/image.jpg');

// From base64
const result = await identifyFromImage(undefined, base64ImageData);

console.log('Product:', result.bestGuessTitle);
console.log('Confidence:', result.confidence);
console.log('Category:', result.bestGuessCategory);
console.log('Keywords:', result.keywords.join(', '));

result.suggestedProducts.forEach(product => {
  console.log('Similar:', product.title);
});
```

**Error Handling:**
- Returns 400 for invalid JSON or missing image
- Returns 200 with low confidence if AI cannot identify
- Returns empty suggestions if identification fails

---

## Client Wrappers

All functions have TypeScript client wrappers in `utils/supabase-edge-functions.ts` that:

- ✅ Handle network errors gracefully
- ✅ Return safe fallback data on failure
- ✅ Log warnings for partial results
- ✅ Provide full TypeScript types
- ✅ Never throw exceptions (return error in response)

**Import:**
```typescript
import {
  extractItem,
  findAlternatives,
  importWishlist,
  identifyFromImage,
} from '@/utils/supabase-edge-functions';
```

---

## Environment Variables

All functions require the following environment variable in Supabase:

```bash
OPENAI_API_KEY=sk-...
```

Set this in the Supabase Dashboard:
1. Go to Project Settings → Edge Functions
2. Add secret: `OPENAI_API_KEY`
3. Value: Your OpenAI API key

**Security:** The API key is NEVER exposed to the client. All AI calls happen server-side.

---

## Deployment

Deploy all functions to Supabase:

```bash
# Deploy all functions
supabase functions deploy extract-item
supabase functions deploy find-alternatives
supabase functions deploy import-wishlist
supabase functions deploy identify-from-image

# Or deploy all at once
supabase functions deploy
```

---

## Testing

Test functions using curl:

```bash
# Test extract-item
curl -X POST https://your-project.supabase.co/functions/v1/extract-item \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com/product"}'

# Test find-alternatives
curl -X POST https://your-project.supabase.co/functions/v1/find-alternatives \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"title":"iPhone 15","countryCode":"US"}'

# Test import-wishlist
curl -X POST https://your-project.supabase.co/functions/v1/import-wishlist \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"wishlistUrl":"https://amazon.com/wishlist/ABC"}'

# Test identify-from-image
curl -X POST https://your-project.supabase.co/functions/v1/identify-from-image \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"imageUrl":"https://example.com/image.jpg"}'
```

---

## Performance

- **Timeouts:** 8s for web fetches, 12s for OpenAI calls
- **Partial Results:** Functions return partial data on timeout
- **Request IDs:** Every response includes a unique requestId for debugging
- **Duration Tracking:** Every response includes durationMs for monitoring

---

## Error Codes

| Status | Meaning |
|--------|---------|
| 200 | Success (may include partial data with error field) |
| 400 | Invalid request (bad JSON or missing required fields) |
| 500 | Never returned (errors are handled as 200 with partial data) |

---

## Best Practices

1. **Always check `meta.partial`** to detect incomplete results
2. **Log `meta.requestId`** for debugging issues
3. **Handle null values** in all response fields
4. **Use client wrappers** instead of calling fetch directly
5. **Show user-friendly messages** for partial results
6. **Don't retry immediately** - respect the timeout design

---

## Database Schema

The `find-alternatives` function uses these tables:

**stores:**
```sql
CREATE TABLE stores (
  id uuid PRIMARY KEY,
  name text,
  domain text UNIQUE,
  type text CHECK (type IN ('website','marketplace')),
  countries_supported text[],
  requires_city boolean DEFAULT false,
  notes text,
  created_at timestamptz DEFAULT now()
);
```

**store_shipping_rules:**
```sql
CREATE TABLE store_shipping_rules (
  id uuid PRIMARY KEY,
  store_id uuid REFERENCES stores(id) ON DELETE CASCADE,
  country_code text NOT NULL,
  city_whitelist text[],
  city_blacklist text[],
  ships_to_country boolean DEFAULT true,
  ships_to_city boolean DEFAULT true,
  delivery_methods text[],
  updated_at timestamptz DEFAULT now()
);
```

---

## Support

For issues or questions:
1. Check function logs in Supabase Dashboard
2. Look for `requestId` in response for debugging
3. Verify `OPENAI_API_KEY` is set correctly
4. Check that database tables exist for location filtering
