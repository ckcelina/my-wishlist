
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { IconSymbol } from '@/components/IconSymbol';
import { colors, typography, spacing } from '@/styles/designSystem';

interface StoreVerificationBadgeProps {
  isVerified: boolean;
  compact?: boolean;
}

export function StoreVerificationBadge({ isVerified, compact = false }: StoreVerificationBadgeProps) {
  if (compact) {
    return (
      <View style={[styles.badge, isVerified ? styles.verified : styles.unverified]}>
        <IconSymbol
          ios_icon_name={isVerified ? 'checkmark.shield.fill' : 'shield'}
          android_material_icon_name={isVerified ? 'verified' : 'shield'}
          size={12}
          color={isVerified ? colors.success : colors.textTertiary}
        />
      </View>
    );
  }
  
  return (
    <View style={[styles.badge, isVerified ? styles.verified : styles.unverified]}>
      <IconSymbol
        ios_icon_name={isVerified ? 'checkmark.shield.fill' : 'shield'}
        android_material_icon_name={isVerified ? 'verified' : 'shield'}
        size={14}
        color={isVerified ? colors.success : colors.textTertiary}
      />
      <Text style={[styles.label, isVerified ? styles.verifiedText : styles.unverifiedText]}>
        {isVerified ? 'Verified store' : 'Unverified store'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 12,
    gap: spacing.xs,
  },
  verified: {
    backgroundColor: `${colors.success}15`,
  },
  unverified: {
    backgroundColor: colors.backgroundAlt,
  },
  label: {
    ...typography.labelSmall,
    fontWeight: '500',
  },
  verifiedText: {
    color: colors.success,
  },
  unverifiedText: {
    color: colors.textTertiary,
  },
});
