
import { StyleSheet, TextStyle, ViewStyle } from 'react-native';
import { Theme, lightTheme, darkTheme } from './theme';

// ═══════════════════════════════════════════════════════
// 🎨 DESIGN SYSTEM - MY WISHLIST
// ═══════════════════════════════════════════════════════

// Export theme utilities
export { lightTheme, darkTheme };
export type { Theme };

// ═══════════════════════════════════════════════════════
// 🎨 COLORS - Dynamic theme-aware colors
// ═══════════════════════════════════════════════════════

export function createColors(theme: Theme) {
  return {
    // Core theme tokens
    background: theme.colors.background,
    surface: theme.colors.surface,
    surface2: theme.colors.surface2,
    textPrimary: theme.colors.textPrimary,
    textSecondary: theme.colors.textSecondary,
    border: theme.colors.border,
    icon: theme.colors.icon,
    accent: theme.colors.accent,
    
    // Primary palette (for backward compatibility)
    primary: theme.colors.accent,
    primaryLight: theme.colors.accentLight,
    primaryDark: theme.mode === 'dark' ? 'rgba(255,255,255,0.8)' : '#2b1f19',
    
    // Neutral palette (legacy aliases)
    backgroundAlt: theme.colors.backgroundSecondary,
    card: theme.colors.surface,
    white: '#FFFFFF',
    black: '#000000',
    
    // Text hierarchy (legacy aliases)
    text: theme.colors.textPrimary,
    textTertiary: theme.mode === 'dark' ? 'rgba(255,255,255,0.5)' : 'rgba(43,31,25,0.5)',
    textInverse: theme.mode === 'dark' ? '#2b1f19' : '#FFFFFF',
    
    // Borders and dividers (legacy aliases)
    borderLight: theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(43,31,25,0.06)',
    divider: theme.colors.border,
    
    // Semantic colors
    success: theme.colors.success,
    successLight: theme.mode === 'dark' ? 'rgba(52,199,89,0.2)' : '#D1FAE5',
    warning: theme.colors.warning,
    warningLight: theme.mode === 'dark' ? 'rgba(255,149,0,0.2)' : '#FEF3C7',
    error: theme.colors.error,
    errorLight: theme.mode === 'dark' ? 'rgba(255,59,48,0.2)' : '#FEE2E2',
    info: theme.colors.info,
    infoLight: theme.mode === 'dark' ? 'rgba(90,200,250,0.2)' : '#DBEAFE',
    
    // Accent colors (legacy aliases)
    accentLight: theme.colors.accentLight,
    
    // Shadows
    shadow: theme.colors.shadow,
    shadowLight: theme.mode === 'dark' ? 'transparent' : 'rgba(0, 0, 0, 0.05)',
    shadowMedium: theme.mode === 'dark' ? 'transparent' : 'rgba(0, 0, 0, 0.1)',
    shadowDark: theme.mode === 'dark' ? 'transparent' : 'rgba(0, 0, 0, 0.15)',
    
    // Highlight (for selected states)
    highlight: theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(43,31,25,0.04)',
  };
}

// Default to light theme for static exports (components should use useAppTheme hook)
const defaultTheme = lightTheme;

// Backward compatibility - static colors export (use createColors with theme instead)
export const colors = createColors(defaultTheme);

// ═══════════════════════════════════════════════════════
// 📏 SPACING SCALE
// ═══════════════════════════════════════════════════════

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
};

// ═══════════════════════════════════════════════════════
// 🔤 TYPOGRAPHY HIERARCHY
// ═══════════════════════════════════════════════════════

export function createTypography(theme: Theme) {
  return {
    // Display text - Large, elegant headings (Playfair Display)
    displayLarge: {
      fontSize: 32,
      fontWeight: '400' as const,
      lineHeight: 40,
      color: theme.colors.textPrimary,
      letterSpacing: -0.5,
    },
    
    displayMedium: {
      fontSize: 28,
      fontWeight: '400' as const,
      lineHeight: 36,
      color: theme.colors.textPrimary,
      letterSpacing: -0.5,
    },
    
    // Titles - Section headings (Playfair Display)
    titleLarge: {
      fontSize: 24,
      fontWeight: '400' as const,
      lineHeight: 32,
      color: theme.colors.textPrimary,
      letterSpacing: -0.3,
    },
    
    titleMedium: {
      fontSize: 20,
      fontWeight: '400' as const,
      lineHeight: 28,
      color: theme.colors.textPrimary,
      letterSpacing: -0.2,
    },
    
    titleSmall: {
      fontSize: 18,
      fontWeight: '400' as const,
      lineHeight: 24,
      color: theme.colors.textPrimary,
    },
    
    // Body text - Regular content (Inter)
    bodyLarge: {
      fontSize: 16,
      fontWeight: '400' as const,
      lineHeight: 24,
      color: theme.colors.textPrimary,
    },
    
    bodyMedium: {
      fontSize: 14,
      fontWeight: '400' as const,
      lineHeight: 20,
      color: theme.colors.textPrimary,
    },
    
    bodySmall: {
      fontSize: 12,
      fontWeight: '400' as const,
      lineHeight: 16,
      color: theme.colors.textSecondary,
    },
    
    // Labels - UI labels and captions
    labelLarge: {
      fontSize: 14,
      fontWeight: '500' as const,
      lineHeight: 20,
      color: theme.colors.textPrimary,
    },
    
    labelMedium: {
      fontSize: 12,
      fontWeight: '500' as const,
      lineHeight: 16,
      color: theme.colors.textSecondary,
    },
    
    labelSmall: {
      fontSize: 10,
      fontWeight: '500' as const,
      lineHeight: 14,
      color: theme.mode === 'dark' ? 'rgba(255,255,255,0.5)' : 'rgba(43,31,25,0.5)',
    },
    
    // Button text
    buttonLarge: {
      fontSize: 16,
      fontWeight: '600' as const,
      lineHeight: 24,
      color: theme.mode === 'dark' ? '#2b1f19' : '#FFFFFF',
    },
    
    buttonMedium: {
      fontSize: 14,
      fontWeight: '600' as const,
      lineHeight: 20,
      color: theme.mode === 'dark' ? '#2b1f19' : '#FFFFFF',
    },
    
    // Backward compatibility
    h1: {
      fontSize: 32,
      fontWeight: '400' as const,
      lineHeight: 40,
      color: theme.colors.textPrimary,
      letterSpacing: -0.5,
    },
    
    h2: {
      fontSize: 24,
      fontWeight: '400' as const,
      lineHeight: 32,
      color: theme.colors.textPrimary,
      letterSpacing: -0.3,
    },
    
    h3: {
      fontSize: 20,
      fontWeight: '400' as const,
      lineHeight: 28,
      color: theme.colors.textPrimary,
      letterSpacing: -0.2,
    },
    
    body: {
      fontSize: 16,
      fontWeight: '400' as const,
      lineHeight: 24,
      color: theme.colors.textPrimary,
    },
    
    caption: {
      fontSize: 12,
      fontWeight: '400' as const,
      lineHeight: 16,
      color: theme.colors.textSecondary,
    },
    
    // Typography sizes (for backward compatibility)
    sizes: {
      xs: 10,
      sm: 12,
      md: 14,
      lg: 16,
      xl: 20,
      xxl: 24,
    },
    
    // Typography weights (for backward compatibility)
    weights: {
      regular: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
    },
  };
}

// Static typography export for backward compatibility
export const typography = createTypography(defaultTheme);

// ═══════════════════════════════════════════════════════
// 🔘 BUTTON STYLES
// ═══════════════════════════════════════════════════════

export const buttonStyles = StyleSheet.create({
  base: {
    borderRadius: 12,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  } as ViewStyle,
  
  primary: {
    backgroundColor: colors.accent,
    shadowColor: colors.shadowMedium,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 2,
  } as ViewStyle,
  
  primaryPressed: {
    backgroundColor: colors.primaryDark,
  } as ViewStyle,
  
  secondary: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
  } as ViewStyle,
  
  secondaryPressed: {
    backgroundColor: colors.backgroundAlt,
    borderColor: colors.textTertiary,
  } as ViewStyle,
  
  destructive: {
    backgroundColor: colors.error,
    shadowColor: colors.shadowMedium,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 2,
  } as ViewStyle,
  
  destructivePressed: {
    backgroundColor: '#DC2626',
  } as ViewStyle,
  
  ghost: {
    backgroundColor: 'transparent',
  } as ViewStyle,
  
  ghostPressed: {
    backgroundColor: colors.backgroundAlt,
  } as ViewStyle,
  
  disabled: {
    opacity: 0.5,
  } as ViewStyle,
  
  primaryText: {
    ...typography.buttonMedium,
    color: colors.textInverse,
  } as TextStyle,
  
  secondaryText: {
    ...typography.buttonMedium,
    color: colors.textPrimary,
  } as TextStyle,
  
  destructiveText: {
    ...typography.buttonMedium,
    color: colors.textInverse,
  } as TextStyle,
  
  ghostText: {
    ...typography.buttonMedium,
    color: colors.primary,
  } as TextStyle,
});

// ═══════════════════════════════════════════════════════
// 🃏 CARD STYLES
// ═══════════════════════════════════════════════════════

export const cardStyles = StyleSheet.create({
  base: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.md,
    shadowColor: colors.shadowLight,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: colors.border,
  } as ViewStyle,
  
  elevated: {
    shadowColor: colors.shadowMedium,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 4,
  } as ViewStyle,
  
  flat: {
    shadowOpacity: 0,
    elevation: 0,
    borderWidth: 1,
    borderColor: colors.border,
  } as ViewStyle,
  
  interactive: {
    backgroundColor: colors.surface,
  } as ViewStyle,
  
  interactivePressed: {
    backgroundColor: colors.highlight,
  } as ViewStyle,
});

// ═══════════════════════════════════════════════════════
// 📦 CONTAINER STYLES
// ═══════════════════════════════════════════════════════

export const containerStyles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  } as ViewStyle,
  
  content: {
    flex: 1,
    paddingHorizontal: spacing.md,
  } as ViewStyle,
  
  section: {
    marginBottom: spacing.lg,
  } as ViewStyle,
  
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  } as ViewStyle,
  
  column: {
    flexDirection: 'column',
    gap: spacing.sm,
  } as ViewStyle,
  
  spaceBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  } as ViewStyle,
  
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
});

// ═══════════════════════════════════════════════════════
// 🔲 INPUT STYLES
// ═══════════════════════════════════════════════════════

export const inputStyles = StyleSheet.create({
  base: {
    backgroundColor: colors.surface2,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 12,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    fontSize: 16,
    color: colors.textPrimary,
  } as TextStyle,
  
  input: {
    backgroundColor: colors.surface2,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 12,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    fontSize: 16,
    color: colors.textPrimary,
  } as TextStyle,
  
  focused: {
    borderColor: colors.accent,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  } as ViewStyle,
  
  error: {
    borderColor: colors.error,
  } as ViewStyle,
  
  disabled: {
    backgroundColor: colors.backgroundAlt,
    color: colors.textSecondary,
  } as TextStyle,
});

// ═══════════════════════════════════════════════════════
// 🏷️ BADGE STYLES
// ═══════════════════════════════════════════════════════

export const badgeStyles = StyleSheet.create({
  base: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: 8,
    alignSelf: 'flex-start',
  } as ViewStyle,
  
  success: {
    backgroundColor: colors.successLight,
  } as ViewStyle,
  
  warning: {
    backgroundColor: colors.warningLight,
  } as ViewStyle,
  
  error: {
    backgroundColor: colors.errorLight,
  } as ViewStyle,
  
  info: {
    backgroundColor: colors.infoLight,
  } as ViewStyle,
  
  neutral: {
    backgroundColor: colors.backgroundAlt,
  } as ViewStyle,
  
  text: {
    ...typography.labelSmall,
    fontWeight: '600',
  } as TextStyle,
  
  successText: {
    color: colors.success,
  } as TextStyle,
  
  warningText: {
    color: colors.warning,
  } as TextStyle,
  
  errorText: {
    color: colors.error,
  } as TextStyle,
  
  infoText: {
    color: colors.info,
  } as TextStyle,
  
  neutralText: {
    color: colors.textSecondary,
  } as TextStyle,
});

// ═══════════════════════════════════════════════════════
// 🔄 DIVIDER STYLES
// ═══════════════════════════════════════════════════════

export const dividerStyles = StyleSheet.create({
  horizontal: {
    height: 1,
    backgroundColor: colors.divider,
    marginVertical: spacing.md,
  } as ViewStyle,
  
  vertical: {
    width: 1,
    backgroundColor: colors.divider,
    marginHorizontal: spacing.md,
  } as ViewStyle,
});
