
import React, { ReactNode, useMemo } from 'react';
import { View, ScrollView, StyleSheet, ViewStyle, StatusBar as RNStatusBar, Platform } from 'react-native';
import { SafeAreaView, Edge } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useAppTheme } from '@/contexts/ThemeContext';
import { createColors, spacing } from '@/styles/designSystem';

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
 * Provides:
 * - Full-screen background color (theme.colors.background)
 * - SafeAreaView for content (top + bottom)
 * - Optional header area (inside safe area)
 * - ScrollView or View content with consistent padding
 * - StatusBar style matching theme
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
      paddingHorizontal: spacing.lg,
    },
    scrollContent: {
      paddingBottom: spacing.xl,
    },
  }), [colors]);

  // Set status bar height for Android
  const statusBarHeight = Platform.OS === 'android' ? RNStatusBar.currentHeight || 0 : 0;

  return (
    <View style={[styles.container, style]}>
      {/* StatusBar with theme-aware style */}
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
            style={[styles.content, contentContainerStyle]}
            contentContainerStyle={styles.scrollContent}
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
