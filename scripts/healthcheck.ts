
/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🏥 PRE-BUILD HEALTH CHECK SCRIPT
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * This script runs before builds to verify:
 * 1. Required environment variables are configured
 * 2. Supabase Edge Functions are accessible
 * 3. All critical endpoints respond correctly
 * 
 * Exits with code 1 if any check fails, preventing broken builds.
 */

import 'dotenv/config';

// Load app.config.js to get extra config
const loadAppConfig = async () => {
  try {
    // Dynamic import for ES modules
    const configModule = await import('../app.config.js');
    const config = typeof configModule.default === 'function' 
      ? configModule.default({ config: { extra: {} } })
      : configModule.default;
    return config.extra || {};
  } catch (error) {
    console.error('⚠️  Failed to load app.config.js:', error);
    return {};
  }
};

interface HealthCheckResult {
  passed: boolean;
  errors: string[];
}

async function runHealthCheck(): Promise<HealthCheckResult> {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('🚀 PRE-BUILD HEALTH CHECK');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const errors: string[] = [];

  // Load configuration
  const extraConfig = await loadAppConfig();

  // Get environment variables
  const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || extraConfig.supabaseUrl;
  const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || extraConfig.supabaseAnonKey;
  const SUPABASE_EDGE_FUNCTIONS_URL = process.env.EXPO_PUBLIC_SUPABASE_EDGE_FUNCTIONS_URL || extraConfig.supabaseEdgeFunctionsUrl;

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. VERIFY REQUIRED ENVIRONMENT VARIABLES
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('📋 Step 1: Verifying Environment Variables\n');

  if (!SUPABASE_URL || !SUPABASE_URL.startsWith('https://')) {
    errors.push('EXPO_PUBLIC_SUPABASE_URL is missing or invalid. Must be a valid HTTPS URL.');
    console.error('  ❌ SUPABASE_URL: Missing or invalid');
  } else {
    console.log(`  ✅ SUPABASE_URL: ${SUPABASE_URL}`);
  }

  if (!SUPABASE_ANON_KEY) {
    errors.push('EXPO_PUBLIC_SUPABASE_ANON_KEY is missing.');
    console.error('  ❌ SUPABASE_ANON_KEY: Missing');
  } else {
    console.log(`  ✅ SUPABASE_ANON_KEY: Configured (${SUPABASE_ANON_KEY.substring(0, 20)}...)`);
  }

  if (!SUPABASE_EDGE_FUNCTIONS_URL || !SUPABASE_EDGE_FUNCTIONS_URL.startsWith('https://')) {
    errors.push('EXPO_PUBLIC_SUPABASE_EDGE_FUNCTIONS_URL is missing or invalid. Must be a valid HTTPS URL.');
    console.error('  ❌ SUPABASE_EDGE_FUNCTIONS_URL: Missing or invalid');
  } else {
    console.log(`  ✅ SUPABASE_EDGE_FUNCTIONS_URL: ${SUPABASE_EDGE_FUNCTIONS_URL}`);
  }

  // If environment variables are missing, stop here
  if (errors.length > 0) {
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.error('❌ ENVIRONMENT VARIABLE CHECK FAILED\n');
    errors.forEach(err => console.error(`  • ${err}`));
    console.log('═══════════════════════════════════════════════════════════════\n');
    return { passed: false, errors };
  }

  console.log('\n✅ All environment variables are configured correctly.\n');

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. CHECK SUPABASE EDGE FUNCTIONS ENDPOINTS
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('🌐 Step 2: Testing Supabase Edge Functions\n');

  const headers = {
    'apikey': SUPABASE_ANON_KEY!,
    'Authorization': `Bearer ${SUPABASE_ANON_KEY!}`,
    'Content-Type': 'application/json',
  };

  const checkEndpoint = async (
    name: string,
    path: string,
    method: string = 'GET',
    body?: any
  ): Promise<boolean> => {
    try {
      const fullUrl = `${SUPABASE_EDGE_FUNCTIONS_URL}${path}`;
      console.log(`  🔍 Testing ${method} ${name}...`);
      console.log(`     URL: ${fullUrl}`);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const response = await fetch(fullUrl, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // For health endpoint, any 2xx is acceptable
      // For authenticated endpoints, 401 is acceptable (no real user session in health check)
      const acceptableStatuses = [200, 201, 401];
      
      if (!acceptableStatuses.includes(response.status)) {
        const errorText = await response.text();
        const errorPreview = errorText.substring(0, 200);
        errors.push(`${name} returned status ${response.status}: ${errorPreview}`);
        console.error(`     ❌ Status: ${response.status}`);
        console.error(`     Response: ${errorPreview}${errorPreview.length >= 200 ? '...' : ''}`);
        return false;
      }

      console.log(`     ✅ Status: ${response.status} OK`);
      return true;
    } catch (e: any) {
      if (e.name === 'AbortError') {
        errors.push(`${name} timed out after 10 seconds`);
        console.error(`     ❌ Timeout: Request took longer than 10 seconds`);
      } else {
        errors.push(`${name} failed: ${e.message}`);
        console.error(`     ❌ Error: ${e.message}`);
      }
      return false;
    }
  };

  // Test health endpoint (public, no auth required)
  await checkEndpoint('Health Check', '/health', 'GET');

  // Test authenticated endpoints (401 is acceptable since we don't have a real user session)
  await checkEndpoint('Users Location (GET)', '/users-location', 'GET');
  
  // Test location search with sample data
  await checkEndpoint(
    'Location Search Cities (POST)',
    '/location-search-cities',
    'POST',
    { query: 'amman', countryCode: 'JO' }
  );

  await checkEndpoint('Alert Settings (GET)', '/alert-settings', 'GET');
  await checkEndpoint('Alert Items with Targets (GET)', '/alert-items-with-targets', 'GET');

  console.log('\n═══════════════════════════════════════════════════════════════');

  if (errors.length > 0) {
    console.error('❌ SUPABASE EDGE FUNCTION HEALTH CHECK FAILED\n');
    errors.forEach(err => console.error(`  • ${err}`));
    console.log('═══════════════════════════════════════════════════════════════\n');
    return { passed: false, errors };
  }

  console.log('✅ ALL HEALTH CHECKS PASSED!\n');
  console.log('═══════════════════════════════════════════════════════════════\n');
  return { passed: true, errors: [] };
}

// Run health check and exit with appropriate code
runHealthCheck()
  .then(result => {
    if (result.passed) {
      process.exit(0);
    } else {
      console.error('\n🚨 BUILD BLOCKED: Health check failed. Fix the errors above before building.\n');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('\n🚨 UNEXPECTED ERROR during health check:', error);
    process.exit(1);
  });
