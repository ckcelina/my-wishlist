
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

export const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'zh-Hans', name: 'Chinese (Simplified)', nativeName: '简体中文' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
  { code: 'es', name: 'Spanish', nativeName: 'Español' },
  { code: 'fr', name: 'French', nativeName: 'Français' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', rtl: true },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский' },
  { code: 'ur', name: 'Urdu', nativeName: 'اردو', rtl: true },
  { code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia' },
  { code: 'de', name: 'German', nativeName: 'Deutsch' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語' },
  { code: 'sw', name: 'Swahili', nativeName: 'Kiswahili' },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు' },
  { code: 'tr', name: 'Turkish', nativeName: 'Türkçe' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்' },
  { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt' },
  { code: 'ko', name: 'Korean', nativeName: '한국어' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano' },
  { code: 'th', name: 'Thai', nativeName: 'ไทย' },
  { code: 'fa', name: 'Persian', nativeName: 'فارسی', rtl: true },
  { code: 'he', name: 'Hebrew', nativeName: 'עברית', rtl: true },
  { code: 'nl', name: 'Dutch', nativeName: 'Nederlands' },
  { code: 'pl', name: 'Polish', nativeName: 'Polski' },
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

// Get device language
export const getDeviceLanguage = (): string => {
  const locales = Localization.getLocales();
  if (locales && locales.length > 0) {
    const deviceLang = locales[0].languageCode || 'en';
    // Check if we support this language
    const supportedCodes = SUPPORTED_LANGUAGES.map(l => l.code);
    if (supportedCodes.includes(deviceLang)) {
      return deviceLang;
    }
    // Check for language without region (e.g., 'zh' from 'zh-CN')
    const baseLang = deviceLang.split('-')[0];
    if (supportedCodes.includes(baseLang)) {
      return baseLang;
    }
  }
  return 'en';
};

// Check if language is RTL
export const isRTL = (languageCode: string): boolean => {
  return RTL_LANGUAGES.includes(languageCode);
};

// Get stored language preference
export const getStoredLanguage = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
  } catch (error) {
    console.error('[i18n] Error getting stored language:', error);
    return null;
  }
};

// Get stored language mode
export const getStoredLanguageMode = async (): Promise<'system' | 'manual'> => {
  try {
    const mode = await AsyncStorage.getItem(LANGUAGE_MODE_STORAGE_KEY);
    return mode === 'manual' ? 'manual' : 'system';
  } catch (error) {
    console.error('[i18n] Error getting stored language mode:', error);
    return 'system';
  }
};

// Store language preference
export const storeLanguage = async (languageCode: string): Promise<void> => {
  try {
    await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, languageCode);
  } catch (error) {
    console.error('[i18n] Error storing language:', error);
  }
};

// Store language mode
export const storeLanguageMode = async (mode: 'system' | 'manual'): Promise<void> => {
  try {
    await AsyncStorage.setItem(LANGUAGE_MODE_STORAGE_KEY, mode);
  } catch (error) {
    console.error('[i18n] Error storing language mode:', error);
  }
};

// Initialize i18n
i18n
  .use(initReactI18next)
  .init({
    compatibilityJSON: 'v3',
    resources,
    lng: 'en', // Will be set properly in initializeI18n
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    },
  });

// Initialize language based on stored preference or device language
export const initializeI18n = async (): Promise<string> => {
  try {
    console.log('[i18n] Initializing i18n');
    
    const mode = await getStoredLanguageMode();
    let languageToUse = 'en';
    
    if (mode === 'manual') {
      const storedLang = await getStoredLanguage();
      if (storedLang) {
        languageToUse = storedLang;
        console.log('[i18n] Using manual language:', languageToUse);
      } else {
        languageToUse = getDeviceLanguage();
        console.log('[i18n] No stored language, using device language:', languageToUse);
      }
    } else {
      languageToUse = getDeviceLanguage();
      console.log('[i18n] Using system language:', languageToUse);
    }
    
    await i18n.changeLanguage(languageToUse);
    console.log('[i18n] Language set to:', languageToUse);
    
    return languageToUse;
  } catch (error) {
    console.error('[i18n] Error initializing i18n:', error);
    await i18n.changeLanguage('en');
    return 'en';
  }
};

// Change language
export const changeLanguage = async (languageCode: string, mode: 'system' | 'manual' = 'manual'): Promise<void> => {
  try {
    console.log('[i18n] Changing language to:', languageCode, 'mode:', mode);
    await i18n.changeLanguage(languageCode);
    await storeLanguage(languageCode);
    await storeLanguageMode(mode);
  } catch (error) {
    console.error('[i18n] Error changing language:', error);
    throw error;
  }
};

export default i18n;
