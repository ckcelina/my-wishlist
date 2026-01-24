
import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_CONNECTION_STATUS } from '@/lib/supabase';

/**
 * Verify Supabase connection and configuration
 * Returns connection status and any errors
 * 
 * NATIVELY INTEGRATION MARKER:
 * @natively-supabase-verification: active
 * @natively-connection-test: enabled
 */
export async function verifySupabaseConnection(): Promise<{
  connected: boolean;
  url: string;
  hasAnonKey: boolean;
  authConfigured: boolean;
  databaseAccessible: boolean;
  error?: string;
}> {
  console.log('[Supabase Connection] ═══════════════════════════════════════════════════');
  console.log('[Supabase Connection] 🔍 Starting verification...');
  console.log('[Supabase Connection] ═══════════════════════════════════════════════════');
  
  const result = {
    connected: false,
    url: SUPABASE_URL,
    hasAnonKey: !!SUPABASE_ANON_KEY,
    authConfigured: false,
    databaseAccessible: false,
    error: undefined as string | undefined,
  };

  try {
    // Check if URL and anon key are configured
    if (!SUPABASE_URL || SUPABASE_URL.includes('YOUR_PROJECT_REF')) {
      result.error = 'Supabase URL not configured in app.json';
      console.error('[Supabase Connection] ❌', result.error);
      return result;
    }
    console.log('[Supabase Connection] ✅ URL configured:', SUPABASE_URL);

    if (!SUPABASE_ANON_KEY || SUPABASE_ANON_KEY.includes('YOUR_SUPABASE_ANON_KEY')) {
      result.error = 'Supabase anon key not configured in app.json';
      console.error('[Supabase Connection] ❌', result.error);
      return result;
    }
    console.log('[Supabase Connection] ✅ Anon key configured');

    // Test auth configuration by checking session
    console.log('[Supabase Connection] 🔐 Testing auth configuration...');
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      result.error = `Auth error: ${sessionError.message}`;
      console.error('[Supabase Connection] ❌', result.error);
      return result;
    }
    
    result.authConfigured = true;
    console.log('[Supabase Connection] ✅ Auth configured successfully');

    // Test database access by querying wishlists table
    console.log('[Supabase Connection] 🗄️  Testing database access...');
    const { error: dbError } = await supabase
      .from('wishlists')
      .select('id')
      .limit(1);
    
    if (dbError) {
      // If error is about RLS, that's actually good - it means the table exists
      if (dbError.message.includes('row-level security') || dbError.message.includes('RLS')) {
        result.databaseAccessible = true;
        console.log('[Supabase Connection] ✅ Database accessible (RLS enabled)');
      } else {
        result.error = `Database error: ${dbError.message}`;
        console.error('[Supabase Connection] ❌', result.error);
        return result;
      }
    } else {
      result.databaseAccessible = true;
      console.log('[Supabase Connection] ✅ Database accessible');
    }

    result.connected = true;
    console.log('[Supabase Connection] ═══════════════════════════════════════════════════');
    console.log('[Supabase Connection] ✅✅✅ ALL CHECKS PASSED ✅✅✅');
    console.log('[Supabase Connection] ═══════════════════════════════════════════════════');
    console.log('[Supabase Connection] 🎉 SUPABASE FULLY CONNECTED TO NATIVELY');
    console.log('[Supabase Connection] ═══════════════════════════════════════════════════');
    
  } catch (error) {
    result.error = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Supabase Connection] ❌ Verification failed:', error);
  }

  return result;
}

/**
 * Get Supabase configuration details
 * 
 * NATIVELY INTEGRATION MARKER:
 * @natively-supabase-config: exported
 */
export function getSupabaseConfig() {
  const config = {
    url: SUPABASE_URL,
    hasAnonKey: !!SUPABASE_ANON_KEY,
    anonKeyPreview: SUPABASE_ANON_KEY ? `${SUPABASE_ANON_KEY.substring(0, 20)}...` : 'Not configured',
    connectionStatus: SUPABASE_CONNECTION_STATUS,
    nativelyIntegration: 'active',
    timestamp: new Date().toISOString(),
  };
  
  console.log('[Supabase Config] Configuration exported for Natively:', config);
  return config;
}

/**
 * Test Supabase Edge Functions
 * 
 * NATIVELY INTEGRATION MARKER:
 * @natively-edge-functions: testing
 */
export async function testEdgeFunctions() {
  console.log('[Supabase Connection] ═══════════════════════════════════════════════════');
  console.log('[Supabase Connection] 🧪 Testing Edge Functions...');
  console.log('[Supabase Connection] ═══════════════════════════════════════════════════');
  
  const results = {
    extractItem: false,
    findAlternatives: false,
    importWishlist: false,
    identifyFromImage: false,
  };

  try {
    // Test extract-item function with a simple request
    console.log('[Supabase Connection] Testing extract-item...');
    const { data: extractData, error: extractError } = await supabase.functions.invoke('extract-item', {
      body: { url: 'https://example.com' },
    });
    
    results.extractItem = !extractError;
    console.log('[Supabase Connection] extract-item:', results.extractItem ? '✅' : '❌', extractError?.message);

    // Test find-alternatives function
    console.log('[Supabase Connection] Testing find-alternatives...');
    const { data: altData, error: altError } = await supabase.functions.invoke('find-alternatives', {
      body: { title: 'Test Product' },
    });
    
    results.findAlternatives = !altError;
    console.log('[Supabase Connection] find-alternatives:', results.findAlternatives ? '✅' : '❌', altError?.message);

    // Test import-wishlist function
    console.log('[Supabase Connection] Testing import-wishlist...');
    const { data: importData, error: importError } = await supabase.functions.invoke('import-wishlist', {
      body: { wishlistUrl: 'https://example.com/wishlist' },
    });
    
    results.importWishlist = !importError;
    console.log('[Supabase Connection] import-wishlist:', results.importWishlist ? '✅' : '❌', importError?.message);

    // Test identify-from-image function
    console.log('[Supabase Connection] Testing identify-from-image...');
    const { data: identifyData, error: identifyError } = await supabase.functions.invoke('identify-from-image', {
      body: { imageUrl: 'https://example.com/image.jpg' },
    });
    
    results.identifyFromImage = !identifyError;
    console.log('[Supabase Connection] identify-from-image:', results.identifyFromImage ? '✅' : '❌', identifyError?.message);

    console.log('[Supabase Connection] ═══════════════════════════════════════════════════');
    console.log('[Supabase Connection] 🧪 Edge Functions Test Complete');
    console.log('[Supabase Connection] ═══════════════════════════════════════════════════');

  } catch (error) {
    console.error('[Supabase Connection] ❌ Edge function test failed:', error);
  }

  return results;
}

// Export connection status for Natively detection
export { SUPABASE_CONNECTION_STATUS };
