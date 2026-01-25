
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
 * Get comprehensive version information about the current app
 * including EAS Update information
 */
export async function getVersionInfo(): Promise<VersionInfo> {
  console.log('[VersionTracking] Gathering version information...');

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
      
      console.log('[VersionTracking] EAS Updates enabled');
      console.log('[VersionTracking] Update ID:', updateId);
      console.log('[VersionTracking] Channel:', channel);
      console.log('[VersionTracking] Runtime Version:', runtimeVersion);
    } else {
      console.log('[VersionTracking] EAS Updates not enabled (development mode)');
    }
  } catch (error) {
    console.log('[VersionTracking] Could not get EAS Update info:', error);
  }

  console.log('[VersionTracking] App Version:', appVersion);
  console.log('[VersionTracking] Build Version:', buildVersion);
  console.log('[VersionTracking] Bundle ID:', bundleId);
  console.log('[VersionTracking] App Name:', appName);
  console.log('[VersionTracking] Platform:', Platform.OS);
  console.log('[VersionTracking] Platform Version:', Platform.Version);

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
 */
export async function logAppVersionToSupabase(userId?: string): Promise<void> {
  try {
    console.log('[VersionTracking] ═══════════════════════════════════════════════════');
    console.log('[VersionTracking] 📊 LOGGING APP VERSION TO SUPABASE');
    console.log('[VersionTracking] ═══════════════════════════════════════════════════');

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

    console.log('[VersionTracking] Deployment Log:', deploymentLog);

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
      console.error('[VersionTracking] ❌ Error logging version to Supabase:', error);
      console.error('[VersionTracking] Error details:', error.message);
      
      // If table doesn't exist, log instructions
      if (error.message.includes('relation "app_versions" does not exist')) {
        console.log('[VersionTracking] ═══════════════════════════════════════════════════');
        console.log('[VersionTracking] ⚠️  TABLE NOT FOUND: app_versions');
        console.log('[VersionTracking] ═══════════════════════════════════════════════════');
        console.log('[VersionTracking] Please run the migration in supabase/migrations/');
        console.log('[VersionTracking] ═══════════════════════════════════════════════════');
      }
      return;
    }

    console.log('[VersionTracking] ✅ Successfully logged version to Supabase');
    console.log('[VersionTracking] Data:', data);
    console.log('[VersionTracking] ═══════════════════════════════════════════════════');
  } catch (error) {
    console.error('[VersionTracking] ❌ Unexpected error logging version:', error);
  }
}

/**
 * Check for EAS Updates and log new deployments
 * This should be called on app start to detect new OTA updates
 */
export async function checkForUpdatesAndLog(userId?: string): Promise<void> {
  try {
    if (!Updates.isEnabled) {
      console.log('[VersionTracking] EAS Updates not enabled, skipping update check');
      return;
    }

    console.log('[VersionTracking] ═══════════════════════════════════════════════════');
    console.log('[VersionTracking] 🔄 CHECKING FOR EAS UPDATES');
    console.log('[VersionTracking] ═══════════════════════════════════════════════════');

    const update = await Updates.checkForUpdateAsync();

    if (update.isAvailable) {
      console.log('[VersionTracking] ✅ New update available!');
      console.log('[VersionTracking] Fetching and applying update...');

      await Updates.fetchUpdateAsync();
      
      // Log the new version before reloading
      await logAppVersionToSupabase(userId);
      
      console.log('[VersionTracking] Update downloaded, reloading app...');
      await Updates.reloadAsync();
    } else {
      console.log('[VersionTracking] No new updates available');
      console.log('[VersionTracking] Current update ID:', Updates.updateId);
      
      // Still log the current version
      await logAppVersionToSupabase(userId);
    }

    console.log('[VersionTracking] ═══════════════════════════════════════════════════');
  } catch (error) {
    console.error('[VersionTracking] Error checking for updates:', error);
    
    // Still try to log the current version even if update check fails
    await logAppVersionToSupabase(userId);
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
      console.error('[VersionTracking] Error fetching latest version:', error);
      return null;
    }

    return data as unknown as DeploymentLog;
  } catch (error) {
    console.error('[VersionTracking] Error fetching latest version:', error);
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
      console.error('[VersionTracking] Error fetching user versions:', error);
      return [];
    }

    return data as unknown as DeploymentLog[];
  } catch (error) {
    console.error('[VersionTracking] Error fetching user versions:', error);
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
      console.error('[VersionTracking] Error fetching deployment statistics:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('[VersionTracking] Error fetching deployment statistics:', error);
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
    console.error('[VersionTracking] Error checking version:', error);
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
