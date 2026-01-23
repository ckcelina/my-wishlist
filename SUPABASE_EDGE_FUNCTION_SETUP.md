
# Supabase Edge Function Setup Guide

## Step 1: Install Supabase CLI

```bash
npm install -g supabase
```

## Step 2: Login to Supabase

```bash
supabase login
```

## Step 3: Link Your Project

```bash
supabase link --project-ref dixgmnuayzblwpqyplsi
```

## Step 4: Create the Edge Function

Create the following file structure in your project root:

```
supabase/
  functions/
    extract-item/
      index.ts
```

Copy the Edge Function code provided above into `supabase/functions/extract-item/index.ts`

## Step 5: Set the OpenAI API Key Secret

```bash
supabase secrets set OPENAI_API_KEY=your_openai_api_key_here
```

## Step 6: Deploy the Function

```bash
supabase functions deploy extract-item
```

## Step 7: Get Your Function URL

After deployment, your function will be available at:
```
https://dixgmnuayzblwpqyplsi.supabase.co/functions/v1/extract-item
```

## Testing the Function

You can test it with curl:

```bash
curl -X POST 'https://dixgmnuayzblwpqyplsi.supabase.co/functions/v1/extract-item' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer YOUR_SUPABASE_ANON_KEY' \
  -d '{"url": "https://www.amazon.com/some-product"}'
```

## Expected Response

```json
{
  "title": "Product Name",
  "imageUrl": "https://example.com/image.jpg",
  "price": 29.99,
  "currency": "USD",
  "sourceDomain": "amazon.com"
}
```

## Error Handling

If extraction fails, the function returns partial data with null values:

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
