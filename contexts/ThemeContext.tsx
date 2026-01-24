
import React, { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Theme, lightTheme, darkTheme } from '@/styles/theme';

type ThemePreference = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  isDark: boolean;
  themePreference: ThemePreference;
  setThemePreference: (preference: ThemePreference) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = '@my_wishlist_theme_preference';

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemColorScheme = useColorScheme();
  const [themePreference, setThemePreferenceState] = useState<ThemePreference>('system');
  const [isLoading, setIsLoading] = useState(true);

  // Load theme preference from storage on mount
  useEffect(() => {
    loadThemePreference();
  }, []);

  const loadThemePreference = async () => {
    try {
      const stored = await AsyncStorage.getItem(THEME_STORAGE_KEY);
      if (stored && (stored === 'light' || stored === 'dark' || stored === 'system')) {
        setThemePreferenceState(stored as ThemePreference);
        console.log('[ThemeContext] Loaded theme preference:', stored);
      }
    } catch (error) {
      console.error('[ThemeContext] Error loading theme preference:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const setThemePreference = async (preference: ThemePreference) => {
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, preference);
      setThemePreferenceState(preference);
      console.log('[ThemeContext] Theme preference saved:', preference);
    } catch (error) {
      console.error('[ThemeContext] Error saving theme preference:', error);
    }
  };

  // Determine actual theme based on preference
  const isDark = themePreference === 'system' 
    ? systemColorScheme === 'dark'
    : themePreference === 'dark';
  
  const theme = isDark ? darkTheme : lightTheme;

  console.log('[ThemeContext] Current theme mode:', theme.mode, 'preference:', themePreference);

  if (isLoading) {
    // Return a default theme while loading
    return (
      <ThemeContext.Provider value={{ 
        theme: lightTheme, 
        isDark: false, 
        themePreference: 'system',
        setThemePreference 
      }}>
        {children}
      </ThemeContext.Provider>
    );
  }

  return (
    <ThemeContext.Provider value={{ theme, isDark, themePreference, setThemePreference }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useAppTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useAppTheme must be used within ThemeProvider');
  }
  return context;
}
