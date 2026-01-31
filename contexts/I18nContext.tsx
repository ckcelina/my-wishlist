
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { I18nManager, Platform } from 'react-native';
import { useTranslation } from 'react-i18next';
import { 
  initializeI18n, 
  changeLanguage as changeI18nLanguage, 
  isRTL, 
  SUPPORTED_LANGUAGES,
  safeTranslate,
  isI18nReady,
  normalizeLanguageCode,
  isLanguageSupported,
} from '@/lib/i18n';
import { useAuth } from './AuthContext';
import { getTranslationDebugEnabled, setTranslationDebugEnabled } from '@/utils/translationDebug';

interface I18nContextType {
  currentLanguage: string;
  languageMode: 'system' | 'manual';
  isRTL: boolean;
  translationDebugEnabled: boolean;
  isI18nReady: boolean;
  changeLanguage: (languageCode: string, mode?: 'system' | 'manual') => Promise<void>;
  toggleTranslationDebug: () => Promise<void>;
  t: (key: string, options?: any) => string;
  loading: boolean;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export function I18nProvider({ children }: { children: ReactNode }) {
  const { i18n } = useTranslation();
  const { user } = useAuth();
  const [currentLanguage, setCurrentLanguage] = useState('en');
  const [languageMode, setLanguageMode] = useState<'system' | 'manual'>('system');
  const [rtl, setRtl] = useState(false);
  const [translationDebugEnabled, setTranslationDebugState] = useState(false);
  const [loading, setLoading] = useState(true);
  const [i18nReadyState, setI18nReadyState] = useState(false);

  // Initialize i18n on mount
  useEffect(() => {
    console.log('[I18nContext] Initializing i18n');
    initializeLanguage();
    loadTranslationDebugMode();
  }, []);

  // Load user preferences when user changes
  useEffect(() => {
    if (user && i18nReadyState) {
      console.log('[I18nContext] User logged in, loading preferences');
      loadUserPreferences();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, i18nReadyState]);

  const initializeLanguage = async () => {
    try {
      console.log('[I18nContext] Starting language initialization');
      const lang = await initializeI18n();
      
      // Validate the language
      const normalizedLang = normalizeLanguageCode(lang);
      if (!isLanguageSupported(normalizedLang)) {
        console.error('[I18nContext] Initialized language not supported:', lang);
        setCurrentLanguage('en');
        setRtl(false);
      } else {
        setCurrentLanguage(normalizedLang);
        setRtl(isRTL(normalizedLang));
      }
      
      // Set RTL layout if needed
      if (Platform.OS !== 'web') {
        const shouldBeRTL = isRTL(normalizedLang);
        if (I18nManager.isRTL !== shouldBeRTL) {
          I18nManager.forceRTL(shouldBeRTL);
          console.log('[I18nContext] RTL changed, app restart may be needed');
        }
      }
      
      setI18nReadyState(true);
      console.log('[I18nContext] Language initialization complete:', normalizedLang);
    } catch (error) {
      console.error('[I18nContext] Error initializing language:', error);
      // Set safe defaults
      setCurrentLanguage('en');
      setRtl(false);
      setI18nReadyState(true);
    } finally {
      setLoading(false);
    }
  };

  const loadTranslationDebugMode = async () => {
    try {
      const enabled = await getTranslationDebugEnabled();
      setTranslationDebugState(enabled);
      console.log('[I18nContext] Translation debug mode:', enabled);
    } catch (error) {
      console.error('[I18nContext] Error loading translation debug mode:', error);
    }
  };

  const loadUserPreferences = async () => {
    try {
      if (!user?.id) {
        console.log('[I18nContext] No user ID, skipping preferences load');
        return;
      }
      
      const { fetchLanguagePreferences } = await import('@/lib/supabase-helpers');
      const response = await fetchLanguagePreferences(user.id);
      
      if (response) {
        console.log('[I18nContext] Loaded user preferences:', response);
        setLanguageMode(response.languageMode);
        
        if (response.languageMode === 'manual' && response.languageCode) {
          // Validate and normalize the language code
          const normalizedCode = normalizeLanguageCode(response.languageCode);
          if (isLanguageSupported(normalizedCode)) {
            await changeI18nLanguage(normalizedCode, response.languageMode);
            setCurrentLanguage(normalizedCode);
            setRtl(isRTL(normalizedCode));
          } else {
            console.warn('[I18nContext] User preference language not supported:', response.languageCode);
          }
        }
      }
    } catch (error) {
      console.error('[I18nContext] Error loading user preferences:', error);
    }
  };

  const changeLanguage = async (languageCode: string, mode: 'system' | 'manual' = 'manual') => {
    try {
      console.log('[I18nContext] Changing language to:', languageCode, 'mode:', mode);
      
      // Validate and normalize
      const normalizedCode = normalizeLanguageCode(languageCode);
      if (!isLanguageSupported(normalizedCode)) {
        throw new Error(`Language not supported: ${languageCode}`);
      }
      
      // Change language in i18n
      await changeI18nLanguage(normalizedCode, mode);
      setCurrentLanguage(normalizedCode);
      setLanguageMode(mode);
      
      // Update RTL
      const shouldBeRTL = isRTL(normalizedCode);
      setRtl(shouldBeRTL);
      
      // Set RTL layout if needed (native only)
      if (Platform.OS !== 'web') {
        if (I18nManager.isRTL !== shouldBeRTL) {
          I18nManager.forceRTL(shouldBeRTL);
          console.log('[I18nContext] RTL changed, app restart may be needed');
        }
      }
      
      // Sync to backend if user is logged in
      if (user?.id) {
        try {
          const { updateLanguagePreferences } = await import('@/lib/supabase-helpers');
          await updateLanguagePreferences(user.id, {
            languageMode: mode,
            languageCode: normalizedCode,
          });
          console.log('[I18nContext] Synced preferences to backend');
        } catch (error) {
          console.error('[I18nContext] Error syncing to backend:', error);
        }
      }
    } catch (error) {
      console.error('[I18nContext] Error changing language:', error);
      throw error;
    }
  };

  const toggleTranslationDebug = async () => {
    try {
      const newValue = !translationDebugEnabled;
      await setTranslationDebugEnabled(newValue);
      setTranslationDebugState(newValue);
      console.log('[I18nContext] Translation debug toggled:', newValue);
    } catch (error) {
      console.error('[I18nContext] Error toggling translation debug:', error);
    }
  };

  // Safe translation function that never throws
  const t = (key: string, options?: any): string => {
    if (!i18nReadyState) {
      console.warn('[I18nContext] t() called before i18n ready, key:', key);
      return `[${key}]`;
    }
    
    return safeTranslate(key, options);
  };

  return (
    <I18nContext.Provider
      value={{
        currentLanguage,
        languageMode,
        isRTL: rtl,
        translationDebugEnabled,
        isI18nReady: i18nReadyState,
        changeLanguage,
        toggleTranslationDebug,
        t,
        loading,
      }}
    >
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (context === undefined) {
    throw new Error('useI18n must be used within I18nProvider');
  }
  return context;
}
