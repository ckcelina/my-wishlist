
/**
 * ═══════════════════════════════════════════════════════════════════════════
 * EDGE FUNCTION NAMES - SINGLE SOURCE OF TRUTH
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * This file centralizes all Edge Function names used throughout the app.
 * 
 * CRITICAL: Use these constants EVERYWHERE you invoke edge functions.
 * DO NOT hardcode function names in components or utilities.
 * 
 * This ensures:
 * - Consistency between client and diagnostics
 * - Easy refactoring if function names change
 * - Type safety for function names
 * - Single place to update when adding/removing functions
 */

export const EDGE_FUNCTION_NAMES = {
  HEALTH: 'health',
  EXTRACT_ITEM: 'extract-item',
  FIND_ALTERNATIVES: 'find-alternatives',
  IMPORT_WISHLIST: 'import-wishlist',
  IDENTIFY_PRODUCT_FROM_IMAGE: 'identify-product-from-image',
  SEARCH_BY_NAME: 'search-by-name',
  ALERT_ITEMS_WITH_TARGETS: 'alert-items-with-targets',
} as const;

export type EdgeFunction = typeof EDGE_FUNCTION_NAMES[keyof typeof EDGE_FUNCTION_NAMES];

/**
 * Array of all edge function names for iteration (e.g., in diagnostics)
 */
export const ALL_EDGE_FUNCTIONS: EdgeFunction[] = Object.values(EDGE_FUNCTION_NAMES);

/**
 * Human-readable descriptions for each function (for diagnostics UI)
 */
export const EDGE_FUNCTION_DESCRIPTIONS: Record<EdgeFunction, string> = {
  [EDGE_FUNCTION_NAMES.HEALTH]: 'Health check endpoint (no auth required)',
  [EDGE_FUNCTION_NAMES.EXTRACT_ITEM]: 'Extract product details from URL',
  [EDGE_FUNCTION_NAMES.FIND_ALTERNATIVES]: 'Find alternative stores for products',
  [EDGE_FUNCTION_NAMES.IMPORT_WISHLIST]: 'Import wishlist from external URL',
  [EDGE_FUNCTION_NAMES.IDENTIFY_PRODUCT_FROM_IMAGE]: 'Identify products from images using Google Vision',
  [EDGE_FUNCTION_NAMES.SEARCH_BY_NAME]: 'Search for products by name',
  [EDGE_FUNCTION_NAMES.ALERT_ITEMS_WITH_TARGETS]: 'Get items with price alert targets',
};
