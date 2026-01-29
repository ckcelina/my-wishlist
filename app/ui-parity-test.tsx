
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Platform,
  Dimensions,
  useWindowDimensions,
} from 'react-native';
import { Stack } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from '@/contexts/ThemeContext';
import { createColors, createTypography, spacing } from '@/styles/designSystem';
import { getEnvironmentInfo, logEnvironmentInfo } from '@/utils/environmentConfig';
import { FontSizes, FontWeights, LineHeights } from '@/styles/typography';
import { Spacing, ComponentSpacing } from '@/styles/spacing';
import Constants from 'expo-constants';

/**
 * UI Parity Test Screen
 * 
 * Internal diagnostic screen to verify UI consistency
 * across Expo Go, TestFlight/App Store, and Android builds.
 * 
 * This screen displays:
 * - Current environment (Expo Go vs Production)
 * - Theme information
 * - Safe area insets
 * - Screen dimensions
 * - Font scale
 * - Tab bar height
 * - Spacing tokens
 * - Typography tokens
 * 
 * Use this to confirm that all values are identical
 * between Expo Go and production builds.
 */
export default function UIParityTestScreen() {
  const { theme, isDark, themePreference } = useAppTheme();
  const colors = createColors(theme);
  const typography = createTypography(theme);
  const insets = useSafeAreaInsets();
  const dimensions = useWindowDimensions();
  const [envInfo, setEnvInfo] = useState(getEnvironmentInfo());

  useEffect(() => {
    logEnvironmentInfo();
  }, []);

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      padding: spacing.md,
    },
    section: {
      marginBottom: spacing.lg,
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
    },
    sectionTitle: {
      ...typography.titleMedium,
      marginBottom: spacing.sm,
      color: colors.textPrimary,
    },
    row: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: spacing.xs,
    },
    label: {
      ...typography.bodyMedium,
      color: colors.textSecondary,
    },
    value: {
      ...typography.bodyMedium,
      color: colors.textPrimary,
      fontWeight: FontWeights.semibold,
    },
    badge: {
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      borderRadius: 8,
      alignSelf: 'flex-start',
      marginBottom: spacing.sm,
    },
    badgeText: {
      ...typography.labelSmall,
      fontWeight: FontWeights.semibold,
    },
  });

  const renderRow = (label: string, value: string | number) => (
    <View style={styles.row} key={label}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );

  const getEnvironmentBadgeColor = () => {
    switch (envInfo.environment) {
      case 'expo-go':
        return { bg: colors.warningLight, text: colors.warning };
      case 'production':
        return { bg: colors.successLight, text: colors.success };
      case 'development':
        return { bg: colors.infoLight, text: colors.info };
      default:
        return { bg: colors.surface2, text: colors.textSecondary };
    }
  };

  const badgeColors = getEnvironmentBadgeColor();

  return (
    <>
      <Stack.Screen
        options={{
          title: 'UI Parity Test',
          headerShown: true,
          headerStyle: {
            backgroundColor: colors.background,
          },
          headerTintColor: colors.textPrimary,
        }}
      />
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Environment Badge */}
          <View style={[styles.badge, { backgroundColor: badgeColors.bg }]}>
            <Text style={[styles.badgeText, { color: badgeColors.text }]}>
              {envInfo.environment.toUpperCase()}
            </Text>
          </View>

          {/* Environment Info */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Environment</Text>
            {renderRow('Runtime', envInfo.environment)}
            {renderRow('Platform', envInfo.platform)}
            {renderRow('App Version', envInfo.appVersion)}
            {renderRow('Build Number', envInfo.buildNumber)}
            {renderRow('Device', envInfo.deviceName || 'Unknown')}
            {renderRow('Is Development', envInfo.isDevelopment ? 'Yes' : 'No')}
            {renderRow('Is Expo Go', envInfo.isExpoGo ? 'Yes' : 'No')}
            {renderRow('Is Production', envInfo.isProduction ? 'Yes' : 'No')}
          </View>

          {/* Theme Info */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Theme</Text>
            {renderRow('Mode', theme.mode)}
            {renderRow('Preference', themePreference)}
            {renderRow('Is Dark', isDark ? 'Yes' : 'No')}
            {renderRow('Background', colors.background)}
            {renderRow('Surface', colors.surface)}
            {renderRow('Text Primary', colors.textPrimary)}
            {renderRow('Accent', colors.accent)}
          </View>

          {/* Safe Area Insets */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Safe Area Insets</Text>
            {renderRow('Top', `${insets.top}px`)}
            {renderRow('Bottom', `${insets.bottom}px`)}
            {renderRow('Left', `${insets.left}px`)}
            {renderRow('Right', `${insets.right}px`)}
          </View>

          {/* Screen Dimensions */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Screen Dimensions</Text>
            {renderRow('Width', `${dimensions.width}px`)}
            {renderRow('Height', `${dimensions.height}px`)}
            {renderRow('Scale', dimensions.scale.toFixed(2))}
            {renderRow('Font Scale', dimensions.fontScale.toFixed(2))}
          </View>

          {/* Tab Bar */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Tab Bar</Text>
            {renderRow('Height', `${ComponentSpacing.tabBarHeight}px`)}
            {renderRow('Padding', `${ComponentSpacing.tabBarPadding}px`)}
            {renderRow('Bottom Margin', `${ComponentSpacing.tabBarBottomMargin}px`)}
          </View>

          {/* Spacing Tokens */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Spacing Tokens</Text>
            {renderRow('XS', `${Spacing.xs}px`)}
            {renderRow('SM', `${Spacing.sm}px`)}
            {renderRow('MD', `${Spacing.md}px`)}
            {renderRow('LG', `${Spacing.lg}px`)}
            {renderRow('XL', `${Spacing.xl}px`)}
            {renderRow('XXL', `${Spacing.xxl}px`)}
          </View>

          {/* Typography Tokens */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Typography Tokens</Text>
            {renderRow('Display Large', `${FontSizes.displayLarge}px`)}
            {renderRow('Title Large', `${FontSizes.titleLarge}px`)}
            {renderRow('Body Large', `${FontSizes.bodyLarge}px`)}
            {renderRow('Body Medium', `${FontSizes.bodyMedium}px`)}
            {renderRow('Body Small', `${FontSizes.bodySmall}px`)}
            {renderRow('Label Medium', `${FontSizes.labelMedium}px`)}
          </View>

          {/* Constants */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Expo Constants</Text>
            {renderRow('App Ownership', Constants.appOwnership || 'standalone')}
            {renderRow('Execution Environment', Constants.executionEnvironment || 'standalone')}
            {renderRow('Platform OS', Platform.OS)}
            {renderRow('Platform Version', Platform.Version.toString())}
          </View>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}
