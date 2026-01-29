
import React, { ReactNode, useMemo } from 'react';
import { View, ScrollView, StyleSheet, ViewStyle, StatusBar as RNStatusBar, Platform } from 'react-native';
import { SafeAreaView, Edge, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useAppTheme } from '@/contexts/ThemeContext';
import { createColors } from '@/styles/designSystem';
import { Spacing } from '@/styles/spacing';
import { UIConfig } from '@/utils/environmentConfig';

interface ScreenShellProps {
  children: ReactNode;
  header?: ReactNode;
  scrollable?: boolean;
  edges?: Edge[];
  contentContainerStyle?: ViewStyle;
  style?: ViewStyle;
}

/**
 * ScreenShell - Reusable wrapper for all screens
 * 
 * Provides consistent layout across Expo Go, TestFlight, and Android builds:
 * - Full-screen background color (theme.colors.background)
 * - SafeAreaView for content (top + bottom)
 * - Optional header area (inside safe area)
 * - ScrollView or View content with consistent padding
 * - StatusBar style matching theme (ONLY driven by theme, no dev overrides)
 * 
 * CRITICAL: This component enforces ONE visual rendering path.
 * No dev-only UI changes that affect layout.
 * 
 * Usage:
 * <ScreenShell header={<CustomHeader />} scrollable>
 *   <YourContent />
 * </ScreenShell>
 */
export function ScreenShell({
  children,
  header,
  scrollable = true,
  edges = ['top', 'bottom'],
  contentContainerStyle,
  style,
}: ScreenShellProps) {
  const { theme, isDark } = useAppTheme();
  const colors = useMemo(() => createColors(theme), [theme]);
  const insets = useSafeAreaInsets();

  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    safeArea: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      flex: 1,
    },
    scrollContent: {
      flexGrow: 1,
      paddingBottom: Spacing.xl,
    },
  }), [colors]);

  return (
    <View style={[styles.container, style]}>
      {/* StatusBar with theme-aware style - ONLY driven by theme */}
      <StatusBar 
        style={isDark ? 'light' : 'dark'} 
        backgroundColor={colors.background}
      />
      
      {/* SafeAreaView for content */}
      <SafeAreaView style={styles.safeArea} edges={edges}>
        {/* Optional header */}
        {header}
        
        {/* Content area */}
        {scrollable ? (
          <ScrollView
            style={styles.content}
            contentContainerStyle={[styles.scrollContent, contentContainerStyle]}
            showsVerticalScrollIndicator={false}
          >
            {children}
          </ScrollView>
        ) : (
          <View style={[styles.content, contentContainerStyle]}>
            {children}
          </View>
        )}
      </SafeAreaView>
    </View>
  );
}
