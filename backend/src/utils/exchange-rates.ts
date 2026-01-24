/**
 * Exchange rate caching and conversion utility
 * Uses a simple in-memory cache for exchange rates
 */

interface ExchangeRateCache {
  rate: number;
  timestamp: number;
}

const CACHE_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours
const exchangeRateCache = new Map<string, ExchangeRateCache>();

/**
 * Get cache key for currency pair
 */
function getCacheKey(fromCode: string, toCode: string): string {
  return `${fromCode.toUpperCase()}_${toCode.toUpperCase()}`;
}

/**
 * Get cached exchange rate if available and not expired
 */
function getCachedRate(fromCode: string, toCode: string): number | null {
  if (fromCode.toUpperCase() === toCode.toUpperCase()) {
    return 1; // Same currency, always 1:1
  }

  const key = getCacheKey(fromCode, toCode);
  const cached = exchangeRateCache.get(key);

  if (cached && Date.now() - cached.timestamp < CACHE_DURATION_MS) {
    return cached.rate;
  }

  return null;
}

/**
 * Cache an exchange rate
 */
function cacheRate(fromCode: string, toCode: string, rate: number): void {
  const key = getCacheKey(fromCode, toCode);
  exchangeRateCache.set(key, {
    rate,
    timestamp: Date.now(),
  });
}

/**
 * Simplified exchange rate table for common currency pairs
 * In production, you would fetch these from an API like Open Exchange Rates or Fixer.io
 */
const SAMPLE_RATES: Record<string, Record<string, number>> = {
  USD: {
    EUR: 0.92,
    GBP: 0.79,
    JPY: 149.5,
    AUD: 1.53,
    CAD: 1.36,
    CHF: 0.88,
    CNY: 7.25,
    INR: 83.12,
    MXN: 17.05,
    SGD: 1.35,
  },
  EUR: {
    USD: 1.09,
    GBP: 0.86,
    JPY: 162.59,
    AUD: 1.66,
    CAD: 1.48,
    CHF: 0.96,
    CNY: 7.88,
    INR: 90.36,
    MXN: 18.54,
    SGD: 1.47,
  },
  GBP: {
    USD: 1.27,
    EUR: 1.16,
    JPY: 189.08,
    AUD: 1.93,
    CAD: 1.72,
    CHF: 1.12,
    CNY: 9.16,
    INR: 105.06,
    MXN: 21.54,
    SGD: 1.71,
  },
};

/**
 * Convert amount from one currency to another
 * Returns null if conversion is not available
 */
export async function convertCurrency(
  fromCode: string,
  toCode: string,
  amount: number
): Promise<{ convertedAmount: number; rate: number } | null> {
  try {
    // Check if same currency
    if (fromCode.toUpperCase() === toCode.toUpperCase()) {
      return { convertedAmount: amount, rate: 1 };
    }

    // Check cache first
    let rate = getCachedRate(fromCode, toCode);

    if (rate === null) {
      // Try to get from sample rates
      const fromRates = SAMPLE_RATES[fromCode.toUpperCase()];
      if (fromRates && fromRates[toCode.toUpperCase()]) {
        rate = fromRates[toCode.toUpperCase()];
        cacheRate(fromCode, toCode, rate);
      } else {
        // In production, call external API here
        // For now, return null if not in sample rates
        return null;
      }
    }

    const convertedAmount = amount * rate;
    return { convertedAmount, rate };
  } catch (error) {
    // Silently fail - return null instead of throwing
    return null;
  }
}

/**
 * Clear cache (useful for testing)
 */
export function clearExchangeRateCache(): void {
  exchangeRateCache.clear();
}
