
import React, { useEffect } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  interpolate,
} from 'react-native-reanimated';
import { colors, spacing, cardStyles } from '@/styles/designSystem';

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export function Skeleton({ width = '100%', height = 20, borderRadius = 8, style }: SkeletonProps) {
  const animatedValue = useSharedValue(0);
  
  useEffect(() => {
    animatedValue.value = withRepeat(
      withTiming(1, { duration: 1500 }),
      -1,
      false
    );
  }, [animatedValue]);
  
  const animatedStyle = useAnimatedStyle(() => {
    const opacity = interpolate(animatedValue.value, [0, 0.5, 1], [0.3, 0.6, 0.3]);
    
    return {
      opacity,
    };
  });
  
  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          width,
          height,
          borderRadius,
        },
        animatedStyle,
        style,
      ]}
    />
  );
}

export function ListItemSkeleton() {
  return (
    <View style={[cardStyles.base, styles.listItem]}>
      <View style={styles.listItemContent}>
        <Skeleton width={80} height={80} borderRadius={12} />
        <View style={styles.listItemText}>
          <Skeleton width="80%" height={20} />
          <Skeleton width="60%" height={16} style={{ marginTop: spacing.sm }} />
          <Skeleton width="40%" height={16} style={{ marginTop: spacing.xs }} />
        </View>
      </View>
    </View>
  );
}

export function DetailPageSkeleton() {
  return (
    <View style={styles.detailContainer}>
      <Skeleton width="100%" height={300} borderRadius={16} />
      
      <View style={styles.detailContent}>
        <Skeleton width="90%" height={28} />
        <Skeleton width="70%" height={24} style={{ marginTop: spacing.md }} />
        <Skeleton width="100%" height={16} style={{ marginTop: spacing.lg }} />
        <Skeleton width="100%" height={16} style={{ marginTop: spacing.sm }} />
        <Skeleton width="80%" height={16} style={{ marginTop: spacing.sm }} />
        
        <View style={styles.detailActions}>
          <Skeleton width="48%" height={48} borderRadius={12} />
          <Skeleton width="48%" height={48} borderRadius={12} />
        </View>
      </View>
    </View>
  );
}

export function GridItemSkeleton() {
  return (
    <View style={[cardStyles.base, styles.gridItem]}>
      <Skeleton width="100%" height={150} borderRadius={12} />
      <View style={styles.gridItemText}>
        <Skeleton width="90%" height={16} />
        <Skeleton width="60%" height={14} style={{ marginTop: spacing.sm }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: colors.backgroundAlt,
  },
  listItem: {
    marginBottom: spacing.md,
  },
  listItemContent: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  listItemText: {
    flex: 1,
    justifyContent: 'center',
  },
  detailContainer: {
    padding: spacing.md,
  },
  detailContent: {
    marginTop: spacing.lg,
  },
  detailActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.xl,
  },
  gridItem: {
    flex: 1,
    margin: spacing.xs,
  },
  gridItemText: {
    marginTop: spacing.sm,
  },
});
