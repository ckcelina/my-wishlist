
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ImportWishlistRequest {
  wishlistUrl: string;
}

interface ImportedItem {
  title: string;
  imageUrl: string | null;
  price: number | null;
  currency: string | null;
  productUrl: string;
}

interface ImportWishlistResponse {
  storeName: string | null;
  items: ImportedItem[];
  meta: {
    requestId: string;
    durationMs: number;
    partial: boolean;
  };
  error?: string;
}

function detectStoreName(url: string): string | null {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.replace('www.', '');
    
    // Extract store name from domain
    const parts = hostname.split('.');
    if (parts.length >= 2) {
      return parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
    }
    return hostname;
  } catch {
    return null;
  }
}

async function fetchWebContent(url: string, logger: string): Promise<string | null> {
  try {
    console.log(`[${logger}] Fetching wishlist content...`);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8s timeout

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; WishlistBot/1.0)',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const content = await response.text();
    console.log(`[${logger}] Fetched content, length:`, content.length);
    return content;
  } catch (e: any) {
    console.error(`[${logger}] Failed to fetch content:`, e.message);
    return null;
  }
}

serve(async (req) => {
  const startTime = Date.now();
  const requestId = crypto.randomUUID();

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Validate input JSON
    let body: ImportWishlistRequest;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON payload' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { wishlistUrl } = body;

    if (!wishlistUrl || typeof wishlistUrl !== 'string' || wishlistUrl.trim() === '') {
      return new Response(
        JSON.stringify({ error: 'wishlistUrl is required and must be a non-empty string' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[${requestId}] Importing wishlist from:`, wishlistUrl);

    // Detect store name
    const storeName = detectStoreName(wishlistUrl);
    console.log(`[${requestId}] Detected store:`, storeName);

    // Get OpenAI API key from environment
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      console.error(`[${requestId}] OPENAI_API_KEY not configured`);
      const durationMs = Date.now() - startTime;
      return new Response(
        JSON.stringify({
          storeName,
          items: [],
          meta: { requestId, durationMs, partial: true },
          error: 'Server configuration error',
        } as ImportWishlistResponse),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch wishlist content
    const htmlContent = await fetchWebContent(wishlistUrl, requestId);
    
    if (!htmlContent) {
      const durationMs = Date.now() - startTime;
      return new Response(
        JSON.stringify({
          storeName,
          items: [],
          meta: { requestId, durationMs, partial: true },
          error: 'Failed to fetch wishlist content',
        } as ImportWishlistResponse),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use OpenAI to extract items from wishlist with timeout
    let items: ImportedItem[] = [];
    let extractionError: string | null = null;
    try {
      console.log(`[${requestId}] Calling OpenAI API to extract items...`);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000); // 12s timeout

      const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          response_format: { type: 'json_object' },
          messages: [
            {
              role: 'system',
              content: `You are a wishlist parser. Extract all items from a wishlist HTML page.

Return ONLY a valid JSON object with this exact structure:
{
  "items": [
    {
      "title": "Product Name",
      "imageUrl": "https://example.com/image.jpg",
      "price": 29.99,
      "currency": "USD",
      "productUrl": "https://example.com/product"
    }
  ]
}

Rules:
- Extract ALL items from the wishlist
- title: Product name (string, required)
- imageUrl: Product image URL (string or null)
- price: Numeric price (number or null)
- currency: Currency code like USD, EUR (string or null)
- productUrl: Link to product page (string, required)
- If some items fail, still return the ones that succeeded
- Return empty array if no items found
- Return valid JSON object only`,
            },
            {
              role: 'user',
              content: `Extract all items from this wishlist HTML:\n\n${htmlContent.substring(0, 12000)}`,
            },
          ],
          temperature: 0.3,
          max_tokens: 2000,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!openaiResponse.ok) {
        const errorText = await openaiResponse.text();
        console.error(`[${requestId}] OpenAI API error:`, errorText);
        throw new Error('OpenAI API request failed');
      }

      const openaiData = await openaiResponse.json();
      const content = openaiData.choices[0]?.message?.content || '{"items":[]}';
      console.log(`[${requestId}] OpenAI response received`);

      // Robust JSON parsing
      try {
        const parsed = JSON.parse(content);
        items = parsed.items || [];
      } catch (e) {
        console.error(`[${requestId}] Failed to parse OpenAI response:`, e);
        extractionError = 'Failed to parse extraction results';
      }
    } catch (error: any) {
      console.error(`[${requestId}] OpenAI extraction error:`, error.message);
      extractionError = error.name === 'AbortError' ? 'OpenAI request timeout' : 'Failed to extract items';
    }

    // Validate items
    const validItems = items.filter((item: any) => {
      return item.title && item.productUrl;
    });

    console.log(`[${requestId}] Extracted ${validItems.length} valid items`);

    const durationMs = Date.now() - startTime;
    const partial = !!extractionError || validItems.length < items.length;

    return new Response(
      JSON.stringify({
        storeName,
        items: validItems,
        meta: { requestId, durationMs, partial },
        ...(extractionError && { error: extractionError }),
      } as ImportWishlistResponse),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error(`[${requestId}] Unexpected error:`, error);
    const durationMs = Date.now() - startTime;
    return new Response(
      JSON.stringify({
        storeName: null,
        items: [],
        meta: { requestId, durationMs, partial: true },
        error: error.message || 'Internal server error',
      } as ImportWishlistResponse),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
