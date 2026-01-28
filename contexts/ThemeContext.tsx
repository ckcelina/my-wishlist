
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
  const [isHydrated, setIsHydrated] = useState(false);

  // Load theme preference from storage BEFORE first render
  useEffect(() => {
    let isMounted = true;
    
    const loadThemePreference = async () => {
      try {
        const stored = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (isMounted && stored && (stored === 'light' || stored === 'dark' || stored === 'system')) {
          setThemePreferenceState(stored as ThemePreference);
          console.log('[ThemeContext] Loaded theme preference:', stored);
        }
      } catch (error) {
        console.error('[ThemeContext] Error loading theme preference:', error);
      } finally {
        if (isMounted) {
          setIsLoading(false);
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

  console.log('[ThemeContext] Current theme mode:', theme.mode, 'preference:', themePreference, 'hydrated:', isHydrated);

  // Show loading state with default theme while hydrating
  if (isLoading || !isHydrated) {
    // Use system theme as default while loading
    const defaultIsDark = systemColorScheme === 'dark';
    const defaultTheme = defaultIsDark ? darkTheme : lightTheme;
    
    return (
      <ThemeContext.Provider value={{ 
        theme: defaultTheme, 
        isDark: defaultIsDark, 
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
