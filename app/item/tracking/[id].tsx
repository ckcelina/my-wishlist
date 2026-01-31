
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
  Modal,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { IconSymbol } from '@/components/IconSymbol';
import { colors, typography, spacing } from '@/styles/designSystem';
import { useAuth } from '@/contexts/AuthContext';
import { authenticatedGet, authenticatedPut } from '@/utils/api';
import { Card } from '@/components/design-system/Card';
import { Divider } from '@/components/design-system/Divider';
import * as Notifications from 'expo-notifications';

interface ItemTrackingSettings {
  itemId: string;
  trackingEnabled: boolean;
  trackingFrequency: 'daily' | 'weekly';
  lastCheckedPrice: number | null;
  lowestPriceSeen: number | null;
  lastCheckedAt: string | null;
  notificationsEnabled: boolean;
}

export default function ItemTrackingScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<ItemTrackingSettings | null>(null);
  const [itemTitle, setItemTitle] = useState<string>('');
  const [showFrequencyModal, setShowFrequencyModal] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<'granted' | 'denied' | 'undetermined'>('undetermined');

  const fetchSettings = useCallback(async () => {
    console.log('[ItemTrackingScreen] Fetching tracking settings for item:', id);
    try {
      setLoading(true);
      const data = await authenticatedGet<ItemTrackingSettings & { itemTitle: string }>(`/api/items/${id}/tracking`);
      setSettings(data);
      setItemTitle(data.itemTitle || '');
      console.log('[ItemTrackingScreen] Settings loaded:', data);
    } catch (error) {
      console.error('[ItemTrackingScreen] Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  const checkNotificationPermission = useCallback(async () => {
    const { status } = await Notifications.getPermissionsAsync();
    setNotificationPermission(status);
    console.log('[ItemTrackingScreen] Notification permission:', status);
  }, []);

  useEffect(() => {
    if (id && user) {
      fetchSettings();
      checkNotificationPermission();
    }
  }, [id, user, fetchSettings, checkNotificationPermission]);

  const handleToggleTracking = async (enabled: boolean) => {
    console.log('[ItemTrackingScreen] Toggling tracking:', enabled);
    
    // Check notification permission if enabling tracking
    if (enabled && notificationPermission !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      setNotificationPermission(status);
      
      if (status !== 'granted') {
        console.log('[ItemTrackingScreen] Notification permission denied');
        return;
      }
    }

    try {
      setSaving(true);
      const updated = await authenticatedPut<ItemTrackingSettings>(`/api/items/${id}/tracking`, {
        trackingEnabled: enabled,
      });
      setSettings(updated);
      console.log('[ItemTrackingScreen] Tracking toggled successfully');
    } catch (error) {
      console.error('[ItemTrackingScreen] Error toggling tracking:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleSelectFrequency = async (frequency: 'daily' | 'weekly') => {
    console.log('[ItemTrackingScreen] Frequency selected:', frequency);
    try {
      setSaving(true);
      const updated = await authenticatedPut<ItemTrackingSettings>(`/api/items/${id}/tracking`, {
        trackingFrequency: frequency,
      });
      setSettings(updated);
      setShowFrequencyModal(false);
      console.log('[ItemTrackingScreen] Frequency updated successfully');
    } catch (error) {
      console.error('[ItemTrackingScreen] Error updating frequency:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleNotifications = async (enabled: boolean) => {
    console.log('[ItemTrackingScreen] Toggling notifications:', enabled);
    
    if (enabled && notificationPermission !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      setNotificationPermission(status);
      
      if (status !== 'granted') {
        console.log('[ItemTrackingScreen] Notification permission denied');
        return;
      }
    }

    try {
      setSaving(true);
      const updated = await authenticatedPut<ItemTrackingSettings>(`/api/items/${id}/tracking`, {
        notificationsEnabled: enabled,
      });
      setSettings(updated);
      console.log('[ItemTrackingScreen] Notifications toggled successfully');
    } catch (error) {
      console.error('[ItemTrackingScreen] Error toggling notifications:', error);
    } finally {
      setSaving(false);
    }
  };

  if (loading || !settings) {
    return (
      <>
        <Stack.Screen
          options={{
            headerShown: true,
            title: 'Price Tracking',
            headerBackTitle: 'Back',
          }}
        />
        <SafeAreaView style={styles.container}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Loading...</Text>
          </View>
        </SafeAreaView>
      </>
    );
  }

  const trackingEnabledValue = settings.trackingEnabled;
  const trackingFrequencyValue = settings.trackingFrequency;
  const notificationsEnabledValue = settings.notificationsEnabled;
  const lastCheckedPriceValue = settings.lastCheckedPrice;
  const lowestPriceSeenValue = settings.lowestPriceSeen;
  const lastCheckedAtValue = settings.lastCheckedAt;

  const frequencyDisplay = trackingFrequencyValue === 'daily' ? 'Daily' : 'Weekly';

  const lastCheckedText = lastCheckedAtValue
    ? new Date(lastCheckedAtValue).toLocaleString([], {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Never';

  const timeSinceLastCheck = lastCheckedAtValue
    ? Math.floor((Date.now() - new Date(lastCheckedAtValue).getTime()) / (1000 * 60 * 60))
    : null;

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Price Tracking',
          headerBackTitle: 'Back',
        }}
      />
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <ScrollView style={styles.scrollContent}>
          {/* Item Title */}
          <View style={styles.headerSection}>
            <Text style={styles.itemTitle}>{itemTitle}</Text>
          </View>

          {/* Tracking Status Card */}
          <View style={styles.section}>
            <Card>
              <View style={styles.settingRow}>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingLabel}>Enable Price Tracking</Text>
                  <Text style={styles.settingDescription}>
                    Automatically check price changes
                  </Text>
                </View>
                <Switch
                  value={trackingEnabledValue}
                  onValueChange={handleToggleTracking}
                  disabled={saving}
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor={colors.background}
                />
              </View>

              {trackingEnabledValue && (
                <>
                  <Divider />
                  <TouchableOpacity
                    style={styles.settingRow}
                    onPress={() => setShowFrequencyModal(true)}
                    disabled={saving}
                  >
                    <View style={styles.settingInfo}>
                      <Text style={styles.settingLabel}>Check Frequency</Text>
                      <Text style={styles.settingDescription}>{frequencyDisplay}</Text>
                    </View>
                    <IconSymbol
                      ios_icon_name="chevron.right"
                      android_material_icon_name="chevron-right"
                      size={20}
                      color={colors.textSecondary}
                    />
                  </TouchableOpacity>

                  <Divider />
                  <View style={styles.settingRow}>
                    <View style={styles.settingInfo}>
                      <Text style={styles.settingLabel}>Push Notifications</Text>
                      <Text style={styles.settingDescription}>
                        Get notified of price changes
                      </Text>
                    </View>
                    <Switch
                      value={notificationsEnabledValue}
                      onValueChange={handleToggleNotifications}
                      disabled={saving}
                      trackColor={{ false: colors.border, true: colors.primary }}
                      thumbColor={colors.background}
                    />
                  </View>
                </>
              )}
            </Card>
          </View>

          {/* Tracking Stats */}
          {trackingEnabledValue && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Tracking Statistics</Text>
              <Card>
                <View style={styles.statRow}>
                  <View style={styles.statLeft}>
                    <IconSymbol
                      ios_icon_name="clock"
                      android_material_icon_name="schedule"
                      size={20}
                      color={colors.textSecondary}
                    />
                    <Text style={styles.statLabel}>Last Checked</Text>
                  </View>
                  <View style={styles.statRight}>
                    <Text style={styles.statValue}>{lastCheckedText}</Text>
                    {timeSinceLastCheck !== null && (
                      <Text style={styles.statSubtext}>
                        {timeSinceLastCheck === 0
                          ? 'Just now'
                          : timeSinceLastCheck === 1
                          ? '1 hour ago'
                          : `${timeSinceLastCheck} hours ago`}
                      </Text>
                    )}
                  </View>
                </View>

                {lastCheckedPriceValue !== null && (
                  <>
                    <Divider />
                    <View style={styles.statRow}>
                      <View style={styles.statLeft}>
                        <IconSymbol
                          ios_icon_name="tag"
                          android_material_icon_name="local-offer"
                          size={20}
                          color={colors.textSecondary}
                        />
                        <Text style={styles.statLabel}>Last Price</Text>
                      </View>
                      <Text style={styles.statValue}>${lastCheckedPriceValue.toFixed(2)}</Text>
                    </View>
                  </>
                )}

                {lowestPriceSeenValue !== null && (
                  <>
                    <Divider />
                    <View style={styles.statRow}>
                      <View style={styles.statLeft}>
                        <IconSymbol
                          ios_icon_name="arrow.down.circle"
                          android_material_icon_name="trending-down"
                          size={20}
                          color="#10B981"
                        />
                        <Text style={styles.statLabel}>Lowest Price Seen</Text>
                      </View>
                      <Text style={[styles.statValue, styles.lowestPrice]}>
                        ${lowestPriceSeenValue.toFixed(2)}
                      </Text>
                    </View>
                  </>
                )}
              </Card>
            </View>
          )}

          {/* Info Box */}
          <View style={styles.infoBox}>
            <IconSymbol
              ios_icon_name="info.circle"
              android_material_icon_name="info"
              size={20}
              color={colors.primary}
            />
            <Text style={styles.infoText}>
              Price tracking automatically checks this item&apos;s price at your selected frequency. You&apos;ll be notified when the price drops, the item is back in stock, or shipping becomes available.
            </Text>
          </View>
        </ScrollView>

        {/* Frequency Modal */}
        <Modal
          visible={showFrequencyModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowFrequencyModal(false)}
        >
          <Pressable
            style={styles.modalOverlay}
            onPress={() => setShowFrequencyModal(false)}
          >
            <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
              <Text style={styles.modalTitle}>Check Frequency</Text>

              <TouchableOpacity
                style={[
                  styles.frequencyOption,
                  trackingFrequencyValue === 'daily' && styles.frequencyOptionActive,
                ]}
                onPress={() => handleSelectFrequency('daily')}
                disabled={saving}
              >
                <View style={styles.frequencyOptionLeft}>
                  <Text style={styles.frequencyOptionLabel}>Daily</Text>
                  <Text style={styles.frequencyOptionDescription}>
                    Check price once per day
                  </Text>
                </View>
                {trackingFrequencyValue === 'daily' && (
                  <IconSymbol
                    ios_icon_name="checkmark"
                    android_material_icon_name="check"
                    size={20}
                    color={colors.primary}
                  />
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.frequencyOption,
                  trackingFrequencyValue === 'weekly' && styles.frequencyOptionActive,
                ]}
                onPress={() => handleSelectFrequency('weekly')}
                disabled={saving}
              >
                <View style={styles.frequencyOptionLeft}>
                  <Text style={styles.frequencyOptionLabel}>Weekly</Text>
                  <Text style={styles.frequencyOptionDescription}>
                    Check price once per week
                  </Text>
                </View>
                {trackingFrequencyValue === 'weekly' && (
                  <IconSymbol
                    ios_icon_name="checkmark"
                    android_material_icon_name="check"
                    size={20}
                    color={colors.primary}
                  />
                )}
              </TouchableOpacity>
            </Pressable>
          </Pressable>
        </Modal>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  scrollContent: {
    flex: 1,
    padding: spacing.lg,
  },
  headerSection: {
    marginBottom: spacing.lg,
  },
  itemTitle: {
    ...typography.h2,
    color: colors.text,
  },
  section: {
    marginBottom: spacing.lg,
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
    marginBottom: spacing.xs / 2,
  },
  settingDescription: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
  },
  statLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  statLabel: {
    ...typography.body,
    color: colors.text,
  },
  statRight: {
    alignItems: 'flex-end',
  },
  statValue: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },
  statSubtext: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs / 2,
  },
  lowestPrice: {
    color: '#10B981',
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
    gap: spacing.sm,
  },
  infoText: {
    ...typography.caption,
    color: colors.textSecondary,
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.lg,
    marginHorizontal: spacing.lg,
    width: '85%',
    maxWidth: 400,
  },
  modalTitle: {
    ...typography.h2,
    color: colors.text,
    marginBottom: spacing.md,
  },
  frequencyOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderRadius: 12,
    marginBottom: spacing.sm,
    backgroundColor: colors.background,
  },
  frequencyOptionActive: {
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  frequencyOptionLeft: {
    flex: 1,
  },
  frequencyOptionLabel: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
    marginBottom: spacing.xs / 2,
  },
  frequencyOptionDescription: {
    ...typography.caption,
    color: colors.textSecondary,
  },
});
