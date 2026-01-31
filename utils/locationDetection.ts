
import * as Location from 'expo-location';
import { authenticatedGet, authenticatedPost } from './api';

export interface LocationData {
  countryCode: string;
  countryName: string;
  city?: string;
  region?: string;
  latitude?: number;
  longitude?: number;
}

export interface SmartLocationSettings {
  homeCountry: string; // User-selected preferred country
  currentCountry: string; // Auto-detected current country
  activeSearchCountry: string; // User-selected country for specific searches
  lastLocationUpdate: string | null;
}

/**
 * Detect current country using OS location + IP fallback
 * Returns country code (e.g., 'US', 'GB', 'FR')
 */
export async function detectCurrentCountry(): Promise<string | null> {
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
  } catch (error) {
    console.warn('[LocationDetection] GPS detection failed:', error);
  }
  
  // Fallback to IP-based detection
  try {
    console.log('[LocationDetection] Using IP-based detection');
    const response = await authenticatedGet<{ countryCode: string }>('/api/location/detect-ip');
    console.log('[LocationDetection] IP detected country:', response.countryCode);
    return response.countryCode;
  } catch (error) {
    console.error('[LocationDetection] IP detection failed:', error);
    return null;
  }
}

/**
 * Update user's current_country silently in the background
 * Does NOT change existing items or offers
 */
export async function updateCurrentCountryInBackground(): Promise<void> {
  console.log('[LocationDetection] Updating current country in background');
  
  try {
    const newCountry = await detectCurrentCountry();
    
    if (!newCountry) {
      console.warn('[LocationDetection] Could not detect country');
      return;
    }
    
    // Update user settings with new current_country
    await authenticatedPost('/api/location/update-current-country', {
      currentCountry: newCountry,
    });
    
    console.log('[LocationDetection] Current country updated to:', newCountry);
  } catch (error) {
    console.error('[LocationDetection] Failed to update current country:', error);
  }
}

/**
 * Get user's smart location settings
 */
export async function getSmartLocationSettings(): Promise<SmartLocationSettings | null> {
  try {
    const response = await authenticatedGet<SmartLocationSettings>('/api/location/smart-settings');
    return response;
  } catch (error) {
    console.error('[LocationDetection] Failed to get smart location settings:', error);
    return null;
  }
}

/**
 * Update smart location settings
 */
export async function updateSmartLocationSettings(
  updates: Partial<SmartLocationSettings>
): Promise<void> {
  try {
    await authenticatedPost('/api/location/smart-settings', updates);
    console.log('[LocationDetection] Smart location settings updated:', updates);
  } catch (error) {
    console.error('[LocationDetection] Failed to update smart location settings:', error);
    throw error;
  }
}

/**
 * Check if user is traveling (current_country != home_country)
 */
export async function isUserTraveling(): Promise<boolean> {
  try {
    const settings = await getSmartLocationSettings();
    if (!settings) return false;
    
    return settings.currentCountry !== settings.homeCountry;
  } catch (error) {
    console.error('[LocationDetection] Failed to check if user is traveling:', error);
    return false;
  }
}
