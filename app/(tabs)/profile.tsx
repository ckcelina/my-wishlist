
import { Divider } from '@/components/design-system/Divider';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { IconSymbol } from '@/components/IconSymbol';
import { useHaptics } from '@/hooks/useHaptics';
import { StatusBar } from 'expo-status-bar';
import { PressableScale } from '@/components/design-system/PressableScale';
import { useAuth } from '@/contexts/AuthContext';
import { getCurrencyByCode } from '@/constants/currencies';
import { PremiumCard } from '@/components/PremiumCard';
import { createColors, createTypography, spacing } from '@/styles/designSystem';
import { Button } from '@/components/design-system/Button';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CurrencyPicker } from '@/components/pickers/CurrencyPicker';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  Platform,
  TouchableOpacity,
  Switch,
  Linking,
  ActivityIndicator,
  Modal,
  Pressable,
} from 'react-native';
import { useAppTheme } from '@/contexts/ThemeContext';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { authenticatedGet, authenticatedPut } from '@/utils/api';
import { Card } from '@/components/design-system/Card';
import { useTranslation } from 'react-i18next';
import { SUPPORTED_LANGUAGES } from '@/lib/i18n';
import { useI18n } from '@/contexts/I18nContext';
import { useRouter } from 'expo-router';

interface UserLocation {
  id: string;
  userId: string;
  countryCode: string;
  countryName: string;
  city: string | null;
  region: string | null;
  postalCode: string | null;
  updatedAt: string;
}

export default function ProfileScreen() {
  const [priceDropAlertsEnabled, setPriceDropAlertsEnabled] = useState(false);
  const [weeklyDigestEnabled, setWeeklyDigestEnabled] = useState(false);
  const [defaultCurrency, setDefaultCurrency] = useState('USD');
  const [loading, setLoading] = useState(true);
  const [currencyPickerVisible, setCurrencyPickerVisible] = useState(false);
  const [location, setLocation] = useState<UserLocation | null>(null);
  const [showSignOutModal, setShowSignOutModal] = useState(false);

  const { user, signOut } = useAuth();
  const router = useRouter();
  const { t } = useTranslation();
  const { language, changeLanguage } = useI18n();
  const { theme, themePreference, setThemePreference, isDark } = useAppTheme();
  const haptics = useHaptics();
  
  const colors = useMemo(() => createColors(theme), [theme]);
  const typography = useMemo(() => createTypography(theme), [theme]);

  const userName = useMemo(() => {
    if (user?.user_metadata?.name) {
      return user.user_metadata.name;
    }
    if (user?.email) {
      return user.email.split('@')[0];
    }
    return 'User';
  }, [user]);

  const styles = useMemo(() => StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.background,
    },
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollContent: {
      flexGrow: 1,
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.xxl,
    },
    header: {
      paddingTop: spacing.lg,
      paddingBottom: spacing.md,
    },
    title: {
      ...typography.h1,
      color: colors.text,
      marginBottom: spacing.xs,
    },
    subtitle: {
      ...typography.body,
      color: colors.textSecondary,
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
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: spacing.md,
    },
    settingLeft: {
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
    settingValue: {
      ...typography.body,
      color: colors.textSecondary,
    },
    themeOptions: {
      flexDirection: 'row',
      gap: spacing.sm,
      marginTop: spacing.sm,
    },
    themeButton: {
      flex: 1,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.sm,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: colors.border,
      backgroundColor: colors.surface2,
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'center',
      gap: spacing.xs,
    },
    themeButtonActive: {
      borderColor: colors.accent,
      backgroundColor: colors.accent,
    },
    themeButtonText: {
      ...typography.body,
      color: colors.textSecondary,
      fontWeight: '500',
    },
    themeButtonTextActive: {
      ...typography.body,
      color: isDark ? colors.textPrimary : '#FFFFFF',
      fontWeight: '600',
    },
    locationCard: {
      marginTop: spacing.sm,
    },
    locationText: {
      ...typography.body,
      color: colors.text,
      marginBottom: spacing.xs,
    },
    locationSubtext: {
      ...typography.caption,
      color: colors.textSecondary,
    },
    linkButton: {
      paddingVertical: spacing.md,
    },
    linkText: {
      ...typography.body,
      color: colors.accent,
    },
    signOutButton: {
      marginTop: spacing.lg,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
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
      marginBottom: spacing.sm,
      textAlign: 'center',
    },
    modalMessage: {
      ...typography.body,
      color: colors.textSecondary,
      marginBottom: spacing.lg,
      textAlign: 'center',
    },
    modalButtons: {
      flexDirection: 'row',
      gap: spacing.md,
    },
    modalButton: {
      flex: 1,
      paddingVertical: spacing.md,
      borderRadius: 12,
      alignItems: 'center',
    },
    modalButtonCancel: {
      backgroundColor: colors.surface2,
    },
    modalButtonConfirm: {
      backgroundColor: '#EF4444',
    },
    modalButtonText: {
      ...typography.body,
      fontWeight: '600',
    },
    modalButtonTextCancel: {
      color: colors.text,
    },
    modalButtonTextConfirm: {
      color: '#FFFFFF',
    },
  }), [colors, typography, isDark]);

  const fetchSettings = useCallback(async () => {
    try {
      console.log('[ProfileScreen] Fetching user settings');
      
      if (!user?.id) {
        console.log('[ProfileScreen] No user ID, skipping settings fetch');
        setLoading(false);
        return;
      }
      
      const { fetchUserSettings } = await import('@/lib/supabase-helpers');
      const data = await fetchUserSettings(user.id);
      console.log('[ProfileScreen] Settings fetched:', data);
      
      // Defensive: Always use nullish coalescing to provide defaults
      setPriceDropAlertsEnabled(data?.priceDropAlertsEnabled ?? false);
      setWeeklyDigestEnabled(data?.weeklyDigestEnabled ?? false);
      setDefaultCurrency(data?.defaultCurrency ?? 'USD');
    } catch (error) {
      console.error('[ProfileScreen] Error fetching settings:', error);
      // Set defaults on error
      setPriceDropAlertsEnabled(false);
      setWeeklyDigestEnabled(false);
      setDefaultCurrency('USD');
    } finally {
      setLoading(false);
    }
  }, [user]);

  const fetchLocation = useCallback(async () => {
    try {
      console.log('[ProfileScreen] Fetching user location');
      
      if (!user?.id) {
        console.log('[ProfileScreen] No user ID, skipping location fetch');
        return;
      }
      
      const { fetchUserLocation } = await import('@/lib/supabase-helpers');
      const data = await fetchUserLocation(user.id);
      console.log('[ProfileScreen] Location fetched:', data);
      setLocation(data);
    } catch (error) {
      console.error('[ProfileScreen] Error fetching location:', error);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchSettings();
      fetchLocation();
    }
  }, [user, fetchSettings, fetchLocation]);

  const updateSettings = async (updates: {
    priceDropAlertsEnabled?: boolean;
    weeklyDigestEnabled?: boolean;
    defaultCurrency?: string;
  }) => {
    try {
      console.log('[ProfileScreen] Updating settings:', updates);
      
      if (!user?.id) {
        console.log('[ProfileScreen] No user ID, cannot update settings');
        return;
      }
      
      const { updateUserSettings } = await import('@/lib/supabase-helpers');
      const updatedSettings = await updateUserSettings(user.id, updates);
      
      console.log('[ProfileScreen] Settings updated successfully:', updatedSettings);
      
      // Update local state with returned values (defensive)
      if (updatedSettings) {
        if (updates.priceDropAlertsEnabled !== undefined) {
          setPriceDropAlertsEnabled(updatedSettings.priceDropAlertsEnabled ?? false);
        }
        if (updates.weeklyDigestEnabled !== undefined) {
          setWeeklyDigestEnabled(updatedSettings.weeklyDigestEnabled ?? false);
        }
        if (updates.defaultCurrency !== undefined) {
          setDefaultCurrency(updatedSettings.defaultCurrency ?? 'USD');
        }
      }
    } catch (error) {
      console.error('[ProfileScreen] Error updating settings:', error);
      Alert.alert('Error', 'Failed to update settings');
    }
  };

  const handleTogglePriceAlerts = async (value: boolean) => {
    console.log('[ProfileScreen] User toggled price alerts:', value);
    haptics.light();
    setPriceDropAlertsEnabled(value);
    await updateSettings({ priceDropAlertsEnabled: value });
  };

  const handleSelectCurrency = async (currency: { currencyCode: string; currencyName: string }) => {
    console.log('[ProfileScreen] User selected currency:', currency.currencyCode);
    haptics.light();
    setDefaultCurrency(currency.currencyCode);
    setCurrencyPickerVisible(false);
    await updateSettings({ defaultCurrency: currency.currencyCode });
  };

  const handleThemeChange = async (preference: 'light' | 'dark' | 'system') => {
    console.log('[ProfileScreen] User changed theme preference:', preference);
    haptics.light();
    await setThemePreference(preference);
  };

  const handleSignOut = async () => {
    console.log('[ProfileScreen] User tapped sign out');
    haptics.medium();
    setShowSignOutModal(true);
  };

  const confirmSignOut = async () => {
    console.log('[ProfileScreen] User confirmed sign out');
    setShowSignOutModal(false);
    try {
      await signOut();
      router.replace('/auth');
    } catch (error) {
      console.error('[ProfileScreen] Error signing out:', error);
      Alert.alert('Error', 'Failed to sign out');
    }
  };

  const handleContactSupport = () => {
    console.log('[ProfileScreen] User tapped contact support');
    haptics.light();
    Linking.openURL('mailto:support@mywishlist.app');
  };

  const handlePrivacyPolicy = () => {
    console.log('[ProfileScreen] User tapped privacy policy');
    haptics.light();
    router.push('/legal/privacy');
  };

  const handleTerms = () => {
    console.log('[ProfileScreen] User tapped terms');
    haptics.light();
    router.push('/legal/terms');
  };

  const handleEditLocation = () => {
    console.log('[ProfileScreen] User tapped edit location');
    haptics.light();
    router.push('/location');
  };

  if (loading) {
    return (
      <>
        <StatusBar style={isDark ? 'light' : 'dark'} backgroundColor={colors.background} />
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.accent} />
          </View>
        </SafeAreaView>
      </>
    );
  }

  const currencyInfo = getCurrencyByCode(defaultCurrency);
  const currencyDisplay = currencyInfo 
    ? `${currencyInfo.symbol} ${currencyInfo.name}` 
    : defaultCurrency;

  const locationDisplay = location
    ? `${location.city ? location.city + ', ' : ''}${location.countryName}`
    : 'Not set';

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} backgroundColor={colors.background} />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView 
          style={styles.container} 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View entering={FadeIn} style={styles.header}>
            <Text style={styles.title}>{userName}</Text>
            <Text style={styles.subtitle}>{user?.email}</Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(100)} style={styles.section}>
            <PremiumCard />
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(200)} style={styles.section}>
            <Text style={styles.sectionTitle}>{t('profile.appearance')}</Text>
            <Card>
              <View style={styles.settingRow}>
                <View style={styles.settingLeft}>
                  <Text style={styles.settingLabel}>{t('profile.theme')}</Text>
                  <Text style={styles.settingDescription}>
                    {t('profile.themeDescription')}
                  </Text>
                </View>
              </View>
              <View style={styles.themeOptions}>
                <TouchableOpacity
                  style={[
                    styles.themeButton,
                    themePreference === 'light' && styles.themeButtonActive,
                  ]}
                  onPress={() => handleThemeChange('light')}
                >
                  <IconSymbol
                    ios_icon_name="sun.max.fill"
                    android_material_icon_name="light-mode"
                    size={18}
                    color={themePreference === 'light' ? (isDark ? colors.textPrimary : '#FFFFFF') : colors.textSecondary}
                  />
                  <Text
                    style={
                      themePreference === 'light'
                        ? styles.themeButtonTextActive
                        : styles.themeButtonText
                    }
                  >
                    {t('profile.light')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.themeButton,
                    themePreference === 'dark' && styles.themeButtonActive,
                  ]}
                  onPress={() => handleThemeChange('dark')}
                >
                  <IconSymbol
                    ios_icon_name="moon.fill"
                    android_material_icon_name="dark-mode"
                    size={18}
                    color={themePreference === 'dark' ? (isDark ? colors.textPrimary : '#FFFFFF') : colors.textSecondary}
                  />
                  <Text
                    style={
                      themePreference === 'dark'
                        ? styles.themeButtonTextActive
                        : styles.themeButtonText
                    }
                  >
                    {t('profile.dark')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.themeButton,
                    themePreference === 'system' && styles.themeButtonActive,
                  ]}
                  onPress={() => handleThemeChange('system')}
                >
                  <IconSymbol
                    ios_icon_name="gear"
                    android_material_icon_name="settings"
                    size={18}
                    color={themePreference === 'system' ? (isDark ? colors.textPrimary : '#FFFFFF') : colors.textSecondary}
                  />
                  <Text
                    style={
                      themePreference === 'system'
                        ? styles.themeButtonTextActive
                        : styles.themeButtonText
                    }
                  >
                    {t('profile.system')}
                  </Text>
                </TouchableOpacity>
              </View>
            </Card>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(300)} style={styles.section}>
            <Text style={styles.sectionTitle}>{t('profile.preferences')}</Text>
            <Card>
              <TouchableOpacity
                style={styles.settingRow}
                onPress={() => {
                  haptics.light();
                  setCurrencyPickerVisible(true);
                }}
              >
                <View style={styles.settingLeft}>
                  <Text style={styles.settingLabel}>{t('profile.currency')}</Text>
                  <Text style={styles.settingDescription}>
                    {t('profile.currencyDescription')}
                  </Text>
                </View>
                <Text style={styles.settingValue}>{currencyDisplay}</Text>
              </TouchableOpacity>

              <Divider />

              <TouchableOpacity style={styles.settingRow} onPress={handleEditLocation}>
                <View style={styles.settingLeft}>
                  <Text style={styles.settingLabel}>Shopping Country</Text>
                  <Text style={styles.settingDescription}>
                    Used for search and price tracking
                  </Text>
                </View>
                <Text style={styles.settingValue}>{locationDisplay}</Text>
              </TouchableOpacity>

              <Divider />

              <TouchableOpacity
                style={styles.settingRow}
                onPress={() => {
                  haptics.light();
                  router.push('/language-selector');
                }}
              >
                <View style={styles.settingLeft}>
                  <Text style={styles.settingLabel}>{t('profile.language')}</Text>
                  <Text style={styles.settingDescription}>
                    {t('profile.languageDescription')}
                  </Text>
                </View>
                <Text style={styles.settingValue}>
                  {SUPPORTED_LANGUAGES.find((l) => l.code === language)?.name || language}
                </Text>
              </TouchableOpacity>
            </Card>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(400)} style={styles.section}>
            <Text style={styles.sectionTitle}>{t('profile.notifications')}</Text>
            <Card>
              <View style={styles.settingRow}>
                <View style={styles.settingLeft}>
                  <Text style={styles.settingLabel}>{t('profile.priceAlerts')}</Text>
                  <Text style={styles.settingDescription}>
                    {t('profile.priceAlertsDescription')}
                  </Text>
                </View>
                <Switch
                  value={priceDropAlertsEnabled}
                  onValueChange={handleTogglePriceAlerts}
                  trackColor={{ false: colors.border, true: colors.accent }}
                  thumbColor={colors.surface}
                />
              </View>

              <Divider />

              <TouchableOpacity
                style={styles.linkButton}
                onPress={() => {
                  haptics.light();
                  router.push('/alerts');
                }}
              >
                <Text style={styles.linkText}>Alert Settings</Text>
              </TouchableOpacity>
            </Card>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(450)} style={styles.section}>
            <Text style={styles.sectionTitle}>Permissions</Text>
            <Card>
              <TouchableOpacity
                style={styles.linkButton}
                onPress={() => {
                  haptics.light();
                  router.push('/permissions-settings');
                }}
              >
                <Text style={styles.linkText}>Manage Permissions</Text>
              </TouchableOpacity>
            </Card>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(500)} style={styles.section}>
            <Text style={styles.sectionTitle}>Developer Tools</Text>
            <Card>
              <TouchableOpacity 
                style={styles.linkButton} 
                onPress={() => {
                  haptics.light();
                  router.push('/diagnostics-enhanced');
                }}
              >
                <Text style={styles.linkText}>System Diagnostics</Text>
              </TouchableOpacity>

              <Divider />

              <TouchableOpacity 
                style={styles.linkButton} 
                onPress={() => {
                  haptics.light();
                  router.push('/e2e-test');
                }}
              >
                <Text style={styles.linkText}>End-to-End Tests</Text>
              </TouchableOpacity>
            </Card>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(600)} style={styles.section}>
            <Text style={styles.sectionTitle}>{t('profile.support')}</Text>
            <Card>
              <TouchableOpacity style={styles.linkButton} onPress={handleContactSupport}>
                <Text style={styles.linkText}>{t('profile.contactSupport')}</Text>
              </TouchableOpacity>

              <Divider />

              <TouchableOpacity style={styles.linkButton} onPress={handlePrivacyPolicy}>
                <Text style={styles.linkText}>{t('profile.privacyPolicy')}</Text>
              </TouchableOpacity>

              <Divider />

              <TouchableOpacity style={styles.linkButton} onPress={handleTerms}>
                <Text style={styles.linkText}>{t('profile.terms')}</Text>
              </TouchableOpacity>
            </Card>
          </Animated.View>

          <Button
            title={t('profile.signOut')}
            onPress={handleSignOut}
            variant="destructive"
            style={styles.signOutButton}
          />
        </ScrollView>

        <CurrencyPicker
          visible={currencyPickerVisible}
          onClose={() => setCurrencyPickerVisible(false)}
          onSelect={handleSelectCurrency}
          selectedCurrency={defaultCurrency}
        />

        <Modal
          visible={showSignOutModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowSignOutModal(false)}
        >
          <Pressable 
            style={styles.modalOverlay}
            onPress={() => setShowSignOutModal(false)}
          >
            <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
              <Text style={styles.modalTitle}>Sign Out</Text>
              <Text style={styles.modalMessage}>
                Are you sure you want to sign out?
              </Text>
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonCancel]}
                  onPress={() => {
                    haptics.light();
                    setShowSignOutModal(false);
                  }}
                >
                  <Text style={[styles.modalButtonText, styles.modalButtonTextCancel]}>
                    Cancel
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonConfirm]}
                  onPress={() => {
                    haptics.medium();
                    confirmSignOut();
                  }}
                >
                  <Text style={[styles.modalButtonText, styles.modalButtonTextConfirm]}>
                    Sign Out
                  </Text>
                </TouchableOpacity>
              </View>
            </Pressable>
          </Pressable>
        </Modal>
      </SafeAreaView>
    </>
  );
}
