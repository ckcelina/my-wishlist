
import { Platform } from 'react-native';

/**
 * ═══════════════════════════════════════════════════════
 * 📏 SPACING SYSTEM - MY WISHLIST
 * ═══════════════════════════════════════════════════════
 */

// Base spacing scale (8px grid)
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
};

/**
 * ═══════════════════════════════════════════════════════
 * 🎯 COMPONENT SPACING - LOCKED FOR PARITY
 * ═══════════════════════════════════════════════════════
 * 
 * These values are LOCKED and must be identical across:
 * - Expo Go
 * - Development Builds
 * - Preview Builds (TestFlight)
 * - Production Builds (App Store/Google Play)
 * 
 * DO NOT MODIFY without updating:
 * - utils/environmentConfig.ts
 * - UI_PARITY_IMPLEMENTATION.md
 */

export const ComponentSpacing = {
  // Tab Bar (LOCKED)
  tabBarHeight: 80,
  tabBarBorderRadius: 20,
  tabBarPadding: 2,
  tabBarBottomMargin: 16,
  
  // Card
  cardPadding: spacing.md,
  cardBorderRadius: 16,
  cardGap: spacing.md,
  
  // Button
  buttonPaddingVertical: spacing.md,
  buttonPaddingHorizontal: spacing.lg,
  buttonBorderRadius: 12,
  buttonGap: spacing.sm,
  
  // Input
  inputPaddingVertical: spacing.md,
  inputPaddingHorizontal: spacing.md,
  inputBorderRadius: 12,
  
  // List Item
  listItemPaddingVertical: spacing.md,
  listItemPaddingHorizontal: spacing.md,
  listItemGap: spacing.sm,
  
  // Screen
  screenPaddingHorizontal: spacing.md,
  screenPaddingVertical: spacing.lg,
  
  // Section
  sectionGap: spacing.lg,
  sectionTitleMarginBottom: spacing.md,
  
  // Modal
  modalPadding: spacing.lg,
  modalBorderRadius: 20,
  
  // Badge
  badgePaddingVertical: spacing.xs,
  badgePaddingHorizontal: spacing.sm,
  badgeBorderRadius: 8,
  
  // Divider
  dividerMarginVertical: spacing.md,
  dividerMarginHorizontal: spacing.md,
};

/**
 * ═══════════════════════════════════════════════════════
 * 🔍 VERIFICATION
 * ═══════════════════════════════════════════════════════
 */

export function verifyComponentSpacing(): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  // Verify tab bar dimensions (CRITICAL for parity)
  if (ComponentSpacing.tabBarHeight !== 80) {
    errors.push(`Tab bar height is ${ComponentSpacing.tabBarHeight}, expected 80`);
  }
  
  if (ComponentSpacing.tabBarBorderRadius !== 20) {
    errors.push(`Tab bar border radius is ${ComponentSpacing.tabBarBorderRadius}, expected 20`);
  }
  
  if (ComponentSpacing.tabBarPadding !== 2) {
    errors.push(`Tab bar padding is ${ComponentSpacing.tabBarPadding}, expected 2`);
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

// Log verification on module load (dev only)
if (__DEV__) {
  const verification = verifyComponentSpacing();
  if (!verification.valid) {
    console.warn('[Spacing] Component spacing verification failed:');
    verification.errors.forEach(error => console.warn(`  - ${error}`));
  }
}
