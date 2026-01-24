
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { getConfidenceLevel, getConfidenceLabel, getConfidenceColor } from '@/utils/networkSafety';
import { typography, spacing } from '@/styles/designSystem';

interface ConfidenceBadgeProps {
  confidence: number | undefined;
  showHelper?: boolean;
}

export function ConfidenceBadge({ confidence, showHelper = false }: ConfidenceBadgeProps) {
  if (confidence === undefined) return null;
  
  const level = getConfidenceLevel(confidence);
  const label = getConfidenceLabel(confidence);
  const color = getConfidenceColor(confidence);
  
  const showWarning = level === 'low' && showHelper;
  
  return (
    <View style={styles.container}>
      <View style={[styles.badge, { backgroundColor: `${color}15` }]}>
        <View style={[styles.dot, { backgroundColor: color }]} />
        <Text style={[styles.label, { color }]}>
          {label} confidence
        </Text>
      </View>
      
      {showWarning && (
        <Text style={styles.helper}>
          Please confirm details before saving.
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 12,
    gap: spacing.xs,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  label: {
    ...typography.labelSmall,
    fontWeight: '600',
  },
  helper: {
    ...typography.bodySmall,
    color: '#ef4444',
    fontStyle: 'italic',
  },
});
