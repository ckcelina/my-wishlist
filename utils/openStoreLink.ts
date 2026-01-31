
import { Alert, Linking, Platform, ToastAndroid } from 'react-native';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import { logEvent, logError } from './observability';
import { appendAffiliateId, trackOutboundClick, getAffiliateDisclosure } from './affiliateLinks';
import { trackConversionClick } from './analytics';

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🔗 STORE LINK HANDLER WITH AFFILIATE SUPPORT
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * This module handles opening store links with:
 * - Affiliate ID appending
 * - Conversion tracking
 * - Analytics
 * - Compliance with App Store guidelines
 */

/**
 * Simple toast helper for cross-platform toast messages
 */
function showToast(message: string, type?: 'success' | 'error' | 'info') {
  if (Platform.OS === 'android') {
    ToastAndroid.show(message, ToastAndroid.SHORT);
  } else {
    console.log('[Toast]', message);
  }
}

export interface OpenStoreLinkOptions {
  source: 'item_detail' | 'import_preview' | 'shared_wishlist' | 'other_stores' | 'search_results';
  storeDomain?: string;
  itemId?: string;
  itemTitle?: string;
  onToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
}

// Debounce tracking
let lastOpenTime = 0;
const DEBOUNCE_MS = 1000;

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
  if (normalizedUrl && normalizedUrl.trim()) {
    return normalizedUrl.trim();
  }
  
  if (originalUrl && originalUrl.trim()) {
    return originalUrl.trim();
  }
  
  return null;
}

/**
 * Show fallback modal when opening link fails
 */
function showFallbackModal(url: string, onToast?: (message: string, type?: 'success' | 'error' | 'info') => void) {
  Alert.alert(
    'We couldn\'t open this link',
    'The link could not be opened in your browser.',
    [
      {
        text: 'Copy link',
        onPress: async () => {
          try {
            await Clipboard.setStringAsync(url);
            if (onToast) {
              onToast('Link copied to clipboard', 'success');
            } else {
              Alert.alert('Copied', 'Link copied to clipboard');
            }
            console.log('[openStoreLink] Link copied to clipboard');
          } catch (error) {
            console.error('[openStoreLink] Error copying link:', error);
            Alert.alert('Error', 'Failed to copy link');
          }
        },
      },
      {
        text: 'Try again',
        onPress: async () => {
          try {
            await Linking.openURL(url);
            console.log('[openStoreLink] Successfully opened URL on retry');
          } catch (retryError) {
            console.error('[openStoreLink] Retry failed:', retryError);
            Alert.alert('Error', 'Still unable to open the link. Please try copying it instead.');
          }
        },
      },
      {
        text: 'Cancel',
        style: 'cancel',
      },
    ]
  );
}

/**
 * Open store link externally in system browser
 * Handles validation, normalization, affiliate IDs, and error cases gracefully
 * Includes haptic feedback, toast messages, debouncing, and fallback handling
 */
export async function openStoreLink(
  url: string | null | undefined,
  options: OpenStoreLinkOptions
): Promise<void> {
  console.log('[openStoreLink] Opening link:', url, 'source:', options.source);
  
  // Debounce: prevent multiple rapid taps
  const now = Date.now();
  if (now - lastOpenTime < DEBOUNCE_MS) {
    console.log('[openStoreLink] Debounced - ignoring duplicate tap');
    return;
  }
  lastOpenTime = now;
  
  // Haptic feedback (light)
  if (Platform.OS === 'ios' || Platform.OS === 'android') {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }
  
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
  
  // Append affiliate ID if store domain is provided
  let finalUrl = trimmedUrl;
  if (options.storeDomain) {
    finalUrl = appendAffiliateId(trimmedUrl, options.storeDomain);
    
    // Show affiliate disclosure if applicable
    const disclosure = getAffiliateDisclosure(options.storeDomain);
    if (disclosure && options.onToast) {
      options.onToast(disclosure, 'info');
    }
  }
  
  // Show toast: "Opening store…"
  if (options.onToast) {
    options.onToast('Opening store…', 'info');
  } else {
    showToast('Opening store…', 'info');
  }
  
  // Track outbound click for affiliate analytics
  if (options.storeDomain) {
    await trackOutboundClick({
      storeId: options.storeDomain,
      storeDomain: options.storeDomain,
      itemId: options.itemId,
      itemTitle: options.itemTitle,
      source: options.source,
    });
  }
  
  // Track conversion click for analytics
  if (options.storeDomain && options.itemId) {
    await trackConversionClick({
      storeId: options.storeDomain,
      storeDomain: options.storeDomain,
      itemId: options.itemId,
      source: options.source,
      timestamp: new Date().toISOString(),
    });
  }
  
  // Log analytics event
  logEvent('store_link_opened', {
    source: options.source,
    storeDomain: options.storeDomain,
    itemId: options.itemId,
    hasUrl: true,
    hasAffiliateId: finalUrl !== trimmedUrl,
  });
  
  try {
    // Check if the URL can be opened
    const canOpen = await Linking.canOpenURL(finalUrl);
    
    if (!canOpen) {
      console.warn('[openStoreLink] Cannot open URL:', finalUrl);
      showFallbackModal(finalUrl, options.onToast);
      return;
    }
    
    // Open URL in system browser (external)
    await Linking.openURL(finalUrl);
    console.log('[openStoreLink] Successfully opened URL');
    
  } catch (error) {
    console.error('[openStoreLink] Error opening URL:', error);
    
    // Show fallback modal with "Try again" and "Copy link" options
    showFallbackModal(finalUrl, options.onToast);
    
    logError(error instanceof Error ? error : new Error(String(error)), {
      context: 'openStoreLink',
      url: finalUrl,
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

/**
 * Copy store link to clipboard
 * Can be used in 3-dot menus or long press handlers
 */
export async function copyStoreLink(
  url: string | null | undefined,
  onToast?: (message: string, type?: 'success' | 'error' | 'info') => void
): Promise<void> {
  console.log('[copyStoreLink] Copying link to clipboard');
  
  if (!url || !url.trim()) {
    console.warn('[copyStoreLink] No URL provided');
    if (onToast) {
      onToast('No link available', 'error');
    } else {
      Alert.alert('Error', 'No link available to copy');
    }
    return;
  }
  
  const trimmedUrl = url.trim();
  
  try {
    await Clipboard.setStringAsync(trimmedUrl);
    console.log('[copyStoreLink] Link copied successfully');
    
    // Haptic feedback
    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    
    if (onToast) {
      onToast('Link copied to clipboard', 'success');
    } else {
      Alert.alert('Copied', 'Link copied to clipboard');
    }
    
    // Log analytics
    logEvent('store_link_copied', {
      hasUrl: true,
    });
  } catch (error) {
    console.error('[copyStoreLink] Error copying link:', error);
    if (onToast) {
      onToast('Failed to copy link', 'error');
    } else {
      Alert.alert('Error', 'Failed to copy link');
    }
    
    logError(error instanceof Error ? error : new Error(String(error)), {
      context: 'copyStoreLink',
      url: trimmedUrl,
    });
  }
}
