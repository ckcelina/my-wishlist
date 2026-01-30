
import React, { createContext, useContext, ReactNode, useState, useEffect, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Theme, lightTheme, darkTheme } from '@/styles/theme';

type ThemePreference = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  isDark: boolean;
  themePreference: ThemePreference;
  setThemePreference: (preference: ThemePreference) => Promise<void>;
  isHydrated: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = '@my_wishlist_theme_preference';

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemColorScheme = useColorScheme();
  const [themePreference, setThemePreferenceState] = useState<ThemePreference>('system');
  const [isHydrated, setIsHydrated] = useState(false);

  // Load theme preference from storage BEFORE first render
  useEffect(() => {
    let isMounted = true;
    
    const loadThemePreference = async () => {
      try {
        const stored = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (isMounted && stored && (stored === 'light' || stored === 'dark' || stored === 'system')) {
          setThemePreferenceState(stored as ThemePreference);
        }
      } catch (error) {
        console.error('[ThemeContext] Error loading theme preference:', error);
      } finally {
        if (isMounted) {
          setIsHydrated(true);
        }
      }
    };

    loadThemePreference();

    return () => {
      isMounted = false;
    };
  }, []);

  const setThemePreference = async (preference: ThemePreference) => {
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, preference);
      setThemePreferenceState(preference);
    } catch (error) {
      console.error('[ThemeContext] Error saving theme preference:', error);
    }
  };

  // Determine actual theme based on preference - memoized to prevent re-renders
  const isDark = useMemo(() => {
    return themePreference === 'system' 
      ? systemColorScheme === 'dark'
      : themePreference === 'dark';
  }, [themePreference, systemColorScheme]);
  
  const theme = useMemo(() => {
    return isDark ? darkTheme : lightTheme;
  }, [isDark]);

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({
    theme,
    isDark,
    themePreference,
    setThemePreference,
    isHydrated,
  }), [theme, isDark, themePreference, isHydrated]);

  // Show default theme while hydrating (prevents flicker)
  if (!isHydrated) {
    const defaultIsDark = systemColorScheme === 'dark';
    const defaultTheme = defaultIsDark ? darkTheme : lightTheme;
    
    return (
      <ThemeContext.Provider value={{ 
        theme: defaultTheme, 
        isDark: defaultIsDark, 
        themePreference: 'system',
        setThemePreference,
        isHydrated: false,
      }}>
        {children}
      </ThemeContext.Provider>
    );
  }

  return (
    <ThemeContext.Provider value={contextValue}>
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
