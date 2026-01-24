
import i18n from '@/lib/i18n';
import * as Localization from 'expo-localization';

// Get current locale for formatting
export const getCurrentLocale = (): string => {
  const currentLang = i18n.language || 'en';
  
  // Map language codes to locale codes
  const localeMap: Record<string, string> = {
    'en': 'en-US',
    'zh-Hans': 'zh-CN',
    'hi': 'hi-IN',
    'es': 'es-ES',
    'fr': 'fr-FR',
    'ar': 'ar-SA',
    'bn': 'bn-BD',
    'pt': 'pt-BR',
    'ru': 'ru-RU',
    'ur': 'ur-PK',
    'id': 'id-ID',
    'de': 'de-DE',
    'ja': 'ja-JP',
    'sw': 'sw-KE',
    'mr': 'mr-IN',
    'te': 'te-IN',
    'tr': 'tr-TR',
    'ta': 'ta-IN',
    'vi': 'vi-VN',
    'ko': 'ko-KR',
    'it': 'it-IT',
    'th': 'th-TH',
    'fa': 'fa-IR',
    'he': 'he-IL',
    'nl': 'nl-NL',
    'pl': 'pl-PL',
  };
  
  return localeMap[currentLang] || 'en-US';
};

// Format money with locale awareness
export const formatMoney = (
  amount: number | null | undefined,
  currencyCode: string = 'USD'
): string => {
  if (amount === null || amount === undefined) {
    return i18n.t('items.noPriceAvailable');
  }
  
  try {
    const locale = getCurrentLocale();
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch (error) {
    console.error('[formatMoney] Error formatting:', error);
    // Fallback to simple format
    return `${currencyCode} ${amount.toFixed(2)}`;
  }
};

// Format date with locale awareness
export const formatDate = (date: Date | string): string => {
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const locale = getCurrentLocale();
    
    return new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(dateObj);
  } catch (error) {
    console.error('[formatDate] Error formatting:', error);
    return String(date);
  }
};

// Format relative time (e.g., "2 days ago")
export const formatRelativeTime = (date: Date | string): string => {
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const now = new Date();
    const diffMs = now.getTime() - dateObj.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);
    const diffWeeks = Math.floor(diffDays / 7);
    const diffMonths = Math.floor(diffDays / 30);
    const diffYears = Math.floor(diffDays / 365);
    
    if (diffSeconds < 60) {
      return i18n.t('time.justNow');
    } else if (diffMinutes < 60) {
      return i18n.t('time.minuteAgo', { count: diffMinutes });
    } else if (diffHours < 24) {
      return i18n.t('time.hourAgo', { count: diffHours });
    } else if (diffDays < 7) {
      return i18n.t('time.dayAgo', { count: diffDays });
    } else if (diffWeeks < 4) {
      return i18n.t('time.weekAgo', { count: diffWeeks });
    } else if (diffMonths < 12) {
      return i18n.t('time.monthAgo', { count: diffMonths });
    } else {
      return i18n.t('time.yearAgo', { count: diffYears });
    }
  } catch (error) {
    console.error('[formatRelativeTime] Error formatting:', error);
    return String(date);
  }
};

// Format number with locale awareness
export const formatNumber = (num: number): string => {
  try {
    const locale = getCurrentLocale();
    return new Intl.NumberFormat(locale).format(num);
  } catch (error) {
    console.error('[formatNumber] Error formatting:', error);
    return String(num);
  }
};

// Format percentage
export const formatPercentage = (value: number): string => {
  try {
    const locale = getCurrentLocale();
    return new Intl.NumberFormat(locale, {
      style: 'percent',
      minimumFractionDigits: 0,
      maximumFractionDigits: 1,
    }).format(value / 100);
  } catch (error) {
    console.error('[formatPercentage] Error formatting:', error);
    return `${value}%`;
  }
};
