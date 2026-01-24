
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface FindAlternativesRequest {
  title: string;
  originalUrl?: string;
  countryCode?: string;
  city?: string;
}

interface Alternative {
  storeName: string;
  domain: string;
  price: number;
  currency: string;
  url: string;
}

interface FindAlternativesResponse {
  alternatives: Alternative[];
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
    let body: FindAlternativesRequest;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON payload' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { title, originalUrl, countryCode, city } = body;

    if (!title || typeof title !== 'string' || title.trim() === '') {
      return new Response(
        JSON.stringify({ error: 'Title is required and must be a non-empty string' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[${requestId}] Finding alternatives for:`, title);
    console.log(`[${requestId}] User location: ${countryCode || 'N/A'}, ${city || 'N/A'}`);

    // Get OpenAI API key from environment
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      console.error(`[${requestId}] OPENAI_API_KEY not configured`);
      const durationMs = Date.now() - startTime;
      return new Response(
        JSON.stringify({
          alternatives: [],
          meta: { requestId, durationMs, partial: true },
          error: 'Server configuration error',
        } as FindAlternativesResponse),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client for filtering
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    let supabaseClient: any = null;

    if (supabaseUrl && supabaseServiceKey) {
      supabaseClient = createClient(supabaseUrl, supabaseServiceKey);
    }

    // Use OpenAI to find alternative stores with timeout
    let alternatives: Alternative[] = [];
    let aiError: string | null = null;
    try {
      console.log(`[${requestId}] Calling OpenAI API`);
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
              content: `You are a shopping assistant that finds alternative stores where products can be purchased. 
Given a product title and optionally its original URL, find 3-5 alternative online stores where this product or similar products can be purchased.

Return ONLY a valid JSON object with this exact structure:
{
  "alternatives": [
    {
      "storeName": "Store Name",
      "domain": "example.com",
      "price": 29.99,
      "currency": "USD",
      "url": "https://example.com/product-page"
    }
  ]
}

Rules:
- Include major retailers like Amazon, eBay, Walmart, Target, Best Buy, etc.
- Provide realistic price estimates based on typical market prices
- Use actual store domains (amazon.com, ebay.com, walmart.com, etc.)
- Generate plausible product URLs for each store
- If you cannot find alternatives, return empty array
- All fields are required for each alternative
- Return valid JSON object only`,
            },
            {
              role: 'user',
              content: originalUrl 
                ? `Find alternative stores for: "${title}"\nOriginal URL: ${originalUrl}`
                : `Find alternative stores for: "${title}"`,
            },
          ],
          temperature: 0.7,
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
      const content = openaiData.choices[0]?.message?.content || '{"alternatives":[]}';
      console.log(`[${requestId}] OpenAI response received`);

      // Robust JSON parsing
      try {
        const parsed = JSON.parse(content);
        alternatives = parsed.alternatives || [];
      } catch (e) {
        console.error(`[${requestId}] Failed to parse OpenAI response:`, e);
        aiError = 'Failed to parse AI response';
      }
    } catch (error: any) {
      console.error(`[${requestId}] OpenAI error:`, error.message);
      aiError = error.name === 'AbortError' ? 'OpenAI request timeout' : 'Failed to find alternatives';
    }

    // Validate alternatives
    const validAlternatives = alternatives.filter((alt: any) => {
      return alt.storeName && 
             alt.domain && 
             typeof alt.price === 'number' && 
             alt.currency && 
             alt.url;
    });

    console.log(`[${requestId}] Found ${validAlternatives.length} valid alternatives before filtering`);

    // Filter by location using Supabase tables if available
    let filteredAlternatives = validAlternatives;
    if (supabaseClient && countryCode) {
      try {
        console.log(`[${requestId}] Filtering by location: ${countryCode}, ${city || 'N/A'}`);
        
        const filteredResults: Alternative[] = [];
        
        for (const alt of validAlternatives) {
          // Look up store in database
          const { data: storeData, error: storeError } = await supabaseClient
            .from('stores')
            .select('id, countries_supported, requires_city')
            .eq('domain', alt.domain)
            .single();

          if (storeError || !storeData) {
            // Store not in database, include as unverified
            console.log(`[${requestId}] Store ${alt.domain} not in database, including as unverified`);
            filteredResults.push(alt);
            continue;
          }

          // Check if store ships to user's country
          const countriesSupported = storeData.countries_supported || [];
          if (!countriesSupported.includes(countryCode)) {
            console.log(`[${requestId}] Store ${alt.domain} does not ship to ${countryCode}`);
            continue;
          }

          // Check city-level shipping rules if required
          if (storeData.requires_city && city) {
            const { data: shippingRules, error: rulesError } = await supabaseClient
              .from('store_shipping_rules')
              .select('*')
              .eq('store_id', storeData.id)
              .eq('country_code', countryCode);

            if (rulesError) {
              console.error(`[${requestId}] Error fetching shipping rules:`, rulesError);
              filteredResults.push(alt);
              continue;
            }

            if (shippingRules && shippingRules.length > 0) {
              const rule = shippingRules[0];
              
              // Check city blacklist
              if (rule.city_blacklist && rule.city_blacklist.includes(city)) {
                console.log(`[${requestId}] City ${city} is blacklisted for ${alt.domain}`);
                continue;
              }

              // Check city whitelist
              if (rule.city_whitelist && rule.city_whitelist.length > 0) {
                if (!rule.city_whitelist.includes(city)) {
                  console.log(`[${requestId}] City ${city} not in whitelist for ${alt.domain}`);
                  continue;
                }
              }

              // Check ships_to_city flag
              if (rule.ships_to_city === false) {
                console.log(`[${requestId}] Store ${alt.domain} does not ship to city ${city}`);
                continue;
              }
            }
          }

          // Store passes all filters
          filteredResults.push(alt);
        }

        filteredAlternatives = filteredResults;
        console.log(`[${requestId}] After location filtering: ${filteredAlternatives.length} alternatives`);
      } catch (filterError: any) {
        console.error(`[${requestId}] Error during location filtering:`, filterError);
        // Continue with unfiltered results on error
      }
    }

    const durationMs = Date.now() - startTime;
    const partial = !!aiError;

    return new Response(
      JSON.stringify({
        alternatives: filteredAlternatives,
        meta: { requestId, durationMs, partial },
        ...(aiError && { error: aiError }),
      } as FindAlternativesResponse),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error(`[${requestId}] Unexpected error:`, error);
    const durationMs = Date.now() - startTime;
    return new Response(
      JSON.stringify({
        alternatives: [],
        meta: { requestId, durationMs, partial: true },
        error: error.message || 'Internal server error',
      } as FindAlternativesResponse),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
