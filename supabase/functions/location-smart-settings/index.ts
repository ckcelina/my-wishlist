
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.5';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SmartLocationSettings {
  enabled: boolean;
  mode: 'manual' | 'auto';
  countryCode: string | null;
  city: string | null;
  currencyCode: string | null;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const defaultSettings: SmartLocationSettings = {
    enabled: false,
    mode: 'manual',
    countryCode: null,
    city: null,
    currencyCode: null,
  };

  try {
    console.log('[location-smart-settings] Request received');

    // Create Supabase client to check auth
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Try to get the authenticated user
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      // Unauthenticated user - return defaults (no 404, always 200)
      console.log('[location-smart-settings] Unauthenticated request, returning defaults');
      return new Response(JSON.stringify(defaultSettings), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    console.log('[location-smart-settings] Authenticated user:', user.id);

    // For authenticated users, you could fetch their actual settings from a table here
    // Example:
    // const { data: userSettings, error } = await supabaseClient
    //   .from('user_smart_location_settings')
    //   .select('*')
    //   .eq('user_id', user.id)
    //   .single();
    //
    // if (userSettings) {
    //   return new Response(JSON.stringify(userSettings), {
    //     headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    //     status: 200,
    //   });
    // }

    // For now, return defaults for authenticated users too
    // This ensures the endpoint never 404s
    console.log('[location-smart-settings] Returning default settings');
    return new Response(JSON.stringify(defaultSettings), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    // Even on error, return 200 with defaults to prevent 404
    console.error('[location-smart-settings] Error:', error.message);
    return new Response(JSON.stringify(defaultSettings), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  }
});
