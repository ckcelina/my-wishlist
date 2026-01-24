
import { useState, useEffect, useCallback } from 'react';
import { getPremiumStatus, isPremiumUser, type PremiumStatus, type PremiumFeature } from '@/utils/premium';
import { logEvent } from '@/utils/observability';

export function usePremium() {
  const [premiumStatus, setPremiumStatus] = useState<PremiumStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPremiumStatus();
  }, []);

  const loadPremiumStatus = async () => {
    console.log('[usePremium] Loading premium status');
    try {
      const status = await getPremiumStatus();
      console.log('[usePremium] Premium status loaded:', status);
      setPremiumStatus(status);
    } catch (error) {
      console.error('[usePremium] Failed to load premium status:', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshPremiumStatus = useCallback(async () => {
    console.log('[usePremium] Refreshing premium status');
    const status = await getPremiumStatus(true);
    setPremiumStatus(status);
    return status;
  }, []);

  const checkFeatureAccess = useCallback((feature: PremiumFeature): boolean => {
    const hasAccess = premiumStatus?.isPremium || false;
    console.log(`[usePremium] Checking feature access for ${feature}:`, hasAccess);
    
    if (!hasAccess) {
      logEvent('premium_feature_blocked', { feature });
    }
    
    return hasAccess;
  }, [premiumStatus]);

  return {
    isPremium: premiumStatus?.isPremium || false,
    planName: premiumStatus?.planName || null,
    loading,
    refreshPremiumStatus,
    checkFeatureAccess,
  };
}
