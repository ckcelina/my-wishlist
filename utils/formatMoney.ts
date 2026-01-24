
import { getCurrencyByCode } from '@/constants/currencies';

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
