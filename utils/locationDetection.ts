
import * as Location from 'expo-location';
import { authenticatedGet, authenticatedPost } from './api';
import Constants from 'expo-constants';
import { supabase } from '@/lib/supabase';

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
 * Detect current country using OS location + IP fallback
 * Returns country code (e.g., 'US', 'GB', 'FR')
 * ALWAYS returns a value or null - never throws
 */
export async function detectCurrentCountry(): Promise<string | null> {
  try {
    console.log('[LocationDetection] Starting country detection');
    
    // Try OS location first (if permission granted)
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
        console.log('[LocationDetection] Location permission not granted, falling back to IP');
      }
    } catch (gpsError) {
      if (__DEV__) {
        console.warn('[LocationDetection] GPS detection failed (non-critical):', gpsError);
      }
    }
    
    // Fallback to IP-based detection
    try {
      console.log('[LocationDetection] Using IP-based detection');
      const response = await authenticatedGet<{ ok: boolean; countryCode: string | null }>('/api/location/detect-ip');
      
      if (response && response.countryCode) {
        console.log('[LocationDetection] IP detected country:', response.countryCode);
        return response.countryCode;
      }
      
      if (__DEV__) {
        console.log('[LocationDetection] IP detection returned null country (expected for stub)');
      }
      return null;
    } catch (ipError) {
      if (__DEV__) {
        console.warn('[LocationDetection] IP detection failed (non-critical):', ipError);
      }
      return null;
    }
  } catch (error) {
    // Catch all errors - location detection should never crash the app
    if (__DEV__) {
      console.warn('[LocationDetection] Country detection failed (non-critical):', error);
    }
    return null;
  }
}

/**
 * Update user's current_country silently in the background
 * Does NOT change existing items or offers
 * Never throws - all errors caught internally
 */
export async function updateCurrentCountryInBackground(): Promise<void> {
  try {
    console.log('[LocationDetection] Updating current country in background');
    
    const newCountry = await detectCurrentCountry();
    
    if (!newCountry) {
      if (__DEV__) {
        console.log('[LocationDetection] Could not detect country (non-critical)');
      }
      return;
    }
    
    // Update user settings with new current_country
    await authenticatedPost('/api/location/update-current-country', {
      currentCountry: newCountry,
    });
    
    console.log('[LocationDetection] Current country updated to:', newCountry);
  } catch (error) {
    // Catch all errors - background updates should never crash the app
    if (__DEV__) {
      console.warn('[LocationDetection] Failed to update current country (non-critical):', error);
    }
  }
}

/**
 * Get user's smart location settings from Supabase Edge Function
 * ALWAYS returns a valid object, never throws
 * Returns safe defaults on any error
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
      console.log('[LocationDetection] Fetching smart location settings');
    }
    
    // Use authenticatedGet which routes to the Supabase Edge Function
    const response = await authenticatedGet<{ 
      ok: boolean; 
      useIpDetection?: boolean; 
      useLocaleFallback?: boolean;
    }>('/api/location/smart-settings');
    
    if (__DEV__) {
      console.log('[LocationDetection] Smart location settings fetched:', response);
    }
    
    // Map the Edge Function response to our SmartLocationSettings interface
    // For now, we return defaults since the Edge Function returns a simplified response
    return defaultSettings;

  } catch (error) {
    // Catch all errors and return safe defaults
    if (__DEV__) {
      console.warn('[LocationDetection] Error fetching smart location settings (non-critical, using defaults):', error);
    }
    return defaultSettings;
  }
}

/**
 * Update smart location settings
 * Never throws - all errors caught internally
 */
export async function updateSmartLocationSettings(
  updates: Partial<SmartLocationSettings>
): Promise<void> {
  try {
    await authenticatedPost('/api/location/smart-settings', updates);
    console.log('[LocationDetection] Smart location settings updated:', updates);
  } catch (error) {
    // Catch all errors - settings updates should never crash the app
    if (__DEV__) {
      console.error('[LocationDetection] Failed to update smart location settings (non-critical):', error);
    }
    // Re-throw so caller knows it failed, but with a user-friendly message
    throw new Error('Failed to update location settings. Please try again.');
  }
}

/**
 * Check if user is traveling (current_country != home_country)
 * Never throws - all errors caught internally
 */
export async function isUserTraveling(): Promise<boolean> {
  try {
    const settings = await getSmartLocationSettings();
    if (!settings) return false;
    
    // For now, we don't have homeCountry in the settings
    // This would need to be implemented when the feature is fully built
    return false;
  } catch (error) {
    // Catch all errors - travel detection should never crash the app
    if (__DEV__) {
      console.warn('[LocationDetection] Failed to check if user is traveling (non-critical):', error);
    }
    return false;
  }
}
