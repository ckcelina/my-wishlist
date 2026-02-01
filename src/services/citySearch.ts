
/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🌍 CITY SEARCH SERVICE - REMOTE + LOCAL FALLBACK
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * This service provides robust city search with:
 * - Primary: Remote search via Supabase Edge Function (location-search-cities)
 * - Fallback: Local search from bundled cities.min.json dataset + majorCitiesByCountry.json
 * - Normalization: Lowercase, trim, remove diacritics for consistent matching
 * - Scoring: Prefix matches > substring matches, country match boost
 * - Consistent result shape for UI regardless of source
 * 
 * UX Rules (as per requirements):
 * - Debounce: 250-400ms (implemented in CityPicker component)
 * - Show spinner while searching online
 * - If API fails → auto fallback to local
 * - Label fallback results as "Offline results"
 */

import { callEdgeFunction } from '@/utils/api';
import majorCitiesByCountry from '@/src/data/cities/majorCitiesByCountry.json';

export interface CityResult {
  id?: string;
  name: string;
  region: string | null;
  countryCode: string;
  countryName: string;
  lat: number | null;
  lng: number | null;
  lon?: number | null; // Alternative field name
  geonameId: string | null;
  admin1?: string | null; // Alternative field name for region
}

export interface CitySearchResponse {
  cities: CityResult[];
  source: 'remote' | 'local';
}

// Local city dataset (loaded once on first use)
let localCities: CityResult[] | null = null;
let loadingPromise: Promise<void> | null = null;

/**
 * Load local cities dataset from bundled JSON file
 * Uses singleton pattern to load only once
 */
async function loadLocalCities(): Promise<void> {
  // If already loaded, return immediately
  if (localCities !== null) {
    return;
  }

  // If currently loading, wait for existing load
  if (loadingPromise !== null) {
    return loadingPromise;
  }

  // Start loading
  loadingPromise = (async () => {
    try {
      if (__DEV__) {
        console.log('[CitySearch] Loading local cities dataset...');
      }

      // Load from bundled asset
      const citiesData = require('@/assets/data/cities.min.json');
      
      // Normalize field names (handle both lon/lng and admin1/region)
      localCities = citiesData.map((city: any) => ({
        id: city.id || city.geonameId,
        name: city.name,
        region: city.region || city.admin1 || null,
        countryCode: city.countryCode,
        countryName: city.countryName,
        lat: city.lat,
        lng: city.lng || city.lon,
        lon: city.lon || city.lng,
        geonameId: city.id || city.geonameId,
        admin1: city.admin1 || city.region || null,
      }));

      if (__DEV__) {
        console.log(`[CitySearch] Loaded ${localCities.length} local cities`);
      }
    } catch (error) {
      console.error('[CitySearch] Failed to load local cities:', error);
      localCities = []; // Set to empty array to prevent retry loops
    } finally {
      loadingPromise = null;
    }
  })();

  return loadingPromise;
}

/**
 * Normalize string for consistent matching
 * - Lowercase
 * - Trim whitespace
 * - Remove diacritics (é → e, ñ → n, etc.)
 */
function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .normalize('NFD') // Decompose combined characters
    .replace(/[\u0300-\u036f]/g, ''); // Remove diacritics
}

/**
 * Score a city based on query match quality
 * Higher score = better match
 * 
 * Scoring rules:
 * - Prefix match on city name: +100
 * - Substring match on city name: +50
 * - Prefix match on region/admin1: +70
 * - Substring match on region/admin1: +30
 * - Exact country match: +20
 */
function scoreCity(
  city: CityResult,
  normalizedQuery: string,
  normalizedCountryCode?: string
): number {
  const normalizedCityName = normalizeString(city.name);
  const normalizedRegion = city.region ? normalizeString(city.region) : '';
  const normalizedAdmin1 = city.admin1 ? normalizeString(city.admin1) : '';
  
  let score = 0;

  // City name matching
  if (normalizedCityName.startsWith(normalizedQuery)) {
    score += 100; // Prefix match is best
  } else if (normalizedCityName.includes(normalizedQuery)) {
    score += 50; // Substring match is good
  }

  // Region/admin1 matching
  const regionToCheck = normalizedRegion || normalizedAdmin1;
  if (regionToCheck) {
    if (regionToCheck.startsWith(normalizedQuery)) {
      score += 70;
    } else if (regionToCheck.includes(normalizedQuery)) {
      score += 30;
    }
  }

  // Country match boost
  if (normalizedCountryCode && normalizeString(city.countryCode) === normalizedCountryCode) {
    score += 20;
  }

  return score;
}

/**
 * Search major cities from static JSON (ultra-fast fallback)
 * Returns cities from majorCitiesByCountry.json
 */
function searchMajorCities(
  query: string,
  countryCode?: string,
  limit: number = 20
): CityResult[] {
  const normalizedQuery = normalizeString(query);
  const normalizedCountryCode = countryCode ? normalizeString(countryCode) : undefined;

  if (__DEV__) {
    console.log('[CitySearch] Searching major cities:', {
      query: normalizedQuery,
      countryCode: normalizedCountryCode,
      limit,
    });
  }

  // If country code is specified, search only that country's cities
  if (normalizedCountryCode) {
    const countryKey = normalizedCountryCode.toUpperCase();
    const majorCitiesData = majorCitiesByCountry as Record<string, string[]>;
    const countryCities = majorCitiesData[countryKey] || [];

    if (__DEV__) {
      console.log(`[CitySearch] Found ${countryCities.length} major cities for ${countryKey}`);
    }

    // If query is empty, return all major cities for the country
    if (!normalizedQuery) {
      return countryCities.slice(0, limit).map((cityName) => ({
        name: cityName,
        region: null,
        countryCode: countryKey,
        countryName: countryKey, // We don't have full country names in this dataset
        lat: null,
        lng: null,
        geonameId: null,
      }));
    }

    // Filter by query (case-insensitive, diacritics-insensitive)
    const filtered = countryCities
      .filter((cityName) => normalizeString(cityName).includes(normalizedQuery))
      .slice(0, limit)
      .map((cityName) => ({
        name: cityName,
        region: null,
        countryCode: countryKey,
        countryName: countryKey,
        lat: null,
        lng: null,
        geonameId: null,
      }));

    if (__DEV__) {
      console.log(`[CitySearch] Major cities search found ${filtered.length} matches`);
    }

    return filtered;
  }

  // If no country code, search all major cities
  const majorCitiesData = majorCitiesByCountry as Record<string, string[]>;
  const allResults: CityResult[] = [];

  for (const [countryKey, cities] of Object.entries(majorCitiesData)) {
    for (const cityName of cities) {
      if (normalizeString(cityName).includes(normalizedQuery)) {
        allResults.push({
          name: cityName,
          region: null,
          countryCode: countryKey,
          countryName: countryKey,
          lat: null,
          lng: null,
          geonameId: null,
        });

        if (allResults.length >= limit) {
          break;
        }
      }
    }

    if (allResults.length >= limit) {
      break;
    }
  }

  if (__DEV__) {
    console.log(`[CitySearch] Major cities global search found ${allResults.length} matches`);
  }

  return allResults;
}

/**
 * Search local cities dataset
 * Returns scored and sorted results
 * If query is empty, returns top cities for the country
 */
function searchLocalCities(
  query: string,
  countryCode?: string,
  limit: number = 20
): CityResult[] {
  if (!localCities || localCities.length === 0) {
    if (__DEV__) {
      console.warn('[CitySearch] Local cities not loaded yet, using major cities fallback');
    }
    return searchMajorCities(query, countryCode, limit);
  }

  const normalizedQuery = normalizeString(query);
  const normalizedCountryCode = countryCode ? normalizeString(countryCode) : undefined;

  if (__DEV__) {
    console.log('[CitySearch] Searching local cities:', {
      query: normalizedQuery,
      countryCode: normalizedCountryCode,
      limit,
    });
  }

  // If query is empty and country is specified, return top cities for that country
  if (!normalizedQuery && normalizedCountryCode) {
    if (__DEV__) {
      console.log('[CitySearch] Empty query with country - returning top cities');
    }
    
    const countryCities = localCities
      .filter(city => normalizeString(city.countryCode) === normalizedCountryCode)
      .slice(0, limit);
    
    if (__DEV__) {
      console.log(`[CitySearch] Found ${countryCities.length} top cities for country`);
    }
    
    return countryCities;
  }

  // Score all cities
  const scoredCities = localCities
    .map(city => ({
      city,
      score: scoreCity(city, normalizedQuery, normalizedCountryCode),
    }))
    .filter(item => item.score > 0) // Only include matches
    .sort((a, b) => b.score - a.score); // Sort by score descending

  // Deduplicate by city name + country code
  const uniqueCities = new Map<string, CityResult>();
  for (const item of scoredCities) {
    const key = `${normalizeString(item.city.name)}-${normalizeString(item.city.countryCode)}`;
    if (!uniqueCities.has(key)) {
      uniqueCities.set(key, item.city);
    }
    if (uniqueCities.size >= limit) {
      break;
    }
  }

  const results = Array.from(uniqueCities.values());

  if (__DEV__) {
    console.log(`[CitySearch] Local search found ${results.length} cities`);
  }

  return results;
}

/**
 * Search cities with remote API + local fallback
 * 
 * Flow:
 * 1. Try remote Edge Function (location-search-cities)
 * 2. If remote fails or returns empty, use local dataset
 * 3. If local dataset not loaded, use major cities JSON
 * 4. Return consistent result shape with source indicator
 * 
 * @param query - Search query (city name)
 * @param countryCode - Optional country filter (ISO 2-letter code)
 * @param limit - Maximum results to return (default: 20)
 * @returns Promise with cities array and source indicator
 */
export async function searchCities(
  query: string,
  countryCode?: string,
  limit: number = 20
): Promise<CitySearchResponse> {
  // Ensure local cities are loaded (for fallback)
  await loadLocalCities();

  if (__DEV__) {
    console.log('[CitySearch] Starting city search:', { query, countryCode, limit });
  }

  // Try remote search first
  try {
    if (__DEV__) {
      console.log('[CitySearch] Attempting remote search via Edge Function...');
    }

    const response = await callEdgeFunction<{ results: CityResult[] }>(
      'location-search-cities',
      {
        method: 'POST',
        body: {
          query,
          countryCode,
          limit,
        },
      }
    );

    if (response && response.results && response.results.length > 0) {
      if (__DEV__) {
        console.log(`[CitySearch] Remote search successful: ${response.results.length} cities`);
      }

      // Normalize field names for consistency
      const normalizedResults = response.results.map(city => ({
        ...city,
        region: city.region || city.admin1 || null,
        lng: city.lng || city.lon,
        lon: city.lon || city.lng,
        geonameId: city.geonameId || city.id || null,
      }));

      return {
        cities: normalizedResults,
        source: 'remote',
      };
    } else {
      if (__DEV__) {
        console.log('[CitySearch] Remote search returned no results, using local fallback');
      }
    }
  } catch (error: any) {
    if (__DEV__) {
      console.warn('[CitySearch] Remote search failed, using local fallback:', error.message);
    }
  }

  // Fallback to local search
  if (__DEV__) {
    console.log('[CitySearch] Using local fallback search');
  }

  const localResults = searchLocalCities(query, countryCode, limit);

  return {
    cities: localResults,
    source: 'local',
  };
}

/**
 * Preload local cities dataset
 * Call this on app startup to avoid delay on first search
 */
export async function preloadLocalCities(): Promise<void> {
  await loadLocalCities();
}
