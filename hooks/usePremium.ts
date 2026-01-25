
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { logEvent } from '@/utils/observability';

export interface PremiumStatus {
  isPremium: boolean;
  planName: string | null;
}

export type PremiumFeature = 'unlimited_wishlists' | 'price_tracking' | 'advanced_sharing' | 'export_data';

export function usePremium() {
  const { user } = useAuth();
  const [premiumStatus, setPremiumStatus] = useState<PremiumStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPremiumStatus();
  }, [user]);

  const loadPremiumStatus = async () => {
    console.log('[usePremium] Loading premium status');
    try {
      if (!user?.id) {
        console.log('[usePremium] No user ID, setting free tier');
        setPremiumStatus({ isPremium: false, planName: null });
        setLoading(false);
        return;
      }
      
      const { fetchPremiumStatus } = await import('@/lib/supabase-helpers');
      const status = await fetchPremiumStatus(user.id);
      console.log('[usePremium] Premium status loaded:', status);
      setPremiumStatus(status);
    } catch (error) {
      console.error('[usePremium] Failed to load premium status:', error);
      setPremiumStatus({ isPremium: false, planName: null });
    } finally {
      setLoading(false);
    }
  };

  const refreshPremiumStatus = useCallback(async () => {
    console.log('[usePremium] Refreshing premium status');
    await loadPremiumStatus();
    return premiumStatus;
  }, [user]);

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
