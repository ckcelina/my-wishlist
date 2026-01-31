
import { appConfig } from './environmentConfig';
import { logEvent } from './observability';

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 💰 AFFILIATE LINK MANAGEMENT
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * This module handles affiliate link generation and tracking for monetization.
 * 
 * Features:
 * - Append affiliate IDs to store URLs
 * - Track outbound clicks per store and item
 * - Support for multiple affiliate networks
 * - Compliance with App Store guidelines
 */

export interface AffiliateTrackingData {
  storeId: string;
  storeDomain: string;
  itemId?: string;
  itemTitle?: string;
  source: 'item_detail' | 'import_preview' | 'shared_wishlist' | 'other_stores' | 'search_results';
}

/**
 * Supported affiliate networks
 */
export const AFFILIATE_NETWORKS = {
  AMAZON: 'amazon',
  EBAY: 'ebay',
  WALMART: 'walmart',
  TARGET: 'target',
  BESTBUY: 'bestbuy',
  ETSY: 'etsy',
  ALIEXPRESS: 'aliexpress',
} as const;

export type AffiliateNetwork = typeof AFFILIATE_NETWORKS[keyof typeof AFFILIATE_NETWORKS];

/**
 * Detect affiliate network from store domain
 */
export function detectAffiliateNetwork(storeDomain: string): AffiliateNetwork | null {
  const domain = storeDomain.toLowerCase();
  
  if (domain.includes('amazon')) return AFFILIATE_NETWORKS.AMAZON;
  if (domain.includes('ebay')) return AFFILIATE_NETWORKS.EBAY;
  if (domain.includes('walmart')) return AFFILIATE_NETWORKS.WALMART;
  if (domain.includes('target')) return AFFILIATE_NETWORKS.TARGET;
  if (domain.includes('bestbuy')) return AFFILIATE_NETWORKS.BESTBUY;
  if (domain.includes('etsy')) return AFFILIATE_NETWORKS.ETSY;
  if (domain.includes('aliexpress')) return AFFILIATE_NETWORKS.ALIEXPRESS;
  
  return null;
}

/**
 * Append affiliate ID to URL based on store
 */
export function appendAffiliateId(url: string, storeDomain: string): string {
  const network = detectAffiliateNetwork(storeDomain);
  
  if (!network) {
    console.log('[Affiliate] No affiliate network detected for domain:', storeDomain);
    return url;
  }
  
  const affiliateId = appConfig.affiliateIds[network];
  
  if (!affiliateId) {
    console.log('[Affiliate] No affiliate ID configured for network:', network);
    return url;
  }
  
  try {
    const urlObj = new URL(url);
    
    switch (network) {
      case AFFILIATE_NETWORKS.AMAZON:
        // Amazon Associates: ?tag=YOUR_TAG
        urlObj.searchParams.set('tag', affiliateId);
        break;
        
      case AFFILIATE_NETWORKS.EBAY:
        // eBay Partner Network: &mkevt=1&mkcid=1&mkrid=YOUR_ID
        urlObj.searchParams.set('mkevt', '1');
        urlObj.searchParams.set('mkcid', '1');
        urlObj.searchParams.set('mkrid', affiliateId);
        break;
        
      case AFFILIATE_NETWORKS.WALMART:
        // Walmart Affiliates: ?affcamid=YOUR_ID
        urlObj.searchParams.set('affcamid', affiliateId);
        break;
        
      case AFFILIATE_NETWORKS.TARGET:
        // Target Affiliates: ?afid=YOUR_ID
        urlObj.searchParams.set('afid', affiliateId);
        break;
        
      case AFFILIATE_NETWORKS.BESTBUY:
        // Best Buy Affiliates: ?ref=YOUR_ID
        urlObj.searchParams.set('ref', affiliateId);
        break;
        
      case AFFILIATE_NETWORKS.ETSY:
        // Etsy Affiliates: ?ref=YOUR_ID
        urlObj.searchParams.set('ref', affiliateId);
        break;
        
      case AFFILIATE_NETWORKS.ALIEXPRESS:
        // AliExpress Affiliates: &aff_platform_order_id=YOUR_ID
        urlObj.searchParams.set('aff_platform_order_id', affiliateId);
        break;
    }
    
    const affiliatedUrl = urlObj.toString();
    console.log('[Affiliate] Appended affiliate ID for', network, ':', affiliatedUrl);
    return affiliatedUrl;
    
  } catch (error) {
    console.error('[Affiliate] Error appending affiliate ID:', error);
    return url;
  }
}

/**
 * Track outbound click for analytics
 */
export async function trackOutboundClick(data: AffiliateTrackingData): Promise<void> {
  if (!appConfig.enableConversionTracking) {
    console.log('[Affiliate] Conversion tracking disabled');
    return;
  }
  
  console.log('[Affiliate] Tracking outbound click:', data);
  
  // Log analytics event
  logEvent('affiliate_click', {
    storeId: data.storeId,
    storeDomain: data.storeDomain,
    itemId: data.itemId,
    source: data.source,
    hasAffiliateId: !!detectAffiliateNetwork(data.storeDomain),
  });
  
  // TODO: Backend Integration - POST /api/analytics/affiliate-click
  // Send aggregated, anonymized data to backend for analytics
  // Body: { storeId, storeDomain, itemId, source, timestamp }
  // This data is used for conversion tracking and monetization reporting
  // NO personal data is sent (no user IDs, emails, or names)
}

/**
 * Get affiliate disclosure text for UI
 */
export function getAffiliateDisclosure(storeDomain: string): string | null {
  const network = detectAffiliateNetwork(storeDomain);
  
  if (!network) {
    return null;
  }
  
  const affiliateId = appConfig.affiliateIds[network];
  
  if (!affiliateId) {
    return null;
  }
  
  return 'This link may earn us a commission at no extra cost to you.';
}

/**
 * Check if a store has affiliate support
 */
export function hasAffiliateSupport(storeDomain: string): boolean {
  const network = detectAffiliateNetwork(storeDomain);
  
  if (!network) {
    return false;
  }
  
  return !!appConfig.affiliateIds[network];
}
