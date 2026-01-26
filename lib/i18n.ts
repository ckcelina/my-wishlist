
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Import all language files
import en from '@/locales/en.json';
import zhHans from '@/locales/zh-Hans.json';
import hi from '@/locales/hi.json';
import es from '@/locales/es.json';
import fr from '@/locales/fr.json';
import ar from '@/locales/ar.json';
import bn from '@/locales/bn.json';
import pt from '@/locales/pt.json';
import ru from '@/locales/ru.json';
import ur from '@/locales/ur.json';
import id from '@/locales/id.json';
import de from '@/locales/de.json';
import ja from '@/locales/ja.json';
import sw from '@/locales/sw.json';
import mr from '@/locales/mr.json';
import te from '@/locales/te.json';
import tr from '@/locales/tr.json';
import ta from '@/locales/ta.json';
import vi from '@/locales/vi.json';
import ko from '@/locales/ko.json';
import it from '@/locales/it.json';
import th from '@/locales/th.json';
import fa from '@/locales/fa.json';
import he from '@/locales/he.json';
import nl from '@/locales/nl.json';
import pl from '@/locales/pl.json';

const LANGUAGE_STORAGE_KEY = '@wishlist_language_preference';
const LANGUAGE_MODE_STORAGE_KEY = '@wishlist_language_mode';

export const RTL_LANGUAGES = ['ar', 'he', 'ur', 'fa'];

export interface SupportedLanguage {
  code: string;
  name: string;
  nativeName: string;
  isRTL?: boolean;
}

export const SUPPORTED_LANGUAGES: SupportedLanguage[] = [
  { code: 'en', name: 'English', nativeName: 'English', isRTL: false },
  { code: 'zh-Hans', name: 'Chinese (Simplified)', nativeName: '简体中文', isRTL: false },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', isRTL: false },
  { code: 'es', name: 'Spanish', nativeName: 'Español', isRTL: false },
  { code: 'fr', name: 'French', nativeName: 'Français', isRTL: false },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', isRTL: true },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা', isRTL: false },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', isRTL: false },
  { code: 'ru', name: 'Russian', nativeName: 'Русский', isRTL: false },
  { code: 'ur', name: 'Urdu', nativeName: 'اردو', isRTL: true },
  { code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia', isRTL: false },
  { code: 'de', name: 'German', nativeName: 'Deutsch', isRTL: false },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', isRTL: false },
  { code: 'sw', name: 'Swahili', nativeName: 'Kiswahili', isRTL: false },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी', isRTL: false },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు', isRTL: false },
  { code: 'tr', name: 'Turkish', nativeName: 'Türkçe', isRTL: false },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்', isRTL: false },
  { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt', isRTL: false },
  { code: 'ko', name: 'Korean', nativeName: '한국어', isRTL: false },
  { code: 'it', name: 'Italian', nativeName: 'Italiano', isRTL: false },
  { code: 'th', name: 'Thai', nativeName: 'ไทย', isRTL: false },
  { code: 'fa', name: 'Persian', nativeName: 'فارسی', isRTL: true },
  { code: 'he', name: 'Hebrew', nativeName: 'עברית', isRTL: true },
  { code: 'nl', name: 'Dutch', nativeName: 'Nederlands', isRTL: false },
  { code: 'pl', name: 'Polish', nativeName: 'Polski', isRTL: false },
];

const resources = {
  en: { translation: en },
  'zh-Hans': { translation: zhHans },
  hi: { translation: hi },
  es: { translation: es },
  fr: { translation: fr },
  ar: { translation: ar },
  bn: { translation: bn },
  pt: { translation: pt },
  ru: { translation: ru },
  ur: { translation: ur },
  id: { translation: id },
  de: { translation: de },
  ja: { translation: ja },
  sw: { translation: sw },
  mr: { translation: mr },
  te: { translation: te },
  tr: { translation: tr },
  ta: { translation: ta },
  vi: { translation: vi },
  ko: { translation: ko },
  it: { translation: it },
  th: { translation: th },
  fa: { translation: fa },
  he: { translation: he },
  nl: { translation: nl },
  pl: { translation: pl },
};

/**
 * Normalize language code to ensure consistency
 * Handles various formats: zh-Hans, zh_Hans, zhCN, etc.
 */
export const normalizeLanguageCode = (code: string): string => {
  if (!code) return 'en';
  
  const normalized = code.toLowerCase().trim();
  
  // Map common variations to our supported codes
  const codeMap: Record<string, string> = {
    'zh': 'zh-Hans',
    'zh-cn': 'zh-Hans',
    'zh_cn': 'zh-Hans',
    'zh-hans': 'zh-Hans',
    'zh_hans': 'zh-Hans',
    'zhcn': 'zh-Hans',
    'zhhans': 'zh-Hans',
  };
  
  // Check if we have a direct mapping
  if (codeMap[normalized]) {
    return codeMap[normalized];
  }
  
  // Check if the code is in our supported languages
  const supportedCodes = SUPPORTED_LANGUAGES.map(l => l.code.toLowerCase());
  if (supportedCodes.includes(normalized)) {
    // Find the original case-sensitive code
    const lang = SUPPORTED_LANGUAGES.find(l => l.code.toLowerCase() === normalized);
    return lang?.code || 'en';
  }
  
  // Try base language (e.g., 'en' from 'en-US')
  const baseLang = normalized.split('-')[0].split('_')[0];
  if (supportedCodes.includes(baseLang)) {
    const lang = SUPPORTED_LANGUAGES.find(l => l.code.toLowerCase() === baseLang);
    return lang?.code || 'en';
  }
  
  console.warn('[i18n] Unsupported language code:', code, '- falling back to English');
  return 'en';
};

/**
 * Validate if a language code is supported
 */
export const isLanguageSupported = (code: string): boolean => {
  const normalized = normalizeLanguageCode(code);
  return SUPPORTED_LANGUAGES.some(l => l.code === normalized);
};

/**
 * Get device language with normalization
 */
export const getDeviceLanguage = (): string => {
  try {
    const locales = Localization.getLocales();
    if (locales && locales.length > 0) {
      const deviceLang = locales[0].languageCode || 'en';
      return normalizeLanguageCode(deviceLang);
    }
  } catch (error) {
    console.error('[i18n] Error getting device language:', error);
  }
  return 'en';
};

/**
 * Check if language is RTL
 */
export const isRTL = (languageCode: string): boolean => {
  const normalized = normalizeLanguageCode(languageCode);
  return RTL_LANGUAGES.includes(normalized);
};

/**
 * Get stored language preference with validation
 */
export const getStoredLanguage = async (): Promise<string | null> => {
  try {
    const stored = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (!stored) return null;
    
    // Validate and normalize the stored language
    const normalized = normalizeLanguageCode(stored);
    if (!isLanguageSupported(normalized)) {
      console.warn('[i18n] Stored language not supported:', stored);
      return null;
    }
    
    return normalized;
  } catch (error) {
    console.error('[i18n] Error getting stored language:', error);
    return null;
  }
};

/**
 * Get stored language mode
 */
export const getStoredLanguageMode = async (): Promise<'system' | 'manual'> => {
  try {
    const mode = await AsyncStorage.getItem(LANGUAGE_MODE_STORAGE_KEY);
    return mode === 'manual' ? 'manual' : 'system';
  } catch (error) {
    console.error('[i18n] Error getting stored language mode:', error);
    return 'system';
  }
};

/**
 * Store language preference with validation
 */
export const storeLanguage = async (languageCode: string): Promise<void> => {
  try {
    const normalized = normalizeLanguageCode(languageCode);
    if (!isLanguageSupported(normalized)) {
      console.error('[i18n] Cannot store unsupported language:', languageCode);
      return;
    }
    await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, normalized);
  } catch (error) {
    console.error('[i18n] Error storing language:', error);
  }
};

/**
 * Store language mode
 */
export const storeLanguageMode = async (mode: 'system' | 'manual'): Promise<void> => {
  try {
    await AsyncStorage.setItem(LANGUAGE_MODE_STORAGE_KEY, mode);
  } catch (error) {
    console.error('[i18n] Error storing language mode:', error);
  }
};

// Track i18n initialization state
let isI18nInitialized = false;

/**
 * Initialize i18n with safe defaults
 */
i18n
  .use(initReactI18next)
  .init({
    compatibilityJSON: 'v3',
    resources,
    lng: 'en',
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    },
    // Return key if translation is missing
    returnNull: false,
    returnEmptyString: false,
    saveMissing: true,
    missingKeyHandler: (lngs, ns, key, fallbackValue) => {
      console.warn('[i18n] Missing translation key:', key, 'in languages:', lngs);
    },
  })
  .then(() => {
    isI18nInitialized = true;
    console.log('[i18n] i18next initialized successfully');
  })
  .catch((error) => {
    console.error('[i18n] Failed to initialize i18next:', error);
    isI18nInitialized = true; // Set to true anyway to prevent blocking
  });

/**
 * Check if i18n is ready
 */
export const isI18nReady = (): boolean => {
  return isI18nInitialized && i18n.isInitialized;
};

/**
 * Initialize language based on stored preference or device language
 */
export const initializeI18n = async (): Promise<string> => {
  try {
    console.log('[i18n] Initializing i18n');
    
    // Wait for i18n to be ready
    let attempts = 0;
    while (!isI18nReady() && attempts < 50) {
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }
    
    if (!isI18nReady()) {
      console.error('[i18n] i18n failed to initialize after waiting');
      return 'en';
    }
    
    const mode = await getStoredLanguageMode();
    let languageToUse = 'en';
    
    if (mode === 'manual') {
      const storedLang = await getStoredLanguage();
      if (storedLang && isLanguageSupported(storedLang)) {
        languageToUse = storedLang;
        console.log('[i18n] Using manual language:', languageToUse);
      } else {
        languageToUse = getDeviceLanguage();
        console.log('[i18n] No valid stored language, using device language:', languageToUse);
      }
    } else {
      languageToUse = getDeviceLanguage();
      console.log('[i18n] Using system language:', languageToUse);
    }
    
    // Validate before setting
    const normalized = normalizeLanguageCode(languageToUse);
    if (!isLanguageSupported(normalized)) {
      console.warn('[i18n] Language not supported:', languageToUse, '- using English');
      languageToUse = 'en';
    } else {
      languageToUse = normalized;
    }
    
    await i18n.changeLanguage(languageToUse);
    console.log('[i18n] Language set to:', languageToUse);
    
    return languageToUse;
  } catch (error) {
    console.error('[i18n] Error initializing i18n:', error);
    try {
      await i18n.changeLanguage('en');
    } catch (fallbackError) {
      console.error('[i18n] Failed to set fallback language:', fallbackError);
    }
    return 'en';
  }
};

/**
 * Change language with validation and normalization
 */
export const changeLanguage = async (languageCode: string, mode: 'system' | 'manual' = 'manual'): Promise<void> => {
  try {
    console.log('[i18n] Changing language to:', languageCode, 'mode:', mode);
    
    // Normalize and validate
    const normalized = normalizeLanguageCode(languageCode);
    if (!isLanguageSupported(normalized)) {
      throw new Error(`Language not supported: ${languageCode}`);
    }
    
    await i18n.changeLanguage(normalized);
    await storeLanguage(normalized);
    await storeLanguageMode(mode);
    
    console.log('[i18n] Language changed successfully to:', normalized);
  } catch (error) {
    console.error('[i18n] Error changing language:', error);
    throw error;
  }
};

/**
 * Safe translation function that never throws
 * Returns fallback text if translation is missing
 */
export const safeTranslate = (key: string, options?: any): string => {
  try {
    if (!isI18nReady()) {
      console.warn('[i18n] i18n not ready, returning key:', key);
      return `[${key}]`;
    }
    
    const translation = i18n.t(key, options);
    
    // Check if translation is missing (i18next returns the key if not found)
    if (!translation || translation === key) {
      // Try English fallback
      const englishTranslation = i18n.t(key, { ...options, lng: 'en' });
      if (englishTranslation && englishTranslation !== key) {
        console.warn('[i18n] Using English fallback for key:', key);
        return englishTranslation;
      }
      
      // Return key in brackets as last resort
      console.warn('[i18n] Missing translation for key:', key);
      return `[${key}]`;
    }
    
    return translation;
  } catch (error) {
    console.error('[i18n] Translation error for key:', key, error);
    return `[${key}]`;
  }
};

export default i18n;
