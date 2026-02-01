
/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🌍 LOCATION BOOTSTRAP SERVICE - AUTOMATIC COUNTRY DETECTION & CITY PRELOADING
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * This service provides automatic location detection on app startup:
 * - Primary: Device locale region via expo-localization (e.g., en-JO -> JO)
 * - Fallback: "US" if detection fails
 * - Preloads top cities for detected country
 * 
 * IMPORTANT: Does NOT silently overwrite user profile - only suggests defaults
 */

import * as Localization from 'expo-localization';
import { getCountryByCode } from '@/constants/countries';
import { searchCities, CityResult, CitySearchResponse } from './citySearch';

export interface LocationBootstrapResult {
  countryCode: string | null;
  countryName: string | null;
  topCities: CityResult[];
  source: 'locale' | 'fallback';
}

/**
 * Determine default location using expo-localization
 * 
 * Priority:
 * 1. Device locale region (fastest, most reliable)
 * 2. Fallback to "US" if detection fails
 * 
 * @returns Promise with detected country and preloaded cities
 */
export async function determineDefaultLocation(): Promise<LocationBootstrapResult> {
  console.log('[LocationBootstrap] Starting automatic location detection');

  let detectedCountryCode: string | null = null;
  let detectedCountryName: string | null = null;
  let detectionSource: 'locale' | 'fallback' = 'fallback';

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
  // STEP 2: Fallback to "US" if detection failed
  // ═══════════════════════════════════════════════════════════════════════
  if (!detectedCountryCode) {
    console.log('[LocationBootstrap] Locale detection failed, falling back to US');
    const fallbackCountry = getCountryByCode('US');
    if (fallbackCountry) {
      detectedCountryCode = 'US';
      detectedCountryName = fallbackCountry.name;
      detectionSource = 'fallback';
      console.log('[LocationBootstrap] ✅ Using fallback country: United States (US)');
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // STEP 3: Preload Top Cities for Detected Country
  // ═══════════════════════════════════════════════════════════════════════
  let topCities: CityResult[] = [];

  if (detectedCountryCode) {
    console.log('[LocationBootstrap] Preloading top cities for:', detectedCountryName);
    try {
      // Search with empty query to get top cities for country
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
