
/**
 * Version Tracking Utility
 * 
 * Provides version tracking functions that are always defined and safe to call.
 * Functions will no-op gracefully if Supabase is not configured or if errors occur.
 */

import * as Application from 'expo-application';
import Constants from 'expo-constants';
import { supabase } from '@/lib/supabase';

// Check if version tracking is enabled via environment config
const SUPABASE_VERSION_TRACKING_ENABLED = 
  Constants.expoConfig?.extra?.SUPABASE_VERSION_TRACKING_ENABLED === 'true';

/**
 * Log app version to Supabase for a specific user
 * 
 * This function is always defined and safe to call. It will:
 * - No-op if version tracking is disabled
 * - No-op if Supabase is not configured
 * - Catch and log any errors without throwing
 * 
 * @param userId - The user ID to log version for
 * @returns Promise that always resolves (never throws)
 */
export async function logAppVersionToSupabase(userId: string): Promise<void> {
  // Guard: Check if feature is enabled
  if (!SUPABASE_VERSION_TRACKING_ENABLED) {
    console.log('[VersionTracking] Version tracking disabled, skipping logAppVersionToSupabase');
    return;
  }

  // Guard: Check if userId is valid
  if (!userId || typeof userId !== 'string') {
    console.warn('[VersionTracking] Invalid userId provided to logAppVersionToSupabase');
    return;
  }

  try {
    // Gather version information
    const appVersion = Application.nativeApplicationVersion || 'unknown';
    const buildVersion = Application.nativeBuildVersion || 'unknown';
    const platform = Constants.platform?.ios 
      ? 'ios' 
      : Constants.platform?.android 
      ? 'android' 
      : 'web';
    const deviceName = Constants.deviceName || 'unknown';

    console.log('[VersionTracking] Logging app version to Supabase:', {
      userId,
      appVersion,
      buildVersion,
      platform,
      deviceName,
    });

    // Attempt to upsert version data to Supabase
    const { error } = await supabase
      .from('app_versions')
      .upsert(
        {
          user_id: userId,
          app_version: appVersion,
          build_version: buildVersion,
          platform: platform,
          device_name: deviceName,
          last_seen_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      );

    if (error) {
      console.error('[VersionTracking] Error logging app version to Supabase:', error);
      // Don't throw - this is optional functionality
    } else {
      console.log('[VersionTracking] App version logged to Supabase successfully');
    }
  } catch (error) {
    // Catch all errors to ensure this function never throws
    console.error('[VersionTracking] Failed to log app version to Supabase:', error);
  }
}

/**
 * Track app version (general purpose)
 * 
 * This function is always defined and safe to call. It will:
 * - No-op if version tracking is disabled
 * - Log version information to console
 * - Never throw errors
 * 
 * Suitable for use in ErrorBoundary and other critical paths.
 * 
 * @returns Promise that always resolves (never throws)
 */
export async function trackAppVersion(): Promise<void> {
  // Guard: Check if feature is enabled
  if (!SUPABASE_VERSION_TRACKING_ENABLED) {
    console.log('[VersionTracking] Version tracking disabled, skipping trackAppVersion');
    return;
  }

  try {
    // Gather version information
    const appVersion = Application.nativeApplicationVersion || 'unknown';
    const buildVersion = Application.nativeBuildVersion || 'unknown';
    const platform = Constants.platform?.ios 
      ? 'ios' 
      : Constants.platform?.android 
      ? 'android' 
      : 'web';
    const deviceName = Constants.deviceName || 'unknown';

    // Log to console (lightweight tracking suitable for error boundaries)
    console.log('[VersionTracking] App version tracked:', {
      appVersion,
      buildVersion,
      platform,
      deviceName,
    });
  } catch (error) {
    // Catch all errors to ensure this function never throws
    console.error('[VersionTracking] Failed to track app version:', error);
  }
}

// Default export for compatibility
export default {
  logAppVersionToSupabase,
  trackAppVersion,
};
