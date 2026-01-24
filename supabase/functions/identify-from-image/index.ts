
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface IdentifyFromImageRequest {
  imageUrl?: string;
  imageBase64?: string;
}

interface SuggestedProduct {
  title: string;
  imageUrl: string | null;
  likelyUrl: string | null;
}

interface IdentifyFromImageResponse {
  bestGuessTitle: string | null;
  bestGuessCategory: string | null;
  keywords: string[];
  confidence: number;
  suggestedProducts: SuggestedProduct[];
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
    let body: IdentifyFromImageRequest;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON payload' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { imageUrl, imageBase64 } = body;

    if (!imageUrl && !imageBase64) {
      return new Response(
        JSON.stringify({ error: 'Either imageUrl or imageBase64 is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[${requestId}] Identifying product from image`);

    // Get OpenAI API key from environment
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      console.error(`[${requestId}] OPENAI_API_KEY not configured`);
      const durationMs = Date.now() - startTime;
      return new Response(
        JSON.stringify({
          bestGuessTitle: null,
          bestGuessCategory: null,
          keywords: [],
          confidence: 0,
          suggestedProducts: [],
          meta: { requestId, durationMs, partial: true },
          error: 'Server configuration error',
        } as IdentifyFromImageResponse),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Prepare image content for OpenAI
    let imageContent: any;
    if (imageUrl) {
      imageContent = {
        type: 'image_url',
        image_url: { url: imageUrl },
      };
    } else if (imageBase64) {
      // Ensure base64 has proper data URI format
      const base64Data = imageBase64.startsWith('data:') 
        ? imageBase64 
        : `data:image/jpeg;base64,${imageBase64}`;
      imageContent = {
        type: 'image_url',
        image_url: { url: base64Data },
      };
    }

    // Use OpenAI Vision to identify product with timeout
    let identificationData: any = {};
    let identificationError: string | null = null;
    try {
      console.log(`[${requestId}] Calling OpenAI Vision API...`);
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
              content: `You are a product identification assistant. Analyze the image and identify the product.

Return ONLY a valid JSON object with this exact structure:
{
  "bestGuessTitle": "Product Name",
  "bestGuessCategory": "Category",
  "keywords": ["keyword1", "keyword2", "keyword3"],
  "confidence": 0.85,
  "suggestedProducts": [
    {
      "title": "Similar Product Name",
      "imageUrl": null,
      "likelyUrl": null
    }
  ]
}

Rules:
- bestGuessTitle: Your best guess for the product name (string or null)
- bestGuessCategory: Product category like "Electronics", "Clothing" (string or null)
- keywords: Array of relevant search keywords (array of strings)
- confidence: Your confidence level from 0 to 1 (number)
- suggestedProducts: 2-5 similar or matching products (array)
- If you cannot identify the product, return low confidence and empty suggestions
- Return valid JSON object only`,
            },
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: 'Identify this product and suggest similar products where it can be purchased.',
                },
                imageContent,
              ],
            },
          ],
          temperature: 0.5,
          max_tokens: 1000,
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
      const content = openaiData.choices[0]?.message?.content || '{}';
      console.log(`[${requestId}] OpenAI Vision response received`);

      // Robust JSON parsing
      try {
        identificationData = JSON.parse(content);
      } catch (e) {
        console.error(`[${requestId}] Failed to parse OpenAI response:`, e);
        identificationError = 'Failed to parse identification results';
      }
    } catch (error: any) {
      console.error(`[${requestId}] OpenAI identification error:`, error.message);
      identificationError = error.name === 'AbortError' ? 'OpenAI request timeout' : 'Failed to identify product';
    }

    // Validate suggested products
    const suggestedProducts = (identificationData.suggestedProducts || []).filter((product: any) => {
      return product.title;
    });

    const durationMs = Date.now() - startTime;
    const partial = !!identificationError;

    return new Response(
      JSON.stringify({
        bestGuessTitle: identificationData.bestGuessTitle || null,
        bestGuessCategory: identificationData.bestGuessCategory || null,
        keywords: Array.isArray(identificationData.keywords) ? identificationData.keywords : [],
        confidence: typeof identificationData.confidence === 'number' ? identificationData.confidence : 0,
        suggestedProducts,
        meta: { requestId, durationMs, partial },
        ...(identificationError && { error: identificationError }),
      } as IdentifyFromImageResponse),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error(`[${requestId}] Unexpected error:`, error);
    const durationMs = Date.now() - startTime;
    return new Response(
      JSON.stringify({
        bestGuessTitle: null,
        bestGuessCategory: null,
        keywords: [],
        confidence: 0,
        suggestedProducts: [],
        meta: { requestId, durationMs, partial: true },
        error: error.message || 'Internal server error',
      } as IdentifyFromImageResponse),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
