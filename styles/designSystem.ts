
import { StyleSheet, TextStyle, ViewStyle } from 'react-native';
import { Theme, lightTheme, darkTheme, createTypography as createThemeTypography } from './theme';

// ═══════════════════════════════════════════════════════
// 🎨 DESIGN SYSTEM - MY WISHLIST
// All colors MUST come from theme tokens - NO hardcoded colors
// ═══════════════════════════════════════════════════════

export { lightTheme, darkTheme };
export type { Theme };

// ═══════════════════════════════════════════════════════
// 🎨 COLORS - Dynamic theme-aware colors
// ═══════════════════════════════════════════════════════

export function createColors(theme: Theme) {
  return {
    // Core theme tokens (single source of truth)
    background: theme.colors.background,
    surface: theme.colors.surface,
    surface2: theme.colors.surface2,
    textPrimary: theme.colors.textPrimary,
    textSecondary: theme.colors.textSecondary,
    border: theme.colors.border,
    icon: theme.colors.icon,
    accent: theme.colors.accent,
    accentLight: theme.colors.accentLight,
    
    // Semantic colors
    success: theme.colors.success,
    successLight: theme.mode === 'dark' ? 'rgba(52,199,89,0.2)' : 'rgba(52,199,89,0.15)',
    warning: theme.colors.warning,
    warningLight: theme.mode === 'dark' ? 'rgba(255,149,0,0.2)' : 'rgba(255,149,0,0.15)',
    error: theme.colors.error,
    errorLight: theme.mode === 'dark' ? 'rgba(255,59,48,0.2)' : 'rgba(255,59,48,0.15)',
    info: theme.colors.info,
    infoLight: theme.mode === 'dark' ? 'rgba(90,200,250,0.2)' : 'rgba(90,200,250,0.15)',
    
    // Legacy aliases for backward compatibility
    primary: theme.colors.accent,
    primaryLight: theme.colors.accentLight,
    primaryDark: theme.mode === 'dark' ? 'rgba(255,255,255,0.8)' : '#2b1f19',
    text: theme.colors.textPrimary,
    textTertiary: theme.mode === 'dark' ? 'rgba(255,255,255,0.5)' : 'rgba(43,31,25,0.5)',
    textInverse: theme.mode === 'dark' ? '#2b1f19' : '#FFFFFF',
    card: theme.colors.surface,
    backgroundAlt: theme.colors.backgroundSecondary,
    backgroundSecondary: theme.colors.backgroundSecondary,
    divider: theme.colors.divider,
    borderLight: theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(43,31,25,0.08)',
    shadow: theme.colors.shadow,
    shadowLight: theme.mode === 'dark' ? 'transparent' : 'rgba(0,0,0,0.05)',
    shadowMedium: theme.mode === 'dark' ? 'transparent' : 'rgba(0,0,0,0.1)',
    shadowDark: theme.mode === 'dark' ? 'transparent' : 'rgba(0,0,0,0.15)',
    highlight: theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(43,31,25,0.04)',
    
    // DO NOT USE - kept only for migration
    white: '#FFFFFF',
    black: '#000000',
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
  return createThemeTypography(theme);
}

// Static typography export for backward compatibility
export const typography = createTypography(defaultTheme);

// ═══════════════════════════════════════════════════════
// 🔘 BUTTON STYLES (Theme-aware)
// ═══════════════════════════════════════════════════════

export function createButtonStyles(theme: Theme) {
  const colors = createColors(theme);
  
  return StyleSheet.create({
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
      ...(theme.mode === 'light' && {
        shadowColor: colors.shadowMedium,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 1,
        shadowRadius: 4,
        elevation: 2,
      }),
    } as ViewStyle,
    
    primaryPressed: {
      backgroundColor: colors.primaryDark,
    } as ViewStyle,
    
    secondary: {
      backgroundColor: colors.surface2,
      borderWidth: 1.5,
      borderColor: colors.border,
    } as ViewStyle,
    
    secondaryPressed: {
      backgroundColor: colors.backgroundAlt,
      borderColor: colors.textTertiary,
    } as ViewStyle,
    
    destructive: {
      backgroundColor: colors.error,
      ...(theme.mode === 'light' && {
        shadowColor: colors.shadowMedium,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 1,
        shadowRadius: 4,
        elevation: 2,
      }),
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
      ...createTypography(theme).buttonMedium,
      color: colors.textInverse,
    } as TextStyle,
    
    secondaryText: {
      ...createTypography(theme).buttonMedium,
      color: colors.textPrimary,
    } as TextStyle,
    
    destructiveText: {
      ...createTypography(theme).buttonMedium,
      color: colors.textInverse,
    } as TextStyle,
    
    ghostText: {
      ...createTypography(theme).buttonMedium,
      color: colors.primary,
    } as TextStyle,
  });
}

// Static button styles export for backward compatibility
export const buttonStyles = createButtonStyles(defaultTheme);

// ═══════════════════════════════════════════════════════
// 🃏 CARD STYLES (Theme-aware)
// ═══════════════════════════════════════════════════════

export function createCardStyles(theme: Theme) {
  const colors = createColors(theme);
  
  return StyleSheet.create({
    base: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
      ...(theme.mode === 'light' && {
        shadowColor: colors.shadowLight,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 1,
        shadowRadius: 8,
        elevation: 2,
      }),
    } as ViewStyle,
    
    elevated: {
      ...(theme.mode === 'light' && {
        shadowColor: colors.shadowMedium,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 1,
        shadowRadius: 12,
        elevation: 4,
      }),
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
}

// Static card styles export for backward compatibility
export const cardStyles = createCardStyles(defaultTheme);

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
// 🔲 INPUT STYLES (Theme-aware)
// ═══════════════════════════════════════════════════════

export function createInputStyles(theme: Theme) {
  const colors = createColors(theme);
  
  return StyleSheet.create({
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
}

// Static input styles export for backward compatibility
export const inputStyles = createInputStyles(defaultTheme);

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
