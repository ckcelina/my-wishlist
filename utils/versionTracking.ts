
/**
 * Version Tracking Utility
 * 
 * Provides version tracking functions that are ALWAYS defined and NEVER throw.
 * These functions are designed to be fire-and-forget and safe to call from
 * critical paths like AuthContext and ErrorBoundary.
 * 
 * GUARANTEES:
 * - Functions always exist (never undefined)
 * - Functions never throw (all errors caught internally)
 * - Functions return Promise<void> or void consistently
 * - Gracefully handles missing config/session/Supabase
 * - Safe to call in production and development
 * - Non-blocking: Can be called without awaiting
 */

import * as Application from 'expo-application';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Lazy import Supabase to avoid hard dependency
let supabaseClient: any = null;
let supabaseImportAttempted = false;

/**
 * Safely get Supabase client with defensive checks
 * Returns null if Supabase is not available or configured
 * Never throws - all errors caught internally
 */
async function getSupabaseClient(): Promise<any> {
  // Only attempt import once to avoid repeated failures
  if (!supabaseImportAttempted) {
    supabaseImportAttempted = true;
    try {
      const module = await import('@/lib/supabase');
      supabaseClient = module.supabase;
      
      // Verify client has required methods
      if (!supabaseClient || typeof supabaseClient.from !== 'function') {
        if (__DEV__) {
          console.warn('[VersionTracking] Supabase client invalid or missing methods');
        }
        supabaseClient = null;
      }
    } catch (e: any) {
      if (__DEV__) {
        console.warn('[VersionTracking] Supabase module not available:', e?.message || 'unknown');
      }
      supabaseClient = null;
    }
  }
  
  return supabaseClient;
}

/**
 * Check if version tracking is enabled
 * Returns false if config is missing or disabled
 * Never throws - all errors caught internally
 */
function isVersionTrackingEnabled(): boolean {
  try {
    const enabled = Constants.expoConfig?.extra?.SUPABASE_VERSION_TRACKING_ENABLED;
    return enabled === 'true' || enabled === true;
  } catch (e: any) {
    if (__DEV__) {
      console.warn('[VersionTracking] Failed to check if enabled:', e?.message || 'unknown');
    }
    return false;
  }
}

/**
 * Safely gather version information
 * Returns object with version data, never throws
 */
function gatherVersionInfo(): {
  appVersion: string;
  buildVersion: string;
  platform: string;
  deviceName: string;
} {
  try {
    const appVersion = Application.nativeApplicationVersion || 'unknown';
    const buildVersion = Application.nativeBuildVersion || 'unknown';
    const platform = Platform.OS || 'unknown';
    const deviceName = Constants.deviceName || 'unknown';
    
    return { appVersion, buildVersion, platform, deviceName };
  } catch (e: any) {
    if (__DEV__) {
      console.warn('[VersionTracking] Failed to gather version info:', e?.message || 'unknown');
    }
    return {
      appVersion: 'unknown',
      buildVersion: 'unknown',
      platform: 'unknown',
      deviceName: 'unknown',
    };
  }
}

/**
 * Log app version to Supabase for a specific user
 * 
 * GUARANTEES:
 * - Never throws (all errors caught internally)
 * - Returns Promise<void> that always resolves
 * - Safe to call without awaiting (fire-and-forget)
 * - Handles missing userId, Supabase, or config gracefully
 * - Non-blocking: Does not block auth state initialization
 * 
 * @param userId - The user ID to log version for
 * @returns Promise that always resolves (never rejects)
 */
export async function logAppVersionToSupabase(userId: string): Promise<void> {
  try {
    // Guard: Check if feature is enabled
    if (!isVersionTrackingEnabled()) {
      if (__DEV__) {
        console.log('[VersionTracking] Disabled by config, skipping');
      }
      return;
    }

    // Guard: Validate userId
    if (!userId || typeof userId !== 'string' || userId.trim() === '') {
      if (__DEV__) {
        console.warn('[VersionTracking] Invalid userId, skipping');
      }
      return;
    }

    // Guard: Check if Supabase is available
    const client = await getSupabaseClient();
    if (!client) {
      if (__DEV__) {
        console.warn('[VersionTracking] Supabase client not available, skipping');
      }
      return;
    }

    // Gather version information
    const versionInfo = gatherVersionInfo();
    
    if (__DEV__) {
      console.log('[VersionTracking] Logging version for user:', userId.substring(0, 8) + '...', versionInfo);
    }

    // Attempt to upsert version data
    const { error } = await client
      .from('app_versions')
      .upsert(
        {
          user_id: userId,
          app_version: versionInfo.appVersion,
          build_version: versionInfo.buildVersion,
          platform: versionInfo.platform,
          device_name: versionInfo.deviceName,
          last_seen_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      );

    if (error) {
      if (__DEV__) {
        console.warn('[VersionTracking] Failed to log to Supabase:', error.message);
      }
    } else {
      if (__DEV__) {
        console.log('[VersionTracking] Successfully logged to Supabase');
      }
    }
  } catch (error: any) {
    // Catch ALL errors to ensure this function NEVER throws
    if (__DEV__) {
      console.warn('[VersionTracking] Unexpected error in logAppVersionToSupabase:', error?.message || 'unknown');
    }
  }
  // Always return void (never reject)
}

/**
 * Track app version (general purpose, lightweight)
 * 
 * GUARANTEES:
 * - Never throws (all errors caught internally)
 * - Returns void (synchronous, no promises)
 * - Safe to call from ErrorBoundary
 * - Handles missing config gracefully
 * - Non-blocking: Completes immediately
 * 
 * This function only logs to console and does not make network requests.
 * Suitable for use in ErrorBoundary and other critical error paths.
 * 
 * @returns void (never throws)
 */
export function trackAppVersion(): void {
  try {
    // Guard: Check if feature is enabled
    if (!isVersionTrackingEnabled()) {
      if (__DEV__) {
        console.log('[VersionTracking] Disabled by config, skipping');
      }
      return;
    }

    // Gather version information
    const versionInfo = gatherVersionInfo();
    
    // Log to console only (no network requests)
    if (__DEV__) {
      console.log('[VersionTracking] App version:', versionInfo);
    }
  } catch (error: any) {
    // Catch ALL errors to ensure this function NEVER throws
    if (__DEV__) {
      console.warn('[VersionTracking] Unexpected error in trackAppVersion:', error?.message || 'unknown');
    }
  }
  // Always return void (never throw)
}

// Default export for compatibility
export default {
  logAppVersionToSupabase,
  trackAppVersion,
};
