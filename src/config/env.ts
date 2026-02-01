
import Constants from 'expo-constants';
import { Platform } from 'react-native';

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🔒 ENVIRONMENT CONFIGURATION - SINGLE SOURCE OF TRUTH
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * This module provides centralized environment variable management with:
 * - Runtime validation of required environment variables
 * - Graceful error handling for missing configuration
 * - Consistent behavior across dev, preview, and production builds
 * - Clear diagnostic logging for debugging
 * - Supabase Edge Functions as primary API
 */

export interface EnvConfig {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  SUPABASE_EDGE_FUNCTIONS_URL: string;
}

/**
 * Safely get environment variable from app.config.js extra section
 */
function getEnvVar(key: string): string {
  const extra = Constants.expoConfig?.extra || {};
  const value = extra[key];
  
  if (value && typeof value === 'string') {
    return value.trim();
  }
  
  return '';
}

/**
 * Normalize URL:
 * - Remove trailing slashes
 * - Validate URL format
 * - Return empty string if invalid
 */
function normalizeUrl(url: string): string {
  if (!url) return '';
  
  // Remove trailing slashes
  let normalized = url.replace(/\/+$/, '');
  
  // Validate URL format
  try {
    new URL(normalized);
    return normalized;
  } catch {
    if (__DEV__) {
      console.error('[ENV] Invalid URL format:', url);
    }
    return '';
  }
}

/**
 * Load and normalize environment configuration
 */
export const ENV: EnvConfig = {
  SUPABASE_URL: normalizeUrl(getEnvVar('supabaseUrl')),
  SUPABASE_ANON_KEY: getEnvVar('supabaseAnonKey'),
  SUPABASE_EDGE_FUNCTIONS_URL: normalizeUrl(
    getEnvVar('supabaseEdgeFunctionsUrl') || 
    (getEnvVar('supabaseUrl') ? `${normalizeUrl(getEnvVar('supabaseUrl'))}/functions/v1` : '')
  ),
};

/**
 * Validate environment configuration at runtime
 * Returns array of missing keys, empty array if all checks pass
 */
export function validateEnv(): string[] {
  const missing: string[] = [];
  
  // Check required variables
  if (!ENV.SUPABASE_URL) {
    missing.push('SUPABASE_URL');
  }
  
  if (!ENV.SUPABASE_ANON_KEY) {
    missing.push('SUPABASE_ANON_KEY');
  }
  
  if (!ENV.SUPABASE_EDGE_FUNCTIONS_URL) {
    missing.push('SUPABASE_EDGE_FUNCTIONS_URL');
  }
  
  // Validate URL formats
  if (ENV.SUPABASE_URL && !ENV.SUPABASE_URL.includes('supabase.co')) {
    missing.push('SUPABASE_URL (invalid format - must be a Supabase URL)');
  }
  
  return missing;
}

/**
 * Get user-friendly error message for missing configuration
 */
export function getConfigurationErrorMessage(missingKeys: string[]): string {
  if (missingKeys.length === 0) {
    return '';
  }
  
  if (__DEV__) {
    // In development, show detailed error
    return `Missing environment variables:\n\n${missingKeys.map(k => `• ${k}`).join('\n')}\n\nPlease check your app.config.js file and ensure these variables are set in the extra section.`;
  } else {
    // In production, show user-friendly message
    return 'App configuration is missing. Please reinstall the app or contact support.';
  }
}

/**
 * Log environment configuration on app start
 */
export function logEnvironmentConfig(): void {
  console.log('═══════════════════════════════════════════════════');
  console.log('🌍 ENVIRONMENT CONFIGURATION');
  console.log('═══════════════════════════════════════════════════');
  console.log(`Platform: ${Platform.OS}`);
  console.log(`Build Type: ${__DEV__ ? 'Development' : 'Production'}`);
  console.log('═══════════════════════════════════════════════════');
  console.log('📡 Supabase Configuration:');
  console.log(`  URL: ${ENV.SUPABASE_URL || '❌ NOT CONFIGURED'}`);
  console.log(`  Anon Key: ${ENV.SUPABASE_ANON_KEY ? '✅ Configured' : '❌ NOT CONFIGURED'}`);
  console.log(`  Edge Functions URL: ${ENV.SUPABASE_EDGE_FUNCTIONS_URL || '❌ NOT CONFIGURED'}`);
  console.log('═══════════════════════════════════════════════════');
  
  const missingKeys = validateEnv();
  if (missingKeys.length > 0) {
    console.error('❌ CONFIGURATION ERRORS:');
    missingKeys.forEach(key => console.error(`  • ${key}`));
    console.log('═══════════════════════════════════════════════════');
  } else {
    console.log('✅ All environment variables configured correctly');
    console.log('═══════════════════════════════════════════════════');
  }
}

// Log configuration on module load
if (__DEV__) {
  logEnvironmentConfig();
}
