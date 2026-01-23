
import { StyleSheet, TextStyle, ViewStyle } from 'react-native';

// ═══════════════════════════════════════════════════════
// 🎨 DESIGN TOKENS - Premium, Calm, Modern Aesthetic
// ═══════════════════════════════════════════════════════

export const colors = {
  // Primary palette - Soft, calming colors
  primary: '#6366F1',           // Soft Indigo - primary actions
  primaryLight: '#818CF8',      // Light Indigo - hover states
  primaryDark: '#4F46E5',       // Dark Indigo - pressed states
  
  // Neutral palette - Soft, breathable backgrounds
  background: '#FAFAFA',        // Soft neutral background
  backgroundAlt: '#F5F5F5',     // Alternate background
  surface: '#FFFFFF',           // Card/surface background
  
  // Text hierarchy
  textPrimary: '#1F2937',       // Primary text - dark gray
  textSecondary: '#6B7280',     // Secondary text - medium gray
  textTertiary: '#9CA3AF',      // Tertiary text - light gray
  textInverse: '#FFFFFF',       // Text on dark backgrounds
  
  // Borders and dividers
  border: '#E5E7EB',            // Subtle borders
  borderLight: '#F3F4F6',       // Very light borders
  divider: '#E5E7EB',           // Dividers
  
  // Semantic colors
  success: '#10B981',           // Success green
  successLight: '#D1FAE5',      // Success background
  warning: '#F59E0B',           // Warning amber
  warningLight: '#FEF3C7',      // Warning background
  error: '#EF4444',             // Error red
  errorLight: '#FEE2E2',        // Error background
  info: '#3B82F6',              // Info blue
  infoLight: '#DBEAFE',         // Info background
  
  // Accent colors
  accent: '#EC4899',            // Pink accent
  accentLight: '#FCE7F3',       // Light pink
  
  // Shadows (for elevation)
  shadowLight: 'rgba(0, 0, 0, 0.05)',
  shadowMedium: 'rgba(0, 0, 0, 0.1)',
  shadowDark: 'rgba(0, 0, 0, 0.15)',
};

// ═══════════════════════════════════════════════════════
// 📏 SPACING SCALE - Consistent spacing throughout the app
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
// 🔤 TYPOGRAPHY HIERARCHY - Clear text hierarchy
// ═══════════════════════════════════════════════════════

export const typography = StyleSheet.create({
  // Display text - Large, bold headings
  displayLarge: {
    fontSize: 32,
    fontWeight: '700',
    lineHeight: 40,
    color: colors.textPrimary,
    letterSpacing: -0.5,
  } as TextStyle,
  
  displayMedium: {
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 36,
    color: colors.textPrimary,
    letterSpacing: -0.5,
  } as TextStyle,
  
  // Titles - Section headings
  titleLarge: {
    fontSize: 24,
    fontWeight: '600',
    lineHeight: 32,
    color: colors.textPrimary,
    letterSpacing: -0.3,
  } as TextStyle,
  
  titleMedium: {
    fontSize: 20,
    fontWeight: '600',
    lineHeight: 28,
    color: colors.textPrimary,
    letterSpacing: -0.2,
  } as TextStyle,
  
  titleSmall: {
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 24,
    color: colors.textPrimary,
  } as TextStyle,
  
  // Body text - Regular content
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
// 🔘 BUTTON STYLES - Primary, Secondary, Destructive
// ═══════════════════════════════════════════════════════

export const buttonStyles = StyleSheet.create({
  // Base button style
  base: {
    borderRadius: 12,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  } as ViewStyle,
  
  // Primary button - Main CTAs
  primary: {
    backgroundColor: colors.primary,
    shadowColor: colors.shadowMedium,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 2,
  } as ViewStyle,
  
  primaryPressed: {
    backgroundColor: colors.primaryDark,
  } as ViewStyle,
  
  // Secondary button - Less prominent actions
  secondary: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
  } as ViewStyle,
  
  secondaryPressed: {
    backgroundColor: colors.backgroundAlt,
    borderColor: colors.textTertiary,
  } as ViewStyle,
  
  // Destructive button - Delete, remove actions
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
  
  // Ghost button - Minimal style
  ghost: {
    backgroundColor: 'transparent',
  } as ViewStyle,
  
  ghostPressed: {
    backgroundColor: colors.backgroundAlt,
  } as ViewStyle,
  
  // Disabled state
  disabled: {
    opacity: 0.5,
  } as ViewStyle,
  
  // Button text styles
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
// 🃏 CARD STYLES - Subtle shadows and rounded corners
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
// 📦 CONTAINER STYLES - Layout containers
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
// 🔲 INPUT STYLES - Form inputs
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
// 🏷️ BADGE STYLES - Status badges
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
