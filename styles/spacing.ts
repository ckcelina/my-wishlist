
/**
 * Spacing Tokens
 * 
 * Centralized spacing values to ensure consistency
 * across Expo Go, TestFlight, and Android builds.
 * 
 * DO NOT use hardcoded spacing values in components.
 * ALWAYS use these tokens.
 */

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
} as const;

/**
 * Component-specific spacing
 */
export const ComponentSpacing = {
  // Screen padding
  screenHorizontal: Spacing.md,
  screenVertical: Spacing.lg,
  
  // Card padding
  cardPadding: Spacing.md,
  cardMargin: Spacing.md,
  
  // List item spacing
  listItemPadding: Spacing.md,
  listItemGap: Spacing.sm,
  
  // Button padding
  buttonPaddingVertical: Spacing.md,
  buttonPaddingHorizontal: Spacing.lg,
  
  // Input padding
  inputPaddingVertical: Spacing.md,
  inputPaddingHorizontal: Spacing.md,
  
  // Section spacing
  sectionMarginBottom: Spacing.lg,
  sectionGap: Spacing.md,
  
  // Tab bar
  tabBarHeight: 64,
  tabBarPadding: 4,
  tabBarBottomMargin: 20,
} as const;

/**
 * Safe area adjustments
 * These are added to ComponentSpacing values when needed
 */
export const SafeAreaAdjustments = {
  // Minimum bottom padding to account for tab bar
  minBottomPadding: 24,
  
  // Extra padding for screens with tab bar
  tabBarExtraPadding: 88, // tabBarHeight + minBottomPadding
} as const;
