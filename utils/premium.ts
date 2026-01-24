
import { authenticatedGet, authenticatedPost } from './api';
import { logEvent, logError } from './observability';
import { getCachedData, setCachedData } from './cache';

const PREMIUM_CACHE_KEY = 'premium_status';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export interface PremiumStatus {
  isPremium: boolean;
  planName: string | null;
  updatedAt: string;
}

let premiumStatusCache: PremiumStatus | null = null;
let lastFetchTime = 0;

export async function getPremiumStatus(forceRefresh = false): Promise<PremiumStatus> {
  console.log('[Premium] Getting premium status, forceRefresh:', forceRefresh);
  
  const now = Date.now();
  const cacheValid = now - lastFetchTime < CACHE_DURATION;
  
  if (!forceRefresh && premiumStatusCache && cacheValid) {
    console.log('[Premium] Returning cached status:', premiumStatusCache);
    return premiumStatusCache;
  }
  
  if (!forceRefresh) {
    const cached = await getCachedData<PremiumStatus>(PREMIUM_CACHE_KEY);
    if (cached) {
      console.log('[Premium] Returning persisted cached status:', cached);
      premiumStatusCache = cached;
      lastFetchTime = now;
      return cached;
    }
  }
  
  try {
    console.log('[Premium] Fetching premium status from API');
    const status = await authenticatedGet<PremiumStatus>('/api/premium/status');
    
    premiumStatusCache = status;
    lastFetchTime = now;
    
    await setCachedData(PREMIUM_CACHE_KEY, status);
    
    console.log('[Premium] Premium status fetched:', status);
    return status;
  } catch (error) {
    console.error('[Premium] Failed to fetch premium status:', error);
    logError(error instanceof Error ? error : new Error(String(error)), {
      context: 'getPremiumStatus',
    });
    
    const fallbackStatus: PremiumStatus = {
      isPremium: false,
      planName: null,
      updatedAt: new Date().toISOString(),
    };
    
    return premiumStatusCache || fallbackStatus;
  }
}

export async function isPremiumUser(): Promise<boolean> {
  const status = await getPremiumStatus();
  return status.isPremium;
}

export async function upgradeToPremium(planName: string): Promise<PremiumStatus> {
  console.log('[Premium] Upgrading to premium, plan:', planName);
  
  try {
    logEvent('premium_upgrade_clicked', { planName });
    
    const status = await authenticatedPost<PremiumStatus>('/api/premium/upgrade', {
      planName,
    });
    
    premiumStatusCache = status;
    lastFetchTime = Date.now();
    await setCachedData(PREMIUM_CACHE_KEY, status);
    
    console.log('[Premium] Upgrade successful:', status);
    return status;
  } catch (error) {
    console.error('[Premium] Upgrade failed:', error);
    logError(error instanceof Error ? error : new Error(String(error)), {
      context: 'upgradeToPremium',
      planName,
    });
    throw error;
  }
}

export async function restorePremium(): Promise<PremiumStatus> {
  console.log('[Premium] Restoring premium purchases');
  
  try {
    logEvent('premium_restore_clicked');
    
    const status = await authenticatedPost<PremiumStatus>('/api/premium/restore', {});
    
    premiumStatusCache = status;
    lastFetchTime = Date.now();
    await setCachedData(PREMIUM_CACHE_KEY, status);
    
    console.log('[Premium] Restore successful:', status);
    return status;
  } catch (error) {
    console.error('[Premium] Restore failed:', error);
    logError(error instanceof Error ? error : new Error(String(error)), {
      context: 'restorePremium',
    });
    throw error;
  }
}

export function clearPremiumCache() {
  console.log('[Premium] Clearing premium cache');
  premiumStatusCache = null;
  lastFetchTime = 0;
}

export const PREMIUM_FEATURES = {
  FREQUENT_PRICE_CHECKS: 'frequent_price_checks',
  UNLIMITED_IMPORTS: 'unlimited_imports',
  ADVANCED_GROUPING: 'advanced_grouping',
  PRICE_DROP_ALERTS: 'price_drop_alerts',
} as const;

export type PremiumFeature = typeof PREMIUM_FEATURES[keyof typeof PREMIUM_FEATURES];

export function getPremiumFeatureDescription(feature: PremiumFeature): string {
  const descriptions: Record<PremiumFeature, string> = {
    [PREMIUM_FEATURES.FREQUENT_PRICE_CHECKS]: 'Get price updates every hour instead of daily',
    [PREMIUM_FEATURES.UNLIMITED_IMPORTS]: 'Import unlimited items per month',
    [PREMIUM_FEATURES.ADVANCED_GROUPING]: 'Use advanced auto-grouping modes',
    [PREMIUM_FEATURES.PRICE_DROP_ALERTS]: 'Set custom price alerts for each item',
  };
  
  return descriptions[feature];
}
