
# Supabase Edge Function Setup Guide

## Overview

This project uses two Supabase Edge Functions:
1. **extract-item** - Extracts product details from URLs
2. **find-alternatives** - Finds alternative stores for products

---

## Initial Setup (One-time)

### Step 1: Install Supabase CLI

```bash
npm install -g supabase
```

### Step 2: Login to Supabase

```bash
supabase login
```

### Step 3: Link Your Project

```bash
supabase link --project-ref dixgmnuayzblwpqyplsi
```

### Step 4: Set the OpenAI API Key Secret

Both functions require the OpenAI API key:

```bash
supabase secrets set OPENAI_API_KEY=your_openai_api_key_here
```

---

## Function 1: extract-item

### Purpose
Extracts product details (title, image, price, currency, sourceDomain) from a URL using OpenAI.

### File Structure

```
supabase/
  functions/
    extract-item/
      index.ts
```

### Deploy

```bash
supabase functions deploy extract-item
```

### Function URL

```
https://dixgmnuayzblwpqyplsi.supabase.co/functions/v1/extract-item
```

### Request Format

```bash
curl -X POST 'https://dixgmnuayzblwpqyplsi.supabase.co/functions/v1/extract-item' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer YOUR_SUPABASE_ANON_KEY' \
  -d '{"url": "https://www.amazon.com/some-product"}'
```

### Response Format

Success:
```json
{
  "title": "Product Name",
  "imageUrl": "https://example.com/image.jpg",
  "price": 29.99,
  "currency": "USD",
  "sourceDomain": "amazon.com"
}
```

Error (partial data):
```json
{
  "title": null,
  "imageUrl": null,
  "price": null,
  "currency": "USD",
  "sourceDomain": "amazon.com",
  "error": "Failed to extract item details"
}
```

---

## Function 2: find-alternatives

### Purpose
Finds alternative stores where a product can be purchased using AI-powered search.

### File Structure

```
supabase/
  functions/
    find-alternatives/
      index.ts
```

### Deploy

```bash
supabase functions deploy find-alternatives
```

### Function URL

```
https://dixgmnuayzblwpqyplsi.supabase.co/functions/v1/find-alternatives
```

### Request Format

```bash
curl -X POST 'https://dixgmnuayzblwpqyplsi.supabase.co/functions/v1/find-alternatives' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer YOUR_SUPABASE_ANON_KEY' \
  -d '{
    "title": "iPhone 15 Pro Max",
    "originalUrl": "https://www.apple.com/iphone-15-pro"
  }'
```

**Parameters:**
- `title` (required): Product title to search for
- `originalUrl` (optional): Original product URL for context

### Response Format

Success:
```json
{
  "alternatives": [
    {
      "storeName": "Amazon",
      "domain": "amazon.com",
      "price": 1199.99,
      "currency": "USD",
      "url": "https://www.amazon.com/iphone-15-pro-max"
    },
    {
      "storeName": "Best Buy",
      "domain": "bestbuy.com",
      "price": 1199.99,
      "currency": "USD",
      "url": "https://www.bestbuy.com/iphone-15-pro-max"
    }
  ]
}
```

No alternatives found:
```json
{
  "alternatives": []
}
```

Error:
```json
{
  "alternatives": [],
  "error": "Failed to find alternatives"
}
```

---

## Deploy Both Functions

To deploy both functions at once:

```bash
supabase functions deploy extract-item
supabase functions deploy find-alternatives
```

---

## Viewing Logs

To view logs for debugging:

```bash
# View extract-item logs
supabase functions logs extract-item

# View find-alternatives logs
supabase functions logs find-alternatives

# Follow logs in real-time
supabase functions logs extract-item --follow
supabase functions logs find-alternatives --follow
```

---

## Testing Functions Locally

You can test functions locally before deploying:

```bash
# Start local Supabase
supabase start

# Serve functions locally
supabase functions serve extract-item --env-file .env.local
supabase functions serve find-alternatives --env-file .env.local
```

Create `.env.local` with:
```
OPENAI_API_KEY=your_openai_api_key_here
```

---

## Integration in App

### extract-item
Used in `app/(tabs)/add.tsx` and `app/(tabs)/add.ios.tsx` when users paste a URL to add an item.

### find-alternatives
Used in `app/item/[id].tsx` to display alternative stores in the "Other Stores" section.

Both functions are called directly from the frontend using the Supabase session token for authentication.

---

## Troubleshooting

### Function returns 401 Unauthorized
- Make sure you're passing the Supabase session token in the Authorization header
- Check that the user is authenticated

### Function returns 500 Internal Server Error
- Check function logs: `supabase functions logs [function-name]`
- Verify OPENAI_API_KEY is set: `supabase secrets list`

### OpenAI API errors
- Verify your OpenAI API key is valid and has credits
- Check OpenAI API status: https://status.openai.com/

### No alternatives found
- This is normal for some products - the AI may not find suitable alternatives
- The function returns an empty array, which is handled gracefully in the UI
