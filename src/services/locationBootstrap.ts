
/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🌍 LOCATION BOOTSTRAP SERVICE - AUTOMATIC COUNTRY DETECTION & CITY PRELOADING
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * This service provides automatic location detection on app startup:
 * - Primary: Device locale region (e.g., en-JO -> JO)
 * - Secondary: GPS + reverse geocode (if permission granted)
 * - Fallback: Previously saved country in user profile
 * - Preloads top cities for detected country
 * 
 * IMPORTANT: Does NOT silently overwrite user profile - only suggests defaults
 */

import * as Localization from 'expo-localization';
import * as Location from 'expo-location';
import { getCountryByCode } from '@/constants/countries';
import { searchCities, CityResult, CitySearchResponse } from './citySearch';
import { authenticatedGet } from '@/utils/api';

export interface LocationBootstrapResult {
  countryCode: string | null;
  countryName: string | null;
  topCities: CityResult[];
  source: 'locale' | 'gps' | 'profile' | 'none';
}

interface UserLocationResponse {
  countryCode: string;
  countryName: string;
  city: string | null;
  region: string | null;
}

/**
 * Determine default location using multiple detection methods
 * 
 * Priority:
 * 1. Device locale region (fastest, most reliable)
 * 2. GPS + reverse geocode (if permission granted)
 * 3. Previously saved country in user profile
 * 
 * @returns Promise with detected country and preloaded cities
 */
export async function determineDefaultLocation(): Promise<LocationBootstrapResult> {
  console.log('[LocationBootstrap] Starting automatic location detection');

  let detectedCountryCode: string | null = null;
  let detectedCountryName: string | null = null;
  let detectionSource: 'locale' | 'gps' | 'profile' | 'none' = 'none';

  // ═══════════════════════════════════════════════════════════════════════
  // STEP 1: Device Locale Region (Primary - Fastest & Most Reliable)
  // ═══════════════════════════════════════════════════════════════════════
  try {
    // Get device locales (returns array of Locale objects)
    const locales = Localization.getLocales();
    
    if (locales && locales.length > 0) {
      const primaryLocale = locales[0];
      console.log('[LocationBootstrap] Device locale:', primaryLocale.languageTag, 'Region:', primaryLocale.regionCode);

      // Use regionCode from locale (e.g., "JO", "SA", "US")
      const localeCountryCode = primaryLocale.regionCode?.toUpperCase();

      if (localeCountryCode) {
        const country = getCountryByCode(localeCountryCode);
        if (country) {
          detectedCountryCode = localeCountryCode;
          detectedCountryName = country.name;
          detectionSource = 'locale';
          console.log('[LocationBootstrap] ✅ Country detected from locale:', detectedCountryName, `(${detectedCountryCode})`);
        } else {
          console.log('[LocationBootstrap] ⚠️ Locale country code not in our list:', localeCountryCode);
        }
      } else {
        console.log('[LocationBootstrap] ⚠️ Locale does not have regionCode');
      }
    } else {
      console.log('[LocationBootstrap] ⚠️ No locales returned from device');
    }
  } catch (error) {
    console.error('[LocationBootstrap] ❌ Error reading device locale:', error);
  }

  // ═══════════════════════════════════════════════════════════════════════
  // STEP 2: GPS + Reverse Geocode (Secondary - Requires Permission)
  // ═══════════════════════════════════════════════════════════════════════
  if (!detectedCountryCode) {
    console.log('[LocationBootstrap] Locale detection failed, trying GPS...');
    try {
      // Request location permission (non-blocking)
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status === 'granted') {
        console.log('[LocationBootstrap] Location permission granted, getting GPS position...');
        
        // Get current position with timeout
        const position = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

        console.log('[LocationBootstrap] GPS position:', position.coords.latitude, position.coords.longitude);

        // Reverse geocode to get country
        const geocodeResults = await Location.reverseGeocodeAsync({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });

        if (geocodeResults && geocodeResults.length > 0) {
          const gpsCountryCode = geocodeResults[0].isoCountryCode?.toUpperCase();
          
          if (gpsCountryCode) {
            const country = getCountryByCode(gpsCountryCode);
            if (country) {
              detectedCountryCode = gpsCountryCode;
              detectedCountryName = country.name;
              detectionSource = 'gps';
              console.log('[LocationBootstrap] ✅ Country detected from GPS:', detectedCountryName, `(${detectedCountryCode})`);
            } else {
              console.log('[LocationBootstrap] ⚠️ GPS country code not in our list:', gpsCountryCode);
            }
          } else {
            console.log('[LocationBootstrap] ⚠️ GPS reverse geocode did not return country code');
          }
        } else {
          console.log('[LocationBootstrap] ⚠️ GPS reverse geocode returned no results');
        }
      } else {
        console.log('[LocationBootstrap] Location permission not granted:', status);
      }
    } catch (error: any) {
      console.warn('[LocationBootstrap] ⚠️ GPS detection failed:', error.message);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // STEP 3: User Profile (Fallback - Previously Saved Country)
  // ═══════════════════════════════════════════════════════════════════════
  if (!detectedCountryCode) {
    console.log('[LocationBootstrap] GPS detection failed, checking user profile...');
    try {
      const userLocation = await authenticatedGet<UserLocationResponse>('/api/users/location');
      
      if (userLocation && userLocation.countryCode) {
        const country = getCountryByCode(userLocation.countryCode);
        if (country) {
          detectedCountryCode = userLocation.countryCode;
          detectedCountryName = userLocation.countryName || country.name;
          detectionSource = 'profile';
          console.log('[LocationBootstrap] ✅ Country detected from user profile:', detectedCountryName, `(${detectedCountryCode})`);
        } else {
          console.log('[LocationBootstrap] ⚠️ Profile country code not in our list:', userLocation.countryCode);
        }
      } else {
        console.log('[LocationBootstrap] ℹ️ No saved location in user profile');
      }
    } catch (error: any) {
      // 404 is expected if user hasn't set location yet
      if (!error.message?.includes('404')) {
        console.warn('[LocationBootstrap] ⚠️ Error fetching user profile location:', error.message);
      } else {
        console.log('[LocationBootstrap] ℹ️ User has not set location yet (404)');
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // STEP 4: Preload Top Cities for Detected Country
  // ═══════════════════════════════════════════════════════════════════════
  let topCities: CityResult[] = [];

  if (detectedCountryCode) {
    console.log('[LocationBootstrap] Preloading top cities for:', detectedCountryName);
    try {
      // Try API first with empty query (should return top cities for country)
      const response: CitySearchResponse = await searchCities('', detectedCountryCode, 10);
      
      if (response.cities && response.cities.length > 0) {
        topCities = response.cities;
        console.log(`[LocationBootstrap] ✅ Preloaded ${topCities.length} cities from ${response.source}`);
      } else {
        console.log('[LocationBootstrap] ⚠️ No cities found for country:', detectedCountryCode);
      }
    } catch (error: any) {
      console.warn('[LocationBootstrap] ⚠️ Failed to preload cities:', error.message);
    }
  } else {
    console.log('[LocationBootstrap] ℹ️ No country detected, skipping city preload');
  }

  // ═══════════════════════════════════════════════════════════════════════
  // RETURN RESULT
  // ═══════════════════════════════════════════════════════════════════════
  const result: LocationBootstrapResult = {
    countryCode: detectedCountryCode,
    countryName: detectedCountryName,
    topCities,
    source: detectionSource,
  };

  console.log('[LocationBootstrap] ✅ Detection complete:', {
    country: detectedCountryName || 'None',
    source: detectionSource,
    citiesPreloaded: topCities.length,
  });

  return result;
}

/**
 * Preload cities for a specific country
 * Useful when user manually selects a country
 * 
 * @param countryCode - ISO 2-letter country code
 * @returns Promise with top cities for the country
 */
export async function preloadCitiesForCountry(countryCode: string): Promise<CityResult[]> {
  console.log('[LocationBootstrap] Preloading cities for country:', countryCode);
  
  try {
    const response: CitySearchResponse = await searchCities('', countryCode, 10);
    console.log(`[LocationBootstrap] ✅ Preloaded ${response.cities.length} cities from ${response.source}`);
    return response.cities;
  } catch (error: any) {
    console.warn('[LocationBootstrap] ⚠️ Failed to preload cities:', error.message);
    return [];
  }
}
