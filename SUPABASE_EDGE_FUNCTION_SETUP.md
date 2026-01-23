
# Supabase Edge Function Setup - extract-item

This guide explains how to deploy the `extract-item` Edge Function to Supabase.

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

The Edge Function needs your OpenAI API key to extract item details.

```bash
# Set the OPENAI_API_KEY secret
supabase secrets set OPENAI_API_KEY=your_openai_api_key_here
```

Replace `your_openai_api_key_here` with your actual OpenAI API key.

### 3. Deploy the Edge Function

```bash
# Deploy the extract-item function
supabase functions deploy extract-item
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

### 5. Test the Function

You can test the function using curl:

```bash
curl -i --location --request POST 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/extract-item' \
  --header 'Authorization: Bearer YOUR_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data '{"url":"https://www.amazon.com/dp/B08N5WRWNW"}'
```

## Function Details

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

### Error Handling

The function returns partial results even if some fields fail to extract. All fields can be `null` if extraction fails.

Example error response:
```json
{
  "error": "Failed to fetch URL content",
  "title": null,
  "imageUrl": null,
  "price": null,
  "currency": null,
  "sourceDomain": "example.com"
}
```

## How It Works

1. **URL Fetching**: The function fetches the HTML content from the provided URL with a 10-second timeout
2. **AI Extraction**: Uses OpenAI GPT-4o to intelligently extract:
   - Product title
   - Best quality product image URL
   - Price (numeric value)
   - Currency code
3. **Robust Error Handling**: Returns partial results even if some steps fail
4. **CORS Support**: Configured to work with your React Native app

## Troubleshooting

### Function returns "Server configuration error"
- Make sure you've set the OPENAI_API_KEY secret: `supabase secrets set OPENAI_API_KEY=your_key`

### Function returns "Failed to fetch URL content"
- The URL might be blocking automated requests
- Try a different URL or use manual entry in the app

### Function times out
- Some websites take longer to load
- The function has a 10-second timeout for fetching and 30-second timeout for OpenAI
- Consider using manual entry for slow websites

## Viewing Logs

To view function logs:

```bash
supabase functions logs extract-item
```

Or view them in the Supabase dashboard under Edge Functions > extract-item > Logs.

## Cost Considerations

- **Supabase Edge Functions**: Free tier includes 500K function invocations per month
- **OpenAI API**: GPT-4o costs approximately $0.005 per request (varies by token usage)
- Each item extraction costs ~$0.005-0.01 depending on HTML size

## Security

- The OpenAI API key is stored securely in Supabase secrets (not in your code)
- The function uses the anon key for authentication (safe to expose in client apps)
- CORS is configured to allow requests from any origin (you can restrict this if needed)
