
import * as Application from 'expo-application';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Updates from 'expo-updates';
import { supabase } from '@/lib/supabase';

/**
 * Version Tracking Utility
 * 
 * This utility automatically tracks app version information in Supabase
 * whenever the app is deployed through EAS or started. It logs:
 * - App version (from app.json)
 * - Build number (native build version)
 * - EAS Update ID (for OTA updates)
 * - Platform (iOS, Android, Web)
 * - Device information
 * - Deployment timestamp
 * 
 * CRITICAL: This module is guarded to prevent crashes in Expo Go and development builds.
 */

interface VersionInfo {
  appVersion: string | null;
  buildVersion: string | null;
  platform: string;
  platformVersion: string | null;
  deviceModel: string | null;
  deviceName: string | null;
  bundleId: string | null;
  appName: string | null;
  isDevice: boolean;
  expoVersion: string | null;
  updateId: string | null;
  channel: string | null;
  runtimeVersion: string | null;
}

interface DeploymentLog {
  appVersion: string | null;
  buildVersion: string | null;
  platform: string;
  platformVersion: string | null;
  bundleId: string | null;
  appName: string | null;
  expoVersion: string | null;
  updateId: string | null;
  channel: string | null;
  runtimeVersion: string | null;
  deployedAt: string;
  environment: 'development' | 'production';
}

/**
 * Check if we're running in Expo Go or development client
 * In these environments, Updates.checkForUpdateAsync() is not available
 */
function isExpoGoOrDevClient(): boolean {
  // Check if running in Expo Go
  if (Constants.appOwnership === 'expo') {
    return true;
  }
  
  // Check if in development mode
  if (__DEV__) {
    return true;
  }
  
  return false;
}

/**
 * Check if we're in a development environment (skip version logging)
 */
function isDevelopment(): boolean {
  return __DEV__ || Constants.appOwnership === 'expo';
}

/**
 * Get comprehensive version information about the current app
 * including EAS Update information
 */
export async function getVersionInfo(): Promise<VersionInfo> {
  console.debug('[VersionTracking] Gathering version information...');

  const appVersion = Application.nativeApplicationVersion;
  const buildVersion = Application.nativeBuildVersion;
  const bundleId = Application.applicationId;
  const appName = Application.applicationName;

  // Get EAS Update information
  let updateId: string | null = null;
  let channel: string | null = null;
  let runtimeVersion: string | null = null;

  try {
    if (Updates.isEnabled) {
      updateId = Updates.updateId || null;
      channel = Updates.channel || null;
      runtimeVersion = Updates.runtimeVersion || null;
      
      console.debug('[VersionTracking] EAS Updates enabled');
      console.debug('[VersionTracking] Update ID:', updateId);
      console.debug('[VersionTracking] Channel:', channel);
      console.debug('[VersionTracking] Runtime Version:', runtimeVersion);
    } else {
      console.debug('[VersionTracking] EAS Updates not enabled (development mode)');
    }
  } catch (error) {
    console.debug('[VersionTracking] Could not get EAS Update info:', error);
  }

  console.debug('[VersionTracking] App Version:', appVersion);
  console.debug('[VersionTracking] Build Version:', buildVersion);
  console.debug('[VersionTracking] Bundle ID:', bundleId);
  console.debug('[VersionTracking] App Name:', appName);
  console.debug('[VersionTracking] Platform:', Platform.OS);
  console.debug('[VersionTracking] Platform Version:', Platform.Version);

  const versionInfo: VersionInfo = {
    appVersion,
    buildVersion,
    platform: Platform.OS,
    platformVersion: Platform.Version?.toString() || null,
    deviceModel: Constants.deviceName || null,
    deviceName: Constants.deviceName || null,
    bundleId,
    appName,
    isDevice: Constants.isDevice,
    expoVersion: Constants.expoVersion || null,
    updateId,
    channel,
    runtimeVersion,
  };

  return versionInfo;
}

/**
 * Log the current app version to Supabase
 * This is called automatically when the app starts or when deployed via EAS
 * 
 * CRITICAL: Skips logging in development environments to avoid noise
 */
export async function logAppVersionToSupabase(userId?: string): Promise<void> {
  // Skip version logging in development environments
  if (isDevelopment()) {
    console.debug('[VersionTracking] Skipping version logging in development environment');
    return;
  }

  try {
    console.debug('[VersionTracking] ═══════════════════════════════════════════════════');
    console.debug('[VersionTracking] 📊 LOGGING APP VERSION TO SUPABASE');
    console.debug('[VersionTracking] ═══════════════════════════════════════════════════');

    const versionInfo = await getVersionInfo();

    const deploymentLog: DeploymentLog = {
      appVersion: versionInfo.appVersion,
      buildVersion: versionInfo.buildVersion,
      platform: versionInfo.platform,
      platformVersion: versionInfo.platformVersion,
      bundleId: versionInfo.bundleId,
      appName: versionInfo.appName,
      expoVersion: versionInfo.expoVersion,
      updateId: versionInfo.updateId,
      channel: versionInfo.channel,
      runtimeVersion: versionInfo.runtimeVersion,
      deployedAt: new Date().toISOString(),
      environment: __DEV__ ? 'development' : 'production',
    };

    console.debug('[VersionTracking] Deployment Log:', deploymentLog);

    // Log to Supabase app_versions table
    const { data, error } = await supabase
      .from('app_versions')
      .insert({
        user_id: userId || null,
        app_version: deploymentLog.appVersion,
        build_version: deploymentLog.buildVersion,
        platform: deploymentLog.platform,
        platform_version: deploymentLog.platformVersion,
        bundle_id: deploymentLog.bundleId,
        app_name: deploymentLog.appName,
        expo_version: deploymentLog.expoVersion,
        update_id: deploymentLog.updateId,
        channel: deploymentLog.channel,
        runtime_version: deploymentLog.runtimeVersion,
        environment: deploymentLog.environment,
        logged_at: deploymentLog.deployedAt,
      });

    if (error) {
      // Check if table doesn't exist - this is expected if migration hasn't been run
      if (error.message.includes('relation "app_versions" does not exist') || 
          error.message.includes('Could not find the table') ||
          error.code === 'PGRST204' || 
          error.code === 'PGRST205') {
        console.debug('[VersionTracking] Table "app_versions" not found - version tracking disabled');
        console.debug('[VersionTracking] To enable: Run migration supabase/migrations/20260125_create_app_versions_table.sql');
        return;
      }
      
      // Other errors - log but don't crash
      console.debug('[VersionTracking] Could not log version to Supabase:', error.message);
      return;
    }

    console.debug('[VersionTracking] ✅ Successfully logged version to Supabase');
    console.debug('[VersionTracking] Data:', data);
    console.debug('[VersionTracking] ═══════════════════════════════════════════════════');
  } catch (error) {
    // Silently fail - version tracking should never break the app
    console.debug('[VersionTracking] Unexpected error logging version:', error);
  }
}

/**
 * Check for EAS Updates and log new deployments
 * This should be called on app start to detect new OTA updates
 * 
 * CRITICAL: This function is guarded to skip in Expo Go and development builds
 * where Updates.checkForUpdateAsync() is not available.
 */
export async function checkForUpdatesAndLog(userId?: string): Promise<void> {
  try {
    // Guard: Skip update check in Expo Go or development client
    if (isExpoGoOrDevClient()) {
      console.debug('[VersionTracking] Skipping update check (Expo Go or dev client)');
      // Still log the current version for tracking (if not in dev)
      if (!isDevelopment()) {
        await logAppVersionToSupabase(userId);
      }
      return;
    }

    if (!Updates.isEnabled) {
      console.debug('[VersionTracking] EAS Updates not enabled, skipping update check');
      return;
    }

    console.debug('[VersionTracking] ═══════════════════════════════════════════════════');
    console.debug('[VersionTracking] 🔄 CHECKING FOR EAS UPDATES');
    console.debug('[VersionTracking] ═══════════════════════════════════════════════════');

    const update = await Updates.checkForUpdateAsync();

    if (update.isAvailable) {
      console.debug('[VersionTracking] ✅ New update available!');
      console.debug('[VersionTracking] Fetching and applying update...');

      await Updates.fetchUpdateAsync();
      
      // Log the new version before reloading
      await logAppVersionToSupabase(userId);
      
      console.debug('[VersionTracking] Update downloaded, reloading app...');
      await Updates.reloadAsync();
    } else {
      console.debug('[VersionTracking] No new updates available');
      console.debug('[VersionTracking] Current update ID:', Updates.updateId);
      
      // Still log the current version
      await logAppVersionToSupabase(userId);
    }

    console.debug('[VersionTracking] ═══════════════════════════════════════════════════');
  } catch (error) {
    // Downgrade to debug - expected in dev environments
    console.debug('[VersionTracking] Could not check for updates:', error);
    
    // Still try to log the current version even if update check fails
    if (!isDevelopment()) {
      await logAppVersionToSupabase(userId);
    }
  }
}

/**
 * Get the latest app version from Supabase
 */
export async function getLatestAppVersion(): Promise<DeploymentLog | null> {
  try {
    const { data, error } = await supabase
      .from('app_versions')
      .select('*')
      .order('logged_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      console.debug('[VersionTracking] Error fetching latest version:', error);
      return null;
    }

    return data as unknown as DeploymentLog;
  } catch (error) {
    console.debug('[VersionTracking] Error fetching latest version:', error);
    return null;
  }
}

/**
 * Get all app versions for a specific user
 */
export async function getUserAppVersions(userId: string): Promise<DeploymentLog[]> {
  try {
    const { data, error } = await supabase
      .from('app_versions')
      .select('*')
      .eq('user_id', userId)
      .order('logged_at', { ascending: false });

    if (error) {
      console.debug('[VersionTracking] Error fetching user versions:', error);
      return [];
    }

    return data as unknown as DeploymentLog[];
  } catch (error) {
    console.debug('[VersionTracking] Error fetching user versions:', error);
    return [];
  }
}

/**
 * Get deployment statistics from Supabase
 */
export async function getDeploymentStatistics(): Promise<any> {
  try {
    const { data, error } = await supabase
      .rpc('get_version_statistics');

    if (error) {
      console.debug('[VersionTracking] Error fetching deployment statistics:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.debug('[VersionTracking] Error fetching deployment statistics:', error);
    return null;
  }
}

/**
 * Check if the current app version is outdated
 */
export async function isAppVersionOutdated(): Promise<boolean> {
  try {
    const currentVersion = await getVersionInfo();
    const latestVersion = await getLatestAppVersion();

    if (!latestVersion || !currentVersion.appVersion) {
      return false;
    }

    // Compare version strings
    return currentVersion.appVersion !== latestVersion.appVersion;
  } catch (error) {
    console.debug('[VersionTracking] Error checking version:', error);
    return false;
  }
}

/**
 * Display version information in the console
 */
export function displayVersionInfo(versionInfo: VersionInfo): void {
  console.log('[VersionTracking] ═══════════════════════════════════════════════════');
  console.log('[VersionTracking] 📱 APP VERSION INFORMATION');
  console.log('[VersionTracking] ═══════════════════════════════════════════════════');
  console.log('[VersionTracking] App Name:', versionInfo.appName);
  console.log('[VersionTracking] Bundle ID:', versionInfo.bundleId);
  console.log('[VersionTracking] App Version:', versionInfo.appVersion);
  console.log('[VersionTracking] Build Version:', versionInfo.buildVersion);
  console.log('[VersionTracking] Platform:', versionInfo.platform);
  console.log('[VersionTracking] Platform Version:', versionInfo.platformVersion);
  console.log('[VersionTracking] Device Model:', versionInfo.deviceModel);
  console.log('[VersionTracking] Expo Version:', versionInfo.expoVersion);
  console.log('[VersionTracking] Environment:', __DEV__ ? 'Development' : 'Production');
  
  if (versionInfo.updateId) {
    console.log('[VersionTracking] ─────────────────────────────────────────────────────');
    console.log('[VersionTracking] 🚀 EAS UPDATE INFORMATION');
    console.log('[VersionTracking] Update ID:', versionInfo.updateId);
    console.log('[VersionTracking] Channel:', versionInfo.channel);
    console.log('[VersionTracking] Runtime Version:', versionInfo.runtimeVersion);
  }
  
  console.log('[VersionTracking] ═══════════════════════════════════════════════════');
}
