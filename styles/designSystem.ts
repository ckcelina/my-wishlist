
import { StyleSheet, TextStyle, ViewStyle } from 'react-native';
import { Theme, lightTheme, darkTheme } from './theme';

// ═══════════════════════════════════════════════════════
// 🎨 DESIGN SYSTEM - MY WISHLIST
// ═══════════════════════════════════════════════════════

// Export theme utilities
export { lightTheme, darkTheme };
export type { Theme };

// Default to light theme for static exports (components should use useAppTheme hook)
const defaultTheme = lightTheme;

// ═══════════════════════════════════════════════════════
// 🎨 COLORS - Backward compatibility
// ═══════════════════════════════════════════════════════

export const colors = {
  // Primary palette
  primary: '#6366F1',
  primaryLight: '#818CF8',
  primaryDark: '#4F46E5',
  
  // Neutral palette
  background: defaultTheme.colors.background,
  backgroundAlt: defaultTheme.colors.backgroundSecondary,
  surface: defaultTheme.colors.card,
  
  // Text hierarchy
  textPrimary: defaultTheme.colors.text,
  textSecondary: defaultTheme.colors.textSecondary,
  textTertiary: 'rgba(59,42,31,0.5)',
  textInverse: '#FFFFFF',
  
  // Borders and dividers
  border: defaultTheme.colors.border,
  borderLight: 'rgba(0,0,0,0.05)',
  divider: defaultTheme.colors.divider,
  
  // Semantic colors
  success: defaultTheme.colors.success,
  successLight: '#D1FAE5',
  warning: defaultTheme.colors.warning,
  warningLight: '#FEF3C7',
  error: defaultTheme.colors.error,
  errorLight: '#FEE2E2',
  info: defaultTheme.colors.info,
  infoLight: '#DBEAFE',
  
  // Accent colors
  accent: defaultTheme.colors.accent,
  accentLight: defaultTheme.colors.accentLight,
  
  // Shadows
  shadowLight: 'rgba(0, 0, 0, 0.05)',
  shadowMedium: 'rgba(0, 0, 0, 0.1)',
  shadowDark: 'rgba(0, 0, 0, 0.15)',
};

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

export const typography = StyleSheet.create({
  // Display text - Large, elegant headings (Playfair Display)
  displayLarge: {
    fontSize: 32,
    fontWeight: '400',
    lineHeight: 40,
    color: colors.textPrimary,
    letterSpacing: -0.5,
  } as TextStyle,
  
  displayMedium: {
    fontSize: 28,
    fontWeight: '400',
    lineHeight: 36,
    color: colors.textPrimary,
    letterSpacing: -0.5,
  } as TextStyle,
  
  // Titles - Section headings (Playfair Display)
  titleLarge: {
    fontSize: 24,
    fontWeight: '400',
    lineHeight: 32,
    color: colors.textPrimary,
    letterSpacing: -0.3,
  } as TextStyle,
  
  titleMedium: {
    fontSize: 20,
    fontWeight: '400',
    lineHeight: 28,
    color: colors.textPrimary,
    letterSpacing: -0.2,
  } as TextStyle,
  
  titleSmall: {
    fontSize: 18,
    fontWeight: '400',
    lineHeight: 24,
    color: colors.textPrimary,
  } as TextStyle,
  
  // Body text - Regular content (Inter)
  bodyLarge: {
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 24,
    color: colors.textPrimary,
  } as TextStyle,
  
  bodyMedium: {
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
    color: colors.textPrimary,
  } as TextStyle,
  
  bodySmall: {
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 16,
    color: colors.textSecondary,
  } as TextStyle,
  
  // Labels - UI labels and captions
  labelLarge: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
    color: colors.textPrimary,
  } as TextStyle,
  
  labelMedium: {
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 16,
    color: colors.textSecondary,
  } as TextStyle,
  
  labelSmall: {
    fontSize: 10,
    fontWeight: '500',
    lineHeight: 14,
    color: colors.textTertiary,
  } as TextStyle,
  
  // Button text
  buttonLarge: {
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 24,
    color: colors.textInverse,
  } as TextStyle,
  
  buttonMedium: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
    color: colors.textInverse,
  } as TextStyle,
});

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
    borderColor: colors.borderLight,
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
    backgroundColor: colors.backgroundAlt,
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
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 12,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    fontSize: 16,
    color: colors.textPrimary,
  } as TextStyle,
  
  focused: {
    borderColor: colors.primary,
    shadowColor: colors.primary,
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
    color: colors.textTertiary,
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
