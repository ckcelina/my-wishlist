
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconSymbol } from '@/components/IconSymbol';
import { useAuth } from '@/contexts/AuthContext';
import { authenticatedGet, authenticatedPut } from '@/utils/api';
import {
  requestNotificationPermissions,
  registerForPushNotifications,
  areNotificationsEnabled,
  scheduleTestNotification,
} from '@/utils/notifications';
import { colors, typography, spacing, containerStyles } from '@/styles/designSystem';
import { Card } from '@/components/design-system/Card';
import { Divider } from '@/components/design-system/Divider';

interface UserSettings {
  priceDropAlertsEnabled: boolean;
  defaultCurrency: string;
  expoPushToken: string | null;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: spacing.lg,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.md,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
  },
  settingInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  settingLabel: {
    ...typography.body,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  settingDescription: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    marginBottom: spacing.md,
  },
  statusBadgeEnabled: {
    backgroundColor: '#E8F5E9',
  },
  statusBadgeDisabled: {
    backgroundColor: '#FFEBEE',
  },
  statusText: {
    ...typography.body,
    marginLeft: spacing.sm,
  },
  statusTextEnabled: {
    color: '#2E7D32',
  },
  statusTextDisabled: {
    color: '#C62828',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: 12,
    marginTop: spacing.md,
  },
  buttonSecondary: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  buttonText: {
    ...typography.button,
    color: colors.background,
    marginLeft: spacing.sm,
  },
  buttonTextSecondary: {
    color: colors.text,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoBox: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
    marginBottom: spacing.md,
  },
  infoText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
});

export default function AlertsScreen() {
  const router = useRouter();
  const { user, authLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [systemPermissionGranted, setSystemPermissionGranted] = useState(false);

  const fetchSettings = useCallback(async () => {
    console.log('[AlertsScreen] Fetching user settings');
    try {
      const data = await authenticatedGet<UserSettings>('/api/users/settings');
      setSettings(data);
      console.log('[AlertsScreen] Settings loaded:', data);
    } catch (error) {
      console.error('[AlertsScreen] Failed to fetch settings:', error);
      Alert.alert('Error', 'Failed to load settings. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  const checkSystemPermissions = useCallback(async () => {
    const enabled = await areNotificationsEnabled();
    setSystemPermissionGranted(enabled);
    console.log('[AlertsScreen] System permissions:', enabled);
  }, []);

  useEffect(() => {
    if (!authLoading && !user) {
      console.log('[AlertsScreen] User not authenticated, redirecting to auth');
      router.replace('/auth');
      return;
    }

    if (user) {
      fetchSettings();
      checkSystemPermissions();
    }
  }, [user, authLoading, fetchSettings, checkSystemPermissions, router]);

  const handleRequestPermissions = async () => {
    console.log('[AlertsScreen] User requesting notification permissions');
    setUpdating(true);

    try {
      const granted = await requestNotificationPermissions();
      
      if (granted) {
        // Register for push notifications
        const token = await registerForPushNotifications();
        
        if (token) {
          Alert.alert(
            'Success',
            'Notification permissions granted! You can now enable price drop alerts.'
          );
          setSystemPermissionGranted(true);
          
          // Refresh settings to get the updated token
          await fetchSettings();
        } else {
          Alert.alert(
            'Warning',
            'Permissions granted but failed to register push token. Please try again.'
          );
        }
      } else {
        Alert.alert(
          'Permission Denied',
          'Please enable notifications in your device settings to receive price drop alerts.'
        );
      }
    } catch (error) {
      console.error('[AlertsScreen] Error requesting permissions:', error);
      Alert.alert('Error', 'Failed to request permissions. Please try again.');
    } finally {
      setUpdating(false);
    }
  };

  const handleToggleAlerts = async (enabled: boolean) => {
    console.log('[AlertsScreen] Toggling alerts:', enabled);

    if (enabled && !systemPermissionGranted) {
      Alert.alert(
        'Permissions Required',
        'Please grant notification permissions first.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Grant Permissions', onPress: handleRequestPermissions },
        ]
      );
      return;
    }

    setUpdating(true);

    try {
      const updated = await authenticatedPut<UserSettings>('/api/users/settings', {
        priceDropAlertsEnabled: enabled,
      });

      setSettings(updated);
      console.log('[AlertsScreen] Alerts toggled successfully');

      const statusText = enabled ? 'enabled' : 'disabled';
      Alert.alert('Success', `Price drop alerts ${statusText}`);
    } catch (error) {
      console.error('[AlertsScreen] Failed to toggle alerts:', error);
      Alert.alert('Error', 'Failed to update settings. Please try again.');
    } finally {
      setUpdating(false);
    }
  };

  const handleTestNotification = async () => {
    console.log('[AlertsScreen] Sending test notification');

    if (!systemPermissionGranted) {
      Alert.alert(
        'Permissions Required',
        'Please grant notification permissions first.'
      );
      return;
    }

    try {
      await scheduleTestNotification();
      Alert.alert(
        'Test Notification Sent',
        'You should receive a test notification in a few seconds.'
      );
    } catch (error) {
      console.error('[AlertsScreen] Failed to send test notification:', error);
      Alert.alert('Error', 'Failed to send test notification.');
    }
  };

  if (authLoading || loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!settings) {
    return null;
  }

  const alertsEnabled = settings.priceDropAlertsEnabled;
  const hasToken = !!settings.expoPushToken;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Stack.Screen
        options={{
          title: 'Alert Settings',
          headerShown: true,
          headerBackTitle: 'Back',
        }}
      />

      <ScrollView style={styles.scrollContent}>
        {/* Status Badge */}
        <View
          style={[
            styles.statusBadge,
            systemPermissionGranted && alertsEnabled
              ? styles.statusBadgeEnabled
              : styles.statusBadgeDisabled,
          ]}
        >
          <IconSymbol
            ios_icon_name={
              systemPermissionGranted && alertsEnabled
                ? 'checkmark.circle.fill'
                : 'xmark.circle.fill'
            }
            android_material_icon_name={
              systemPermissionGranted && alertsEnabled ? 'check-circle' : 'cancel'
            }
            size={20}
            color={
              systemPermissionGranted && alertsEnabled ? '#2E7D32' : '#C62828'
            }
          />
          <Text
            style={[
              styles.statusText,
              systemPermissionGranted && alertsEnabled
                ? styles.statusTextEnabled
                : styles.statusTextDisabled,
            ]}
          >
            {systemPermissionGranted && alertsEnabled
              ? 'Alerts Active'
              : 'Alerts Inactive'}
          </Text>
        </View>

        {/* Info Box */}
        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            Get notified when prices drop on items in your wishlists. We&apos;ll send you a
            push notification with the new price and percentage decrease.
          </Text>
        </View>

        {/* System Permissions Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>System Permissions</Text>
          <Card>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Notification Permissions</Text>
                <Text style={styles.settingDescription}>
                  {systemPermissionGranted
                    ? 'Granted - You can receive notifications'
                    : 'Not granted - Enable to receive alerts'}
                </Text>
              </View>
              <IconSymbol
                ios_icon_name={
                  systemPermissionGranted
                    ? 'checkmark.circle.fill'
                    : 'xmark.circle.fill'
                }
                android_material_icon_name={
                  systemPermissionGranted ? 'check-circle' : 'cancel'
                }
                size={24}
                color={systemPermissionGranted ? '#4CAF50' : '#F44336'}
              />
            </View>

            {!systemPermissionGranted && (
              <TouchableOpacity
                style={styles.button}
                onPress={handleRequestPermissions}
                disabled={updating}
              >
                <IconSymbol
                  ios_icon_name="bell.badge.fill"
                  android_material_icon_name="notifications-active"
                  size={20}
                  color={colors.background}
                />
                <Text style={styles.buttonText}>
                  {updating ? 'Requesting...' : 'Grant Permissions'}
                </Text>
              </TouchableOpacity>
            )}
          </Card>
        </View>

        {/* Alert Settings Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Alert Settings</Text>
          <Card>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Price Drop Alerts</Text>
                <Text style={styles.settingDescription}>
                  Receive notifications when item prices decrease
                </Text>
              </View>
              <Switch
                value={alertsEnabled}
                onValueChange={handleToggleAlerts}
                disabled={updating || !systemPermissionGranted}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={colors.background}
              />
            </View>

            <Divider />

            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Push Token Status</Text>
                <Text style={styles.settingDescription}>
                  {hasToken
                    ? 'Registered - Ready to receive notifications'
                    : 'Not registered - Grant permissions to register'}
                </Text>
              </View>
              <IconSymbol
                ios_icon_name={hasToken ? 'checkmark.circle' : 'xmark.circle'}
                android_material_icon_name={hasToken ? 'check-circle' : 'cancel'}
                size={24}
                color={hasToken ? '#4CAF50' : '#9E9E9E'}
              />
            </View>
          </Card>
        </View>

        {/* Test Notification */}
        {systemPermissionGranted && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Testing</Text>
            <Card>
              <TouchableOpacity
                style={[styles.button, styles.buttonSecondary]}
                onPress={handleTestNotification}
              >
                <IconSymbol
                  ios_icon_name="bell.fill"
                  android_material_icon_name="notifications"
                  size={20}
                  color={colors.text}
                />
                <Text style={[styles.buttonText, styles.buttonTextSecondary]}>
                  Send Test Notification
                </Text>
              </TouchableOpacity>
            </Card>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
