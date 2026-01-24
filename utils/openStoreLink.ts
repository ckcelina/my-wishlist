
import { Alert, Linking } from 'react-native';
import { logEvent, logError } from './observability';

/**
 * Reusable helper to open store/product links
 * Validates, normalizes, and opens links externally in system browser
 */

export interface OpenStoreLinkOptions {
  source: 'item_detail' | 'import_preview' | 'shared_wishlist' | 'other_stores';
  storeDomain?: string;
  itemId?: string;
  itemTitle?: string;
}

/**
 * Validate URL format
 */
function isValidUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Normalize URL (prefer normalized_url over original_url)
 */
function normalizeUrl(
  normalizedUrl: string | null | undefined,
  originalUrl: string | null | undefined
): string | null {
  // Prefer normalized URL if available
  if (normalizedUrl && normalizedUrl.trim()) {
    return normalizedUrl.trim();
  }
  
  // Fallback to original URL
  if (originalUrl && originalUrl.trim()) {
    return originalUrl.trim();
  }
  
  return null;
}

/**
 * Open store link externally in system browser
 * Handles validation, normalization, and error cases gracefully
 */
export async function openStoreLink(
  url: string | null | undefined,
  options: OpenStoreLinkOptions
): Promise<void> {
  console.log('[openStoreLink] Opening link:', url, 'source:', options.source);
  
  // Log analytics event
  logEvent('store_link_opened', {
    source: options.source,
    storeDomain: options.storeDomain,
    itemId: options.itemId,
    hasUrl: !!url,
  });
  
  // Check if URL exists
  if (!url || !url.trim()) {
    console.warn('[openStoreLink] No URL provided');
    Alert.alert(
      'Link Unavailable',
      'This link is no longer available.',
      [{ text: 'OK' }]
    );
    return;
  }
  
  const trimmedUrl = url.trim();
  
  // Validate URL format
  if (!isValidUrl(trimmedUrl)) {
    console.warn('[openStoreLink] Invalid URL:', trimmedUrl);
    Alert.alert(
      'Invalid Link',
      'This link is no longer available.',
      [{ text: 'OK' }]
    );
    
    logError(new Error('Invalid store URL'), {
      context: 'openStoreLink',
      url: trimmedUrl,
      source: options.source,
    });
    
    return;
  }
  
  try {
    // Check if the URL can be opened
    const canOpen = await Linking.canOpenURL(trimmedUrl);
    
    if (!canOpen) {
      console.warn('[openStoreLink] Cannot open URL:', trimmedUrl);
      Alert.alert(
        'Cannot Open Link',
        'Unable to open this link on your device.',
        [{ text: 'OK' }]
      );
      return;
    }
    
    // Open URL in system browser (external)
    await Linking.openURL(trimmedUrl);
    console.log('[openStoreLink] Successfully opened URL');
    
  } catch (error) {
    console.error('[openStoreLink] Error opening URL:', error);
    
    Alert.alert(
      'Error',
      'Failed to open the link. Please try again.',
      [{ text: 'OK' }]
    );
    
    logError(error instanceof Error ? error : new Error(String(error)), {
      context: 'openStoreLink',
      url: trimmedUrl,
      source: options.source,
    });
  }
}

/**
 * Helper to get the best URL from an item
 * Prefers normalized_url, falls back to original_url
 */
export function getItemUrl(item: {
  normalized_url?: string | null;
  normalizedUrl?: string | null;
  original_url?: string | null;
  originalUrl?: string | null;
}): string | null {
  return normalizeUrl(
    item.normalized_url || item.normalizedUrl,
    item.original_url || item.originalUrl
  );
}

/**
 * Check if an item has a valid URL
 */
export function hasValidUrl(item: {
  normalized_url?: string | null;
  normalizedUrl?: string | null;
  original_url?: string | null;
  originalUrl?: string | null;
}): boolean {
  const url = getItemUrl(item);
  return !!url && isValidUrl(url);
}
