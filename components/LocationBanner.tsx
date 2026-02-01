
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Pressable } from 'react-native';
import { IconSymbol } from './IconSymbol';
import { useAppTheme } from '@/contexts/ThemeContext';
import { createColors, createTypography, spacing } from '@/styles/designSystem';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BANNER_DISMISSED_KEY = '@location_banner_dismissed';

interface LocationBannerProps {
  visible: boolean;
}

export function LocationBanner({ visible }: LocationBannerProps) {
  const { theme } = useAppTheme();
  const router = useRouter();
  const [dismissed, setDismissed] = useState(false);

  const colors = createColors(theme);
  const typography = createTypography(theme);

  const handleDismiss = async () => {
    console.log('[LocationBanner] User dismissed banner');
    setDismissed(true);
    try {
      await AsyncStorage.setItem(BANNER_DISMISSED_KEY, 'true');
    } catch (error) {
      console.error('[LocationBanner] Error saving dismissed state:', error);
    }
  };

  const handleSetLocation = () => {
    console.log('[LocationBanner] User tapped "Set Location"');
    router.push('/location');
  };

  if (!visible || dismissed) {
    return null;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.accentLight }]}>
      <View style={styles.content}>
        <IconSymbol
          ios_icon_name="location.fill"
          android_material_icon_name="location-on"
          size={20}
          color={colors.accent}
        />
        <View style={styles.textContainer}>
          <Text style={[styles.title, { color: colors.text }]}>
            Set your country to see local stores & prices
          </Text>
        </View>
        <TouchableOpacity onPress={handleDismiss} style={styles.dismissButton}>
          <IconSymbol
            ios_icon_name="xmark"
            android_material_icon_name="close"
            size={18}
            color={colors.textSecondary}
          />
        </TouchableOpacity>
      </View>
      <TouchableOpacity
        style={[styles.actionButton, { backgroundColor: colors.accent }]}
        onPress={handleSetLocation}
      >
        <Text style={[styles.actionButtonText, { color: '#FFFFFF' }]}>
          Set Location
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: 12,
    marginHorizontal: spacing.md,
    marginVertical: spacing.sm,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  textContainer: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 18,
  },
  dismissButton: {
    padding: spacing.xs,
  },
  actionButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
