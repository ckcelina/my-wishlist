
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
  TextInput,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconSymbol } from '@/components/IconSymbol';
import { useAuth } from '@/contexts/AuthContext';
import { authenticatedGet, authenticatedPut } from '@/utils/api';
import { colors, typography, spacing } from '@/styles/designSystem';
import { Card } from '@/components/design-system/Card';
import { Divider } from '@/components/design-system/Divider';
import { CurrencyPicker } from '@/components/pickers/CurrencyPicker';
import { getCurrencyByCode } from '@/constants/currencies';
import { PermissionBanner } from '@/components/PermissionBanner';
import { checkNotificationPermission } from '@/utils/permissions';
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
  priceDropThresholdType: 'any' | 'percentage' | 'amount';
  priceDropThresholdValue: number | null;
  checkFrequency: 'daily' | 'twice_daily' | 'hourly';
  preferredStores: string[];
  preferredCurrency: string;
  updatedAt: string;
}

interface ItemsWithTargetsResponse {
  count: number;
  items: {
    id: string;
    title: string;
    alertPrice: number;
    currentPrice: number | null;
    currency: string;
  }[];
}

const DEFAULT_SETTINGS: Omit<AlertSettings, 'userId' | 'updatedAt'> = {
  alertsEnabled: true,
  notifyPriceDrops: true,
  notifyUnderTarget: true,
  weeklyDigest: false,
  quietHoursEnabled: false,
  quietStart: null,
  quietEnd: null,
  priceDropThresholdType: 'any',
  priceDropThresholdValue: null,
  checkFrequency: 'daily',
  preferredStores: [],
  preferredCurrency: 'USD',
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
  thresholdOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderRadius: 12,
    marginBottom: spacing.sm,
    backgroundColor: colors.background,
  },
  thresholdOptionActive: {
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  thresholdOptionLeft: {
    flex: 1,
  },
  thresholdOptionLabel: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
    marginBottom: spacing.xs / 2,
  },
  thresholdOptionDescription: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  thresholdInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
  },
  thresholdInput: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: spacing.sm,
    fontSize: 16,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  thresholdInputPrefix: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },
  thresholdInputSuffix: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },
  thresholdSaveButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 8,
  },
  thresholdSaveButtonText: {
    ...typography.body,
    color: '#FFFFFF',
    fontWeight: '600',
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

export default function AlertsScreen() {
  const router = useRouter();
  const { user, authLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<AlertSettings | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [itemsWithTargets, setItemsWithTargets] = useState<ItemsWithTargetsResponse | null>(null);
  const [showThresholdModal, setShowThresholdModal] = useState(false);
  const [showFrequencyModal, setShowFrequencyModal] = useState(false);
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);
  const [thresholdValue, setThresholdValue] = useState('');
  const [notificationPermissionGranted, setNotificationPermissionGranted] = useState(true);
  const [showPermissionBanner, setShowPermissionBanner] = useState(false);

  // Debounced save function
  const debouncedSaveRef = useRef<ReturnType<typeof debounce> | null>(null);

  const fetchSettings = useCallback(async () => {
    console.log('[AlertsScreen] Fetching alert settings from backend API');
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
    console.log('[AlertsScreen] Fetching items with target prices from backend API');
    try {
      const data = await authenticatedGet<ItemsWithTargetsResponse>('/api/alert-settings/items-with-targets');
      setItemsWithTargets(data);
      console.log('[AlertsScreen] Items with targets:', data.count);
    } catch (err) {
      console.error('[AlertsScreen] Failed to fetch items with targets:', err);
    }
  }, []);

  const checkNotificationPermissionStatus = useCallback(async () => {
    console.log('[AlertsScreen] Checking notification permission');
    const status = await checkNotificationPermission();
    setNotificationPermissionGranted(status.granted);
    setShowPermissionBanner(!status.granted);
    console.log('[AlertsScreen] Notification permission:', status.granted);
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
      checkNotificationPermissionStatus();
    }
  }, [user, authLoading, fetchSettings, fetchItemsWithTargets, checkNotificationPermissionStatus, router]);

  const saveSettings = useCallback(async (updates: Partial<AlertSettings>) => {
    console.log('[AlertsScreen] Saving settings to backend API:', updates);
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
  const priceDropThresholdTypeValue = settings.priceDropThresholdType || 'any';
  const priceDropThresholdValueValue = settings.priceDropThresholdValue;
  const checkFrequencyValue = settings.checkFrequency || 'daily';
  const preferredCurrencyValue = settings.preferredCurrency || 'USD';

  const thresholdTypeDisplay = priceDropThresholdTypeValue === 'any'
    ? 'Any price drop'
    : priceDropThresholdTypeValue === 'percentage'
    ? `${priceDropThresholdValueValue || 0}% drop`
    : `${preferredCurrencyValue} ${priceDropThresholdValueValue || 0} drop`;

  const frequencyDisplay = checkFrequencyValue === 'daily'
    ? 'Once daily'
    : checkFrequencyValue === 'twice_daily'
    ? 'Twice daily'
    : 'Every hour';

  const currencyInfo = getCurrencyByCode(preferredCurrencyValue);
  const currencyDisplay = currencyInfo
    ? `${currencyInfo.symbol} ${currencyInfo.name}`
    : preferredCurrencyValue;

  const handleThresholdTypeSelect = (type: 'any' | 'percentage' | 'amount') => {
    console.log('[AlertsScreen] Threshold type selected:', type);
    setSettings(prev => prev ? { ...prev, priceDropThresholdType: type } : null);
    debouncedSaveRef.current?.({ priceDropThresholdType: type });

    if (type === 'any') {
      setSettings(prev => prev ? { ...prev, priceDropThresholdValue: null } : null);
      debouncedSaveRef.current?.({ priceDropThresholdValue: null });
      setShowThresholdModal(false);
    }
  };

  const handleThresholdValueSave = () => {
    const value = parseFloat(thresholdValue);
    if (isNaN(value) || value <= 0) {
      return;
    }

    console.log('[AlertsScreen] Threshold value saved:', value);
    setSettings(prev => prev ? { ...prev, priceDropThresholdValue: value } : null);
    debouncedSaveRef.current?.({ priceDropThresholdValue: value });
    setShowThresholdModal(false);
  };

  const handleFrequencySelect = (frequency: 'daily' | 'twice_daily' | 'hourly') => {
    console.log('[AlertsScreen] Frequency selected:', frequency);
    setSettings(prev => prev ? { ...prev, checkFrequency: frequency } : null);
    debouncedSaveRef.current?.({ checkFrequency: frequency });
    setShowFrequencyModal(false);
  };

  const handleCurrencySelect = (currency: { currencyCode: string; currencyName: string }) => {
    console.log('[AlertsScreen] Currency selected:', currency.currencyCode);
    setSettings(prev => prev ? { ...prev, preferredCurrency: currency.currencyCode } : null);
    debouncedSaveRef.current?.({ preferredCurrency: currency.currencyCode });
    setShowCurrencyPicker(false);
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Stack.Screen
        options={{
          title: 'Price Drop Alerts',
          headerShown: true,
          headerBackTitle: 'Back',
        }}
      />

      <ScrollView style={styles.scrollContent}>
        {/* Notification Permission Banner */}
        {showPermissionBanner && !notificationPermissionGranted && (
          <View style={{ marginBottom: spacing.md }}>
            <PermissionBanner
              type="notifications"
              message="Notifications are disabled. Enable them to receive price drop alerts."
              onDismiss={() => setShowPermissionBanner(false)}
              onAction={() => {
                router.push('/permissions/notifications');
              }}
              actionText="Enable"
            />
          </View>
        )}

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

        {/* Price Drop Threshold */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Price Drop Threshold</Text>
          <Card>
            <TouchableOpacity
              style={styles.settingRow}
              onPress={() => {
                setThresholdValue(priceDropThresholdValueValue?.toString() || '');
                setShowThresholdModal(true);
              }}
              disabled={!alertsEnabledValue || !notifyPriceDropsValue}
            >
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Alert Threshold</Text>
                <Text style={styles.settingDescription}>
                  {thresholdTypeDisplay}
                </Text>
              </View>
              <IconSymbol
                ios_icon_name="chevron.right"
                android_material_icon_name="chevron-right"
                size={20}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
          </Card>
        </View>

        {/* Check Frequency */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Price Check Frequency</Text>
          <Card>
            <TouchableOpacity
              style={styles.settingRow}
              onPress={() => setShowFrequencyModal(true)}
              disabled={!alertsEnabledValue}
            >
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Check Frequency</Text>
                <Text style={styles.settingDescription}>
                  {frequencyDisplay}
                </Text>
              </View>
              <IconSymbol
                ios_icon_name="chevron.right"
                android_material_icon_name="chevron-right"
                size={20}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
          </Card>
        </View>

        {/* Preferred Currency */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preferred Currency</Text>
          <Card>
            <TouchableOpacity
              style={styles.settingRow}
              onPress={() => setShowCurrencyPicker(true)}
            >
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Currency for Alerts</Text>
                <Text style={styles.settingDescription}>
                  {currencyDisplay}
                </Text>
              </View>
              <IconSymbol
                ios_icon_name="chevron.right"
                android_material_icon_name="chevron-right"
                size={20}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
          </Card>
        </View>
      </ScrollView>

      {/* Threshold Modal */}
      <Modal
        visible={showThresholdModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowThresholdModal(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowThresholdModal(false)}
        >
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>Price Drop Threshold</Text>

            <TouchableOpacity
              style={[
                styles.thresholdOption,
                priceDropThresholdTypeValue === 'any' && styles.thresholdOptionActive,
              ]}
              onPress={() => handleThresholdTypeSelect('any')}
            >
              <View style={styles.thresholdOptionLeft}>
                <Text style={styles.thresholdOptionLabel}>Any Price Drop</Text>
                <Text style={styles.thresholdOptionDescription}>
                  Alert me whenever the price decreases
                </Text>
              </View>
              {priceDropThresholdTypeValue === 'any' && (
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
                styles.thresholdOption,
                priceDropThresholdTypeValue === 'percentage' && styles.thresholdOptionActive,
              ]}
              onPress={() => handleThresholdTypeSelect('percentage')}
            >
              <View style={styles.thresholdOptionLeft}>
                <Text style={styles.thresholdOptionLabel}>Percentage Drop</Text>
                <Text style={styles.thresholdOptionDescription}>
                  Alert when price drops by a certain %
                </Text>
              </View>
              {priceDropThresholdTypeValue === 'percentage' && (
                <IconSymbol
                  ios_icon_name="checkmark"
                  android_material_icon_name="check"
                  size={20}
                  color={colors.primary}
                />
              )}
            </TouchableOpacity>

            {priceDropThresholdTypeValue === 'percentage' && (
              <View style={styles.thresholdInputContainer}>
                <TextInput
                  style={styles.thresholdInput}
                  value={thresholdValue}
                  onChangeText={setThresholdValue}
                  placeholder="e.g., 10"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="decimal-pad"
                />
                <Text style={styles.thresholdInputSuffix}>%</Text>
                <TouchableOpacity
                  style={styles.thresholdSaveButton}
                  onPress={handleThresholdValueSave}
                >
                  <Text style={styles.thresholdSaveButtonText}>Save</Text>
                </TouchableOpacity>
              </View>
            )}

            <TouchableOpacity
              style={[
                styles.thresholdOption,
                priceDropThresholdTypeValue === 'amount' && styles.thresholdOptionActive,
              ]}
              onPress={() => handleThresholdTypeSelect('amount')}
            >
              <View style={styles.thresholdOptionLeft}>
                <Text style={styles.thresholdOptionLabel}>Amount Drop</Text>
                <Text style={styles.thresholdOptionDescription}>
                  Alert when price drops by a specific amount
                </Text>
              </View>
              {priceDropThresholdTypeValue === 'amount' && (
                <IconSymbol
                  ios_icon_name="checkmark"
                  android_material_icon_name="check"
                  size={20}
                  color={colors.primary}
                />
              )}
            </TouchableOpacity>

            {priceDropThresholdTypeValue === 'amount' && (
              <View style={styles.thresholdInputContainer}>
                <Text style={styles.thresholdInputPrefix}>{currencyInfo?.symbol || preferredCurrencyValue}</Text>
                <TextInput
                  style={styles.thresholdInput}
                  value={thresholdValue}
                  onChangeText={setThresholdValue}
                  placeholder="e.g., 5.00"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="decimal-pad"
                />
                <TouchableOpacity
                  style={styles.thresholdSaveButton}
                  onPress={handleThresholdValueSave}
                >
                  <Text style={styles.thresholdSaveButtonText}>Save</Text>
                </TouchableOpacity>
              </View>
            )}
          </Pressable>
        </Pressable>
      </Modal>

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
            <Text style={styles.modalTitle}>Price Check Frequency</Text>

            <TouchableOpacity
              style={[
                styles.frequencyOption,
                checkFrequencyValue === 'daily' && styles.frequencyOptionActive,
              ]}
              onPress={() => handleFrequencySelect('daily')}
            >
              <View style={styles.frequencyOptionLeft}>
                <Text style={styles.frequencyOptionLabel}>Once Daily</Text>
                <Text style={styles.frequencyOptionDescription}>
                  Check prices once per day
                </Text>
              </View>
              {checkFrequencyValue === 'daily' && (
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
                checkFrequencyValue === 'twice_daily' && styles.frequencyOptionActive,
              ]}
              onPress={() => handleFrequencySelect('twice_daily')}
            >
              <View style={styles.frequencyOptionLeft}>
                <Text style={styles.frequencyOptionLabel}>Twice Daily</Text>
                <Text style={styles.frequencyOptionDescription}>
                  Check prices every 12 hours
                </Text>
              </View>
              {checkFrequencyValue === 'twice_daily' && (
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
                checkFrequencyValue === 'hourly' && styles.frequencyOptionActive,
              ]}
              onPress={() => handleFrequencySelect('hourly')}
            >
              <View style={styles.frequencyOptionLeft}>
                <Text style={styles.frequencyOptionLabel}>Every Hour</Text>
                <Text style={styles.frequencyOptionDescription}>
                  Check prices hourly (Premium only)
                </Text>
              </View>
              {checkFrequencyValue === 'hourly' && (
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

      {/* Currency Picker */}
      <CurrencyPicker
        visible={showCurrencyPicker}
        onClose={() => setShowCurrencyPicker(false)}
        onSelect={handleCurrencySelect}
        selectedCurrency={preferredCurrencyValue}
      />
    </SafeAreaView>
  );
}
