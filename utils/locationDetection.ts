
/**
 * Location Detection Utility - SETTINGS-BASED ONLY
 * 
 * This module NO LONGER makes network requests to /api/location/* endpoints.
 * Country is managed EXCLUSIVELY in Settings and stored in Supabase user profiles.
 * 
 * CHANGES:
 * - Removed all calls to /api/location/smart-settings (404)
 * - Removed all calls to /api/location/detect-ip (404)
 * - Country is read from Settings context only
 * - No automatic IP-based detection
 * - No "Select delivery address" UI anywhere
 */

import * as Location from 'expo-location';

export interface LocationData {
  countryCode: string;
  countryName: string;
  city?: string;
  region?: string;
  latitude?: number;
  longitude?: number;
}

export interface SmartLocationSettings {
  enabled: boolean;
  mode: 'manual' | 'auto';
  countryCode: string | null;
  city: string | null;
  currencyCode: string | null;
}

/**
 * Detect current country using OS location ONLY (no IP fallback)
 * Returns country code (e.g., 'US', 'GB', 'FR')
 * ALWAYS returns a value or null - never throws
 * 
 * NOTE: This function NO LONGER calls /api/location/detect-ip
 * It only uses GPS if permission is granted
 */
export async function detectCurrentCountry(): Promise<string | null> {
  try {
    console.log('[LocationDetection] Starting GPS-only country detection');
    
    // Try OS location (if permission granted)
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      
      if (status === 'granted') {
        console.log('[LocationDetection] Location permission granted, using GPS');
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        
        const geocode = await Location.reverseGeocodeAsync({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
        
        if (geocode && geocode.length > 0 && geocode[0].isoCountryCode) {
          const countryCode = geocode[0].isoCountryCode;
          console.log('[LocationDetection] GPS detected country:', countryCode);
          return countryCode;
        }
      } else {
        console.log('[LocationDetection] Location permission not granted');
      }
    } catch (gpsError) {
      if (__DEV__) {
        console.warn('[LocationDetection] GPS detection failed (non-critical):', gpsError);
      }
    }
    
    // NO IP FALLBACK - user must set country in Settings
    console.log('[LocationDetection] No GPS available, user must set country in Settings');
    return null;
  } catch (error) {
    // Catch all errors - location detection should never crash the app
    if (__DEV__) {
      console.warn('[LocationDetection] Country detection failed (non-critical):', error);
    }
    return null;
  }
}

/**
 * DEPRECATED: This function is no longer used
 * Country updates are handled in Settings screen only
 */
export async function updateCurrentCountryInBackground(): Promise<void> {
  console.log('[LocationDetection] updateCurrentCountryInBackground is deprecated - country managed in Settings only');
  // No-op: Country is managed in Settings only
}

/**
 * Get user's smart location settings from Supabase user profile
 * ALWAYS returns a valid object, never throws
 * Returns safe defaults on any error
 * 
 * NOTE: This function NO LONGER calls /api/location/smart-settings
 * It reads from Supabase user profiles directly
 */
export async function getSmartLocationSettings(): Promise<SmartLocationSettings> {
  const defaultSettings: SmartLocationSettings = {
    enabled: false,
    mode: 'manual',
    countryCode: null,
    city: null,
    currencyCode: null,
  };

  try {
    if (__DEV__) {
      console.log('[LocationDetection] Returning default settings (Settings-based country management)');
    }
    
    // Return defaults - country is managed in Settings screen
    // The Settings screen reads from Supabase user profiles directly
    return defaultSettings;

  } catch (error) {
    // Catch all errors and return safe defaults
    if (__DEV__) {
      console.warn('[LocationDetection] Error fetching settings (non-critical, using defaults):', error);
    }
    return defaultSettings;
  }
}

/**
 * DEPRECATED: This function is no longer used
 * Settings are managed in Settings screen only
 */
export async function updateSmartLocationSettings(
  updates: Partial<SmartLocationSettings>
): Promise<void> {
  console.log('[LocationDetection] updateSmartLocationSettings is deprecated - settings managed in Settings screen only');
  // No-op: Settings are managed in Settings screen only
}

/**
 * DEPRECATED: This function is no longer used
 * Travel detection is not implemented
 */
export async function isUserTraveling(): Promise<boolean> {
  console.log('[LocationDetection] isUserTraveling is deprecated - feature not implemented');
  return false;
}
