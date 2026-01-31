
import { supabase } from '@/lib/supabase';
import { logEvent, logError } from './observability';
import { getCachedData, setCachedData } from './cache';

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 💎 PREMIUM FEATURES MANAGEMENT
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Premium Features:
 * 1. Unlimited price tracking
 * 2. Historical price charts
 * 3. Multi-country comparison
 * 4. Early price-drop alerts
 */

const PREMIUM_CACHE_KEY = 'premium_status';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export interface PremiumStatus {
  isPremium: boolean;
  planName: string | null;
  features: {
    unlimitedPriceTracking: boolean;
    historicalPriceCharts: boolean;
    multiCountryComparison: boolean;
    earlyPriceDropAlerts: boolean;
  };
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
    console.log('[Premium] Fetching premium status from Supabase');
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.log('[Premium] No user found, returning free status');
      const fallbackStatus: PremiumStatus = {
        isPremium: false,
        planName: null,
        features: {
          unlimitedPriceTracking: false,
          historicalPriceCharts: false,
          multiCountryComparison: false,
          earlyPriceDropAlerts: false,
        },
        updatedAt: new Date().toISOString(),
      };
      return fallbackStatus;
    }
    
    // TODO: Backend Integration - GET /api/premium/status
    // Returns: { isPremium, planName, features, updatedAt }
    // This checks the user's premium subscription status
    
    // For now, premium status is not implemented
    const status: PremiumStatus = {
      isPremium: false,
      planName: null,
      features: {
        unlimitedPriceTracking: false,
        historicalPriceCharts: false,
        multiCountryComparison: false,
        earlyPriceDropAlerts: false,
      },
      updatedAt: new Date().toISOString(),
    };
    
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
      features: {
        unlimitedPriceTracking: false,
        historicalPriceCharts: false,
        multiCountryComparison: false,
        earlyPriceDropAlerts: false,
      },
      updatedAt: new Date().toISOString(),
    };
    
    return premiumStatusCache || fallbackStatus;
  }
}

export async function isPremiumUser(): Promise<boolean> {
  const status = await getPremiumStatus();
  return status.isPremium;
}

export async function hasUnlimitedPriceTracking(): Promise<boolean> {
  const status = await getPremiumStatus();
  return status.features.unlimitedPriceTracking;
}

export async function hasHistoricalPriceCharts(): Promise<boolean> {
  const status = await getPremiumStatus();
  return status.features.historicalPriceCharts;
}

export async function hasMultiCountryComparison(): Promise<boolean> {
  const status = await getPremiumStatus();
  return status.features.multiCountryComparison;
}

export async function hasEarlyPriceDropAlerts(): Promise<boolean> {
  const status = await getPremiumStatus();
  return status.features.earlyPriceDropAlerts;
}

export async function upgradeToPremium(planName: string): Promise<PremiumStatus> {
  console.log('[Premium] Upgrading to premium, plan:', planName);
  
  try {
    logEvent('premium_upgrade_clicked', { planName });
    
    // TODO: Backend Integration - POST /api/premium/upgrade
    // Body: { planName }
    // Returns: { isPremium, planName, features, updatedAt }
    // This initiates the premium upgrade flow
    
    console.log('[Premium] Premium upgrade not yet implemented');
    
    const status: PremiumStatus = {
      isPremium: false,
      planName: null,
      features: {
        unlimitedPriceTracking: false,
        historicalPriceCharts: false,
        multiCountryComparison: false,
        earlyPriceDropAlerts: false,
      },
      updatedAt: new Date().toISOString(),
    };
    
    premiumStatusCache = status;
    lastFetchTime = Date.now();
    await setCachedData(PREMIUM_CACHE_KEY, status);
    
    console.log('[Premium] Upgrade not available yet');
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
    
    // TODO: Backend Integration - POST /api/premium/restore
    // Returns: { isPremium, planName, features, updatedAt }
    // This restores premium purchases from App Store/Google Play
    
    console.log('[Premium] Premium restore not yet implemented');
    
    const status: PremiumStatus = {
      isPremium: false,
      planName: null,
      features: {
        unlimitedPriceTracking: false,
        historicalPriceCharts: false,
        multiCountryComparison: false,
        earlyPriceDropAlerts: false,
      },
      updatedAt: new Date().toISOString(),
    };
    
    premiumStatusCache = status;
    lastFetchTime = Date.now();
    await setCachedData(PREMIUM_CACHE_KEY, status);
    
    console.log('[Premium] Restore not available yet');
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
  UNLIMITED_PRICE_TRACKING: 'unlimited_price_tracking',
  HISTORICAL_PRICE_CHARTS: 'historical_price_charts',
  MULTI_COUNTRY_COMPARISON: 'multi_country_comparison',
  EARLY_PRICE_DROP_ALERTS: 'early_price_drop_alerts',
} as const;

export type PremiumFeature = typeof PREMIUM_FEATURES[keyof typeof PREMIUM_FEATURES];

export function getPremiumFeatureDescription(feature: PremiumFeature): string {
  const descriptions: Record<PremiumFeature, string> = {
    [PREMIUM_FEATURES.UNLIMITED_PRICE_TRACKING]: 'Track unlimited items with automatic price updates',
    [PREMIUM_FEATURES.HISTORICAL_PRICE_CHARTS]: 'View historical price trends and charts',
    [PREMIUM_FEATURES.MULTI_COUNTRY_COMPARISON]: 'Compare prices across multiple countries',
    [PREMIUM_FEATURES.EARLY_PRICE_DROP_ALERTS]: 'Get instant alerts when prices drop',
  };
  
  return descriptions[feature];
}

export const PREMIUM_PLANS = {
  MONTHLY: {
    id: 'premium_monthly',
    name: 'Premium Monthly',
    price: 4.99,
    currency: 'USD',
    interval: 'month',
  },
  YEARLY: {
    id: 'premium_yearly',
    name: 'Premium Yearly',
    price: 39.99,
    currency: 'USD',
    interval: 'year',
    savings: '33%',
  },
} as const;
