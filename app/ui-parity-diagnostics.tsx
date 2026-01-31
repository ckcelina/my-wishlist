
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Dimensions,
  PixelRatio,
  useWindowDimensions,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconSymbol } from '@/components/IconSymbol';
import { useAppTheme } from '@/contexts/ThemeContext';
import { createColors, createTypography, spacing } from '@/styles/designSystem';
import { ComponentSpacing } from '@/styles/spacing';
import { appConfig, getEnvironmentSummary } from '@/utils/environmentConfig';
import { runParityVerification } from '@/utils/parityVerification';
import Constants from 'expo-constants';
import * as Device from 'expo-device';

interface DiagnosticSection {
  title: string;
  items: DiagnosticItem[];
}

interface DiagnosticItem {
  label: string;
  value: string;
  status?: 'good' | 'warning' | 'error';
  details?: string;
}

export default function UIParityDiagnosticsScreen() {
  const router = useRouter();
  const { theme, isDark, themePreference } = useAppTheme();
  const colors = createColors(theme);
  const typography = createTypography(theme);
  const insets = useSafeAreaInsets();
  const dimensions = useWindowDimensions();
  const [parityReport, setParityReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    runDiagnostics();
  }, []);

  const runDiagnostics = async () => {
    console.log('[UI Parity Diagnostics] Running parity verification...');
    setLoading(true);
    
    try {
      const report = await runParityVerification();
      setParityReport(report);
    } catch (error) {
      console.error('[UI Parity Diagnostics] Error running diagnostics:', error);
    } finally {
      setLoading(false);
    }
  };

  // Screen dimensions
  const screenWidth = Dimensions.get('window').width;
  const screenHeight = Dimensions.get('window').height;
  const screenScale = PixelRatio.get();
  const fontScale = PixelRatio.getFontScale();
  const pixelDensity = PixelRatio.getPixelSizeForLayoutSize(1);

  // Build info
  const isExpoGo = Constants.appOwnership === 'expo';
  const buildType = isExpoGo ? 'Expo Go' : 'Standalone Build';
  const environment = appConfig.environment;

  // Theme info
  const themeMode = isDark ? 'Dark' : 'Light';
  const themePreferenceText = themePreference === 'system' ? 'System' : themePreference === 'dark' ? 'Dark' : 'Light';

  // Tab bar height
  const tabBarHeight = ComponentSpacing.tabBarHeight;
  const tabBarBottomMargin = ComponentSpacing.tabBarBottomMargin;
  const totalTabBarSpace = tabBarHeight + tabBarBottomMargin + insets.bottom;

  // Environment summary
  const envSummary = getEnvironmentSummary();

  const sections: DiagnosticSection[] = [
    {
      title: '🏗️ Build Configuration',
      items: [
        {
          label: 'Build Type',
          value: buildType,
          status: isExpoGo ? 'warning' : 'good',
          details: isExpoGo ? 'Running in Expo Go' : 'Production build',
        },
        {
          label: 'Environment',
          value: environment,
          status: environment === 'PROD' ? 'good' : environment === 'PREVIEW' ? 'warning' : 'warning',
        },
        {
          label: 'Platform',
          value: Platform.OS,
        },
        {
          label: 'Platform Version',
          value: String(Platform.Version),
        },
        {
          label: 'App Version',
          value: Constants.expoConfig?.version || '1.0.0',
        },
        {
          label: 'Device Type',
          value: Device.deviceType ? String(Device.deviceType) : 'Unknown',
        },
      ],
    },
    {
      title: '🎨 Theme Configuration',
      items: [
        {
          label: 'Current Theme',
          value: themeMode,
          status: 'good',
        },
        {
          label: 'Theme Preference',
          value: themePreferenceText,
        },
        {
          label: 'Background Color',
          value: colors.background,
        },
        {
          label: 'Surface Color',
          value: colors.surface,
        },
        {
          label: 'Text Color',
          value: colors.textPrimary,
        },
        {
          label: 'Accent Color',
          value: colors.accent,
        },
      ],
    },
    {
      title: '📐 Safe Area Insets',
      items: [
        {
          label: 'Top Inset',
          value: `${insets.top}px`,
          status: insets.top > 0 ? 'good' : 'warning',
          details: insets.top === 0 ? 'No top safe area (check device)' : undefined,
        },
        {
          label: 'Bottom Inset',
          value: `${insets.bottom}px`,
          status: insets.bottom > 0 ? 'good' : 'warning',
          details: insets.bottom === 0 ? 'No bottom safe area (check device)' : undefined,
        },
        {
          label: 'Left Inset',
          value: `${insets.left}px`,
        },
        {
          label: 'Right Inset',
          value: `${insets.right}px`,
        },
      ],
    },
    {
      title: '📱 Screen Dimensions',
      items: [
        {
          label: 'Screen Width',
          value: `${Math.round(screenWidth)}px`,
        },
        {
          label: 'Screen Height',
          value: `${Math.round(screenHeight)}px`,
        },
        {
          label: 'Window Width',
          value: `${Math.round(dimensions.width)}px`,
        },
        {
          label: 'Window Height',
          value: `${Math.round(dimensions.height)}px`,
        },
        {
          label: 'Pixel Ratio',
          value: `${screenScale}x`,
        },
        {
          label: 'Font Scale',
          value: `${fontScale.toFixed(2)}x`,
          status: fontScale > 1.3 ? 'warning' : 'good',
          details: fontScale > 1.3 ? 'Large text enabled' : undefined,
        },
        {
          label: 'Pixel Density',
          value: `${pixelDensity.toFixed(2)} px/dp`,
        },
      ],
    },
    {
      title: '🎯 Tab Bar Configuration',
      items: [
        {
          label: 'Tab Bar Height',
          value: `${tabBarHeight}px`,
          status: tabBarHeight === 80 ? 'good' : 'warning',
          details: tabBarHeight !== 80 ? 'Non-standard height detected' : undefined,
        },
        {
          label: 'Bottom Margin',
          value: `${tabBarBottomMargin}px`,
        },
        {
          label: 'Total Space (with insets)',
          value: `${totalTabBarSpace}px`,
        },
        {
          label: 'Border Radius',
          value: `${appConfig.lockedTabBarBorderRadius}px`,
        },
        {
          label: 'Spacing',
          value: `${appConfig.lockedTabBarSpacing}px`,
        },
      ],
    },
    {
      title: '🔒 API Configuration',
      items: [
        {
          label: 'Supabase URL',
          value: appConfig.supabaseUrl ? 'Configured' : 'Missing',
          status: appConfig.supabaseUrl ? 'good' : 'error',
          details: appConfig.supabaseUrl || 'Not configured',
        },
        {
          label: 'Supabase Key',
          value: appConfig.supabaseAnonKey ? 'Configured' : 'Missing',
          status: appConfig.supabaseAnonKey ? 'good' : 'error',
        },
        {
          label: 'Backend URL',
          value: appConfig.backendUrl ? 'Configured' : 'Not configured',
          status: appConfig.backendUrl ? 'good' : 'warning',
          details: appConfig.backendUrl || 'Not configured',
        },
        {
          label: 'Edge Functions URL',
          value: appConfig.supabaseEdgeFunctionsUrl ? 'Configured' : 'Missing',
          status: appConfig.supabaseEdgeFunctionsUrl ? 'good' : 'error',
        },
      ],
    },
    {
      title: '🎯 Parity Verification',
      items: [
        {
          label: 'Debug UI',
          value: appConfig.showDebugUI ? 'Enabled ❌' : 'Disabled ✅',
          status: appConfig.showDebugUI ? 'error' : 'good',
          details: appConfig.showDebugUI ? 'BREAKS PARITY - Must be disabled' : 'Correct',
        },
        {
          label: 'Dev Banner',
          value: appConfig.showDevBanner ? 'Enabled ❌' : 'Disabled ✅',
          status: appConfig.showDevBanner ? 'error' : 'good',
          details: appConfig.showDevBanner ? 'BREAKS PARITY - Must be disabled' : 'Correct',
        },
        {
          label: 'Dev Padding',
          value: appConfig.addDevPadding ? 'Enabled ❌' : 'Disabled ✅',
          status: appConfig.addDevPadding ? 'error' : 'good',
          details: appConfig.addDevPadding ? 'BREAKS PARITY - Must be disabled' : 'Correct',
        },
        {
          label: 'Dev Wrapper',
          value: appConfig.useDevWrapper ? 'Enabled ❌' : 'Disabled ✅',
          status: appConfig.useDevWrapper ? 'error' : 'good',
          details: appConfig.useDevWrapper ? 'BREAKS PARITY - Must be disabled' : 'Correct',
        },
      ],
    },
  ];

  if (parityReport) {
    sections.push({
      title: '✅ Parity Report Summary',
      items: [
        {
          label: 'Overall Status',
          value: parityReport.overallPassed ? 'PASSED ✅' : 'FAILED ❌',
          status: parityReport.overallPassed ? 'good' : 'error',
        },
        {
          label: 'Total Checks',
          value: String(parityReport.summary.totalChecks),
        },
        {
          label: 'Passed',
          value: String(parityReport.summary.passedChecks),
          status: 'good',
        },
        {
          label: 'Failed',
          value: String(parityReport.summary.failedChecks),
          status: parityReport.summary.failedChecks > 0 ? 'error' : 'good',
        },
        {
          label: 'Critical Failures',
          value: String(parityReport.summary.criticalFailures),
          status: parityReport.summary.criticalFailures > 0 ? 'error' : 'good',
        },
      ],
    });
  }

  const getStatusColor = (status?: 'good' | 'warning' | 'error') => {
    if (!status) return colors.textSecondary;
    const statusColorMap = {
      good: colors.success,
      warning: colors.warning,
      error: colors.error,
    };
    return statusColorMap[status];
  };

  const getStatusIcon = (status?: 'good' | 'warning' | 'error') => {
    if (!status) return null;
    const iconMap = {
      good: 'check-circle',
      warning: 'warning',
      error: 'error',
    };
    return iconMap[status];
  };

  const dynamicStyles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollView: {
      flex: 1,
    },
    content: {
      padding: spacing.lg,
      paddingBottom: spacing.xxxl,
    },
    header: {
      alignItems: 'center',
      marginBottom: spacing.xl,
    },
    title: {
      ...typography.h1,
      color: colors.textPrimary,
      marginTop: spacing.md,
      marginBottom: spacing.xs,
    },
    subtitle: {
      ...typography.body,
      color: colors.textSecondary,
      textAlign: 'center',
    },
    buildBadge: {
      backgroundColor: isExpoGo ? colors.warningLight : colors.successLight,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      borderRadius: 8,
      marginTop: spacing.sm,
    },
    buildBadgeText: {
      ...typography.labelSmall,
      color: isExpoGo ? colors.warning : colors.success,
      fontWeight: '600',
    },
    section: {
      marginBottom: spacing.xl,
    },
    sectionTitle: {
      ...typography.h3,
      color: colors.textPrimary,
      marginBottom: spacing.md,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
    },
    item: {
      paddingVertical: spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: colors.divider,
    },
    lastItem: {
      borderBottomWidth: 0,
    },
    itemHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.xs,
    },
    itemLabel: {
      ...typography.body,
      color: colors.textSecondary,
      flex: 1,
    },
    itemValueContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
    itemValue: {
      ...typography.body,
      color: colors.textPrimary,
      fontWeight: '600',
    },
    itemDetails: {
      ...typography.caption,
      color: colors.textSecondary,
      marginTop: spacing.xs,
    },
    refreshButton: {
      backgroundColor: colors.accent,
      borderRadius: 12,
      padding: spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      marginTop: spacing.lg,
    },
    refreshButtonText: {
      ...typography.button,
      color: colors.textInverse,
    },
    parityStatus: {
      backgroundColor: parityReport?.overallPassed ? colors.successLight : colors.errorLight,
      borderRadius: 12,
      padding: spacing.md,
      marginBottom: spacing.lg,
      borderWidth: 2,
      borderColor: parityReport?.overallPassed ? colors.success : colors.error,
    },
    parityStatusText: {
      ...typography.h3,
      color: parityReport?.overallPassed ? colors.success : colors.error,
      textAlign: 'center',
    },
  });

  return (
    <SafeAreaView style={dynamicStyles.container} edges={['top']}>
      <Stack.Screen
        options={{
          title: 'UI Parity Diagnostics',
          headerShown: true,
          headerBackTitle: 'Back',
        }}
      />
      
      <ScrollView style={dynamicStyles.scrollView} contentContainerStyle={dynamicStyles.content}>
        <View style={dynamicStyles.header}>
          <IconSymbol
            ios_icon_name="chart.bar.doc.horizontal"
            android_material_icon_name="assessment"
            size={48}
            color={colors.accent}
          />
          <Text style={dynamicStyles.title}>UI Parity Diagnostics</Text>
          <Text style={dynamicStyles.subtitle}>
            Verify Expo Go matches production builds
          </Text>
          <View style={dynamicStyles.buildBadge}>
            <Text style={dynamicStyles.buildBadgeText}>{buildType}</Text>
          </View>
        </View>

        {parityReport && (
          <View style={dynamicStyles.parityStatus}>
            <Text style={dynamicStyles.parityStatusText}>
              {parityReport.overallPassed ? '✅ PARITY VERIFIED' : '❌ PARITY ISSUES DETECTED'}
            </Text>
          </View>
        )}

        {sections.map((section, sectionIndex) => (
          <View key={sectionIndex} style={dynamicStyles.section}>
            <Text style={dynamicStyles.sectionTitle}>{section.title}</Text>
            <View style={dynamicStyles.card}>
              {section.items.map((item, itemIndex) => {
                const isLast = itemIndex === section.items.length - 1;
                const statusColor = getStatusColor(item.status);
                const statusIcon = getStatusIcon(item.status);
                
                return (
                  <View key={itemIndex} style={[dynamicStyles.item, isLast && dynamicStyles.lastItem]}>
                    <View style={dynamicStyles.itemHeader}>
                      <Text style={dynamicStyles.itemLabel}>{item.label}</Text>
                      <View style={dynamicStyles.itemValueContainer}>
                        {statusIcon && (
                          <IconSymbol
                            ios_icon_name={statusIcon}
                            android_material_icon_name={statusIcon}
                            size={16}
                            color={statusColor}
                          />
                        )}
                        <Text style={[dynamicStyles.itemValue, { color: statusColor }]}>
                          {item.value}
                        </Text>
                      </View>
                    </View>
                    {item.details && (
                      <Text style={dynamicStyles.itemDetails}>{item.details}</Text>
                    )}
                  </View>
                );
              })}
            </View>
          </View>
        ))}

        <TouchableOpacity
          style={dynamicStyles.refreshButton}
          onPress={runDiagnostics}
        >
          <IconSymbol
            ios_icon_name="arrow.clockwise"
            android_material_icon_name="refresh"
            size={20}
            color={colors.textInverse}
          />
          <Text style={dynamicStyles.refreshButtonText}>Refresh Diagnostics</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
