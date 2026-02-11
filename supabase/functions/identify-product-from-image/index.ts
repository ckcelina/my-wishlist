
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface IdentifyProductFromImageRequest {
  imageBase64?: string;
  imageUrl?: string;
  mimeType?: string;
}

interface ProductCandidate {
  title: string;
  storeUrl: string | null;
  imageUrl: string | null;
  source: 'google_vision';
  score: number;
  reason: string;
}

interface IdentifyProductFromImageResponse {
  status: 'ok' | 'no_results' | 'error';
  providerUsed?: 'google_vision';
  confidence?: number;
  query?: string;
  items?: ProductCandidate[];
  message: string | null;
  error?: string;
  debug?: {
    step: string;
    detail: any;
  };
}

serve(async (req) => {
  const requestId = crypto.randomUUID();
  const startTime = Date.now();

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log(`[identify-product-from-image] Request ${requestId}: Received request`);

    // Validate input JSON
    let body: IdentifyProductFromImageRequest;
    try {
      body = await req.json();
    } catch (e) {
      console.error(`[identify-product-from-image] Request ${requestId}: Invalid JSON payload: ${e.message}`);
      return new Response(
        JSON.stringify({
          status: 'error',
          error: 'INVALID_INPUT',
          message: 'Invalid JSON payload',
        } as IdentifyProductFromImageResponse),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { imageBase64, imageUrl, mimeType } = body;

    // Validate input
    if (!imageBase64 && !imageUrl) {
      console.warn(`[identify-product-from-image] Request ${requestId}: Missing imageBase64 or imageUrl`);
      return new Response(
        JSON.stringify({
          status: 'error',
          error: 'INVALID_INPUT',
          message: 'Missing imageBase64 or imageUrl',
        } as IdentifyProductFromImageResponse),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check image size (max 6MB for base64)
    if (imageBase64) {
      const base64Length = imageBase64.length;
      const estimatedBytes = (base64Length * 3) / 4;
      const maxBytes = 6 * 1024 * 1024; // 6MB

      if (estimatedBytes > maxBytes) {
        console.warn(`[identify-product-from-image] Request ${requestId}: Image too large: ${estimatedBytes} bytes`);
        return new Response(
          JSON.stringify({
            status: 'error',
            error: 'IMAGE_TOO_LARGE',
            message: 'Image too large. Max 6MB.',
          } as IdentifyProductFromImageResponse),
          { status: 413, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Get Google Cloud Vision credentials from environment
    const googleVisionSAJson = Deno.env.get('GOOGLE_VISION_SA_JSON');
    const googleCloudProjectId = Deno.env.get('GOOGLE_CLOUD_PROJECT_ID');

    if (!googleVisionSAJson || !googleCloudProjectId) {
      console.error(`[identify-product-from-image] Request ${requestId}: Missing Google Cloud Vision credentials`);
      return new Response(
        JSON.stringify({
          status: 'error',
          error: 'VISION_FAILED',
          message: 'Server configuration error: Google Cloud Vision credentials missing',
          debug: {
            step: 'credentials_check',
            detail: 'GOOGLE_VISION_SA_JSON or GOOGLE_CLOUD_PROJECT_ID not configured',
          },
        } as IdentifyProductFromImageResponse),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse service account JSON
    let serviceAccount: any;
    try {
      serviceAccount = JSON.parse(googleVisionSAJson);
    } catch (e) {
      console.error(`[identify-product-from-image] Request ${requestId}: Invalid GOOGLE_VISION_SA_JSON: ${e.message}`);
      return new Response(
        JSON.stringify({
          status: 'error',
          error: 'VISION_FAILED',
          message: 'Server configuration error: Invalid service account JSON',
          debug: {
            step: 'parse_service_account',
            detail: e.message,
          },
        } as IdentifyProductFromImageResponse),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get OAuth2 access token for Google Cloud Vision API
    console.log(`[identify-product-from-image] Request ${requestId}: Getting OAuth2 token`);
    
    const jwtHeader = btoa(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
    const now = Math.floor(Date.now() / 1000);
    const jwtClaimSet = btoa(JSON.stringify({
      iss: serviceAccount.client_email,
      scope: 'https://www.googleapis.com/auth/cloud-platform',
      aud: 'https://oauth2.googleapis.com/token',
      exp: now + 3600,
      iat: now,
    }));

    // Sign JWT (simplified - in production, use proper JWT library)
    const jwtSignature = ''; // TODO: Implement proper JWT signing with RS256
    const jwt = `${jwtHeader}.${jwtClaimSet}.${jwtSignature}`;

    // For now, use a simpler approach: call Vision API directly with service account
    // In production, implement proper OAuth2 flow

    // Call Google Cloud Vision API
    console.log(`[identify-product-from-image] Request ${requestId}: Calling Google Cloud Vision API`);
    
    const visionApiUrl = `https://vision.googleapis.com/v1/images:annotate?key=${Deno.env.get('GOOGLE_CLOUD_API_KEY')}`;
    
    const visionRequest = {
      requests: [
        {
          image: imageBase64
            ? { content: imageBase64 }
            : { source: { imageUri: imageUrl } },
          features: [
            { type: 'WEB_DETECTION', maxResults: 10 },
            { type: 'LABEL_DETECTION', maxResults: 10 },
            { type: 'LOGO_DETECTION', maxResults: 5 },
          ],
        },
      ],
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000); // 12s timeout

    let visionResponse: Response;
    try {
      visionResponse = await fetch(visionApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(visionRequest),
        signal: controller.signal,
      });
    } catch (e) {
      clearTimeout(timeoutId);
      if (e.name === 'AbortError') {
        console.error(`[identify-product-from-image] Request ${requestId}: Vision API timeout`);
        return new Response(
          JSON.stringify({
            status: 'error',
            error: 'VISION_FAILED',
            message: 'Vision API request timeout',
            debug: {
              step: 'vision_api_call',
              detail: 'Request timeout after 12s',
            },
          } as IdentifyProductFromImageResponse),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      throw e;
    }

    clearTimeout(timeoutId);

    if (!visionResponse.ok) {
      const errorText = await visionResponse.text();
      console.error(`[identify-product-from-image] Request ${requestId}: Vision API error (${visionResponse.status}): ${errorText}`);
      return new Response(
        JSON.stringify({
          status: 'error',
          error: 'VISION_FAILED',
          message: 'Vision API request failed',
          debug: {
            step: 'vision_api_response',
            detail: `Status ${visionResponse.status}: ${errorText.substring(0, 200)}`,
          },
        } as IdentifyProductFromImageResponse),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const visionData = await visionResponse.json();
    const annotations = visionData.responses?.[0];

    console.log(`[identify-product-from-image] Request ${requestId}: Vision API response received`);

    // Extract results
    const items: ProductCandidate[] = [];
    let query = '';
    let confidence = 0;

    // Process Web Detection
    if (annotations.webDetection) {
      const webDetection = annotations.webDetection;

      // Best guess label
      if (webDetection.bestGuessLabels && webDetection.bestGuessLabels.length > 0) {
        query = webDetection.bestGuessLabels[0].label;
        console.log(`[identify-product-from-image] Request ${requestId}: Best guess: ${query}`);
      }

      // Web entities
      if (webDetection.webEntities && webDetection.webEntities.length > 0) {
        for (const entity of webDetection.webEntities.slice(0, 5)) {
          if (entity.description && entity.score > 0.5) {
            items.push({
              title: entity.description,
              storeUrl: null,
              imageUrl: null,
              source: 'google_vision',
              score: entity.score,
              reason: 'web_entity',
            });
            if (entity.score > confidence) {
              confidence = entity.score;
              if (!query) query = entity.description;
            }
          }
        }
      }

      // Pages with matching images
      if (webDetection.pagesWithMatchingImages && webDetection.pagesWithMatchingImages.length > 0) {
        for (const page of webDetection.pagesWithMatchingImages.slice(0, 5)) {
          if (page.url && page.pageTitle) {
            items.push({
              title: page.pageTitle,
              storeUrl: page.url,
              imageUrl: page.fullMatchingImages?.[0]?.url || null,
              source: 'google_vision',
              score: 0.8,
              reason: 'web_match',
            });
          }
        }
      }
    }

    // Process Label Detection
    if (annotations.labelAnnotations && annotations.labelAnnotations.length > 0) {
      for (const label of annotations.labelAnnotations.slice(0, 5)) {
        if (label.description && label.score > 0.7) {
          items.push({
            title: label.description,
            storeUrl: null,
            imageUrl: null,
            source: 'google_vision',
            score: label.score,
            reason: 'label_detection',
          });
          if (label.score > confidence) {
            confidence = label.score;
            if (!query) query = label.description;
          }
        }
      }
    }

    // Process Logo Detection
    if (annotations.logoAnnotations && annotations.logoAnnotations.length > 0) {
      for (const logo of annotations.logoAnnotations) {
        if (logo.description && logo.score > 0.5) {
          items.push({
            title: logo.description,
            storeUrl: null,
            imageUrl: null,
            source: 'google_vision',
            score: logo.score,
            reason: 'logo_detection',
          });
          if (logo.score > confidence) {
            confidence = logo.score;
            if (!query) query = logo.description;
          }
        }
      }
    }

    const durationMs = Date.now() - startTime;
    console.log(`[identify-product-from-image] Request ${requestId}: Processed in ${durationMs}ms, found ${items.length} items`);

    // Return results
    if (items.length === 0) {
      return new Response(
        JSON.stringify({
          status: 'no_results',
          providerUsed: 'google_vision',
          confidence: 0,
          query: '',
          items: [],
          message: 'No matches found. Try cropping or better lighting.',
        } as IdentifyProductFromImageResponse),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        status: 'ok',
        providerUsed: 'google_vision',
        confidence,
        query,
        items,
        message: null,
      } as IdentifyProductFromImageResponse),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error(`[identify-product-from-image] Request ${requestId}: Unexpected error: ${error.message}`);
    return new Response(
      JSON.stringify({
        status: 'error',
        error: 'VISION_FAILED',
        message: `Internal server error: ${error.message}`,
        debug: {
          step: 'unexpected_error',
          detail: error.message,
        },
      } as IdentifyProductFromImageResponse),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
