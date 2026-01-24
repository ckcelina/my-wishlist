
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { I18nManager, Platform } from 'react-native';
import { useTranslation } from 'react-i18next';
import { initializeI18n, changeLanguage as changeI18nLanguage, isRTL, SUPPORTED_LANGUAGES } from '@/lib/i18n';
import { authenticatedGet, authenticatedPut } from '@/utils/api';
import { useAuth } from './AuthContext';
import { getTranslationDebugEnabled, setTranslationDebugEnabled, debugTranslate } from '@/utils/translationDebug';

interface I18nContextType {
  currentLanguage: string;
  languageMode: 'system' | 'manual';
  isRTL: boolean;
  translationDebugEnabled: boolean;
  changeLanguage: (languageCode: string, mode?: 'system' | 'manual') => Promise<void>;
  toggleTranslationDebug: () => Promise<void>;
  t: (key: string, options?: any) => string;
  loading: boolean;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export function I18nProvider({ children }: { children: ReactNode }) {
  const { i18n, t: i18nT } = useTranslation();
  const { user } = useAuth();
  const [currentLanguage, setCurrentLanguage] = useState('en');
  const [languageMode, setLanguageMode] = useState<'system' | 'manual'>('system');
  const [rtl, setRtl] = useState(false);
  const [translationDebugEnabled, setTranslationDebugState] = useState(false);
  const [loading, setLoading] = useState(true);

  // Initialize i18n on mount
  useEffect(() => {
    console.log('[I18nContext] Initializing i18n');
    initializeLanguage();
    loadTranslationDebugMode();
  }, []);

  // Load user preferences when user changes
  useEffect(() => {
    if (user) {
      console.log('[I18nContext] User logged in, loading preferences');
      loadUserPreferences();
    }
  }, [user]);

  const initializeLanguage = async () => {
    try {
      const lang = await initializeI18n();
      setCurrentLanguage(lang);
      setRtl(isRTL(lang));
      
      // Set RTL layout if needed
      if (Platform.OS !== 'web') {
        const shouldBeRTL = isRTL(lang);
        if (I18nManager.isRTL !== shouldBeRTL) {
          I18nManager.forceRTL(shouldBeRTL);
          // Note: On native, this requires app restart
          console.log('[I18nContext] RTL changed, app restart may be needed');
        }
      }
    } catch (error) {
      console.error('[I18nContext] Error initializing language:', error);
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
      const response = await authenticatedGet<{
        languageMode: 'system' | 'manual';
        languageCode: string;
      }>('/api/users/language-preferences');
      
      if (response) {
        console.log('[I18nContext] Loaded user preferences:', response);
        setLanguageMode(response.languageMode);
        
        if (response.languageMode === 'manual' && response.languageCode) {
          await changeI18nLanguage(response.languageCode, response.languageMode);
          setCurrentLanguage(response.languageCode);
          setRtl(isRTL(response.languageCode));
        }
      }
    } catch (error) {
      console.error('[I18nContext] Error loading user preferences:', error);
    }
  };

  const changeLanguage = async (languageCode: string, mode: 'system' | 'manual' = 'manual') => {
    try {
      console.log('[I18nContext] Changing language to:', languageCode, 'mode:', mode);
      
      // Change language in i18n
      await changeI18nLanguage(languageCode, mode);
      setCurrentLanguage(languageCode);
      setLanguageMode(mode);
      
      // Update RTL
      const shouldBeRTL = isRTL(languageCode);
      setRtl(shouldBeRTL);
      
      // Set RTL layout if needed (native only)
      if (Platform.OS !== 'web') {
        if (I18nManager.isRTL !== shouldBeRTL) {
          I18nManager.forceRTL(shouldBeRTL);
          console.log('[I18nContext] RTL changed, app restart may be needed');
        }
      }
      
      // Sync to backend if user is logged in
      if (user) {
        try {
          await authenticatedPut('/api/users/language-preferences', {
            languageMode: mode,
            languageCode: languageCode,
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

  // Enhanced translation function with debug support
  const t = (key: string, options?: any): string => {
    return debugTranslate(key, options, translationDebugEnabled);
  };

  return (
    <I18nContext.Provider
      value={{
        currentLanguage,
        languageMode,
        isRTL: rtl,
        translationDebugEnabled,
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
