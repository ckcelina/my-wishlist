
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { IconSymbol } from '@/components/IconSymbol';
import { Button } from './Button';
import { colors, typography, spacing, containerStyles } from '@/styles/designSystem';

interface EmptyStateProps {
  icon: string;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
}

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
}: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <IconSymbol
          ios_icon_name={icon}
          android_material_icon_name={icon}
          size={64}
          color={colors.textTertiary}
        />
      </View>
      
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
      
      {actionLabel && onAction && (
        <View style={styles.actionContainer}>
          <Button
            title={actionLabel}
            onPress={onAction}
            variant="primary"
          />
          {secondaryActionLabel && onSecondaryAction && (
            <Button
              title={secondaryActionLabel}
              onPress={onSecondaryAction}
              variant="secondary"
              style={styles.secondaryButton}
            />
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...containerStyles.center,
    paddingVertical: spacing.xxxl,
    paddingHorizontal: spacing.lg,
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.backgroundAlt,
    ...containerStyles.center,
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.titleMedium,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  description: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  actionContainer: {
    width: '100%',
    maxWidth: 300,
    marginTop: spacing.md,
  },
  secondaryButton: {
    marginTop: spacing.sm,
  },
});
