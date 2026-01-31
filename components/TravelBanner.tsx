
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { IconSymbol } from './IconSymbol';
import { useAppTheme } from '@/contexts/ThemeContext';
import { createColors, createTypography, spacing } from '@/styles/designSystem';
import { useSmartLocation } from '@/contexts/SmartLocationContext';
import { getCountryFlag } from '@/constants/countries';
import Animated, { FadeInDown, FadeOutUp } from 'react-native-reanimated';

export function TravelBanner() {
  const { theme } = useAppTheme();
  const { settings, showTravelBanner, dismissTravelBanner } = useSmartLocation();

  if (!showTravelBanner || !settings) {
    return null;
  }

  const currentCountryFlag = getCountryFlag(settings.currentCountry);
  const homeCountryFlag = getCountryFlag(settings.homeCountry);

  const bannerText = `You're currently in ${currentCountryFlag} ${settings.currentCountry}. Search prices here or keep original location.`;

  return (
    <Animated.View
      entering={FadeInDown.springify()}
      exiting={FadeOutUp.springify()}
      style={[styles.container, { backgroundColor: theme.colors.accent + '15', borderColor: theme.colors.accent + '30' }]}
    >
      <View style={styles.content}>
        <IconSymbol
          ios_icon_name="location.fill"
          android_material_icon_name="location-on"
          size={20}
          color={theme.colors.accent}
        />
        <Text style={[styles.text, { color: theme.colors.text }]}>
          {bannerText}
        </Text>
        <TouchableOpacity onPress={dismissTravelBanner} style={styles.closeButton}>
          <IconSymbol
            ios_icon_name="xmark"
            android_material_icon_name="close"
            size={18}
            color={theme.colors.textSecondary}
          />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  text: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  closeButton: {
    padding: spacing.xs,
  },
});
