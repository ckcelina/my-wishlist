
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface FindAlternativesRequest {
  title: string;
  originalUrl?: string;
}

interface Alternative {
  storeName: string;
  domain: string;
  price: number;
  currency: string;
  url: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('[find-alternatives] Request received');

    // Parse request body
    const { title, originalUrl }: FindAlternativesRequest = await req.json();
    console.log('[find-alternatives] Finding alternatives for:', title);

    if (!title || title.trim() === '') {
      console.error('[find-alternatives] Missing title');
      return new Response(
        JSON.stringify({ error: 'Title is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Get OpenAI API key from environment
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      console.error('[find-alternatives] OpenAI API key not configured');
      return new Response(
        JSON.stringify({ error: 'OpenAI API key not configured' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Use OpenAI to find alternative stores
    console.log('[find-alternatives] Calling OpenAI API');
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `You are a shopping assistant that finds alternative stores where products can be purchased. 
Given a product title and optionally its original URL, find 3-5 alternative online stores where this product or similar products can be purchased.

Return ONLY a valid JSON array with this exact structure (no markdown, no code blocks, just the JSON):
[
  {
    "storeName": "Store Name",
    "domain": "example.com",
    "price": 29.99,
    "currency": "USD",
    "url": "https://example.com/product-page"
  }
]

Rules:
- Include major retailers like Amazon, eBay, Walmart, Target, Best Buy, etc.
- Provide realistic price estimates based on typical market prices
- Use actual store domains (amazon.com, ebay.com, walmart.com, etc.)
- Generate plausible product URLs for each store
- If you cannot find alternatives, return an empty array []
- Return ONLY the JSON array, no other text`
          },
          {
            role: 'user',
            content: originalUrl 
              ? `Find alternative stores for: "${title}"\nOriginal URL: ${originalUrl}`
              : `Find alternative stores for: "${title}"`
          }
        ],
        temperature: 0.7,
        max_tokens: 1000,
      }),
    });

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      console.error('[find-alternatives] OpenAI API error:', errorText);
      return new Response(
        JSON.stringify({ 
          alternatives: [],
          error: 'Failed to find alternatives' 
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const openaiData = await openaiResponse.json();
    console.log('[find-alternatives] OpenAI response received');

    // Extract alternatives from OpenAI response
    let alternatives: Alternative[] = [];
    try {
      const content = openaiData.choices[0]?.message?.content || '[]';
      console.log('[find-alternatives] Raw OpenAI content:', content);
      
      // Remove markdown code blocks if present
      const cleanContent = content
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      
      alternatives = JSON.parse(cleanContent);
      console.log('[find-alternatives] Found', alternatives.length, 'alternatives');
    } catch (parseError) {
      console.error('[find-alternatives] Failed to parse OpenAI response:', parseError);
      alternatives = [];
    }

    // Validate and clean alternatives
    const validAlternatives = alternatives.filter((alt: any) => {
      return alt.storeName && 
             alt.domain && 
             typeof alt.price === 'number' && 
             alt.currency && 
             alt.url;
    });

    console.log('[find-alternatives] Returning', validAlternatives.length, 'valid alternatives');

    return new Response(
      JSON.stringify({ alternatives: validAlternatives }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('[find-alternatives] Unexpected error:', error);
    return new Response(
      JSON.stringify({ 
        alternatives: [],
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
