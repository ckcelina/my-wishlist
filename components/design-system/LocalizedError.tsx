
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, typography, spacing } from '@/styles/designSystem';
import { IconSymbol } from '@/components/IconSymbol';

interface LocalizedErrorProps {
  errorKey?: string;
  fallbackMessage?: string;
  showIcon?: boolean;
  style?: any;
}

/**
 * Localized error message component
 * Displays user-friendly error messages in the user's language
 */
export function LocalizedError({
  errorKey = 'errors.generic',
  fallbackMessage,
  showIcon = true,
  style,
}: LocalizedErrorProps) {
  const { t } = useTranslation();
  
  const errorMessage = t(errorKey, { defaultValue: fallbackMessage || t('errors.generic') });
  
  return (
    <View style={[styles.container, style]}>
      {showIcon && (
        <IconSymbol
          ios_icon_name="exclamationmark.triangle"
          android_material_icon_name="warning"
          size={20}
          color={colors.error}
        />
      )}
      <Text style={styles.errorText}>{errorMessage}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    padding: spacing.sm,
    backgroundColor: `${colors.error}15`,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: colors.error,
  },
  errorText: {
    ...typography.bodySmall,
    color: colors.error,
    flex: 1,
  },
});
