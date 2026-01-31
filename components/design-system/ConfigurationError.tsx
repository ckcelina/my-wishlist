
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { IconSymbol } from '@/components/IconSymbol';
import { createColors, createTypography, spacing } from '@/styles/designSystem';
import { useAppTheme } from '@/contexts/ThemeContext';
import { SafeAreaView } from 'react-native-safe-area-context';

interface ConfigurationErrorProps {
  message: string;
  onRetry?: () => void;
}

/**
 * Configuration Error Screen
 * 
 * Displays a user-friendly error message when environment configuration is missing or invalid.
 * Shows a retry button if onRetry callback is provided.
 */
export function ConfigurationError({ message, onRetry }: ConfigurationErrorProps) {
  const { theme } = useAppTheme();
  const colors = createColors(theme);
  const typography = createTypography(theme);

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: spacing.xl,
    },
    iconContainer: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: colors.surface2,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: spacing.lg,
    },
    title: {
      ...typography.h2,
      color: colors.text,
      textAlign: 'center',
      marginBottom: spacing.md,
    },
    message: {
      ...typography.body,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 24,
      marginBottom: spacing.xl,
    },
    retryButton: {
      backgroundColor: colors.accent,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.xl,
      borderRadius: 12,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    retryButtonText: {
      ...typography.body,
      color: '#FFFFFF',
      fontWeight: '600',
    },
    devMessage: {
      marginTop: spacing.xl,
      padding: spacing.md,
      backgroundColor: colors.surface2,
      borderRadius: 12,
      borderLeftWidth: 4,
      borderLeftColor: colors.error,
    },
    devMessageText: {
      ...typography.caption,
      color: colors.textSecondary,
      fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    },
  });

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <IconSymbol
            ios_icon_name="exclamationmark.triangle.fill"
            android_material_icon_name="warning"
            size={40}
            color={colors.error}
          />
        </View>

        <Text style={styles.title}>Configuration Error</Text>

        <Text style={styles.message}>{message}</Text>

        {onRetry && (
          <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
            <IconSymbol
              ios_icon_name="arrow.clockwise"
              android_material_icon_name="refresh"
              size={20}
              color="#FFFFFF"
            />
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        )}

        {__DEV__ && (
          <View style={styles.devMessage}>
            <Text style={styles.devMessageText}>
              Development Mode:{'\n'}
              Check app.config.js for missing environment variables:{'\n'}
              • EXPO_PUBLIC_API_BASE_URL{'\n'}
              • EXPO_PUBLIC_SUPABASE_URL{'\n'}
              • EXPO_PUBLIC_SUPABASE_ANON_KEY
            </Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}
