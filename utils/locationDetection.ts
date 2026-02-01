
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
 * Get user's smart location settings from Supabase Edge Function
 * Always returns a valid object, never throws
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
    console.log('[LocationDetection] Fetching smart location settings from Supabase Edge Function');
    
    // Get Supabase configuration
    const SUPABASE_URL = Constants.expoConfig?.extra?.supabaseUrl;
    const SUPABASE_ANON_KEY = Constants.expoConfig?.extra?.supabaseAnonKey;

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      console.warn('[LocationDetection] Supabase URL or ANON_KEY not configured. Returning defaults.');
      return defaultSettings;
    }

    // Get access token from Supabase session
    const { data: { session } } = await supabase.auth.getSession();
    const accessToken = session?.access_token;

    // Build headers with Supabase auth pattern
    const headers: HeadersInit = {
      'apikey': SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
    };

    // Add Authorization header if user is authenticated
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
      console.log('[LocationDetection] Using authenticated request');
    } else {
      console.log('[LocationDetection] Using unauthenticated request');
    }

    // Call Supabase Edge Function
    const edgeFunctionUrl = `${SUPABASE_URL}/functions/v1/location-smart-settings`;
    console.log('[LocationDetection] Calling:', edgeFunctionUrl);

    const response = await fetch(edgeFunctionUrl, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      console.error(`[LocationDetection] Edge Function returned ${response.status}: ${response.statusText}`);
      return defaultSettings;
    }

    const data: SmartLocationSettings = await response.json();
    console.log('[LocationDetection] Smart location settings fetched successfully:', data);
    return data;

  } catch (error) {
    console.error('[LocationDetection] Error fetching smart location settings:', error);
    return defaultSettings;
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
    
    // For now, we don't have homeCountry in the settings
    // This would need to be implemented when the feature is fully built
    return false;
  } catch (error) {
    console.error('[LocationDetection] Failed to check if user is traveling:', error);
    return false;
  }
}
