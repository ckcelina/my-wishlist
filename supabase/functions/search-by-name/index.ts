
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SearchByNameRequest {
  query: string;
  countryCode?: string;
  city?: string;
  currency?: string;
  limit?: number;
}

interface SearchResult {
  title: string;
  imageUrl: string | null;
  productUrl: string;
  storeDomain: string;
  price: number | null;
  currency: string | null;
  confidence: number;
}

interface SearchByNameResponse {
  results: SearchResult[];
  error: string | null;
}

serve(async (req) => {
  const requestId = crypto.randomUUID();

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log(`[search-by-name] Request ${requestId}: Received request`);

    // Validate input JSON
    let body: SearchByNameRequest;
    try {
      body = await req.json();
    } catch (e) {
      console.error(`[search-by-name] Request ${requestId}: Invalid JSON payload: ${e.message}`);
      return new Response(
        JSON.stringify({ results: [], error: 'Invalid JSON payload' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { query, countryCode, city, currency, limit = 10 } = body;

    // 2) Add logging for request input
    console.log(`[search-by-name] Request ${requestId}: Input query: "${query}", countryCode: "${countryCode || 'N/A'}", city: "${city || 'N/A'}", currency: "${currency || 'N/A'}", limit: ${limit}`);

    if (!query || typeof query !== 'string' || query.trim() === '') {
      console.warn(`[search-by-name] Request ${requestId}: Missing or empty query`);
      return new Response(
        JSON.stringify({ results: [], error: 'Query is required and must be a non-empty string' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 1) Validate environment variables exist: OPENAI_API_KEY must be present
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      console.error(`[search-by-name] Request ${requestId}: OPENAI_API_KEY is not configured`);
      // 4) On missing key, return 500 with a clear message
      return new Response(
        JSON.stringify({ 
          results: [], 
          error: 'Server configuration error: OpenAI API key is missing. Please contact support.' 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client for filtering
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    let supabaseClient: any = null;

    if (supabaseUrl && supabaseServiceKey) {
      supabaseClient = createClient(supabaseUrl, supabaseServiceKey);
      console.log(`[search-by-name] Request ${requestId}: Supabase client initialized`);
    } else {
      console.warn(`[search-by-name] Request ${requestId}: Supabase credentials not available, location filtering disabled`);
    }

    // Use OpenAI to search for products with timeout
    let searchResults: SearchResult[] = [];
    let aiError: string | null = null;
    
    try {
      console.log(`[search-by-name] Request ${requestId}: Calling OpenAI API for product search`);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

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
              content: `You are a shopping search assistant that finds products across multiple online stores.
Given a product search query, find ${limit} relevant products from various online retailers.

Return ONLY a valid JSON object with this exact structure:
{
  "results": [
    {
      "title": "Product Name - Store Name",
      "imageUrl": "https://example.com/image.jpg or null",
      "productUrl": "https://example.com/product-page",
      "storeDomain": "example.com",
      "price": 29.99 or null,
      "currency": "USD" or null,
      "confidence": 0.95
    }
  ]
}

Rules:
- Search across major retailers: Amazon, eBay, Walmart, Target, Best Buy, Etsy, etc.
- Include product images when possible (use null if unavailable)
- Provide realistic price estimates based on typical market prices (use null if price unavailable)
- Use actual store domains (amazon.com, ebay.com, walmart.com, etc.)
- Generate plausible product URLs for each store
- Confidence score (0-1) indicates how well the product matches the search query
- Sort results by confidence (highest first)
- If you cannot find products, return empty array
- All fields except imageUrl, price, and currency are required
- Return valid JSON object only`,
            },
            {
              role: 'user',
              content: `Search for products matching: "${query}"${currency ? `\nPreferred currency: ${currency}` : ''}`,
            },
          ],
          temperature: 0.7,
          max_tokens: 2000,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!openaiResponse.ok) {
        const errorText = await openaiResponse.text();
        console.error(`[search-by-name] Request ${requestId}: OpenAI API error (${openaiResponse.status}): ${errorText}`);
        throw new Error(`OpenAI API request failed with status ${openaiResponse.status}`);
      }

      const openaiData = await openaiResponse.json();
      const content = openaiData.choices[0]?.message?.content || '{"results":[]}';
      console.log(`[search-by-name] Request ${requestId}: OpenAI response received, parsing results`);

      // Robust JSON parsing
      try {
        const parsed = JSON.parse(content);
        searchResults = parsed.results || [];
        
        // 2) Add logging for generated query terms (extracted from results)
        const generatedTerms = searchResults.map(r => r.title).join(', ');
        console.log(`[search-by-name] Request ${requestId}: Generated query terms/products: ${generatedTerms || 'none'}`);
      } catch (e) {
        console.error(`[search-by-name] Request ${requestId}: Failed to parse OpenAI response: ${e.message}`);
        aiError = 'Failed to parse AI response';
      }
    } catch (error: any) {
      console.error(`[search-by-name] Request ${requestId}: OpenAI error: ${error.message}`);
      aiError = error.name === 'AbortError' ? 'Search request timeout' : 'Failed to search for products';
      
      // Return partial results if timeout
      if (error.name === 'AbortError' && searchResults.length > 0) {
        console.log(`[search-by-name] Request ${requestId}: Returning partial results due to timeout`);
      }
    }

    // Validate search results
    const validResults = searchResults.filter((result: any) => {
      return result.title && 
             result.productUrl && 
             result.storeDomain && 
             typeof result.confidence === 'number';
    });

    console.log(`[search-by-name] Request ${requestId}: Found ${validResults.length} valid results before filtering`);

    // Filter by location using Supabase tables if available
    let filteredResults = validResults;
    if (supabaseClient && countryCode) {
      try {
        console.log(`[search-by-name] Request ${requestId}: Filtering by location: ${countryCode}, ${city || 'N/A'}`);
        
        const locationFilteredResults: SearchResult[] = [];
        
        for (const result of validResults) {
          // Look up store in database
          const { data: storeData, error: storeError } = await supabaseClient
            .from('stores')
            .select('id, countries_supported, requires_city')
            .eq('domain', result.storeDomain)
            .single();

          if (storeError || !storeData) {
            // Store not in database, include as unverified
            console.log(`[search-by-name] Request ${requestId}: Store ${result.storeDomain} not in database, including as unverified`);
            locationFilteredResults.push(result);
            continue;
          }

          // Check if store ships to user's country
          const countriesSupported = storeData.countries_supported || [];
          if (!countriesSupported.includes(countryCode)) {
            console.log(`[search-by-name] Request ${requestId}: Store ${result.storeDomain} does not ship to ${countryCode}`);
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
              console.error(`[search-by-name] Request ${requestId}: Error fetching shipping rules: ${rulesError.message}`);
              locationFilteredResults.push(result);
              continue;
            }

            if (shippingRules && shippingRules.length > 0) {
              const rule = shippingRules[0];
              
              // Check city blacklist
              if (rule.city_blacklist && rule.city_blacklist.includes(city)) {
                console.log(`[search-by-name] Request ${requestId}: City ${city} is blacklisted for ${result.storeDomain}`);
                continue;
              }

              // Check city whitelist
              if (rule.city_whitelist && rule.city_whitelist.length > 0) {
                if (!rule.city_whitelist.includes(city)) {
                  console.log(`[search-by-name] Request ${requestId}: City ${city} not in whitelist for ${result.storeDomain}`);
                  continue;
                }
              }

              // Check ships_to_city flag
              if (rule.ships_to_city === false) {
                console.log(`[search-by-name] Request ${requestId}: Store ${result.storeDomain} does not ship to city ${city}`);
                continue;
              }
            }
          }

          // Store passes all filters
          locationFilteredResults.push(result);
        }

        filteredResults = locationFilteredResults;
        console.log(`[search-by-name] Request ${requestId}: After location filtering: ${filteredResults.length} results`);
      } catch (filterError: any) {
        console.error(`[search-by-name] Request ${requestId}: Error during location filtering: ${filterError.message}`);
        // Continue with unfiltered results on error
      }
    }

    // Sort by confidence (highest first)
    filteredResults.sort((a, b) => b.confidence - a.confidence);

    // Apply limit
    const limitedResults = filteredResults.slice(0, limit);

    // 3) Ensure the function returns: { results: [...], error: null }
    // 2) Add logging for final results count
    console.log(`[search-by-name] Request ${requestId}: Final results count: ${limitedResults.length}`);

    return new Response(
      JSON.stringify({
        results: limitedResults,
        error: aiError,
      } as SearchByNameResponse),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error(`[search-by-name] Request ${requestId}: Unexpected error: ${error.message}`);
    // 3) Never silently return an empty array on configuration errors
    return new Response(
      JSON.stringify({
        results: [],
        error: `Internal server error: ${error.message}`,
      } as SearchByNameResponse),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
