
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { IconSymbol } from '@/components/IconSymbol';
import { colors, typography, spacing } from '@/styles/designSystem';

interface PriceFreshnessProps {
  lastCheckedAt: string | null | undefined;
  variant?: 'compact' | 'full';
}

export function PriceFreshness({ lastCheckedAt, variant = 'compact' }: PriceFreshnessProps) {
  if (!lastCheckedAt) {
    return (
      <View style={styles.container}>
        <IconSymbol
          ios_icon_name="clock"
          android_material_icon_name="schedule"
          size={14}
          color={colors.textTertiary}
        />
        <Text style={styles.text}>Price not detected</Text>
      </View>
    );
  }
  
  const timeAgo = getTimeAgo(lastCheckedAt);
  const isStale = isStalePrice(lastCheckedAt);
  
  return (
    <View style={styles.container}>
      <IconSymbol
        ios_icon_name="clock"
        android_material_icon_name="schedule"
        size={14}
        color={isStale ? colors.warning : colors.textTertiary}
      />
      <Text style={[styles.text, isStale && styles.staleText]}>
        {variant === 'full' ? `Last checked: ${timeAgo}` : timeAgo}
      </Text>
    </View>
  );
}

function getTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return '1 day ago';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return `${Math.floor(diffDays / 30)} months ago`;
}

function isStalePrice(dateString: string): boolean {
  const date = new Date(dateString);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / 86400000);
  return diffDays > 7;
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  text: {
    ...typography.labelSmall,
    color: colors.textTertiary,
  },
  staleText: {
    color: colors.warning,
  },
});
