
import { useAppTheme } from '@/contexts/ThemeContext';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { PressableScale } from '@/components/design-system/PressableScale';
import { getCurrencyByCode } from '@/constants/currencies';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { createColors, createTypography, spacing } from '@/styles/designSystem';
import { SUPPORTED_LANGUAGES } from '@/lib/i18n';
import { Card } from '@/components/design-system/Card';
import { Divider } from '@/components/design-system/Divider';
import { useRouter } from 'expo-router';
import { authenticatedGet, authenticatedPut } from '@/utils/api';
import { PremiumCard } from '@/components/PremiumCard';
import { Button } from '@/components/design-system/Button';
import { CurrencyPicker } from '@/components/pickers/CurrencyPicker';
import { useI18n } from '@/contexts/I18nContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
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
} from 'react-native';
import { useHaptics } from '@/hooks/useHaptics';
import { IconSymbol } from '@/components/IconSymbol';

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

  const { user, signOut } = useAuth();
  const router = useRouter();
  const { t } = useTranslation();
  const { language, changeLanguage } = useI18n();
  const { theme, themePreference, setThemePreference, isDark } = useAppTheme();
  const { triggerHaptic } = useHaptics();
  
  const colors = useMemo(() => createColors(theme), [theme]);
  const typography = useMemo(() => createTypography(theme), [theme]);

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
      borderWidth: 1.5,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      alignItems: 'center',
    },
    themeButtonActive: {
      borderColor: colors.accent,
      backgroundColor: colors.accentLight,
    },
    themeButtonText: {
      ...typography.body,
      color: colors.text,
    },
    themeButtonTextActive: {
      ...typography.body,
      color: colors.accent,
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
  }), [colors, typography]);

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
      
      setPriceDropAlertsEnabled(data.priceDropAlertsEnabled ?? false);
      setWeeklyDigestEnabled(data.weeklyDigestEnabled ?? false);
      setDefaultCurrency(data.defaultCurrency ?? 'USD');
    } catch (error) {
      console.error('[ProfileScreen] Error fetching settings:', error);
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
      await updateUserSettings(user.id, updates);
      
      console.log('[ProfileScreen] Settings updated successfully');
    } catch (error) {
      console.error('[ProfileScreen] Error updating settings:', error);
      Alert.alert('Error', 'Failed to update settings');
    }
  };

  const handleTogglePriceAlerts = async (value: boolean) => {
    console.log('[ProfileScreen] User toggled price alerts:', value);
    triggerHaptic('light');
    setPriceDropAlertsEnabled(value);
    await updateSettings({ priceDropAlertsEnabled: value });
  };

  const handleSelectCurrency = async (currency: { currencyCode: string; currencyName: string }) => {
    console.log('[ProfileScreen] User selected currency:', currency.currencyCode);
    triggerHaptic('light');
    setDefaultCurrency(currency.currencyCode);
    setCurrencyPickerVisible(false);
    await updateSettings({ defaultCurrency: currency.currencyCode });
  };

  const handleThemeChange = async (preference: 'light' | 'dark' | 'system') => {
    console.log('[ProfileScreen] User changed theme preference:', preference);
    triggerHaptic('light');
    await setThemePreference(preference);
  };

  const handleSignOut = async () => {
    console.log('[ProfileScreen] User tapped sign out');
    triggerHaptic('medium');
    
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut();
              router.replace('/auth');
            } catch (error) {
              console.error('[ProfileScreen] Error signing out:', error);
              Alert.alert('Error', 'Failed to sign out');
            }
          },
        },
      ]
    );
  };

  const handleContactSupport = () => {
    console.log('[ProfileScreen] User tapped contact support');
    triggerHaptic('light');
    Linking.openURL('mailto:support@mywishlist.app');
  };

  const handlePrivacyPolicy = () => {
    console.log('[ProfileScreen] User tapped privacy policy');
    triggerHaptic('light');
    router.push('/legal/privacy');
  };

  const handleTerms = () => {
    console.log('[ProfileScreen] User tapped terms');
    triggerHaptic('light');
    router.push('/legal/terms');
  };

  const handleEditLocation = () => {
    console.log('[ProfileScreen] User tapped edit location');
    triggerHaptic('light');
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
            <Text style={styles.title}>{t('profile.title')}</Text>
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
                onPress={() => setCurrencyPickerVisible(true)}
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
                  <Text style={styles.settingLabel}>{t('profile.location')}</Text>
                  <Text style={styles.settingDescription}>
                    {t('profile.locationDescription')}
                  </Text>
                </View>
                <Text style={styles.settingValue}>{locationDisplay}</Text>
              </TouchableOpacity>

              <Divider />

              <TouchableOpacity
                style={styles.settingRow}
                onPress={() => router.push('/language-selector')}
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
            </Card>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(500)} style={styles.section}>
            <Text style={styles.sectionTitle}>Developer Tools</Text>
            <Card>
              <TouchableOpacity 
                style={styles.linkButton} 
                onPress={() => {
                  triggerHaptic('light');
                  router.push('/diagnostics-enhanced');
                }}
              >
                <Text style={styles.linkText}>System Diagnostics</Text>
              </TouchableOpacity>

              <Divider />

              <TouchableOpacity 
                style={styles.linkButton} 
                onPress={() => {
                  triggerHaptic('light');
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
      </SafeAreaView>
    </>
  );
}
