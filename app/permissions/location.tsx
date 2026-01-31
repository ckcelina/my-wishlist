
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { IconSymbol } from '@/components/IconSymbol';
import { colors, typography, spacing } from '@/styles/designSystem';
import { useAuth } from '@/contexts/AuthContext';
import { recordPermissionAsk, updatePermissionConsent } from '@/lib/supabase-helpers';
import { openAppSettings } from '@/utils/permissions';

export default function LocationPermissionScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const handleContinue = async () => {
    console.log('[LocationPermissionScreen] User tapped Continue');
    
    try {
      // Record that we asked for permission
      if (user?.id) {
        await recordPermissionAsk(user.id, 'location');
      }

      const { status } = await Location.requestForegroundPermissionsAsync();
      
      // Save consent
      if (user?.id) {
        await updatePermissionConsent(user.id, {
          location: status === 'granted',
          locationAskedAt: new Date().toISOString(),
        });
      }
      
      if (status === 'granted') {
        console.log('[LocationPermissionScreen] Location permission granted');
        router.back();
      } else {
        console.log('[LocationPermissionScreen] Location permission denied');
        Alert.alert(
          'Permission Denied',
          'Location access helps us pre-fill your country and city. You can still set it manually in Settings.',
          [
            { text: 'OK', onPress: () => router.back() },
          ]
        );
      }
    } catch (error) {
      console.error('[LocationPermissionScreen] Error requesting location permission:', error);
      Alert.alert('Error', 'Failed to request location permission');
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Location Access',
          headerBackTitle: 'Back',
        }}
      />
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <IconSymbol
              ios_icon_name="location.fill"
              android_material_icon_name="location-on"
              size={80}
              color={colors.accent}
            />
          </View>

          <Text style={styles.title}>Location Access</Text>
          <Text style={styles.description}>
            My Wishlist can use your location to automatically detect your country and city, helping you find stores that ship to your area.
          </Text>

          <View style={styles.features}>
            <View style={styles.feature}>
              <IconSymbol
                ios_icon_name="checkmark.circle.fill"
                android_material_icon_name="check-circle"
                size={24}
                color={colors.success}
              />
              <Text style={styles.featureText}>Auto-detect your country</Text>
            </View>
            <View style={styles.feature}>
              <IconSymbol
                ios_icon_name="checkmark.circle.fill"
                android_material_icon_name="check-circle"
                size={24}
                color={colors.success}
              />
              <Text style={styles.featureText}>Find stores that ship to you</Text>
            </View>
            <View style={styles.feature}>
              <IconSymbol
                ios_icon_name="checkmark.circle.fill"
                android_material_icon_name="check-circle"
                size={24}
                color={colors.success}
              />
              <Text style={styles.featureText}>Better price filtering</Text>
            </View>
          </View>

          <View style={styles.optionalNote}>
            <IconSymbol
              ios_icon_name="info.circle"
              android_material_icon_name="info"
              size={20}
              color={colors.textSecondary}
            />
            <Text style={styles.optionalText}>
              This permission is optional. You can always set your location manually.
            </Text>
          </View>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleContinue}
            activeOpacity={0.7}
          >
            <Text style={styles.primaryButtonText}>Continue</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Text style={styles.secondaryButtonText}>Not Now</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl,
    alignItems: 'center',
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.accent + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  title: {
    ...typography.titleLarge,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  description: {
    ...typography.bodyLarge,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: 24,
  },
  features: {
    width: '100%',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  featureText: {
    ...typography.bodyLarge,
    flex: 1,
  },
  optionalNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: 12,
    width: '100%',
  },
  optionalText: {
    ...typography.caption,
    color: colors.textSecondary,
    flex: 1,
  },
  actions: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
    gap: spacing.md,
  },
  primaryButton: {
    backgroundColor: colors.accent,
    paddingVertical: spacing.md,
    borderRadius: 12,
    alignItems: 'center',
    minHeight: 48,
  },
  primaryButtonText: {
    ...typography.bodyLarge,
    fontWeight: '600',
    color: colors.textInverse,
  },
  secondaryButton: {
    paddingVertical: spacing.md,
    alignItems: 'center',
    minHeight: 48,
  },
  secondaryButtonText: {
    ...typography.bodyLarge,
    color: colors.textSecondary,
  },
});
