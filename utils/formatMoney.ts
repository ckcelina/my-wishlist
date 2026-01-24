
import { getCurrencyByCode } from '@/constants/currencies';
import { authenticatedPost } from './api';

/**
 * Format a monetary amount with currency code
 * @param amount - The amount to format
 * @param currencyCode - ISO 4217 currency code (e.g., 'USD', 'EUR')
 * @param locale - Optional locale for formatting (defaults to user's locale)
 * @returns Formatted money string (e.g., '$1,234.56', '€1.234,56')
 */
export function formatMoney(
  amount: number | null | undefined,
  currencyCode: string,
  locale?: string
): string {
  if (amount === null || amount === undefined) {
    return 'N/A';
  }

  const currency = getCurrencyByCode(currencyCode);
  
  try {
    // Try to use Intl.NumberFormat for proper localization
    const formatter = new Intl.NumberFormat(locale || undefined, {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: currency?.minorUnits ?? 2,
      maximumFractionDigits: currency?.minorUnits ?? 2,
    });
    
    return formatter.format(amount);
  } catch (error) {
    // Fallback if currency code is not recognized by Intl
    console.warn(`[formatMoney] Failed to format ${currencyCode}:`, error);
    
    // Manual fallback formatting
    const minorUnits = currency?.minorUnits ?? 2;
    const symbol = currency?.symbol || currencyCode;
    
    const formattedAmount = amount.toFixed(minorUnits);
    const parts = formattedAmount.split('.');
    const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    const decimalPart = parts[1];
    
    if (minorUnits === 0) {
      return `${symbol}${integerPart}`;
    }
    
    return `${symbol}${integerPart}.${decimalPart}`;
  }
}

/**
 * Parse a formatted money string back to a number
 * @param moneyString - Formatted money string
 * @returns Parsed number or null if invalid
 */
export function parseMoney(moneyString: string): number | null {
  if (!moneyString) {
    return null;
  }
  
  // Remove currency symbols, spaces, and commas
  const cleaned = moneyString.replace(/[^0-9.-]/g, '');
  const parsed = parseFloat(cleaned);
  
  return isNaN(parsed) ? null : parsed;
}

/**
 * Convert currency amount from one currency to another
 * @param amount - Amount to convert
 * @param fromCurrency - Source currency code
 * @param toCurrency - Target currency code
 * @returns Converted amount or null if conversion unavailable
 */
export async function convertCurrency(
  amount: number,
  fromCurrency: string,
  toCurrency: string
): Promise<number | null> {
  if (fromCurrency === toCurrency) {
    return amount;
  }

  try {
    console.log(`[convertCurrency] Converting ${amount} from ${fromCurrency} to ${toCurrency}`);
    const response = await authenticatedPost<{
      convertedAmount: number | null;
      rate: number | null;
      error?: string;
    }>('/api/convert-currency', {
      fromCurrency,
      toCurrency,
      amount,
    });

    if (response.convertedAmount !== null) {
      console.log(`[convertCurrency] Converted: ${response.convertedAmount} ${toCurrency}`);
      return response.convertedAmount;
    }

    console.warn(`[convertCurrency] Conversion unavailable:`, response.error);
    return null;
  } catch (error) {
    console.error('[convertCurrency] Error converting currency:', error);
    return null;
  }
}

/**
 * Format money with optional currency conversion
 * Shows primary price in original currency and secondary price in user's currency
 * @param amount - Amount to format
 * @param itemCurrency - Item's currency code
 * @param userCurrency - User's preferred currency code
 * @returns Object with primary and secondary formatted strings
 */
export async function formatMoneyWithConversion(
  amount: number | null | undefined,
  itemCurrency: string,
  userCurrency: string
): Promise<{
  primary: string;
  secondary: string | null;
}> {
  const primary = formatMoney(amount, itemCurrency);

  if (amount === null || amount === undefined || itemCurrency === userCurrency) {
    return { primary, secondary: null };
  }

  const converted = await convertCurrency(amount, itemCurrency, userCurrency);
  
  if (converted === null) {
    return { primary, secondary: null };
  }

  const secondary = formatMoney(converted, userCurrency);
  return { primary, secondary };
}
