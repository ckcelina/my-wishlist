
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { I18nManager, Platform } from 'react-native';
import { useTranslation } from 'react-i18next';
import { initializeI18n, changeLanguage as changeI18nLanguage, isRTL, SUPPORTED_LANGUAGES } from '@/lib/i18n';
import { authenticatedGet, authenticatedPut } from '@/utils/api';
import { useAuth } from './AuthContext';

interface I18nContextType {
  currentLanguage: string;
  languageMode: 'system' | 'manual';
  isRTL: boolean;
  changeLanguage: (languageCode: string, mode?: 'system' | 'manual') => Promise<void>;
  loading: boolean;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export function I18nProvider({ children }: { children: ReactNode }) {
  const { i18n } = useTranslation();
  const { user } = useAuth();
  const [currentLanguage, setCurrentLanguage] = useState('en');
  const [languageMode, setLanguageMode] = useState<'system' | 'manual'>('system');
  const [rtl, setRtl] = useState(false);
  const [loading, setLoading] = useState(true);

  // Initialize i18n on mount
  useEffect(() => {
    console.log('[I18nContext] Initializing i18n');
    initializeLanguage();
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

  return (
    <I18nContext.Provider
      value={{
        currentLanguage,
        languageMode,
        isRTL: rtl,
        changeLanguage,
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
