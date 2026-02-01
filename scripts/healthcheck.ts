
/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🏥 PRE-BUILD HEALTH CHECK
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * This script verifies that all required environment variables are configured
 * and that Supabase Edge Functions are reachable before building the app.
 * 
 * Run this script before deploying to catch configuration issues early.
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import { execSync } from 'child_process';

// Load environment variables from .env file
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const SUPABASE_EDGE_FUNCTIONS_URL = process.env.EXPO_PUBLIC_SUPABASE_EDGE_FUNCTIONS_URL || process.env.SUPABASE_EDGE_FUNCTIONS_URL || SUPABASE_URL;

console.log('═══════════════════════════════════════════════════');
console.log('🏥 PRE-BUILD HEALTH CHECK');
console.log('═══════════════════════════════════════════════════\n');

let hasErrors = false;

// 1. Validate environment variables
console.log('📋 Step 1: Validating environment variables...\n');

const requiredVars = [
  { name: 'SUPABASE_URL', value: SUPABASE_URL },
  { name: 'SUPABASE_ANON_KEY', value: SUPABASE_ANON_KEY },
  { name: 'SUPABASE_EDGE_FUNCTIONS_URL', value: SUPABASE_EDGE_FUNCTIONS_URL },
];

for (const { name, value } of requiredVars) {
  if (!value) {
    console.error(`  ❌ ${name} is not set`);
    hasErrors = true;
  } else {
    console.log(`  ✅ ${name} is configured`);
  }
}

if (hasErrors) {
  console.error('\n❌ Environment variable check failed.');
  console.error('Please set the required variables in your .env file or environment.\n');
  process.exit(1);
}

console.log('\n✅ All environment variables are configured.\n');

// 2. Check Supabase REST API
console.log('📋 Step 2: Checking Supabase REST API...\n');

try {
  const command = `curl -s -o /dev/null -w "%{http_code}" -H "apikey: ${SUPABASE_ANON_KEY}" "${SUPABASE_URL}/rest/v1/"`;
  const httpCode = execSync(command, { stdio: 'pipe', timeout: 10000 }).toString().trim();
  
  if (httpCode === '200' || httpCode === '401') {
    console.log(`  ✅ Supabase REST API is reachable (HTTP ${httpCode})\n`);
  } else {
    console.error(`  ❌ Supabase REST API returned unexpected status: ${httpCode}\n`);
    hasErrors = true;
  }
} catch (error: any) {
  console.error(`  ❌ Failed to reach Supabase REST API: ${error.message}\n`);
  hasErrors = true;
}

// 3. Check Supabase Edge Functions
console.log('📋 Step 3: Checking Supabase Edge Functions...\n');

const edgeFunctions = [
  { name: 'health', method: 'GET', requiresAuth: false },
  { name: 'users-location', method: 'GET', requiresAuth: true },
  { name: 'location-search-cities', method: 'POST', body: '{"query":"amman","countryCode":"JO"}', requiresAuth: false },
  { name: 'alert-settings', method: 'GET', requiresAuth: true },
];

for (const func of edgeFunctions) {
  try {
    const url = `${SUPABASE_EDGE_FUNCTIONS_URL}/functions/v1/${func.name}`;
    let command: string;
    
    if (func.method === 'POST' && func.body) {
      command = `curl -s -o /dev/null -w "%{http_code}" -X POST -H "Content-Type: application/json" -H "apikey: ${SUPABASE_ANON_KEY}" -d '${func.body}' "${url}"`;
    } else {
      command = `curl -s -o /dev/null -w "%{http_code}" -H "apikey: ${SUPABASE_ANON_KEY}" "${url}"`;
    }
    
    const httpCode = execSync(command, { stdio: 'pipe', timeout: 10000 }).toString().trim();
    
    // 200 = success, 401 = requires auth (expected for protected functions)
    if (httpCode === '200' || (httpCode === '401' && func.requiresAuth)) {
      console.log(`  ✅ Edge Function '${func.name}' is reachable (HTTP ${httpCode})`);
    } else {
      console.error(`  ❌ Edge Function '${func.name}' returned unexpected status: ${httpCode}`);
      hasErrors = true;
    }
  } catch (error: any) {
    console.error(`  ❌ Failed to reach Edge Function '${func.name}': ${error.message}`);
    hasErrors = true;
  }
}

console.log('');

// Final result
if (hasErrors) {
  console.error('═══════════════════════════════════════════════════');
  console.error('❌ HEALTH CHECK FAILED');
  console.error('═══════════════════════════════════════════════════');
  console.error('Please fix the errors above before building the app.\n');
  process.exit(1);
} else {
  console.log('═══════════════════════════════════════════════════');
  console.log('✅ HEALTH CHECK PASSED');
  console.log('═══════════════════════════════════════════════════');
  console.log('All systems are operational. Ready to build!\n');
  process.exit(0);
}
