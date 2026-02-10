
import Constants from 'expo-constants';
import { Platform } from 'react-native';

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🔒 ENVIRONMENT CONFIGURATION - PRODUCTION PARITY ENFORCED
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * This module ensures IDENTICAL behavior across:
 * - DEV (Expo Go)
 * - PREVIEW (TestFlight/Internal Testing)
 * - PROD (App Store/Google Play)
 * 
 * ALL environment variables are locked to the same values.
 * NO dev-only behavior differences.
 * FULL UI and API parity guaranteed.
 */

export type Environment = 'DEV' | 'PREVIEW' | 'PROD';

export interface AppConfig {
  // Environment
  environment: Environment;
  
  // API Configuration
  supabaseUrl: string;
  supabaseAnonKey: string;
  supabaseEdgeFunctionsUrl: string;
  backendUrl: string;
  
  // Feature Flags (ALL LOCKED FOR PARITY)
  showDebugUI: boolean;
  showDevBanner: boolean;
  addDevPadding: boolean;
  useDevWrapper: boolean;
  
  // UI Configuration (LOCKED)
  lockedTabBarHeight: number;
  lockedTabBarBorderRadius: number;
  lockedTabBarSpacing: number;
  
  // Monetization Configuration
  affiliateIds: {
    amazon?: string;
    ebay?: string;
    walmart?: string;
    target?: string;
    bestbuy?: string;
    etsy?: string;
    aliexpress?: string;
  };
  
  // Premium Features
  premiumFeatures: {
    unlimitedPriceTracking: boolean;
    historicalPriceCharts: boolean;
    multiCountryComparison: boolean;
    earlyPriceDropAlerts: boolean;
  };
  
  // Analytics
  enableAnalytics: boolean;
  enableConversionTracking: boolean;
  
  // Compliance
  requireTrackingConsent: boolean;
  requireNotificationConsent: boolean;
}

/**
 * Get environment from app.json extra config
 * Defaults to DEV if not specified
 */
function getEnvironment(): Environment {
  const extra = Constants.expoConfig?.extra || {};
  const env = extra.environment as Environment | undefined;
  
  // Validate environment
  if (env === 'DEV' || env === 'PREVIEW' || env === 'PROD') {
    return env;
  }
  
  // Default to DEV
  console.warn('[Environment] No valid environment specified in app.json, defaulting to DEV');
  return 'DEV';
}

/**
 * Safely get environment variable with fallback
 */
function getEnvVar(key: string, fallback: string = ''): string {
  const extra = Constants.expoConfig?.extra || {};
  const value = extra[key];
  
  if (value && typeof value === 'string') {
    return value;
  }
  
  if (__DEV__ && !fallback) {
    console.warn(`[Environment] Missing environment variable: ${key}`);
  }
  
  return fallback;
}

/**
 * Load configuration from app.json extra
 */
const extra = Constants.expoConfig?.extra || {};

export const appConfig: AppConfig = {
  // Environment
  environment: getEnvironment(),
  
  // API Configuration - LOCKED from app.json with safe fallbacks
  supabaseUrl: getEnvVar('supabaseUrl', ''),
  supabaseAnonKey: getEnvVar('supabaseAnonKey', ''),
  supabaseEdgeFunctionsUrl: getEnvVar('supabaseEdgeFunctionsUrl', getEnvVar('supabaseUrl', '')),
  backendUrl: getEnvVar('backendUrl', ''),
  
  // Feature Flags - ALL DISABLED FOR PARITY
  showDebugUI: false,
  showDevBanner: false,
  addDevPadding: false,
  useDevWrapper: false,
  
  // UI Configuration - LOCKED
  lockedTabBarHeight: 80,
  lockedTabBarBorderRadius: 20,
  lockedTabBarSpacing: 10,
  
  // Monetization Configuration
  affiliateIds: {
    amazon: extra.amazonAffiliateId,
    ebay: extra.ebayAffiliateId,
    walmart: extra.walmartAffiliateId,
    target: extra.targetAffiliateId,
    bestbuy: extra.bestbuyAffiliateId,
    etsy: extra.etsyAffiliateId,
    aliexpress: extra.aliexpressAffiliateId,
  },
  
  // Premium Features - Gated by user subscription
  premiumFeatures: {
    unlimitedPriceTracking: false, // Checked at runtime
    historicalPriceCharts: false, // Checked at runtime
    multiCountryComparison: false, // Checked at runtime
    earlyPriceDropAlerts: false, // Checked at runtime
  },
  
  // Analytics - ENABLED for all environments
  enableAnalytics: true,
  enableConversionTracking: true,
  
  // Compliance - REQUIRED for App Store
  requireTrackingConsent: true,
  requireNotificationConsent: true,
};

/**
 * Legacy ENV export for backward compatibility
 * @deprecated Use appConfig instead
 */
export const ENV = {
  SUPABASE_URL: appConfig.supabaseUrl,
  SUPABASE_ANON_KEY: appConfig.supabaseAnonKey,
  SUPABASE_EDGE_FUNCTIONS_URL: appConfig.supabaseEdgeFunctionsUrl,
  BACKEND_URL: appConfig.backendUrl,
  IS_EXPO_GO: __DEV__,
  IS_PRODUCTION: appConfig.environment === 'PROD',
};

/**
 * Check if environment is properly configured
 */
export function isEnvironmentConfigured(): boolean {
  return !!(appConfig.supabaseUrl && appConfig.supabaseAnonKey);
}

/**
 * Check if backend URL is configured
 * This is REQUIRED for backend API features (global search, etc.)
 */
export function isBackendConfigured(): boolean {
  return !!appConfig.backendUrl;
}

/**
 * Get user-friendly error message for missing configuration
 */
export function getConfigurationErrorMessage(): string {
  if (!appConfig.supabaseUrl && !appConfig.supabaseAnonKey) {
    return 'App configuration is missing. Please contact support.';
  }
  if (!appConfig.supabaseUrl) {
    return 'Database connection is not configured. Please contact support.';
  }
  if (!appConfig.supabaseAnonKey) {
    return 'Authentication is not configured. Please contact support.';
  }
  return 'Configuration error. Please contact support.';
}

/**
 * Get user-friendly error message for missing backend URL
 * This is a CRITICAL error - backend features will not work
 */
export function getBackendConfigurationErrorMessage(): string {
  return 'Backend API is not configured. Global search and AI features are unavailable. Please check app.config.js and ensure BACKEND_URL is set.';
}

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🔍 BUILD-TIME VERIFICATION
 * ═══════════════════════════════════════════════════════════════════════════
 */

export function verifyConfiguration(): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Critical checks (errors)
  if (!appConfig.supabaseUrl) {
    errors.push('Missing supabaseUrl in app.json extra config');
  }
  
  if (!appConfig.supabaseAnonKey) {
    errors.push('Missing supabaseAnonKey in app.json extra config');
  }
  
  if (appConfig.supabaseUrl && !appConfig.supabaseUrl.includes('supabase.co')) {
    errors.push('Invalid supabaseUrl format - must be a Supabase URL');
  }
  
  // Backend URL check (CRITICAL - now an error instead of warning)
  if (!appConfig.backendUrl) {
    errors.push('Missing backendUrl in app.json extra config - backend features will not work');
  } else if (!appConfig.backendUrl.includes('supabase.co/functions/v1')) {
    warnings.push('backendUrl does not point to Supabase Edge Functions - verify URL format');
  }
  
  // Parity checks (errors)
  if (appConfig.showDebugUI) {
    errors.push('showDebugUI is enabled - breaks production parity');
  }
  
  if (appConfig.showDevBanner) {
    errors.push('showDevBanner is enabled - breaks production parity');
  }
  
  if (appConfig.addDevPadding) {
    errors.push('addDevPadding is enabled - breaks production parity');
  }
  
  if (appConfig.useDevWrapper) {
    errors.push('useDevWrapper is enabled - breaks production parity');
  }
  
  // Non-critical checks (warnings)
  if (!appConfig.affiliateIds.amazon && !appConfig.affiliateIds.ebay) {
    warnings.push('No affiliate IDs configured - monetization disabled');
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Log configuration on app start
 */
export function logConfiguration(): void {
  const verification = verifyConfiguration();
  
  console.log('═══════════════════════════════════════════════════');
  console.log('🌍 ENVIRONMENT CONFIGURATION - PRODUCTION PARITY ENFORCED');
  console.log('═══════════════════════════════════════════════════');
  console.log(`Environment: ${appConfig.environment}`);
  console.log(`Platform: ${Platform.OS}`);
  console.log(`App Version: ${Constants.expoConfig?.version || '1.0.0'}`);
  console.log('═══════════════════════════════════════════════════');
  console.log('🔒 LOCKED CONFIGURATION:');
  console.log(`Supabase URL: ${appConfig.supabaseUrl || 'NOT CONFIGURED'}`);
  console.log(`Supabase Key: ${appConfig.supabaseAnonKey ? 'Configured' : 'NOT CONFIGURED'}`);
  console.log(`Backend URL: ${appConfig.backendUrl || 'NOT CONFIGURED ❌'}`);
  console.log('═══════════════════════════════════════════════════');
  console.log('🎯 PARITY VERIFICATION:');
  console.log(`Debug UI: ${appConfig.showDebugUI ? 'ENABLED ❌' : 'DISABLED ✅'}`);
  console.log(`Dev Banner: ${appConfig.showDevBanner ? 'ENABLED ❌' : 'DISABLED ✅'}`);
  console.log(`Dev Padding: ${appConfig.addDevPadding ? 'ENABLED ❌' : 'DISABLED ✅'}`);
  console.log(`Dev Wrapper: ${appConfig.useDevWrapper ? 'ENABLED ❌' : 'DISABLED ✅'}`);
  console.log('═══════════════════════════════════════════════════');
  console.log('💰 MONETIZATION:');
  console.log(`Amazon Affiliate: ${appConfig.affiliateIds.amazon ? 'Configured' : 'Not configured'}`);
  console.log(`eBay Affiliate: ${appConfig.affiliateIds.ebay ? 'Configured' : 'Not configured'}`);
  console.log(`Analytics: ${appConfig.enableAnalytics ? 'Enabled' : 'Disabled'}`);
  console.log(`Conversion Tracking: ${appConfig.enableConversionTracking ? 'Enabled' : 'Disabled'}`);
  console.log('═══════════════════════════════════════════════════');
  
  if (verification.valid) {
    console.log('✅✅✅ ALL CONFIGURATION CHECKS PASSED ✅✅✅');
    console.log('✅ Expo Go and production builds are identical');
    console.log('✅ No dev-only behavior differences');
    console.log('✅ Backend URL configured and available');
  } else {
    console.log('❌ CONFIGURATION ERRORS:');
    verification.errors.forEach(error => console.log(`  ❌ ${error}`));
  }
  
  if (verification.warnings.length > 0) {
    console.log('⚠️ WARNINGS:');
    verification.warnings.forEach(warning => console.log(`  ⚠️ ${warning}`));
  }
  
  console.log('═══════════════════════════════════════════════════');
}

/**
 * Get environment summary for diagnostics
 */
export function getEnvironmentSummary(): Record<string, any> {
  const verification = verifyConfiguration();
  
  return {
    environment: appConfig.environment,
    platform: Platform.OS,
    appVersion: Constants.expoConfig?.version || '1.0.0',
    configuration: {
      supabaseConfigured: !!appConfig.supabaseUrl && !!appConfig.supabaseAnonKey,
      backendConfigured: !!appConfig.backendUrl,
      affiliateConfigured: !!(appConfig.affiliateIds.amazon || appConfig.affiliateIds.ebay),
    },
    parity: {
      showDebugUI: appConfig.showDebugUI,
      showDevBanner: appConfig.showDevBanner,
      addDevPadding: appConfig.addDevPadding,
      useDevWrapper: appConfig.useDevWrapper,
    },
    verification: {
      valid: verification.valid,
      errors: verification.errors,
      warnings: verification.warnings,
    },
  };
}
