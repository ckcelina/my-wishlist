/**
 * Location and store availability helper utilities
 */

/**
 * Normalize city name for consistent comparison
 * - Lowercase
 * - Trim whitespace
 * - Remove extra spaces
 * - Handles common variations
 */
export function normalizeCityName(city: string): string {
  return city
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s]/g, '');
}

/**
 * Compare city names case-insensitively and with whitespace normalization
 */
export function citiesMatch(city1: string | null, city2: string | null): boolean {
  if (!city1 || !city2) return false;
  return normalizeCityName(city1) === normalizeCityName(city2);
}

/**
 * Reason codes for store unavailability
 */
export enum StoreUnavailableReasonCode {
  NO_COUNTRY_MATCH = 'no_country_match',
  NO_CITY_MATCH = 'no_city_match',
  CITY_REQUIRED = 'city_required',
}

/**
 * Get user-friendly message for unavailability reason code
 */
export function getUnavailabilityMessage(
  reasonCode: StoreUnavailableReasonCode
): string {
  const messages: Record<StoreUnavailableReasonCode, string> = {
    [StoreUnavailableReasonCode.NO_COUNTRY_MATCH]: "Doesn't ship to your country",
    [StoreUnavailableReasonCode.NO_CITY_MATCH]: "Doesn't deliver to your city",
    [StoreUnavailableReasonCode.CITY_REQUIRED]: 'Add your city to see if this store delivers to you',
  };
  return messages[reasonCode];
}
