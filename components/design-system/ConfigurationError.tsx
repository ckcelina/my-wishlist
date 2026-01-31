
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { IconSymbol } from '@/components/IconSymbol';
import { createColors, createTypography, spacing } from '@/styles/designSystem';
import { useAppTheme } from '@/contexts/ThemeContext';

interface ConfigurationErrorProps {
  message: string;
  onRetry?: () => void;
}

export function ConfigurationError({ message, onRetry }: ConfigurationErrorProps) {
  const { theme } = useAppTheme();
  const colors = createColors(theme);
  const typography = createTypography(theme);

  const handleContactSupport = () => {
    Linking.openURL('mailto:support@mywishlist.app?subject=Configuration Error');
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <IconSymbol
          ios_icon_name="exclamationmark.triangle"
          android_material_icon_name="warning"
          size={64}
          color={colors.error}
        />
        
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          Configuration Error
        </Text>
        
        <Text style={[styles.message, { color: colors.textSecondary }]}>
          {message}
        </Text>

        <View style={styles.buttonContainer}>
          {onRetry && (
            <TouchableOpacity
              style={[styles.button, styles.retryButton, { backgroundColor: colors.accent }]}
              onPress={onRetry}
            >
              <IconSymbol
                ios_icon_name="arrow.clockwise"
                android_material_icon_name="refresh"
                size={20}
                color={colors.textInverse}
              />
              <Text style={[styles.buttonText, { color: colors.textInverse }]}>
                Retry
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.button, styles.supportButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={handleContactSupport}
          >
            <IconSymbol
              ios_icon_name="envelope"
              android_material_icon_name="email"
              size={20}
              color={colors.accent}
            />
            <Text style={[styles.buttonText, { color: colors.accent }]}>
              Contact Support
            </Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.infoBox, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}>
          <IconSymbol
            ios_icon_name="info.circle"
            android_material_icon_name="info"
            size={16}
            color={colors.textTertiary}
          />
          <Text style={[styles.infoText, { color: colors.textTertiary }]}>
            This error occurs when the app cannot connect to required services. Please contact support for assistance.
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    padding: spacing.xl,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: spacing.xl,
  },
  buttonContainer: {
    width: '100%',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    padding: spacing.md,
    borderRadius: 12,
  },
  retryButton: {
    // Accent background set inline
  },
  supportButton: {
    borderWidth: 1,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
    padding: spacing.sm,
    borderRadius: 8,
    borderWidth: 1,
    width: '100%',
  },
  infoText: {
    fontSize: 12,
    flex: 1,
    lineHeight: 16,
  },
});
