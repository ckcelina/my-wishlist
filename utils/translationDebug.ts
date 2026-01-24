
import AsyncStorage from '@react-native-async-storage/async-storage';
import i18n from '@/lib/i18n';

const TRANSLATION_DEBUG_KEY = '@wishlist_translation_debug';

/**
 * Translation Debug Mode
 * Dev-only feature to highlight missing translation keys
 */

export async function getTranslationDebugEnabled(): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(TRANSLATION_DEBUG_KEY);
    return value === 'true';
  } catch (error) {
    console.error('[TranslationDebug] Error getting debug mode:', error);
    return false;
  }
}

export async function setTranslationDebugEnabled(enabled: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(TRANSLATION_DEBUG_KEY, enabled ? 'true' : 'false');
    console.log('[TranslationDebug] Debug mode set to:', enabled);
  } catch (error) {
    console.error('[TranslationDebug] Error setting debug mode:', error);
  }
}

/**
 * Enhanced translation function with debug mode support
 * Shows missing keys in bright warning color when debug mode is enabled
 */
export function debugTranslate(
  key: string,
  options?: any,
  debugEnabled: boolean = false
): string {
  try {
    const translation = i18n.t(key, options);
    
    // Check if translation is missing (i18next returns the key if not found)
    if (translation === key || !translation) {
      if (debugEnabled) {
        // Return key in brackets with warning indicator
        console.warn(`[TranslationDebug] Missing key: ${key}`);
        return `[${key}]`;
      }
      // Fallback to empty string or key
      return key;
    }
    
    return translation;
  } catch (error) {
    console.error('[TranslationDebug] Translation error:', error, 'key:', key);
    if (debugEnabled) {
      return `[ERROR:${key}]`;
    }
    return key;
  }
}

/**
 * Validate translation keys at runtime
 * Checks for missing keys, unused keys, and mismatched params
 */
export interface TranslationValidationResult {
  missingKeys: string[];
  unusedKeys: string[];
  mismatchedParams: Array<{
    key: string;
    expectedParams: string[];
    actualParams: string[];
  }>;
}

export function validateTranslations(
  usedKeys: Set<string>,
  availableKeys: Set<string>
): TranslationValidationResult {
  const missingKeys: string[] = [];
  const unusedKeys: string[] = [];
  
  // Check for missing keys
  usedKeys.forEach(key => {
    if (!availableKeys.has(key)) {
      missingKeys.push(key);
    }
  });
  
  // Check for unused keys
  availableKeys.forEach(key => {
    if (!usedKeys.has(key)) {
      unusedKeys.push(key);
    }
  });
  
  return {
    missingKeys,
    unusedKeys,
    mismatchedParams: [], // TODO: Implement param validation
  };
}

/**
 * Extract all translation keys from a translation object
 */
export function extractTranslationKeys(
  obj: any,
  prefix: string = ''
): Set<string> {
  const keys = new Set<string>();
  
  for (const key in obj) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    
    if (typeof obj[key] === 'object' && obj[key] !== null) {
      // Recursively extract nested keys
      const nestedKeys = extractTranslationKeys(obj[key], fullKey);
      nestedKeys.forEach(k => keys.add(k));
    } else {
      keys.add(fullKey);
    }
  }
  
  return keys;
}

/**
 * Log translation validation results
 */
export function logTranslationValidation(result: TranslationValidationResult): void {
  console.group('[TranslationDebug] Validation Results');
  
  if (result.missingKeys.length > 0) {
    console.warn('Missing Keys:', result.missingKeys);
  }
  
  if (result.unusedKeys.length > 0) {
    console.info('Unused Keys:', result.unusedKeys);
  }
  
  if (result.mismatchedParams.length > 0) {
    console.warn('Mismatched Params:', result.mismatchedParams);
  }
  
  if (
    result.missingKeys.length === 0 &&
    result.unusedKeys.length === 0 &&
    result.mismatchedParams.length === 0
  ) {
    console.log('✅ All translations valid');
  }
  
  console.groupEnd();
}
