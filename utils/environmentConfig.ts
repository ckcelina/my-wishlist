
import Constants from 'expo-constants';
import { Platform } from 'react-native';

/**
 * Environment Configuration Module
 * 
 * Detects runtime environment and provides consistent configuration
 * across Expo Go, TestFlight/App Store, and Android builds.
 * 
 * This ensures UI parity by:
 * - Detecting environment type (dev, Expo Go, production)
 * - Providing consistent feature flags
 * - Guarding native-only features
 * - Ensuring layout consistency
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
 * Check if a native-only feature is available
 * Returns false in Expo Go to prevent crashes
 */
export function isNativeFeatureAvailable(featureName: string): boolean {
  const env = detectEnvironment();
  
  // In Expo Go, native-only features are not available
  if (env === 'expo-go') {
    console.log(`[EnvironmentConfig] Native feature "${featureName}" not available in Expo Go`);
    return false;
  }
  
  return true;
}

/**
 * Safe wrapper for native-only features
 * Executes callback only if feature is available, otherwise returns fallback
 */
export async function safeNativeFeature<T>(
  featureName: string,
  callback: () => Promise<T>,
  fallback: T
): Promise<T> {
  if (!isNativeFeatureAvailable(featureName)) {
    console.log(`[EnvironmentConfig] Using fallback for "${featureName}" in Expo Go`);
    return fallback;
  }
  
  try {
    return await callback();
  } catch (error) {
    console.error(`[EnvironmentConfig] Error executing native feature "${featureName}":`, error);
    return fallback;
  }
}

/**
 * Log environment information on app start
 */
export function logEnvironmentInfo(): void {
  const info = getEnvironmentInfo();
  
  console.log('═══════════════════════════════════════════════════');
  console.log('🌍 ENVIRONMENT CONFIGURATION');
  console.log('═══════════════════════════════════════════════════');
  console.log(`Environment: ${info.environment.toUpperCase()}`);
  console.log(`Platform: ${info.platform}`);
  console.log(`App Version: ${info.appVersion}`);
  console.log(`Build Number: ${info.buildNumber}`);
  console.log(`Device: ${info.deviceName || 'Unknown'}`);
  console.log(`Is Development: ${info.isDevelopment}`);
  console.log(`Is Expo Go: ${info.isExpoGo}`);
  console.log(`Is Production: ${info.isProduction}`);
  console.log('═══════════════════════════════════════════════════');
}

/**
 * Feature flags based on environment
 */
export const FeatureFlags = {
  /**
   * Whether to show debug UI elements
   * Only in development, never in production or Expo Go
   */
  showDebugUI: (): boolean => {
    const env = detectEnvironment();
    return env === 'development';
  },
  
  /**
   * Whether to enable native updates check
   * Only in production builds, not in Expo Go or development
   */
  enableUpdatesCheck: (): boolean => {
    const env = detectEnvironment();
    return env === 'production';
  },
  
  /**
   * Whether to enable native notifications
   * Not available in Expo Go
   */
  enableNotifications: (): boolean => {
    return isNativeFeatureAvailable('notifications');
  },
  
  /**
   * Whether to enable camera features
   * Not available in Expo Go
   */
  enableCamera: (): boolean => {
    return isNativeFeatureAvailable('camera');
  },
};

/**
 * Get consistent UI configuration across all environments
 * This ensures layout, spacing, and visual elements are identical
 */
export const UIConfig = {
  /**
   * Whether to add extra dev-only padding/margins
   * ALWAYS FALSE to ensure UI parity
   */
  addDevPadding: false,
  
  /**
   * Whether to show dev-only banners
   * ALWAYS FALSE to ensure UI parity
   */
  showDevBanner: false,
  
  /**
   * Whether to wrap content in dev-only containers
   * ALWAYS FALSE to ensure UI parity
   */
  useDevWrapper: false,
  
  /**
   * Tab bar height (consistent across all environments)
   */
  tabBarHeight: 64,
  
  /**
   * Standard spacing values (consistent across all environments)
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
   * Standard border radius values (consistent across all environments)
   */
  borderRadius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 18,
  },
};
