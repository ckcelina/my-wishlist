
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();
    
    if (!url) {
      return new Response(
        JSON.stringify({ error: 'URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Extracting item from URL:', url);

    // Get OpenAI API key from environment
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      console.error('OPENAI_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract source domain
    let sourceDomain = '';
    try {
      const urlObj = new URL(url);
      sourceDomain = urlObj.hostname.replace('www.', '');
    } catch (e) {
      console.error('Invalid URL format:', e);
    }

    // Fetch the HTML content from the URL
    let htmlContent = '';
    try {
      console.log('Fetching URL content...');
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

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
      console.log('Fetched HTML content, length:', htmlContent.length);
    } catch (e: any) {
      console.error('Failed to fetch URL:', e.message);
      return new Response(
        JSON.stringify({
          error: 'Failed to fetch URL content',
          sourceDomain,
          title: null,
          imageUrl: null,
          price: null,
          currency: null,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use OpenAI to extract product information
    try {
      console.log('Calling OpenAI API...');
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

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
              content: `You are a product information extractor. Extract product details from HTML and return ONLY valid JSON with this exact structure:
{
  "title": "product name",
  "imageUrl": "full URL to best quality product image",
  "price": 123.45,
  "currency": "USD"
}

Rules:
- title: Extract the main product name/title
- imageUrl: Find the highest quality product image URL (prefer og:image, product images, avoid thumbnails)
- price: Extract numeric price value only (e.g., 29.99)
- currency: Extract currency code (e.g., USD, EUR, GBP)
- Use null for any field you cannot determine
- Return ONLY the JSON object, no other text`,
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
        console.error('OpenAI API error:', errorText);
        throw new Error('OpenAI API request failed');
      }

      const openaiData = await openaiResponse.json();
      const extractedText = openaiData.choices[0]?.message?.content || '{}';
      console.log('OpenAI response:', extractedText);

      // Parse the extracted JSON
      let extractedData: any = {};
      try {
        extractedData = JSON.parse(extractedText);
      } catch (e) {
        console.error('Failed to parse OpenAI response as JSON:', extractedText);
        extractedData = {};
      }

      // Return the extracted data with fallbacks
      return new Response(
        JSON.stringify({
          title: extractedData.title || null,
          imageUrl: extractedData.imageUrl || null,
          price: extractedData.price || null,
          currency: extractedData.currency || 'USD',
          sourceDomain: sourceDomain || null,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } catch (error: any) {
      console.error('OpenAI extraction error:', error.message);
      
      // Return partial results even if OpenAI fails
      return new Response(
        JSON.stringify({
          error: 'Failed to extract item details',
          sourceDomain,
          title: null,
          imageUrl: null,
          price: null,
          currency: null,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error: any) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({
        error: error.message || 'Internal server error',
        title: null,
        imageUrl: null,
        price: null,
        currency: null,
        sourceDomain: null,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
