
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
  itemName: string | null;
  brand: string | null;
  confidence: number; // 0.0 - 1.0
  extractedText: string;
  suggestedQueries: string[];
  error?: string;
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

    // Validate JWT and get user ID
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error(`[${requestId}] Missing Authorization header`);
      return new Response(
        JSON.stringify({ error: 'Missing Authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Validate JWT
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.error(`[${requestId}] Invalid JWT:`, authError?.message);
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
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
          itemName: null,
          brand: null,
          confidence: 0,
          extractedText: '',
          suggestedQueries: [],
          error: 'Failed to fetch image from URL. Please ensure the URL is valid and accessible.',
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
          itemName: null,
          brand: null,
          confidence: 0,
          extractedText: '',
          suggestedQueries: [],
          error: 'OpenAI API key not configured. Please contact support.',
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
      if (visionResponse.status === 401) {
        errorMessage = 'OpenAI API authentication failed. Please contact support.';
      } else if (visionResponse.status === 429) {
        errorMessage = 'Rate limit exceeded. Please try again in a moment.';
      } else if (visionResponse.status === 400) {
        errorMessage = 'Invalid image format. Please try a different image.';
      }

      return new Response(
        JSON.stringify({
          itemName: null,
          brand: null,
          confidence: 0,
          extractedText: '',
          suggestedQueries: [],
          error: errorMessage,
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
          itemName: null,
          brand: null,
          confidence: 0,
          extractedText: '',
          suggestedQueries: [],
          error: 'Failed to parse AI response. Please try again.',
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

    return new Response(
      JSON.stringify({
        itemName,
        brand,
        confidence,
        extractedText,
        suggestedQueries,
      } as IdentifyFromImageResponse),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error(`[${requestId}] Unexpected error:`, error);
    return new Response(
      JSON.stringify({
        itemName: null,
        brand: null,
        confidence: 0,
        extractedText: '',
        suggestedQueries: [],
        error: error.message || 'Internal server error. Please try again.',
      } as IdentifyFromImageResponse),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
