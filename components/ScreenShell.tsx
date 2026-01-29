
import React, { ReactNode, useMemo } from 'react';
import { View, ScrollView, StyleSheet, ViewStyle, Platform } from 'react-native';
import { SafeAreaView, Edge } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useAppTheme } from '@/contexts/ThemeContext';
import { createColors } from '@/styles/designSystem';
import { spacing } from '@/styles/spacing';

interface ScreenShellProps {
  children: ReactNode;
  header?: ReactNode;
  scrollable?: boolean;
  edges?: Edge[];
  contentContainerStyle?: ViewStyle;
  style?: ViewStyle;
  showsVerticalScrollIndicator?: boolean;
}

/**
 * ScreenShell - Reusable wrapper for all screens
 * 
 * Provides consistent layout across all environments:
 * - Full-screen background color (theme.background)
 * - SafeAreaView for content (top + bottom)
 * - Optional header area (inside safe area)
 * - ScrollView or View content with consistent padding (16)
 * - StatusBar style matching theme (light-content for dark, dark-content for light)
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
  showsVerticalScrollIndicator = false,
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
      paddingHorizontal: spacing.md,
    },
    scrollContent: {
      flexGrow: 1,
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.xl,
    },
  }), [colors]);

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
            style={styles.content}
            contentContainerStyle={[styles.scrollContent, contentContainerStyle]}
            showsVerticalScrollIndicator={showsVerticalScrollIndicator}
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
