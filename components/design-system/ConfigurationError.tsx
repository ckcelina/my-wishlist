
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconSymbol } from '@/components/IconSymbol';
import { colors, typography, spacing } from '@/styles/designSystem';
import { getMissingConfigurationKeys } from '@/utils/environmentConfig';

interface ConfigurationErrorProps {
  message?: string;
  missingKeys?: string[];
  onRetry: () => void;
}

export function ConfigurationError({ message, missingKeys, onRetry }: ConfigurationErrorProps) {
  const isDev = __DEV__;
  
  // If missingKeys not provided, get them from the environment config
  const keys = missingKeys || getMissingConfigurationKeys();
  
  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.iconContainer}>
          <IconSymbol
            ios_icon_name="exclamationmark.triangle.fill"
            android_material_icon_name="warning"
            size={64}
            color={colors.error}
          />
        </View>
        
        <Text style={styles.title}>Configuration Error</Text>
        
        <Text style={styles.message}>
          {message || (isDev 
            ? 'The app is missing required environment variables. Please check your configuration.'
            : 'The app configuration is incomplete. Please reinstall the app or contact support.')}
        </Text>
        
        {isDev && keys.length > 0 && (
          <View style={styles.detailsContainer}>
            <Text style={styles.detailsTitle}>Missing Variables:</Text>
            {keys.map((key, index) => (
              <View key={index} style={styles.keyItem}>
                <IconSymbol
                  ios_icon_name="xmark.circle"
                  android_material_icon_name="cancel"
                  size={20}
                  color={colors.error}
                />
                <Text style={styles.keyText}>{key}</Text>
              </View>
            ))}
          </View>
        )}
        
        {isDev && (
          <View style={styles.instructionsContainer}>
            <Text style={styles.instructionsTitle}>How to fix:</Text>
            <Text style={styles.instructionText}>
              1. Open app.config.js
            </Text>
            <Text style={styles.instructionText}>
              2. Ensure all required variables are set in the extra section
            </Text>
            <Text style={styles.instructionText}>
              3. Restart the development server
            </Text>
          </View>
        )}
        
        <TouchableOpacity style={styles.button} onPress={onRetry}>
          <IconSymbol
            ios_icon_name="arrow.clockwise"
            android_material_icon_name="refresh"
            size={20}
            color={colors.background}
          />
          <Text style={styles.buttonText}>Retry</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    marginBottom: spacing.xl,
  },
  title: {
    ...typography.h1,
    color: colors.text,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  message: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  detailsContainer: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  detailsTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.md,
  },
  keyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  keyText: {
    ...typography.body,
    color: colors.text,
    flex: 1,
  },
  instructionsContainer: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.lg,
    marginBottom: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
  },
  instructionsTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.md,
  },
  instructionText: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    minWidth: 200,
  },
  buttonText: {
    ...typography.button,
    color: colors.background,
  },
});
