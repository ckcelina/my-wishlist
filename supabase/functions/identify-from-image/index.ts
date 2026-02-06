
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface IdentifyFromImageRequest {
  imageUrl: string; // Signed URL from Supabase Storage
}

interface IdentifyFromImageResponse {
  status: 'ok' | 'no_results' | 'error';
  code?: string; // e.g., 'AUTH_REQUIRED', 'INTERNAL_ERROR'
  message?: string;
  providerUsed: 'openai_vision' | 'serpapi_google_lens' | 'bing_visual_search' | 'none';
  confidence: number; // 0.0 - 1.0
  query: string;
  items: Array<{
    title: string;
    brand: string | null;
    model: string | null;
    category: string | null;
    imageUrl: string;
    url: string;
    price: number | null;
    currency: string | null;
    store: string | null;
  }>;
}

Deno.serve(async (req) => {
  const startTime = Date.now();
  const requestId = crypto.randomUUID();

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log(`[${requestId}] identify-from-image: Request received`);

    // EDGE FUNCTION ENTRY CHECK: Validate JWT and get user ID
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error(`[${requestId}] Missing Authorization header`);
      return new Response(
        JSON.stringify({
          status: 'error',
          code: 'AUTH_REQUIRED',
          message: 'Login required',
          providerUsed: 'none',
          confidence: 0,
          query: '',
          items: [],
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Validate JWT
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    // If user is missing → return AUTH_REQUIRED (NEVER throw raw errors)
    if (authError || !user) {
      console.error(`[${requestId}] Invalid JWT or user missing:`, authError?.message);
      return new Response(
        JSON.stringify({
          status: 'error',
          code: 'AUTH_REQUIRED',
          message: 'Login required',
          providerUsed: 'none',
          confidence: 0,
          query: '',
          items: [],
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[${requestId}] User authenticated: ${user.id}`);

    // Parse request body
    let body: IdentifyFromImageRequest;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON payload' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { imageUrl } = body;

    if (!imageUrl) {
      return new Response(
        JSON.stringify({ error: 'imageUrl is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[${requestId}] Fetching image from signed URL`);

    // Fetch image bytes from signed URL
    let imageBytes: Uint8Array;
    try {
      const imageResponse = await fetch(imageUrl);
      if (!imageResponse.ok) {
        throw new Error(`Failed to fetch image: ${imageResponse.status}`);
      }
      const arrayBuffer = await imageResponse.arrayBuffer();
      imageBytes = new Uint8Array(arrayBuffer);
      console.log(`[${requestId}] Image fetched: ${imageBytes.length} bytes`);
    } catch (error: any) {
      console.error(`[${requestId}] Error fetching image:`, error.message);
      return new Response(
        JSON.stringify({
          status: 'error',
          code: 'IMAGE_FETCH_ERROR',
          message: 'Failed to fetch image from URL. Please ensure the URL is valid and accessible.',
          providerUsed: 'none',
          confidence: 0,
          query: '',
          items: [],
        } as IdentifyFromImageResponse),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get OpenAI API key
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      console.error(`[${requestId}] OPENAI_API_KEY not configured`);
      return new Response(
        JSON.stringify({
          status: 'error',
          code: 'CONFIG_ERROR',
          message: 'OpenAI API key not configured. Please contact support.',
          providerUsed: 'none',
          confidence: 0,
          query: '',
          items: [],
        } as IdentifyFromImageResponse),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Convert image bytes to base64 data URL
    const base64Image = btoa(String.fromCharCode(...imageBytes));
    const dataUrl = `data:image/jpeg;base64,${base64Image}`;

    console.log(`[${requestId}] Calling OpenAI Vision API (gpt-4o-mini)`);

    // Call OpenAI Vision API
    const visionResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini', // Cost-effective vision model
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Analyze this product image. Extract the following information:
1. Item Name: The primary name of the product.
2. Brand: The brand name, if clearly visible.
3. Extracted Text: ALL visible text on the packaging, labels, or product itself.
4. Confidence: A score from 0.0 to 1.0 indicating certainty of identification.
5. Suggested Queries: A list of 3-5 alternative search terms for this product.

Prioritize accuracy for item name and brand. For Extracted Text, be exhaustive.
If no clear item name or brand is found, return null for those fields.
If no text is visible, return an empty string for Extracted Text.
Confidence should be high (0.8-1.0) if item name and brand are clear,
moderate (0.4-0.7) if some info is present but ambiguous,
and low (0.0-0.3) if nothing useful is identified.

Return the response as a JSON object with keys:
itemName: string | null
brand: string | null
confidence: number (0.0-1.0)
extractedText: string
suggestedQueries: string[]`,
              },
              {
                type: 'image_url',
                image_url: {
                  url: dataUrl,
                  detail: 'high', // High detail for better OCR
                },
              },
            ],
          },
        ],
        max_tokens: 1000,
        temperature: 0.2, // Low temperature for consistent results
      }),
    });

    if (!visionResponse.ok) {
      const errorText = await visionResponse.text();
      console.error(`[${requestId}] OpenAI API error (${visionResponse.status}):`, errorText);

      let errorMessage = 'Failed to analyze image. Please try again.';
      let errorCode = 'OPENAI_ERROR';
      
      if (visionResponse.status === 401) {
        errorMessage = 'OpenAI API authentication failed. Please contact support.';
        errorCode = 'OPENAI_AUTH_ERROR';
      } else if (visionResponse.status === 429) {
        errorMessage = 'Rate limit exceeded. Please try again in a moment.';
        errorCode = 'RATE_LIMIT_ERROR';
      } else if (visionResponse.status === 400) {
        errorMessage = 'Invalid image format. Please try a different image.';
        errorCode = 'INVALID_IMAGE_ERROR';
      }

      return new Response(
        JSON.stringify({
          status: 'error',
          code: errorCode,
          message: errorMessage,
          providerUsed: 'openai_vision',
          confidence: 0,
          query: '',
          items: [],
        } as IdentifyFromImageResponse),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const visionData = await visionResponse.json();
    const content = visionData.choices[0]?.message?.content || '{}';

    console.log(`[${requestId}] OpenAI response received`);

    // Parse OpenAI response
    let parsedData: any = {};
    try {
      parsedData = JSON.parse(content);
    } catch (e) {
      console.error(`[${requestId}] Failed to parse OpenAI response:`, e);
      return new Response(
        JSON.stringify({
          status: 'error',
          code: 'PARSE_ERROR',
          message: 'Failed to parse AI response. Please try again.',
          providerUsed: 'openai_vision',
          confidence: 0,
          query: '',
          items: [],
        } as IdentifyFromImageResponse),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate and sanitize response
    const itemName = parsedData.itemName && typeof parsedData.itemName === 'string'
      ? parsedData.itemName.trim()
      : null;

    const brand = parsedData.brand && typeof parsedData.brand === 'string'
      ? parsedData.brand.trim()
      : null;

    const confidence = typeof parsedData.confidence === 'number'
      ? Math.max(0, Math.min(1, parsedData.confidence))
      : 0;

    const extractedText = parsedData.extractedText && typeof parsedData.extractedText === 'string'
      ? parsedData.extractedText.trim()
      : '';

    const suggestedQueries = Array.isArray(parsedData.suggestedQueries)
      ? parsedData.suggestedQueries
          .filter((q: any) => typeof q === 'string' && q.trim().length > 0)
          .map((q: string) => q.trim())
          .slice(0, 5)
      : [];

    const durationMs = Date.now() - startTime;

    console.log(`[${requestId}] Identification complete in ${durationMs}ms`);
    console.log(`[${requestId}] Result: itemName="${itemName}", brand="${brand}", confidence=${confidence}`);

    // Build query from extracted data
    const query = [itemName, brand].filter(Boolean).join(' ').trim() || extractedText.slice(0, 100);

    // If we have a high-confidence result, return it as a single item
    if (itemName && confidence >= 0.5) {
      return new Response(
        JSON.stringify({
          status: 'ok',
          providerUsed: 'openai_vision',
          confidence,
          query,
          items: [
            {
              title: itemName,
              brand,
              model: null,
              category: null,
              imageUrl: imageUrl, // Use the original image
              url: '',
              price: null,
              currency: null,
              store: null,
            },
          ],
        } as IdentifyFromImageResponse),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If confidence is low or no item name, return no_results
    return new Response(
      JSON.stringify({
        status: 'no_results',
        message: 'Could not identify the product with sufficient confidence. Try a clearer image or add manually.',
        providerUsed: 'openai_vision',
        confidence,
        query,
        items: [],
      } as IdentifyFromImageResponse),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error(`[${requestId}] Unexpected error:`, error);
    
    // NEVER throw raw errors - always return structured JSON
    return new Response(
      JSON.stringify({
        status: 'error',
        code: 'INTERNAL_ERROR',
        message: error.message || 'Internal server error. Please try again.',
        providerUsed: 'none',
        confidence: 0,
        query: '',
        items: [],
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
