
import Constants from 'expo-constants';
import { Platform } from 'react-native';

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🔒 ENVIRONMENT CONFIGURATION - ROBUST API BASE URL HANDLING
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * This module provides centralized environment variable management with:
 * - Runtime validation of required environment variables
 * - Graceful error handling for missing configuration
 * - Consistent behavior across dev, preview, and production builds
 * - Clear diagnostic logging for debugging
 */

export interface EnvConfig {
  API_BASE_URL: string;
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
 * Normalize API base URL:
 * - Remove trailing slashes
 * - Validate URL format
 * - Return empty string if invalid
 */
function normalizeBaseUrl(url: string): string {
  if (!url) return '';
  
  // Remove trailing slashes
  let normalized = url.replace(/\/+$/, '');
  
  // Validate URL format
  try {
    new URL(normalized);
    return normalized;
  } catch {
    console.error('[ENV] Invalid URL format:', url);
    return '';
  }
}

/**
 * Load and normalize environment configuration
 */
export const ENV: EnvConfig = {
  API_BASE_URL: normalizeBaseUrl(getEnvVar('backendUrl')),
  SUPABASE_URL: normalizeBaseUrl(getEnvVar('supabaseUrl')),
  SUPABASE_ANON_KEY: getEnvVar('supabaseAnonKey'),
  SUPABASE_EDGE_FUNCTIONS_URL: normalizeBaseUrl(
    getEnvVar('supabaseEdgeFunctionsUrl') || getEnvVar('supabaseUrl')
  ),
};

/**
 * Validate environment configuration at runtime
 * Returns error message if validation fails, null if all checks pass
 */
export function validateEnv(): string | null {
  const missing: string[] = [];
  const invalid: string[] = [];
  
  // Check required variables
  if (!ENV.API_BASE_URL) {
    missing.push('EXPO_PUBLIC_API_BASE_URL (backendUrl in app.config.js)');
  }
  
  if (!ENV.SUPABASE_URL) {
    missing.push('EXPO_PUBLIC_SUPABASE_URL (supabaseUrl in app.config.js)');
  }
  
  if (!ENV.SUPABASE_ANON_KEY) {
    missing.push('EXPO_PUBLIC_SUPABASE_ANON_KEY (supabaseAnonKey in app.config.js)');
  }
  
  // Validate URL formats
  if (ENV.API_BASE_URL && !ENV.API_BASE_URL.startsWith('http')) {
    invalid.push('API_BASE_URL must start with http:// or https://');
  }
  
  if (ENV.SUPABASE_URL && !ENV.SUPABASE_URL.includes('supabase.co')) {
    invalid.push('SUPABASE_URL must be a valid Supabase URL');
  }
  
  // Build error message
  if (missing.length > 0 || invalid.length > 0) {
    const errors: string[] = [];
    
    if (missing.length > 0) {
      errors.push(`Missing required environment variables:\n${missing.map(m => `  • ${m}`).join('\n')}`);
    }
    
    if (invalid.length > 0) {
      errors.push(`Invalid configuration:\n${invalid.map(i => `  • ${i}`).join('\n')}`);
    }
    
    return errors.join('\n\n');
  }
  
  return null;
}

/**
 * Get user-friendly error message for missing configuration
 */
export function getConfigurationErrorMessage(): string {
  const validationError = validateEnv();
  
  if (!validationError) {
    return '';
  }
  
  if (__DEV__) {
    // In development, show detailed error
    return `App configuration error:\n\n${validationError}\n\nPlease check your app.config.js file.`;
  } else {
    // In production, show user-friendly message
    return 'App configuration is missing. Please contact support or reinstall the app.';
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
  console.log('📡 API Configuration:');
  console.log(`  API Base URL: ${ENV.API_BASE_URL || '❌ NOT CONFIGURED'}`);
  console.log(`  Supabase URL: ${ENV.SUPABASE_URL || '❌ NOT CONFIGURED'}`);
  console.log(`  Supabase Key: ${ENV.SUPABASE_ANON_KEY ? '✅ Configured' : '❌ NOT CONFIGURED'}`);
  console.log('═══════════════════════════════════════════════════');
  
  const validationError = validateEnv();
  if (validationError) {
    console.error('❌ CONFIGURATION ERRORS:');
    console.error(validationError);
    console.log('═══════════════════════════════════════════════════');
  } else {
    console.log('✅ All environment variables configured correctly');
    console.log('═══════════════════════════════════════════════════');
  }
}

// Log configuration on module load
logEnvironmentConfig();
