
import { useColorScheme } from 'react-native';

// ═══════════════════════════════════════════════════════
// 🎨 MY WISHLIST - BRAND DESIGN SYSTEM
// ═══════════════════════════════════════════════════════

export type ThemeMode = 'light' | 'dark';

export interface Theme {
  mode: ThemeMode;
  colors: {
    // Primary backgrounds
    background: string;
    backgroundSecondary: string;
    
    // Text colors
    text: string;
    textSecondary: string;
    
    // Card & surface colors
    card: string;
    
    // Borders & dividers
    border: string;
    divider: string;
    
    // Accent colors (for buttons, links, etc.)
    accent: string;
    accentLight: string;
    
    // Semantic colors
    success: string;
    warning: string;
    error: string;
    info: string;
    
    // Shadow colors
    shadow: string;
  };
  
  // Spacing scale
  spacing: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
    xxl: number;
  };
  
  // Border radius scale
  radius: {
    sm: number;
    md: number;
    lg: number;
    xl: number;
  };
  
  // Typography
  fonts: {
    display: string;  // Elegant serif for titles
    body: string;     // Clean sans-serif for body
  };
  
  // Shadows (only in light mode)
  shadows: {
    sm: string;
    md: string;
    lg: string;
  };
}

// ═══════════════════════════════════════════════════════
// 🌙 DARK MODE THEME
// ═══════════════════════════════════════════════════════

export const darkTheme: Theme = {
  mode: 'dark',
  colors: {
    background: '#765943',
    backgroundSecondary: 'rgba(255,255,255,0.05)',
    
    text: '#FFFFFF',
    textSecondary: 'rgba(255,255,255,0.75)',
    
    card: 'rgba(255,255,255,0.08)',
    
    border: 'rgba(255,255,255,0.15)',
    divider: 'rgba(255,255,255,0.15)',
    
    accent: '#FFFFFF',
    accentLight: 'rgba(255,255,255,0.2)',
    
    success: '#34C759',
    warning: '#FF9500',
    error: '#FF3B30',
    info: '#5AC8FA',
    
    shadow: 'transparent', // No shadows in dark mode
  },
  
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  
  radius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 18,
  },
  
  fonts: {
    display: 'PlayfairDisplay_400Regular',
    body: 'Inter_400Regular',
  },
  
  shadows: {
    sm: 'none',
    md: 'none',
    lg: 'none',
  },
};

// ═══════════════════════════════════════════════════════
// ☀️ LIGHT MODE THEME
// ═══════════════════════════════════════════════════════

export const lightTheme: Theme = {
  mode: 'light',
  colors: {
    background: '#ede8e3',
    backgroundSecondary: '#f5f1ed',
    
    text: '#3b2a1f',
    textSecondary: 'rgba(59,42,31,0.7)',
    
    card: '#ffffff',
    
    border: 'rgba(0,0,0,0.08)',
    divider: 'rgba(0,0,0,0.08)',
    
    accent: '#3b2a1f',
    accentLight: 'rgba(59,42,31,0.1)',
    
    success: '#34C759',
    warning: '#FF9500',
    error: '#FF3B30',
    info: '#007AFF',
    
    shadow: 'rgba(0,0,0,0.1)',
  },
  
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  
  radius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 18,
  },
  
  fonts: {
    display: 'PlayfairDisplay_400Regular',
    body: 'Inter_400Regular',
  },
  
  shadows: {
    sm: '0px 2px 4px rgba(0,0,0,0.06)',
    md: '0px 4px 8px rgba(0,0,0,0.08)',
    lg: '0px 8px 16px rgba(0,0,0,0.1)',
  },
};

// ═══════════════════════════════════════════════════════
// 🎯 THEME HOOK
// ═══════════════════════════════════════════════════════

export function useTheme(): Theme {
  const colorScheme = useColorScheme();
  return colorScheme === 'dark' ? darkTheme : lightTheme;
}

// ═══════════════════════════════════════════════════════
// 📐 TYPOGRAPHY STYLES
// ═══════════════════════════════════════════════════════

export const createTypography = (theme: Theme) => ({
  // Page titles - Elegant serif
  pageTitle: {
    fontFamily: theme.fonts.display,
    fontSize: 32,
    fontWeight: '400' as const,
    lineHeight: 40,
    color: theme.colors.text,
    letterSpacing: -0.5,
  },
  
  // Section titles - Elegant serif
  sectionTitle: {
    fontFamily: theme.fonts.display,
    fontSize: 24,
    fontWeight: '400' as const,
    lineHeight: 32,
    color: theme.colors.text,
    letterSpacing: -0.3,
  },
  
  // Subsection titles
  subsectionTitle: {
    fontFamily: theme.fonts.display,
    fontSize: 20,
    fontWeight: '400' as const,
    lineHeight: 28,
    color: theme.colors.text,
    letterSpacing: -0.2,
  },
  
  // Body text - Clean sans-serif
  body: {
    fontFamily: theme.fonts.body,
    fontSize: 16,
    fontWeight: '400' as const,
    lineHeight: 24,
    color: theme.colors.text,
  },
  
  bodyMedium: {
    fontFamily: theme.fonts.body,
    fontSize: 15,
    fontWeight: '400' as const,
    lineHeight: 22,
    color: theme.colors.text,
  },
  
  bodySmall: {
    fontFamily: theme.fonts.body,
    fontSize: 14,
    fontWeight: '400' as const,
    lineHeight: 20,
    color: theme.colors.textSecondary,
  },
  
  // Caption text
  caption: {
    fontFamily: theme.fonts.body,
    fontSize: 12,
    fontWeight: '400' as const,
    lineHeight: 16,
    color: theme.colors.textSecondary,
  },
  
  // Button text
  button: {
    fontFamily: theme.fonts.body,
    fontSize: 16,
    fontWeight: '600' as const,
    lineHeight: 24,
    color: theme.colors.text,
  },
  
  // Label text
  label: {
    fontFamily: theme.fonts.body,
    fontSize: 14,
    fontWeight: '500' as const,
    lineHeight: 20,
    color: theme.colors.text,
  },
});

// ═══════════════════════════════════════════════════════
// 🎨 COMPONENT STYLES
// ═══════════════════════════════════════════════════════

export const createComponentStyles = (theme: Theme) => ({
  // Card styles
  card: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    ...(theme.mode === 'light' && {
      shadowColor: theme.colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 1,
      shadowRadius: 8,
      elevation: 2,
    }),
  },
  
  // Button styles
  button: {
    backgroundColor: theme.colors.accent,
    borderRadius: theme.radius.md,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    ...(theme.mode === 'light' && {
      shadowColor: theme.colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 1,
      shadowRadius: 4,
      elevation: 2,
    }),
  },
  
  buttonSecondary: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.md,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  
  // Input styles
  input: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.md,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    fontSize: 16,
    color: theme.colors.text,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  
  // Divider
  divider: {
    height: 1,
    backgroundColor: theme.colors.divider,
    marginVertical: theme.spacing.md,
  },
  
  // Container
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  
  // Section
  section: {
    marginBottom: theme.spacing.lg,
  },
});
