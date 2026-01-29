
/**
 * Typography Tokens
 * 
 * Centralized font sizes, weights, and line heights
 * to ensure consistency across Expo Go, TestFlight, and Android builds.
 * 
 * DO NOT use hardcoded font sizes in components.
 * ALWAYS use these tokens.
 */

export const FontSizes = {
  // Display text (large headings)
  displayLarge: 32,
  displayMedium: 28,
  
  // Titles (section headings)
  titleLarge: 24,
  titleMedium: 20,
  titleSmall: 18,
  
  // Body text (regular content)
  bodyLarge: 16,
  bodyMedium: 14,
  bodySmall: 12,
  
  // Labels (UI labels and captions)
  labelLarge: 14,
  labelMedium: 12,
  labelSmall: 10,
  
  // Button text
  buttonLarge: 16,
  buttonMedium: 14,
  buttonSmall: 12,
} as const;

export const FontWeights = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
} as const;

export const LineHeights = {
  // Display text
  displayLarge: 40,
  displayMedium: 36,
  
  // Titles
  titleLarge: 32,
  titleMedium: 28,
  titleSmall: 24,
  
  // Body text
  bodyLarge: 24,
  bodyMedium: 20,
  bodySmall: 16,
  
  // Labels
  labelLarge: 20,
  labelMedium: 16,
  labelSmall: 14,
  
  // Button text
  buttonLarge: 24,
  buttonMedium: 20,
  buttonSmall: 16,
} as const;

export const LetterSpacing = {
  tight: -0.5,
  normal: 0,
  wide: 0.5,
} as const;

/**
 * Typography style presets
 * Use these in StyleSheet.create() for consistent typography
 */
export const TypographyStyles = {
  displayLarge: {
    fontSize: FontSizes.displayLarge,
    fontWeight: FontWeights.regular,
    lineHeight: LineHeights.displayLarge,
    letterSpacing: LetterSpacing.tight,
  },
  
  displayMedium: {
    fontSize: FontSizes.displayMedium,
    fontWeight: FontWeights.regular,
    lineHeight: LineHeights.displayMedium,
    letterSpacing: LetterSpacing.tight,
  },
  
  titleLarge: {
    fontSize: FontSizes.titleLarge,
    fontWeight: FontWeights.regular,
    lineHeight: LineHeights.titleLarge,
    letterSpacing: LetterSpacing.tight,
  },
  
  titleMedium: {
    fontSize: FontSizes.titleMedium,
    fontWeight: FontWeights.regular,
    lineHeight: LineHeights.titleMedium,
  },
  
  titleSmall: {
    fontSize: FontSizes.titleSmall,
    fontWeight: FontWeights.regular,
    lineHeight: LineHeights.titleSmall,
  },
  
  bodyLarge: {
    fontSize: FontSizes.bodyLarge,
    fontWeight: FontWeights.regular,
    lineHeight: LineHeights.bodyLarge,
  },
  
  bodyMedium: {
    fontSize: FontSizes.bodyMedium,
    fontWeight: FontWeights.regular,
    lineHeight: LineHeights.bodyMedium,
  },
  
  bodySmall: {
    fontSize: FontSizes.bodySmall,
    fontWeight: FontWeights.regular,
    lineHeight: LineHeights.bodySmall,
  },
  
  labelLarge: {
    fontSize: FontSizes.labelLarge,
    fontWeight: FontWeights.medium,
    lineHeight: LineHeights.labelLarge,
  },
  
  labelMedium: {
    fontSize: FontSizes.labelMedium,
    fontWeight: FontWeights.medium,
    lineHeight: LineHeights.labelMedium,
  },
  
  labelSmall: {
    fontSize: FontSizes.labelSmall,
    fontWeight: FontWeights.medium,
    lineHeight: LineHeights.labelSmall,
  },
  
  buttonLarge: {
    fontSize: FontSizes.buttonLarge,
    fontWeight: FontWeights.semibold,
    lineHeight: LineHeights.buttonLarge,
  },
  
  buttonMedium: {
    fontSize: FontSizes.buttonMedium,
    fontWeight: FontWeights.semibold,
    lineHeight: LineHeights.buttonMedium,
  },
  
  buttonSmall: {
    fontSize: FontSizes.buttonSmall,
    fontWeight: FontWeights.semibold,
    lineHeight: LineHeights.buttonSmall,
  },
} as const;
