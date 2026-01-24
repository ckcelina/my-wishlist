
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ExtractItemRequest {
  url: string;
}

interface ExtractItemResponse {
  title: string | null;
  imageUrl: string | null;
  price: number | null;
  currency: string | null;
  sourceDomain: string | null;
  meta: {
    requestId: string;
    durationMs: number;
    partial: boolean;
  };
  error?: string;
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
    let body: ExtractItemRequest;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON payload' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { url } = body;

    if (!url || typeof url !== 'string' || url.trim() === '') {
      return new Response(
        JSON.stringify({ error: 'URL is required and must be a non-empty string' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[${requestId}] Extracting item from URL:`, url);

    // Get OpenAI API key from environment
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      console.error(`[${requestId}] OPENAI_API_KEY not configured`);
      const durationMs = Date.now() - startTime;
      return new Response(
        JSON.stringify({
          title: null,
          imageUrl: null,
          price: null,
          currency: null,
          sourceDomain: null,
          meta: { requestId, durationMs, partial: true },
          error: 'Server configuration error',
        } as ExtractItemResponse),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract source domain
    let sourceDomain: string | null = null;
    try {
      const urlObj = new URL(url);
      sourceDomain = urlObj.hostname.replace('www.', '');
    } catch (e) {
      console.error(`[${requestId}] Invalid URL format:`, e);
    }

    // Fetch the HTML content from the URL with timeout
    let htmlContent = '';
    let fetchError: string | null = null;
    try {
      console.log(`[${requestId}] Fetching URL content...`);
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
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      htmlContent = await response.text();
      console.log(`[${requestId}] Fetched HTML content, length:`, htmlContent.length);
    } catch (e: any) {
      console.error(`[${requestId}] Failed to fetch URL:`, e.message);
      fetchError = e.name === 'AbortError' ? 'Request timeout' : 'Failed to fetch URL content';
    }

    // If fetch failed, return partial result
    if (!htmlContent) {
      const durationMs = Date.now() - startTime;
      return new Response(
        JSON.stringify({
          title: null,
          imageUrl: null,
          price: null,
          currency: null,
          sourceDomain,
          meta: { requestId, durationMs, partial: true },
          error: fetchError || 'No content fetched',
        } as ExtractItemResponse),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use OpenAI to extract product information with timeout
    let extractedData: any = {};
    let extractionError: string | null = null;
    try {
      console.log(`[${requestId}] Calling OpenAI API...`);
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
              content: `You are a product information extractor. Extract product details from HTML and return ONLY valid JSON with this exact structure:
{
  "title": "product name",
  "imageUrl": "full URL to best quality product image",
  "price": 123.45,
  "currency": "USD"
}

Rules:
- title: Extract the main product name/title (string or null)
- imageUrl: Find the highest quality product image URL (string or null)
- price: Extract numeric price value only (number or null)
- currency: Extract currency code like USD, EUR, GBP (string or null)
- Use null for any field you cannot determine
- Return valid JSON object only`,
            },
            {
              role: 'user',
              content: `Extract product information from this HTML:\n\n${htmlContent.substring(0, 8000)}`,
            },
          ],
          temperature: 0.3,
          max_tokens: 500,
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
      const extractedText = openaiData.choices[0]?.message?.content || '{}';
      console.log(`[${requestId}] OpenAI response:`, extractedText);

      // Robust JSON parsing
      try {
        extractedData = JSON.parse(extractedText);
      } catch (e) {
        console.error(`[${requestId}] Failed to parse OpenAI response as JSON:`, extractedText);
        extractionError = 'Failed to parse extraction results';
      }
    } catch (error: any) {
      console.error(`[${requestId}] OpenAI extraction error:`, error.message);
      extractionError = error.name === 'AbortError' ? 'OpenAI request timeout' : 'Failed to extract item details';
    }

    // Return best-effort partial output
    const durationMs = Date.now() - startTime;
    const partial = !!extractionError;

    return new Response(
      JSON.stringify({
        title: extractedData.title || null,
        imageUrl: extractedData.imageUrl || null,
        price: typeof extractedData.price === 'number' ? extractedData.price : null,
        currency: extractedData.currency || null,
        sourceDomain,
        meta: { requestId, durationMs, partial },
        ...(extractionError && { error: extractionError }),
      } as ExtractItemResponse),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error(`[${requestId}] Unexpected error:`, error);
    const durationMs = Date.now() - startTime;
    return new Response(
      JSON.stringify({
        title: null,
        imageUrl: null,
        price: null,
        currency: null,
        sourceDomain: null,
        meta: { requestId, durationMs, partial: true },
        error: error.message || 'Internal server error',
      } as ExtractItemResponse),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
