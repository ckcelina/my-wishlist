
import React, { useState } from 'react';
import { usePremium } from '@/hooks/usePremium';
import { PremiumUpsellModal } from './PremiumUpsellModal';
import { type PremiumFeature } from '@/utils/premium';

interface PremiumFeatureGateProps {
  feature: PremiumFeature;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function PremiumFeatureGate({ feature, children, fallback }: PremiumFeatureGateProps) {
  const { isPremium, checkFeatureAccess } = usePremium();
  const [showUpsell, setShowUpsell] = useState(false);

  const hasAccess = checkFeatureAccess(feature);

  if (hasAccess) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  return (
    <>
      {children}
      <PremiumUpsellModal
        visible={showUpsell}
        onClose={() => setShowUpsell(false)}
        feature={feature}
      />
    </>
  );
}

export function withPremiumCheck(feature: PremiumFeature, onBlocked?: () => void) {
  return async (callback: () => void | Promise<void>) => {
    const hasAccess = await import('@/utils/premium').then(m => m.isPremiumUser());
    
    if (hasAccess) {
      await callback();
    } else {
      console.log(`[PremiumFeatureGate] Feature ${feature} blocked - user is not premium`);
      if (onBlocked) {
        onBlocked();
      }
    }
  };
}
