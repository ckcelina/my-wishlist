
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import { IconSymbol } from '@/components/IconSymbol';
import { colors, typography, spacing } from '@/styles/designSystem';
import { useAuth } from '@/contexts/AuthContext';
import { recordPermissionAsk, updatePermissionConsent } from '@/lib/supabase-helpers';
import { openAppSettings } from '@/utils/permissions';

export default function NotificationsPermissionScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const handleContinue = async () => {
    console.log('[NotificationsPermissionScreen] User tapped Continue');
    
    try {
      // Record that we asked for permission
      if (user?.id) {
        await recordPermissionAsk(user.id, 'notifications');
      }

      const { status } = await Notifications.requestPermissionsAsync();
      
      // Save consent
      if (user?.id) {
        await updatePermissionConsent(user.id, {
          notifications: status === 'granted',
          notificationsAskedAt: new Date().toISOString(),
        });
      }
      
      if (status === 'granted') {
        console.log('[NotificationsPermissionScreen] Notifications permission granted');
        router.back();
      } else {
        console.log('[NotificationsPermissionScreen] Notifications permission denied');
        Alert.alert(
          'Permission Denied',
          'Notification access is required to receive price drop alerts. You can enable it later in Settings.',
          [
            { text: 'Cancel', style: 'cancel', onPress: () => router.back() },
            { text: 'Open Settings', onPress: () => openAppSettings() },
          ]
        );
      }
    } catch (error) {
      console.error('[NotificationsPermissionScreen] Error requesting notifications permission:', error);
      Alert.alert('Error', 'Failed to request notifications permission');
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Notifications',
          headerBackTitle: 'Back',
        }}
      />
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <IconSymbol
              ios_icon_name="bell.fill"
              android_material_icon_name="notifications"
              size={80}
              color={colors.accent}
            />
          </View>

          <Text style={styles.title}>Stay Updated</Text>
          <Text style={styles.description}>
            Get notified when prices drop on your wishlist items so you never miss a great deal.
          </Text>

          <View style={styles.features}>
            <View style={styles.feature}>
              <IconSymbol
                ios_icon_name="checkmark.circle.fill"
                android_material_icon_name="check-circle"
                size={24}
                color={colors.success}
              />
              <Text style={styles.featureText}>Price drop alerts</Text>
            </View>
            <View style={styles.feature}>
              <IconSymbol
                ios_icon_name="checkmark.circle.fill"
                android_material_icon_name="check-circle"
                size={24}
                color={colors.success}
              />
              <Text style={styles.featureText}>Weekly deals summary</Text>
            </View>
            <View style={styles.feature}>
              <IconSymbol
                ios_icon_name="checkmark.circle.fill"
                android_material_icon_name="check-circle"
                size={24}
                color={colors.success}
              />
              <Text style={styles.featureText}>Lowest price notifications</Text>
            </View>
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
