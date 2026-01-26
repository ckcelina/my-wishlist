
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Pressable,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { IconSymbol } from '@/components/IconSymbol';
import { useAuth } from '@/contexts/AuthContext';
import { authenticatedGet, authenticatedPut } from '@/utils/api';
import { colors, typography, spacing } from '@/styles/designSystem';
import { Card } from '@/components/design-system/Card';
import { Divider } from '@/components/design-system/Divider';
import debounce from 'lodash.debounce';

interface AlertSettings {
  userId: string;
  alertsEnabled: boolean;
  notifyPriceDrops: boolean;
  notifyUnderTarget: boolean;
  weeklyDigest: boolean;
  quietHoursEnabled: boolean;
  quietStart: string | null;
  quietEnd: string | null;
  updatedAt: string;
}

interface ItemsWithTargetsResponse {
  count: number;
  items: Array<{
    id: string;
    title: string;
    alertPrice: number;
    currentPrice: number | null;
    currency: string;
  }>;
}

const DEFAULT_SETTINGS: Omit<AlertSettings, 'userId' | 'updatedAt'> = {
  alertsEnabled: true,
  notifyPriceDrops: true,
  notifyUnderTarget: true,
  weeklyDigest: false,
  quietHoursEnabled: false,
  quietStart: null,
  quietEnd: null,
};

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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorBanner: {
    backgroundColor: '#FEE2E2',
    padding: spacing.md,
    borderRadius: 12,
    marginBottom: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  errorText: {
    ...typography.caption,
    color: '#991B1B',
    flex: 1,
  },
  retryButton: {
    backgroundColor: '#DC2626',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 8,
  },
  retryButtonText: {
    ...typography.caption,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  savingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  savingText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  targetsSummary: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: 12,
    marginBottom: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  targetsSummaryText: {
    ...typography.body,
    color: colors.text,
    flex: 1,
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
  const [settings, setSettings] = useState<AlertSettings | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [itemsWithTargets, setItemsWithTargets] = useState<ItemsWithTargetsResponse | null>(null);

  // Debounced save function
  const debouncedSaveRef = useRef<ReturnType<typeof debounce> | null>(null);

  const fetchSettings = useCallback(async () => {
    console.log('[AlertsScreen] Fetching alert settings');
    try {
      setError(null);
      const data = await authenticatedGet<AlertSettings>('/api/alert-settings');
      setSettings(data);
      console.log('[AlertsScreen] Settings loaded successfully');
    } catch (err) {
      console.error('[AlertsScreen] Failed to fetch settings:', err);
      setError('Failed to load settings');
      // Set safe defaults so UI is still usable
      setSettings({
        userId: user?.id || '',
        ...DEFAULT_SETTINGS,
        updatedAt: new Date().toISOString(),
      });
    } finally {
      setLoading(false);
    }
  }, [user]);

  const fetchItemsWithTargets = useCallback(async () => {
    console.log('[AlertsScreen] Fetching items with target prices');
    try {
      const data = await authenticatedGet<ItemsWithTargetsResponse>('/api/alert-settings/items-with-targets');
      setItemsWithTargets(data);
      console.log('[AlertsScreen] Items with targets:', data.count);
    } catch (err) {
      console.error('[AlertsScreen] Failed to fetch items with targets:', err);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && !user) {
      console.log('[AlertsScreen] User not authenticated, redirecting to auth');
      router.replace('/auth');
      return;
    }

    if (user) {
      fetchSettings();
      fetchItemsWithTargets();
    }
  }, [user, authLoading, fetchSettings, fetchItemsWithTargets, router]);

  const saveSettings = useCallback(async (updates: Partial<AlertSettings>) => {
    console.log('[AlertsScreen] Saving settings:', updates);
    setSaving(true);
    try {
      const response = await authenticatedPut<{ success: boolean } & AlertSettings>('/api/alert-settings', updates);
      // Backend returns { success, ...settings }, extract the settings
      const { success, ...updated } = response;
      setSettings(prev => prev ? { ...prev, ...updated } : null);
      setError(null);
      console.log('[AlertsScreen] Settings saved successfully');
    } catch (err) {
      console.error('[AlertsScreen] Failed to save settings:', err);
      setError('Couldn\'t save. Tap to retry.');
    } finally {
      setSaving(false);
    }
  }, []);

  // Initialize debounced save
  useEffect(() => {
    debouncedSaveRef.current = debounce((updates: Partial<AlertSettings>) => {
      saveSettings(updates);
    }, 400);

    return () => {
      debouncedSaveRef.current?.cancel();
    };
  }, [saveSettings]);

  const handleToggle = useCallback((key: keyof AlertSettings, value: boolean) => {
    console.log('[AlertsScreen] Toggle:', key, value);
    // Optimistic UI update
    setSettings(prev => prev ? { ...prev, [key]: value } : null);
    // Debounced save
    debouncedSaveRef.current?.({ [key]: value });
  }, []);

  const handleRetry = () => {
    console.log('[AlertsScreen] Retrying fetch');
    setLoading(true);
    fetchSettings();
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

  const alertsEnabledValue = settings.alertsEnabled;
  const notifyPriceDropsValue = settings.notifyPriceDrops;
  const notifyUnderTargetValue = settings.notifyUnderTarget;
  const weeklyDigestValue = settings.weeklyDigest;
  const quietHoursEnabledValue = settings.quietHoursEnabled;

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Price Drop Alerts',
          headerShown: true,
          headerBackTitle: 'Back',
        }}
      />
      <View style={styles.container}>
        <ScrollView style={styles.scrollContent}>
          {/* Error Banner */}
          {error && (
            <View style={styles.errorBanner}>
              <IconSymbol
                ios_icon_name="exclamationmark.triangle.fill"
                android_material_icon_name="warning"
                size={20}
                color="#991B1B"
              />
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Saving Indicator */}
          {saving && (
            <View style={styles.savingIndicator}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={styles.savingText}>Saving...</Text>
            </View>
          )}

          {/* Info Box */}
          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              Get notified when prices drop on items in your wishlists. Set target prices on individual items to get alerts when they go below your desired price.
            </Text>
          </View>

          {/* Items with Targets Summary */}
          {itemsWithTargets && itemsWithTargets.count > 0 && (
            <View style={styles.targetsSummary}>
              <IconSymbol
                ios_icon_name="bell.badge.fill"
                android_material_icon_name="notifications-active"
                size={24}
                color={colors.primary}
              />
              <Text style={styles.targetsSummaryText}>
                {itemsWithTargets.count} {itemsWithTargets.count === 1 ? 'item has' : 'items have'} target price alerts
              </Text>
            </View>
          )}

          {/* Main Alert Settings */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Alert Settings</Text>
            <Card>
              <View style={styles.settingRow}>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingLabel}>Enable Alerts</Text>
                  <Text style={styles.settingDescription}>
                    Master switch for all price drop notifications
                  </Text>
                </View>
                <Switch
                  value={alertsEnabledValue}
                  onValueChange={(value) => handleToggle('alertsEnabled', value)}
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor={colors.background}
                />
              </View>

              <Divider />

              <View style={styles.settingRow}>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingLabel}>Price Drop Notifications</Text>
                  <Text style={styles.settingDescription}>
                    Get notified when any item price decreases
                  </Text>
                </View>
                <Switch
                  value={notifyPriceDropsValue}
                  onValueChange={(value) => handleToggle('notifyPriceDrops', value)}
                  disabled={!alertsEnabledValue}
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor={colors.background}
                />
              </View>

              <Divider />

              <View style={styles.settingRow}>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingLabel}>Target Price Alerts</Text>
                  <Text style={styles.settingDescription}>
                    Get notified when items go below your target price
                  </Text>
                </View>
                <Switch
                  value={notifyUnderTargetValue}
                  onValueChange={(value) => handleToggle('notifyUnderTarget', value)}
                  disabled={!alertsEnabledValue}
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor={colors.background}
                />
              </View>
            </Card>
          </View>

          {/* Digest Settings */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Digest</Text>
            <Card>
              <View style={styles.settingRow}>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingLabel}>Weekly Digest</Text>
                  <Text style={styles.settingDescription}>
                    Receive a weekly summary of price changes
                  </Text>
                </View>
                <Switch
                  value={weeklyDigestValue}
                  onValueChange={(value) => handleToggle('weeklyDigest', value)}
                  disabled={!alertsEnabledValue}
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor={colors.background}
                />
              </View>
            </Card>
          </View>

          {/* Quiet Hours */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Quiet Hours</Text>
            <Card>
              <View style={styles.settingRow}>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingLabel}>Enable Quiet Hours</Text>
                  <Text style={styles.settingDescription}>
                    Pause notifications during specific hours
                  </Text>
                </View>
                <Switch
                  value={quietHoursEnabledValue}
                  onValueChange={(value) => handleToggle('quietHoursEnabled', value)}
                  disabled={!alertsEnabledValue}
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor={colors.background}
                />
              </View>

              {quietHoursEnabledValue && (
                <>
                  <Divider />
                  <TouchableOpacity
                    style={styles.settingRow}
                    onPress={() => router.push('/quiet-hours')}
                  >
                    <View style={styles.settingInfo}>
                      <Text style={styles.settingLabel}>Set Quiet Hours</Text>
                      <Text style={styles.settingDescription}>
                        {settings.quietStart && settings.quietEnd
                          ? `${settings.quietStart} - ${settings.quietEnd}`
                          : 'Tap to configure'}
                      </Text>
                    </View>
                    <IconSymbol
                      ios_icon_name="chevron.right"
                      android_material_icon_name="chevron-right"
                      size={20}
                      color={colors.textSecondary}
                    />
                  </TouchableOpacity>
                </>
              )}
            </Card>
          </View>
        </ScrollView>
      </View>
    </>
  );
}
