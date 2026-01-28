
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
    surface: string;      // Cards
    surface2: string;     // Inputs / secondary surfaces
    
    // Text colors
    textPrimary: string;
    textSecondary: string;
    
    // Borders & dividers
    border: string;
    
    // Icons
    icon: string;
    
    // Accent colors (for buttons, links, etc.)
    accent: string;
    
    // Semantic colors
    success: string;
    warning: string;
    error: string;
    info: string;
    
    // Legacy aliases for backward compatibility
    text: string;
    card: string;
    backgroundSecondary: string;
    divider: string;
    accentLight: string;
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
// 🌙 DARK MODE THEME - POLISHED & PREMIUM
// ═══════════════════════════════════════════════════════

export const darkTheme: Theme = {
  mode: 'dark',
  colors: {
    // Core tokens
    background: '#765943',
    surface: 'rgba(255,255,255,0.10)',
    surface2: 'rgba(255,255,255,0.14)',
    
    textPrimary: '#FFFFFF',
    textSecondary: 'rgba(255,255,255,0.75)',
    
    border: 'rgba(255,255,255,0.16)',
    
    icon: '#FFFFFF',
    
    // Brand-safe accent (white for dark mode)
    accent: '#FFFFFF',
    
    // Semantic colors
    success: '#34C759',
    warning: '#FF9500',
    error: '#FF3B30',
    info: '#5AC8FA',
    
    // Legacy aliases
    text: '#FFFFFF',
    card: 'rgba(255,255,255,0.10)',
    backgroundSecondary: 'rgba(255,255,255,0.05)',
    divider: 'rgba(255,255,255,0.16)',
    accentLight: 'rgba(255,255,255,0.12)',
    shadow: 'transparent',
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
    // Core tokens
    background: '#ede8e3',
    surface: '#ffffff',
    surface2: 'rgba(0,0,0,0.04)',
    
    textPrimary: '#2b1f19',
    textSecondary: 'rgba(43,31,25,0.70)',
    
    border: 'rgba(43,31,25,0.12)',
    
    icon: '#2b1f19',
    
    // Brand-safe accent
    accent: '#3b2a1f',
    
    // Semantic colors
    success: '#34C759',
    warning: '#FF9500',
    error: '#FF3B30',
    info: '#007AFF',
    
    // Legacy aliases
    text: '#2b1f19',
    card: '#ffffff',
    backgroundSecondary: '#f5f1ed',
    divider: 'rgba(43,31,25,0.12)',
    accentLight: 'rgba(59,42,31,0.1)',
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
    color: theme.colors.textPrimary,
    letterSpacing: -0.5,
  },
  
  // Section titles - Elegant serif
  sectionTitle: {
    fontFamily: theme.fonts.display,
    fontSize: 24,
    fontWeight: '400' as const,
    lineHeight: 32,
    color: theme.colors.textPrimary,
    letterSpacing: -0.3,
  },
  
  // Subsection titles
  subsectionTitle: {
    fontFamily: theme.fonts.display,
    fontSize: 20,
    fontWeight: '400' as const,
    lineHeight: 28,
    color: theme.colors.textPrimary,
    letterSpacing: -0.2,
  },
  
  // Body text - Clean sans-serif
  body: {
    fontFamily: theme.fonts.body,
    fontSize: 16,
    fontWeight: '400' as const,
    lineHeight: 24,
    color: theme.colors.textPrimary,
  },
  
  bodyMedium: {
    fontFamily: theme.fonts.body,
    fontSize: 15,
    fontWeight: '400' as const,
    lineHeight: 22,
    color: theme.colors.textPrimary,
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
    color: theme.colors.textPrimary,
  },
  
  // Label text
  label: {
    fontFamily: theme.fonts.body,
    fontSize: 14,
    fontWeight: '500' as const,
    lineHeight: 20,
    color: theme.colors.textPrimary,
  },
});

// ═══════════════════════════════════════════════════════
// 🎨 COMPONENT STYLES
// ═══════════════════════════════════════════════════════

export const createComponentStyles = (theme: Theme) => ({
  // Card styles - consistent radius and surface color
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: theme.spacing.md,
    ...(theme.mode === 'dark' 
      ? {
          // Dark mode: subtle border instead of shadow
          borderWidth: 1,
          borderColor: theme.colors.border,
        }
      : {
          // Light mode: shadow
          shadowColor: theme.colors.shadow,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 1,
          shadowRadius: 8,
          elevation: 2,
        }
    ),
  },
  
  // Button styles - prominent in dark mode
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
    backgroundColor: theme.colors.surface2,
    borderRadius: theme.radius.md,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  
  // Input styles - visible placeholders
  input: {
    backgroundColor: theme.colors.surface2,
    borderRadius: theme.radius.md,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    fontSize: 16,
    color: theme.colors.textPrimary,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  
  // Divider
  divider: {
    height: 1,
    backgroundColor: theme.colors.border,
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
