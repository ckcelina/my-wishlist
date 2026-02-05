
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

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

Deno.serve(async (req) => {
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
          error: 'OpenAI API key not configured. Please contact support to enable image identification.',
        } as IdentifyFromImageResponse),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Prepare image content for OpenAI Vision API
    // CRITICAL: Use "input_image" type for GPT-4o multimodal support (per OpenAI docs)
    let imageContent: any;
    if (imageUrl) {
      imageContent = {
        type: 'input_image',
        image_url: { url: imageUrl },
      };
    } else if (imageBase64) {
      // Ensure base64 has proper data URI format
      const base64Data = imageBase64.startsWith('data:') 
        ? imageBase64 
        : `data:image/jpeg;base64,${imageBase64}`;
      imageContent = {
        type: 'input_image',
        image_url: { url: base64Data },
      };
    }

    // Enhanced system prompt for better OCR and product identification
    const systemPrompt = `You are an expert product identification assistant with OCR capabilities. Analyze the image and identify the product.

Your task:
1. Extract ALL visible text from the image (product names, brand names, model numbers, labels)
2. Identify logos and brand marks
3. Determine the product category
4. Generate relevant search keywords
5. Suggest similar products

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
- bestGuessTitle: Your best guess for the product name based on visible text and visual analysis (string or null)
- bestGuessCategory: Product category like "Electronics", "Clothing", "Home & Garden", "Food & Beverage" (string or null)
- keywords: Array of 3-7 relevant search keywords extracted from text and visual analysis (array of strings)
- confidence: Your confidence level from 0 to 1 (number between 0 and 1)
  - 0.8-1.0: Clear text visible, brand/product name identified
  - 0.5-0.8: Some text visible, product type clear
  - 0.3-0.5: Limited text, product category identifiable
  - 0.0-0.3: No clear text, generic product
- suggestedProducts: 2-5 similar or matching products (array)
- If you cannot identify the product clearly, return low confidence (< 0.5) and generic keywords
- Return valid JSON object only, no additional text`;

    // Use OpenAI Vision to identify product with timeout
    let identificationData: any = {};
    let identificationError: string | null = null;
    try {
      console.log(`[${requestId}] Calling OpenAI Vision API (gpt-4o-mini for cost efficiency)...`);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000); // 20s timeout (increased for Vision API)

      const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini', // Cost-effective vision-capable model
          response_format: { type: 'json_object' },
          messages: [
            {
              role: 'system',
              content: systemPrompt,
            },
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: 'Identify this product. Extract ALL visible text (brand names, product names, model numbers, labels). Look for logos and brand marks. Determine the product category and suggest similar products where it can be purchased.',
                },
                imageContent,
              ],
            },
          ],
          temperature: 0.2, // Lower temperature for more consistent, factual results
          max_tokens: 1500, // Increased for detailed responses
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!openaiResponse.ok) {
        const errorText = await openaiResponse.text();
        console.error(`[${requestId}] OpenAI API error (${openaiResponse.status}):`, errorText);
        
        // Provide specific error messages based on status code
        if (openaiResponse.status === 401) {
          throw new Error('OpenAI API authentication failed. The API key is invalid or expired. Please contact support.');
        } else if (openaiResponse.status === 429) {
          throw new Error('OpenAI API rate limit exceeded. Please try again in a moment.');
        } else if (openaiResponse.status === 400) {
          // Parse error details for better user feedback
          try {
            const errorData = JSON.parse(errorText);
            if (errorData.error?.message?.includes('image')) {
              throw new Error('Invalid image format or size. Please try a different image (max 20MB, JPG/PNG).');
            }
          } catch {
            // Fallback to generic error
          }
          throw new Error('Invalid image format. Please try a different image.');
        } else if (openaiResponse.status === 500 || openaiResponse.status === 503) {
          throw new Error('OpenAI service is temporarily unavailable. Please try again in a moment.');
        } else {
          throw new Error(`OpenAI API request failed (${openaiResponse.status}). Please try again.`);
        }
      }

      const openaiData = await openaiResponse.json();
      const content = openaiData.choices[0]?.message?.content || '{}';
      console.log(`[${requestId}] OpenAI Vision response received`);
      console.log(`[${requestId}] Raw response:`, content.substring(0, 300));

      // Robust JSON parsing with fallback
      try {
        identificationData = JSON.parse(content);
        console.log(`[${requestId}] Parsed identification data:`, {
          title: identificationData.bestGuessTitle,
          category: identificationData.bestGuessCategory,
          confidence: identificationData.confidence,
          keywordsCount: identificationData.keywords?.length || 0,
          suggestedProductsCount: identificationData.suggestedProducts?.length || 0,
        });
      } catch (e) {
        console.error(`[${requestId}] Failed to parse OpenAI response:`, e);
        console.error(`[${requestId}] Raw content:`, content);
        identificationError = 'Failed to parse identification results. The AI response was malformed.';
      }
    } catch (error: any) {
      console.error(`[${requestId}] OpenAI identification error:`, error.message);
      identificationError = error.name === 'AbortError' 
        ? 'Request timeout. Please try again with a smaller image (max 5MB recommended).' 
        : error.message || 'Failed to identify product. Please try again.';
    }

    // Validate and sanitize suggested products
    const suggestedProducts = (identificationData.suggestedProducts || [])
      .filter((product: any) => product && product.title && typeof product.title === 'string')
      .slice(0, 5) // Limit to 5 suggestions
      .map((product: any) => ({
        title: product.title,
        imageUrl: product.imageUrl || null,
        likelyUrl: product.likelyUrl || null,
      }));

    // Validate and sanitize keywords
    const keywords = Array.isArray(identificationData.keywords) 
      ? identificationData.keywords
          .filter((k: any) => typeof k === 'string' && k.trim().length > 0)
          .map((k: string) => k.trim())
          .slice(0, 10)
      : [];

    // Validate confidence score (must be between 0 and 1)
    let confidence = typeof identificationData.confidence === 'number' 
      ? Math.max(0, Math.min(1, identificationData.confidence))
      : 0;

    // If we have an error but got some data, reduce confidence
    if (identificationError && confidence > 0.3) {
      confidence = Math.min(confidence, 0.3);
    }

    // Validate title and category
    const bestGuessTitle = identificationData.bestGuessTitle && typeof identificationData.bestGuessTitle === 'string'
      ? identificationData.bestGuessTitle.trim()
      : null;
    
    const bestGuessCategory = identificationData.bestGuessCategory && typeof identificationData.bestGuessCategory === 'string'
      ? identificationData.bestGuessCategory.trim()
      : null;

    const durationMs = Date.now() - startTime;
    const partial = !!identificationError;

    console.log(`[${requestId}] Identification complete in ${durationMs}ms (partial: ${partial})`);
    console.log(`[${requestId}] Final result:`, {
      title: bestGuessTitle,
      category: bestGuessCategory,
      confidence,
      keywordsCount: keywords.length,
      suggestedProductsCount: suggestedProducts.length,
      partial,
    });

    return new Response(
      JSON.stringify({
        bestGuessTitle,
        bestGuessCategory,
        keywords,
        confidence,
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
        error: error.message || 'Internal server error. Please try again.',
      } as IdentifyFromImageResponse),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
