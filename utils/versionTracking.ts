
import * as Application from 'expo-application';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { supabase } from '@/lib/supabase';

/**
 * Version Tracking Utility
 * 
 * This utility automatically tracks app version information in Supabase
 * whenever the app is deployed or started. It logs:
 * - App version (from app.json)
 * - Build number (native build version)
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
}

interface DeploymentLog {
  appVersion: string | null;
  buildVersion: string | null;
  platform: string;
  platformVersion: string | null;
  bundleId: string | null;
  appName: string | null;
  expoVersion: string | null;
  deployedAt: string;
  environment: 'development' | 'production';
}

/**
 * Get comprehensive version information about the current app
 */
export async function getVersionInfo(): Promise<VersionInfo> {
  console.log('[VersionTracking] Gathering version information...');

  const appVersion = Application.nativeApplicationVersion;
  const buildVersion = Application.nativeBuildVersion;
  const bundleId = Application.applicationId;
  const appName = Application.applicationName;

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
    isDevice: !Constants.isDevice,
    expoVersion: Constants.expoVersion || null,
  };

  return versionInfo;
}

/**
 * Log the current app version to Supabase
 * This is called automatically when the app starts
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
        console.log('[VersionTracking] Please create the table in Supabase with this SQL:');
        console.log('[VersionTracking]');
        console.log('[VersionTracking] CREATE TABLE app_versions (');
        console.log('[VersionTracking]   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),');
        console.log('[VersionTracking]   user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,');
        console.log('[VersionTracking]   app_version TEXT,');
        console.log('[VersionTracking]   build_version TEXT,');
        console.log('[VersionTracking]   platform TEXT NOT NULL,');
        console.log('[VersionTracking]   platform_version TEXT,');
        console.log('[VersionTracking]   bundle_id TEXT,');
        console.log('[VersionTracking]   app_name TEXT,');
        console.log('[VersionTracking]   expo_version TEXT,');
        console.log('[VersionTracking]   environment TEXT NOT NULL,');
        console.log('[VersionTracking]   logged_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),');
        console.log('[VersionTracking]   created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()');
        console.log('[VersionTracking] );');
        console.log('[VersionTracking]');
        console.log('[VersionTracking] CREATE INDEX idx_app_versions_user_id ON app_versions(user_id);');
        console.log('[VersionTracking] CREATE INDEX idx_app_versions_logged_at ON app_versions(logged_at DESC);');
        console.log('[VersionTracking] CREATE INDEX idx_app_versions_platform ON app_versions(platform);');
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
 * Check if the current app version is outdated
 */
export async function isAppVersionOutdated(): Promise<boolean> {
  try {
    const currentVersion = await getVersionInfo();
    const latestVersion = await getLatestAppVersion();

    if (!latestVersion || !currentVersion.appVersion) {
      return false;
    }

    // Simple version comparison (you can make this more sophisticated)
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
  console.log('[VersionTracking] ═══════════════════════════════════════════════════');
}
