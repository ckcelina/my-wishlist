
import * as Application from 'expo-application';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const LAST_TRACKED_VERSION_KEY = 'lastTrackedAppVersion';

/**
 * Version Tracking Utility - Idempotent & Cross-Platform
 * 
 * Features:
 * - Uses expo-application for version/build info
 * - Stores last tracked version in AsyncStorage (or localStorage on web)
 * - Only tracks if version changed (idempotent)
 * - Never throws - all errors are swallowed
 */

interface StorageAdapter {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
}

/**
 * Get storage adapter - AsyncStorage for native, localStorage for web
 */
function getStorageAdapter(): StorageAdapter {
  if (Platform.OS === 'web') {
    // Web fallback using localStorage
    return {
      getItem: async (key: string) => {
        try {
          return localStorage.getItem(key);
        } catch (e) {
          console.warn('[VersionTracking] localStorage.getItem failed:', e);
          return null;
        }
      },
      setItem: async (key: string, value: string) => {
        try {
          localStorage.setItem(key, value);
        } catch (e) {
          console.warn('[VersionTracking] localStorage.setItem failed:', e);
        }
      },
    };
  }

  // Native platforms use AsyncStorage
  return {
    getItem: async (key: string) => {
      try {
        return await AsyncStorage.getItem(key);
      } catch (e) {
        console.warn('[VersionTracking] AsyncStorage.getItem failed:', e);
        return null;
      }
    },
    setItem: async (key: string, value: string) => {
      try {
        await AsyncStorage.setItem(key, value);
      } catch (e) {
        console.warn('[VersionTracking] AsyncStorage.setItem failed:', e);
      }
    },
  };
}

/**
 * Get current app version string
 */
function getCurrentVersion(): string {
  try {
    const appVersion = Application.nativeApplicationVersion || 'unknown';
    const buildVersion = Application.nativeBuildVersion || 'unknown';
    return `${appVersion} (${buildVersion})`;
  } catch (e) {
    console.warn('[VersionTracking] Failed to get version info:', e);
    return 'unknown';
  }
}

/**
 * Track app version - idempotent and cross-platform
 * 
 * This function:
 * 1. Gets current version from expo-application
 * 2. Checks last tracked version from storage
 * 3. Only tracks if version changed (idempotent)
 * 4. Never throws - all errors are swallowed
 */
export async function trackAppVersion(): Promise<void> {
  try {
    const currentVersion = getCurrentVersion();
    const storage = getStorageAdapter();

    // Get last tracked version
    const lastTrackedVersion = await storage.getItem(LAST_TRACKED_VERSION_KEY);

    // Idempotent check - only track if version changed
    if (lastTrackedVersion === currentVersion) {
      console.log('[VersionTracking] Version unchanged, skipping tracking:', currentVersion);
      return;
    }

    // Version changed - log it
    console.log('[VersionTracking] Version changed:');
    console.log('[VersionTracking]   Previous:', lastTrackedVersion || 'N/A');
    console.log('[VersionTracking]   Current:', currentVersion);
    console.log('[VersionTracking]   Platform:', Platform.OS);

    // TODO: Backend Integration - POST /api/track-version
    // Send version info to backend analytics
    // Body: { version: currentVersion, platform: Platform.OS, previousVersion: lastTrackedVersion }
    // This is where you would call your backend API to log the version change

    // Store new version
    await storage.setItem(LAST_TRACKED_VERSION_KEY, currentVersion);
    
    console.log('[VersionTracking] Version tracking complete');
  } catch (e) {
    // Swallow all errors - version tracking should never crash the app
    console.warn('[VersionTracking] Error tracking app version:', e);
  }
}

/**
 * Get the last tracked version (for debugging)
 */
export async function getLastTrackedVersion(): Promise<string | null> {
  try {
    const storage = getStorageAdapter();
    return await storage.getItem(LAST_TRACKED_VERSION_KEY);
  } catch (e) {
    console.warn('[VersionTracking] Error getting last tracked version:', e);
    return null;
  }
}

/**
 * Clear tracked version (for testing)
 */
export async function clearTrackedVersion(): Promise<void> {
  try {
    const storage = getStorageAdapter();
    if (Platform.OS === 'web') {
      localStorage.removeItem(LAST_TRACKED_VERSION_KEY);
    } else {
      await AsyncStorage.removeItem(LAST_TRACKED_VERSION_KEY);
    }
    console.log('[VersionTracking] Cleared tracked version');
  } catch (e) {
    console.warn('[VersionTracking] Error clearing tracked version:', e);
  }
}
