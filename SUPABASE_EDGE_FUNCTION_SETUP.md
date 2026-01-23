
# Supabase Edge Functions Setup

This guide explains how to deploy the Edge Functions to Supabase.

## Prerequisites

1. A Supabase project (create one at https://supabase.com)
2. Supabase CLI installed: `npm install -g supabase`
3. OpenAI API key (get one at https://platform.openai.com)

## Setup Steps

### 1. Link Your Supabase Project

```bash
# Login to Supabase
supabase login

# Link to your project (you'll be prompted to select your project)
supabase link --project-ref YOUR_PROJECT_REF
```

To find your project ref:
- Go to your Supabase dashboard
- Navigate to Settings > General
- Copy the "Reference ID"

### 2. Set the OpenAI API Key Secret

Both Edge Functions need your OpenAI API key.

```bash
# Set the OPENAI_API_KEY secret
supabase secrets set OPENAI_API_KEY=your_openai_api_key_here
```

Replace `your_openai_api_key_here` with your actual OpenAI API key.

### 3. Deploy the Edge Functions

```bash
# Deploy the extract-item function
supabase functions deploy extract-item

# Deploy the find-alternatives function
supabase functions deploy find-alternatives
```

### 4. Update app.json with Supabase Configuration

Add your Supabase URL and anon key to `app.json`:

```json
{
  "expo": {
    "extra": {
      "supabaseUrl": "https://YOUR_PROJECT_REF.supabase.co",
      "supabaseAnonKey": "YOUR_ANON_KEY",
      "backendUrl": "https://dp5sm9gseg2u24kanaj9us8ayp8awmu3.app.specular.dev"
    }
  }
}
```

To find these values:
- Go to your Supabase dashboard
- Navigate to Settings > API
- Copy the "Project URL" (supabaseUrl)
- Copy the "anon public" key (supabaseAnonKey)

---

## Edge Function 1: extract-item

Extracts product details from a URL using AI.

### Input

```json
{
  "url": "https://example.com/product"
}
```

### Output

```json
{
  "title": "Product Name",
  "imageUrl": "https://example.com/image.jpg",
  "price": 29.99,
  "currency": "USD",
  "sourceDomain": "example.com"
}
```

### Test the Function

```bash
curl -i --location --request POST 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/extract-item' \
  --header 'Authorization: Bearer YOUR_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data '{"url":"https://www.amazon.com/dp/B08N5WRWNW"}'
```

### How It Works

1. **URL Fetching**: Fetches HTML content from the provided URL with a 10-second timeout
2. **AI Extraction**: Uses OpenAI GPT-4o to intelligently extract:
   - Product title
   - Best quality product image URL
   - Price (numeric value)
   - Currency code
3. **Robust Error Handling**: Returns partial results even if some steps fail
4. **CORS Support**: Configured to work with your React Native app

---

## Edge Function 2: find-alternatives

Finds alternative stores where a product can be purchased using AI.

### Input

```json
{
  "title": "iPhone 15 Pro",
  "originalUrl": "https://apple.com/iphone-15-pro" // optional
}
```

### Output

```json
{
  "alternatives": [
    {
      "storeName": "Amazon",
      "domain": "amazon.com",
      "price": 999.99,
      "currency": "USD",
      "url": "https://amazon.com/iphone-15-pro"
    },
    {
      "storeName": "Best Buy",
      "domain": "bestbuy.com",
      "price": 999.99,
      "currency": "USD",
      "url": "https://bestbuy.com/iphone-15-pro"
    }
  ]
}
```

### Test the Function

```bash
curl -i --location --request POST 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/find-alternatives' \
  --header 'Authorization: Bearer YOUR_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data '{"title":"iPhone 15 Pro","originalUrl":"https://apple.com/iphone-15-pro"}'
```

### How It Works

1. **AI Search**: Uses OpenAI GPT-4o to find 3-5 alternative stores where the product can be purchased
2. **Smart Matching**: Considers the product title and original URL to find relevant alternatives
3. **Price Estimation**: Provides realistic price estimates based on typical market prices
4. **Major Retailers**: Includes popular stores like Amazon, eBay, Walmart, Target, Best Buy, etc.
5. **Plausible URLs**: Generates realistic product URLs for each store
6. **Graceful Degradation**: Returns empty array if no alternatives are found

### Features

- **Does not overwrite saved item**: The function only suggests alternatives, it doesn't modify your saved item data
- **Loading state**: The UI shows a loading indicator while searching for alternatives
- **Empty state**: Shows a nice message with an icon when no alternatives are found
- **Clickable cards**: Each alternative is displayed as a card that opens the store URL when tapped

---

## Viewing Logs

To view function logs:

```bash
# View extract-item logs
supabase functions logs extract-item

# View find-alternatives logs
supabase functions logs find-alternatives
```

Or view them in the Supabase dashboard under Edge Functions > [function-name] > Logs.

## Troubleshooting

### Function returns "Server configuration error" or "OpenAI API key not configured"
- Make sure you've set the OPENAI_API_KEY secret: `supabase secrets set OPENAI_API_KEY=your_key`
- Verify the secret is set: `supabase secrets list`

### extract-item returns "Failed to fetch URL content"
- The URL might be blocking automated requests
- Try a different URL or use manual entry in the app

### find-alternatives returns empty array
- The AI couldn't find suitable alternatives for the product
- Try providing a more specific product title
- Check the function logs for more details

### Function times out
- Some operations take longer to complete
- The functions have appropriate timeouts configured
- Consider using manual entry for problematic cases

### CORS errors
- Make sure you're using the correct Supabase URL and anon key
- Check that the functions are deployed correctly
- Verify the Authorization header is being sent

## Cost Considerations

- **Supabase Edge Functions**: Free tier includes 500K function invocations per month
- **OpenAI API**: GPT-4o costs approximately $0.005-0.01 per request (varies by token usage)
- Each item extraction costs ~$0.005-0.01
- Each alternatives search costs ~$0.005-0.01

## Security

- The OpenAI API key is stored securely in Supabase secrets (not in your code)
- The functions use the anon key for authentication (safe to expose in client apps)
- CORS is configured to allow requests from any origin (you can restrict this if needed)
- Row Level Security (RLS) policies protect your database data

## Integration in the App

### extract-item
Used in the "Add Item" screen (`app/(tabs)/add.tsx`) to automatically extract product details from a URL.

### find-alternatives
Used in the "Item Detail" screen (`app/item/[id].tsx`) to show alternative stores in the "Other Stores" section.

Both functions are called automatically when needed and handle errors gracefully.
