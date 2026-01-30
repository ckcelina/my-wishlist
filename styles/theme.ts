
// ═══════════════════════════════════════════════════════
// 🎨 MY WISHLIST - GLOBAL THEME SYSTEM
// Single source of truth for all colors and design tokens
// ═══════════════════════════════════════════════════════

export type ThemeMode = 'light' | 'dark';

export interface Theme {
  mode: ThemeMode;
  colors: {
    // Core theme tokens (single source of truth)
    background: string;
    surface: string;      // Cards, elevated surfaces
    surface2: string;     // Inputs, secondary surfaces
    
    textPrimary: string;
    textSecondary: string;
    
    border: string;
    
    icon: string;
    
    // Accent colors
    accent: string;
    accentLight: string;
    
    // Semantic colors
    success: string;
    warning: string;
    error: string;
    info: string;
    
    // Legacy aliases for backward compatibility (will be removed)
    text: string;
    card: string;
    backgroundSecondary: string;
    divider: string;
    shadow: string;
  };
  
  spacing: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
    xxl: number;
  };
  
  radius: {
    sm: number;
    md: number;
    lg: number;
    xl: number;
  };
  
  fonts: {
    display: string;
    body: string;
  };
  
  shadows: {
    sm: string;
    md: string;
    lg: string;
  };
}

// ═══════════════════════════════════════════════════════
// 🌙 DARK MODE THEME
// Brand base: #765943 (ENFORCED)
// ═══════════════════════════════════════════════════════

export const darkTheme: Theme = {
  mode: 'dark',
  colors: {
    // Core tokens - EXACT specifications (ENFORCED)
    background: '#765943',
    surface: 'rgba(255,255,255,0.10)',
    surface2: 'rgba(255,255,255,0.14)',
    
    textPrimary: '#FFFFFF',
    textSecondary: 'rgba(255,255,255,0.75)',
    
    border: 'rgba(255,255,255,0.16)',
    
    icon: '#FFFFFF',
    
    // Accent colors
    accent: '#FFFFFF',
    accentLight: 'rgba(255,255,255,0.12)',
    
    // Semantic colors
    success: '#34C759',
    warning: '#FF9500',
    error: '#FF3B30',
    info: '#5AC8FA',
    
    // Legacy aliases (map to core tokens)
    text: '#FFFFFF',
    card: 'rgba(255,255,255,0.10)',
    backgroundSecondary: 'rgba(255,255,255,0.05)',
    divider: 'rgba(255,255,255,0.16)',
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
// Brand base: #ede8e3
// ═══════════════════════════════════════════════════════

export const lightTheme: Theme = {
  mode: 'light',
  colors: {
    // Core tokens - EXACT specifications
    background: '#ede8e3',
    surface: 'rgba(43,31,25,0.06)',
    surface2: 'rgba(43,31,25,0.10)',
    
    textPrimary: '#2b1f19',
    textSecondary: 'rgba(43,31,25,0.70)',
    
    border: 'rgba(43,31,25,0.14)',
    
    icon: '#2b1f19',
    
    // Accent colors
    accent: '#2b1f19',
    accentLight: 'rgba(43,31,25,0.08)',
    
    // Semantic colors
    success: '#34C759',
    warning: '#FF9500',
    error: '#FF3B30',
    info: '#007AFF',
    
    // Legacy aliases (map to core tokens)
    text: '#2b1f19',
    card: 'rgba(43,31,25,0.06)',
    backgroundSecondary: 'rgba(43,31,25,0.04)',
    divider: 'rgba(43,31,25,0.14)',
    shadow: 'rgba(0,0,0,0.08)',
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
// 📐 TYPOGRAPHY STYLES
// ═══════════════════════════════════════════════════════

export const createTypography = (theme: Theme) => ({
  // Display text - Large headings
  displayLarge: {
    fontFamily: theme.fonts.display,
    fontSize: 32,
    fontWeight: '400' as const,
    lineHeight: 40,
    color: theme.colors.textPrimary,
    letterSpacing: -0.5,
  },
  
  displayMedium: {
    fontFamily: theme.fonts.display,
    fontSize: 28,
    fontWeight: '400' as const,
    lineHeight: 36,
    color: theme.colors.textPrimary,
    letterSpacing: -0.5,
  },
  
  // Titles - Section headings
  titleLarge: {
    fontFamily: theme.fonts.display,
    fontSize: 24,
    fontWeight: '400' as const,
    lineHeight: 32,
    color: theme.colors.textPrimary,
    letterSpacing: -0.3,
  },
  
  titleMedium: {
    fontFamily: theme.fonts.display,
    fontSize: 20,
    fontWeight: '400' as const,
    lineHeight: 28,
    color: theme.colors.textPrimary,
    letterSpacing: -0.2,
  },
  
  titleSmall: {
    fontFamily: theme.fonts.display,
    fontSize: 18,
    fontWeight: '400' as const,
    lineHeight: 24,
    color: theme.colors.textPrimary,
  },
  
  // Body text
  bodyLarge: {
    fontFamily: theme.fonts.body,
    fontSize: 16,
    fontWeight: '400' as const,
    lineHeight: 24,
    color: theme.colors.textPrimary,
  },
  
  bodyMedium: {
    fontFamily: theme.fonts.body,
    fontSize: 14,
    fontWeight: '400' as const,
    lineHeight: 20,
    color: theme.colors.textPrimary,
  },
  
  bodySmall: {
    fontFamily: theme.fonts.body,
    fontSize: 12,
    fontWeight: '400' as const,
    lineHeight: 16,
    color: theme.colors.textSecondary,
  },
  
  // Labels
  labelLarge: {
    fontFamily: theme.fonts.body,
    fontSize: 14,
    fontWeight: '500' as const,
    lineHeight: 20,
    color: theme.colors.textPrimary,
  },
  
  labelMedium: {
    fontFamily: theme.fonts.body,
    fontSize: 12,
    fontWeight: '500' as const,
    lineHeight: 16,
    color: theme.colors.textSecondary,
  },
  
  labelSmall: {
    fontFamily: theme.fonts.body,
    fontSize: 10,
    fontWeight: '500' as const,
    lineHeight: 14,
    color: theme.colors.textSecondary,
  },
  
  // Button text
  buttonLarge: {
    fontFamily: theme.fonts.body,
    fontSize: 16,
    fontWeight: '600' as const,
    lineHeight: 24,
    color: theme.mode === 'dark' ? '#2b1f19' : '#FFFFFF',
  },
  
  buttonMedium: {
    fontFamily: theme.fonts.body,
    fontSize: 14,
    fontWeight: '600' as const,
    lineHeight: 20,
    color: theme.mode === 'dark' ? '#2b1f19' : '#FFFFFF',
  },
  
  // Backward compatibility aliases
  h1: {
    fontFamily: theme.fonts.display,
    fontSize: 32,
    fontWeight: '400' as const,
    lineHeight: 40,
    color: theme.colors.textPrimary,
    letterSpacing: -0.5,
  },
  
  h2: {
    fontFamily: theme.fonts.display,
    fontSize: 24,
    fontWeight: '400' as const,
    lineHeight: 32,
    color: theme.colors.textPrimary,
    letterSpacing: -0.3,
  },
  
  h3: {
    fontFamily: theme.fonts.display,
    fontSize: 20,
    fontWeight: '400' as const,
    lineHeight: 28,
    color: theme.colors.textPrimary,
    letterSpacing: -0.2,
  },
  
  body: {
    fontFamily: theme.fonts.body,
    fontSize: 16,
    fontWeight: '400' as const,
    lineHeight: 24,
    color: theme.colors.textPrimary,
  },
  
  caption: {
    fontFamily: theme.fonts.body,
    fontSize: 12,
    fontWeight: '400' as const,
    lineHeight: 16,
    color: theme.colors.textSecondary,
  },
  
  // Typography sizes
  sizes: {
    xs: 10,
    sm: 12,
    md: 14,
    lg: 16,
    xl: 20,
    xxl: 24,
  },
  
  // Typography weights
  weights: {
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
});

// ═══════════════════════════════════════════════════════
// 🎨 COMPONENT STYLES
// ═══════════════════════════════════════════════════════

export const createComponentStyles = (theme: Theme) => ({
  // Card styles
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: theme.spacing.md,
    ...(theme.mode === 'dark' 
      ? {
          borderWidth: 1,
          borderColor: theme.colors.border,
        }
      : {
          shadowColor: theme.colors.shadow,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 1,
          shadowRadius: 8,
          elevation: 2,
          borderWidth: 1,
          borderColor: theme.colors.border,
        }
    ),
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
    backgroundColor: theme.colors.surface2,
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
