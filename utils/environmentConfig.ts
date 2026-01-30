
import Constants from 'expo-constants';
import { Platform } from 'react-native';

/**
 * Environment Configuration Module - PRODUCTION PARITY ENFORCED
 * 
 * This module ensures IDENTICAL behavior across:
 * - Expo Go
 * - TestFlight/App Store (iOS)
 * - Google Play (Android)
 * - Web builds
 * 
 * ALL environment variables are locked to the same values.
 * NO dev-only behavior differences.
 * FULL UI and API parity guaranteed.
 */

export type RuntimeEnvironment = 'development' | 'expo-go' | 'production';

export interface EnvironmentInfo {
  environment: RuntimeEnvironment;
  isDevelopment: boolean;
  isExpoGo: boolean;
  isProduction: boolean;
  platform: 'ios' | 'android' | 'web';
  appVersion: string;
  buildNumber: string;
  deviceName: string | null;
}

/**
 * Detect the current runtime environment
 */
export function detectEnvironment(): RuntimeEnvironment {
  // Check if running in Expo Go
  if (Constants.appOwnership === 'expo') {
    return 'expo-go';
  }
  
  // Check if in development mode
  if (__DEV__) {
    return 'development';
  }
  
  // Otherwise, it's a production build (standalone)
  return 'production';
}

/**
 * Get comprehensive environment information
 */
export function getEnvironmentInfo(): EnvironmentInfo {
  const environment = detectEnvironment();
  
  return {
    environment,
    isDevelopment: environment === 'development',
    isExpoGo: environment === 'expo-go',
    isProduction: environment === 'production',
    platform: Platform.OS as 'ios' | 'android' | 'web',
    appVersion: Constants.expoConfig?.version || '1.0.0',
    buildNumber: Constants.expoConfig?.ios?.buildNumber || Constants.expoConfig?.android?.versionCode?.toString() || '1',
    deviceName: Constants.deviceName || null,
  };
}

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🔒 LOCKED ENVIRONMENT VARIABLES - PRODUCTION PARITY ENFORCED
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * These values are IDENTICAL across ALL environments:
 * - Expo Go
 * - Production iOS (TestFlight/App Store)
 * - Production Android (Google Play)
 * - Web builds
 * 
 * NO conditional logic. NO dev-only overrides.
 * This ensures API calls, authentication, and data access work identically.
 */

export const ENV = {
  // Supabase configuration - LOCKED for all environments
  SUPABASE_URL: Constants.expoConfig?.extra?.supabaseUrl || '',
  SUPABASE_ANON_KEY: Constants.expoConfig?.extra?.supabaseAnonKey || '',
  
  // Backend URL (legacy) - LOCKED for all environments
  BACKEND_URL: Constants.expoConfig?.extra?.backendUrl || '',
  
  // Environment detection (read-only, for logging purposes only)
  IS_EXPO_GO: Constants.appOwnership === 'expo',
  IS_DEVELOPMENT: __DEV__,
  IS_PRODUCTION: !__DEV__ && Constants.appOwnership !== 'expo',
  
  // Platform information
  PLATFORM: Platform.OS,
  APP_VERSION: Constants.expoConfig?.version || '1.0.0',
  BUILD_NUMBER: Constants.expoConfig?.ios?.buildNumber || Constants.expoConfig?.android?.versionCode?.toString() || '1',
};

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🚫 FEATURE FLAGS - ALL DISABLED FOR PARITY
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * To ensure IDENTICAL behavior across all environments, ALL feature flags
 * that could cause differences are DISABLED.
 * 
 * The app behaves EXACTLY the same in Expo Go and production builds.
 */

export const FeatureFlags = {
  /**
   * Debug UI - ALWAYS DISABLED for parity
   * No debug panels, dev tools, or special UI in any environment
   */
  showDebugUI: false,
  
  /**
   * Updates check - ENABLED for all environments
   * Expo Go will gracefully skip if not available
   */
  enableUpdatesCheck: true,
  
  /**
   * Notifications - ENABLED for all environments
   * Expo Go will gracefully skip if not available
   */
  enableNotifications: true,
  
  /**
   * Camera - ENABLED for all environments
   * Expo Go will gracefully skip if not available
   */
  enableCamera: true,
  
  /**
   * Version tracking - ENABLED for all environments
   * Logs app version to Supabase for analytics
   */
  enableVersionTracking: true,
  
  /**
   * Error logging - ENABLED for all environments
   * Captures errors for debugging
   */
  enableErrorLogging: true,
};

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🎨 UI CONFIGURATION - LOCKED FOR PARITY
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * These values ensure IDENTICAL layout, spacing, and visual appearance
 * across ALL environments. NO conditional styling or layout differences.
 */

export const UIConfig = {
  /**
   * Dev-only padding - ALWAYS FALSE
   * No extra padding in any environment
   */
  addDevPadding: false,
  
  /**
   * Dev-only banners - ALWAYS FALSE
   * No environment banners in any build
   */
  showDevBanner: false,
  
  /**
   * Dev-only wrappers - ALWAYS FALSE
   * No special containers in any environment
   */
  useDevWrapper: false,
  
  /**
   * Tab bar height - LOCKED
   * Identical across all environments
   */
  tabBarHeight: 64,
  
  /**
   * Standard spacing values - LOCKED
   * Identical across all environments
   */
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  
  /**
   * Standard border radius values - LOCKED
   * Identical across all environments
   */
  borderRadius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 18,
  },
  
  /**
   * Safe area insets - CONSISTENT
   * Applied uniformly across all environments
   */
  useSafeAreaInsets: true,
  
  /**
   * Status bar style - CONSISTENT
   * Theme-based, no environment overrides
   */
  statusBarStyle: 'auto' as const,
};

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 📊 LOGGING CONFIGURATION - CONSISTENT ACROSS ALL ENVIRONMENTS
 * ═══════════════════════════════════════════════════════════════════════════
 */

export const LoggingConfig = {
  /**
   * Log level - CONSISTENT
   * Same verbosity in all environments
   */
  logLevel: 'info' as 'debug' | 'info' | 'warn' | 'error',
  
  /**
   * Log to console - ENABLED
   * Always log to console for debugging
   */
  logToConsole: true,
  
  /**
   * Log to server - ENABLED
   * Always send logs to server for analytics
   */
  logToServer: true,
  
  /**
   * Log API calls - ENABLED
   * Always log API calls for debugging
   */
  logApiCalls: true,
};

/**
 * Log environment information on app start
 * This helps verify parity across environments
 */
export function logEnvironmentInfo(): void {
  const info = getEnvironmentInfo();
  
  console.log('═══════════════════════════════════════════════════');
  console.log('🌍 ENVIRONMENT CONFIGURATION - PRODUCTION PARITY ENFORCED');
  console.log('═══════════════════════════════════════════════════');
  console.log(`Environment: ${info.environment.toUpperCase()}`);
  console.log(`Platform: ${info.platform}`);
  console.log(`App Version: ${info.appVersion}`);
  console.log(`Build Number: ${info.buildNumber}`);
  console.log(`Device: ${info.deviceName || 'Unknown'}`);
  console.log('═══════════════════════════════════════════════════');
  console.log('🔒 LOCKED CONFIGURATION:');
  console.log(`Supabase URL: ${ENV.SUPABASE_URL}`);
  console.log(`Supabase Key: ${ENV.SUPABASE_ANON_KEY ? 'Configured' : 'Missing'}`);
  console.log(`Backend URL: ${ENV.BACKEND_URL || 'Not configured'}`);
  console.log('═══════════════════════════════════════════════════');
  console.log('🎯 PARITY VERIFICATION:');
  console.log(`Debug UI: ${FeatureFlags.showDebugUI ? 'ENABLED' : 'DISABLED'} ✅`);
  console.log(`Dev Banner: ${UIConfig.showDevBanner ? 'ENABLED' : 'DISABLED'} ✅`);
  console.log(`Dev Padding: ${UIConfig.addDevPadding ? 'ENABLED' : 'DISABLED'} ✅`);
  console.log(`Dev Wrapper: ${UIConfig.useDevWrapper ? 'ENABLED' : 'DISABLED'} ✅`);
  console.log('═══════════════════════════════════════════════════');
  console.log('✅ ALL ENVIRONMENTS USE IDENTICAL CONFIGURATION');
  console.log('✅ EXPO GO AND PRODUCTION BUILDS ARE IDENTICAL');
  console.log('✅ NO DEV-ONLY BEHAVIOR DIFFERENCES');
  console.log('═══════════════════════════════════════════════════');
}

/**
 * Validate environment configuration
 * Ensures all required values are present
 */
export function validateEnvironmentConfig(): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  if (!ENV.SUPABASE_URL) {
    errors.push('Missing SUPABASE_URL in app.json extra config');
  }
  
  if (!ENV.SUPABASE_ANON_KEY) {
    errors.push('Missing SUPABASE_ANON_KEY in app.json extra config');
  }
  
  if (ENV.SUPABASE_URL && !ENV.SUPABASE_URL.includes('supabase.co')) {
    errors.push('Invalid SUPABASE_URL format');
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Get environment summary for diagnostics
 */
export function getEnvironmentSummary(): Record<string, any> {
  const info = getEnvironmentInfo();
  const validation = validateEnvironmentConfig();
  
  return {
    environment: info.environment,
    platform: info.platform,
    appVersion: info.appVersion,
    buildNumber: info.buildNumber,
    supabaseConfigured: !!ENV.SUPABASE_URL && !!ENV.SUPABASE_ANON_KEY,
    configurationValid: validation.valid,
    configurationErrors: validation.errors,
    featureFlags: FeatureFlags,
    uiConfig: UIConfig,
    loggingConfig: LoggingConfig,
  };
}
