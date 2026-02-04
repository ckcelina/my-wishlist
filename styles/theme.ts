
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
// New palette:
// Background: #2D1763
// Surface:    #3D189C
// Accent:     #9F7EF2
// ═══════════════════════════════════════════════════════

export const darkTheme: Theme = {
  mode: 'dark',
  colors: {
    // Core tokens - NEW PURPLE DARK PALETTE
    background: '#2D1763',
    surface: '#3D189C',
    surface2: 'rgba(159,126,242,0.16)',

    textPrimary: '#FFFFFF',
    textSecondary: 'rgba(255,255,255,0.78)',

    border: 'rgba(159,126,242,0.22)',

    icon: '#FFFFFF',

    // Accent colors
    accent: '#9F7EF2',
    accentLight: 'rgba(159,126,242,0.18)',

    // Semantic colors
    success: '#34C759',
    warning: '#FF9500',
    error: '#FF3B30',
    info: '#5AC8FA',

    // Legacy aliases (map to core tokens)
    text: '#FFFFFF',
    card: '#3D189C',
    backgroundSecondary: 'rgba(255,255,255,0.06)',
    divider: 'rgba(159,126,242,0.22)',
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
    display: 'System',
    body: 'System',
  },

  shadows: {
    sm: 'none',
    md: 'none',
    lg: 'none',
  },
};

// ═══════════════════════════════════════════════════════
// ☀️ LIGHT MODE THEME
// New palette:
// Background: #EFEFFF
// Surface:    #E1E2FC
// Accent:     #652DF5
// ═══════════════════════════════════════════════════════

export const lightTheme: Theme = {
  mode: 'light',
  colors: {
    // Core tokens - NEW PURPLE LIGHT PALETTE
    background: '#EFEFFF',
    surface: '#E1E2FC',
    surface2: '#E1E2FC',

    textPrimary: '#2D1763',
    textSecondary: 'rgba(45,23,99,0.70)',

    border: 'rgba(101,45,245,0.15)',

    icon: '#2D1763',

    // Accent colors - NEW PURPLE ACCENT
    accent: '#652DF5',
    accentLight: 'rgba(101,45,245,0.15)',

    // Semantic colors
    success: '#34C759',
    warning: '#FF9500',
    error: '#FF3B30',
    info: '#007AFF',

    // Legacy aliases (map to core tokens)
    text: '#2D1763',
    card: '#E1E2FC',
    backgroundSecondary: '#E1E2FC',
    divider: 'rgba(101,45,245,0.12)',
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
    display: 'System',
    body: 'System',
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

export const createTypography = (theme?: Theme) => {
  // CRITICAL FIX: Provide safe defaults if theme is undefined
  // This prevents "Cannot read property 'fonts' of undefined" crashes
  const safeTheme = theme || lightTheme;
  
  return {
    // Display text - Large headings
    displayLarge: {
      fontFamily: safeTheme.fonts.display,
      fontSize: 32,
      fontWeight: '400' as const,
      lineHeight: 40,
      color: safeTheme.colors.textPrimary,
      letterSpacing: -0.5,
    },

    displayMedium: {
      fontFamily: safeTheme.fonts.display,
      fontSize: 28,
      fontWeight: '400' as const,
      lineHeight: 36,
      color: safeTheme.colors.textPrimary,
      letterSpacing: -0.5,
    },

    // Titles - Section headings
    titleLarge: {
      fontFamily: safeTheme.fonts.display,
      fontSize: 24,
      fontWeight: '400' as const,
      lineHeight: 32,
      color: safeTheme.colors.textPrimary,
      letterSpacing: -0.3,
    },

    titleMedium: {
      fontFamily: safeTheme.fonts.display,
      fontSize: 20,
      fontWeight: '400' as const,
      lineHeight: 28,
      color: safeTheme.colors.textPrimary,
      letterSpacing: -0.2,
    },

    titleSmall: {
      fontFamily: safeTheme.fonts.display,
      fontSize: 18,
      fontWeight: '400' as const,
      lineHeight: 24,
      color: safeTheme.colors.textPrimary,
    },

    // Body text
    bodyLarge: {
      fontFamily: safeTheme.fonts.body,
      fontSize: 16,
      fontWeight: '400' as const,
      lineHeight: 24,
      color: safeTheme.colors.textPrimary,
    },

    bodyMedium: {
      fontFamily: safeTheme.fonts.body,
      fontSize: 14,
      fontWeight: '400' as const,
      lineHeight: 20,
      color: safeTheme.colors.textPrimary,
    },

    bodySmall: {
      fontFamily: safeTheme.fonts.body,
      fontSize: 12,
      fontWeight: '400' as const,
      lineHeight: 16,
      color: safeTheme.colors.textSecondary,
    },

    // Labels
    labelLarge: {
      fontFamily: safeTheme.fonts.body,
      fontSize: 14,
      fontWeight: '500' as const,
      lineHeight: 20,
      color: safeTheme.colors.textPrimary,
    },

    labelMedium: {
      fontFamily: safeTheme.fonts.body,
      fontSize: 12,
      fontWeight: '500' as const,
      lineHeight: 16,
      color: safeTheme.colors.textSecondary,
    },

    labelSmall: {
      fontFamily: safeTheme.fonts.body,
      fontSize: 10,
      fontWeight: '500' as const,
      lineHeight: 14,
      color: safeTheme.colors.textSecondary,
    },

    // Button text
    buttonLarge: {
      fontFamily: safeTheme.fonts.body,
      fontSize: 16,
      fontWeight: '600' as const,
      lineHeight: 24,
      color: safeTheme.mode === 'dark' ? '#2D1763' : '#FFFFFF',
    },

    buttonMedium: {
      fontFamily: safeTheme.fonts.body,
      fontSize: 14,
      fontWeight: '600' as const,
      lineHeight: 20,
      color: safeTheme.mode === 'dark' ? '#2D1763' : '#FFFFFF',
    },

    // Backward compatibility aliases
    h1: {
      fontFamily: safeTheme.fonts.display,
      fontSize: 32,
      fontWeight: '400' as const,
      lineHeight: 40,
      color: safeTheme.colors.textPrimary,
      letterSpacing: -0.5,
    },

    h2: {
      fontFamily: safeTheme.fonts.display,
      fontSize: 24,
      fontWeight: '400' as const,
      lineHeight: 32,
      color: safeTheme.colors.textPrimary,
      letterSpacing: -0.3,
    },

    h3: {
      fontFamily: safeTheme.fonts.display,
      fontSize: 20,
      fontWeight: '400' as const,
      lineHeight: 28,
      color: safeTheme.colors.textPrimary,
      letterSpacing: -0.2,
    },

    body: {
      fontFamily: safeTheme.fonts.body,
      fontSize: 16,
      fontWeight: '400' as const,
      lineHeight: 24,
      color: safeTheme.colors.textPrimary,
    },

    caption: {
      fontFamily: safeTheme.fonts.body,
      fontSize: 12,
      fontWeight: '400' as const,
      lineHeight: 16,
      color: safeTheme.colors.textSecondary,
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
  };
};

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
