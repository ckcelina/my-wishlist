
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  Switch,
  Linking,
  ActivityIndicator,
  Modal,
  Pressable,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useAppTheme } from '@/contexts/ThemeContext';
import { IconSymbol } from '@/components/IconSymbol';
import { Button } from '@/components/design-system/Button';
import { Card } from '@/components/design-system/Card';
import { Divider } from '@/components/design-system/Divider';
import { PressableScale } from '@/components/design-system/PressableScale';
import { PremiumCard } from '@/components/PremiumCard';
import { colors, typography, spacing, containerStyles } from '@/styles/designSystem';
import { authenticatedGet, authenticatedPut } from '@/utils/api';
import { useHaptics } from '@/hooks/useHaptics';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { CurrencyPicker } from '@/components/pickers/CurrencyPicker';
import { getCurrencyByCode } from '@/constants/currencies';
import { useI18n } from '@/contexts/I18nContext';
import { SUPPORTED_LANGUAGES } from '@/lib/i18n';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

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
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { theme, isDark, themePreference, setThemePreference } = useAppTheme();
  const haptics = useHaptics();
  const { t } = useTranslation();
  const { currentLanguage, languageMode } = useI18n();
  
  const [priceDropAlerts, setPriceDropAlerts] = useState(false);
  const [weeklyDigest, setWeeklyDigest] = useState(false);
  const [defaultCurrency, setDefaultCurrency] = useState('USD');
  const [loading, setLoading] = useState(true);
  const [showCurrencyModal, setShowCurrencyModal] = useState(false);
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [showSignOutModal, setShowSignOutModal] = useState(false);

  // Extract user name from user metadata
  const userName = useMemo(() => {
    if (user?.user_metadata?.name) {
      return user.user_metadata.name;
    }
    if (user?.email) {
      return user.email.split('@')[0];
    }
    return 'User';
  }, [user]);

  const userInitial = useMemo(() => {
    return userName.charAt(0).toUpperCase();
  }, [userName]);

  const fetchSettings = useCallback(async () => {
    console.log('[ProfileScreen] Fetching user settings');
    try {
      if (!user?.id) {
        console.log('[ProfileScreen] No user ID, skipping settings fetch');
        return;
      }
      
      const { fetchUserSettings } = await import('@/lib/supabase-helpers');
      const data = await fetchUserSettings(user.id);
      
      console.log('[ProfileScreen] Settings fetched:', data);
      // Defensive: Always use nullish coalescing to provide defaults
      setPriceDropAlerts(data?.priceDropAlertsEnabled ?? false);
      setWeeklyDigest(data?.weeklyDigestEnabled ?? false);
      setDefaultCurrency(data?.defaultCurrency ?? 'USD');
    } catch (error) {
      console.error('[ProfileScreen] Error fetching settings:', error);
      // Set defaults on error
      setPriceDropAlerts(false);
      setWeeklyDigest(false);
      setDefaultCurrency('USD');
    }
  }, [user]);

  const fetchLocation = useCallback(async () => {
    console.log('[ProfileScreen] Fetching user location');
    try {
      if (!user?.id) {
        console.log('[ProfileScreen] No user ID, skipping location fetch');
        return;
      }
      
      const { fetchUserLocation } = await import('@/lib/supabase-helpers');
      const data = await fetchUserLocation(user.id);
      console.log('[ProfileScreen] Location fetched:', data);
      setUserLocation(data);
    } catch (error) {
      console.error('[ProfileScreen] Error fetching location:', error);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      Promise.all([fetchSettings(), fetchLocation()]).finally(() => {
        setLoading(false);
      });
    }
  }, [user, fetchSettings, fetchLocation]);

  const updateSettings = async (updates: { priceDropAlertsEnabled?: boolean; weeklyDigestEnabled?: boolean; defaultCurrency?: string }) => {
    console.log('[ProfileScreen] Updating settings:', updates);
    try {
      if (!user?.id) {
        console.log('[ProfileScreen] No user ID, cannot update settings');
        return;
      }
      
      const { updateUserSettings } = await import('@/lib/supabase-helpers');
      const data = await updateUserSettings(user.id, updates);
      
      console.log('[ProfileScreen] Settings updated:', data);
      // Defensive: Always use nullish coalescing to provide defaults
      setPriceDropAlerts(data?.priceDropAlertsEnabled ?? false);
      setWeeklyDigest(data?.weeklyDigestEnabled ?? false);
      setDefaultCurrency(data?.defaultCurrency ?? 'USD');
      haptics.success();
    } catch (error) {
      console.error('[ProfileScreen] Error updating settings:', error);
      haptics.error();
      Alert.alert('Error', 'Failed to update settings');
      // Revert to current state on error (no change needed, state already set)
    }
  };

  const handleTogglePriceAlerts = async (value: boolean) => {
    console.log('[ProfileScreen] User toggled price alerts:', value);
    setPriceDropAlerts(value);
    await updateSettings({ priceDropAlertsEnabled: value });
  };

  const handleSelectCurrency = async (currency: { currencyCode: string; currencyName: string }) => {
    console.log('[ProfileScreen] User selected currency:', currency.currencyCode, currency.currencyName);
    haptics.selection();
    setDefaultCurrency(currency.currencyCode);
    setShowCurrencyModal(false);
    await updateSettings({ defaultCurrency: currency.currencyCode });
  };

  const handleThemeChange = async (preference: 'light' | 'dark' | 'system') => {
    console.log('[ProfileScreen] User changed theme to:', preference);
    haptics.selection();
    await setThemePreference(preference);
  };

  const handleSignOut = async () => {
    console.log('[ProfileScreen] User tapped sign out');
    haptics.warning();
    setShowSignOutModal(true);
  };

  const confirmSignOut = async () => {
    console.log('[ProfileScreen] User confirmed sign out');
    setShowSignOutModal(false);
    try {
      haptics.medium();
      await signOut();
      console.log('[ProfileScreen] Sign out successful');
    } catch (error: any) {
      console.error('[ProfileScreen] Sign out error:', error);
      haptics.error();
      Alert.alert('Error', 'Failed to sign out');
    }
  };

  const handleContactSupport = () => {
    console.log('[ProfileScreen] User tapped Contact Support');
    haptics.light();
    const email = 'support@mywishlist.app';
    const subject = 'Support Request';
    const mailtoUrl = `mailto:${email}?subject=${encodeURIComponent(subject)}`;
    Linking.openURL(mailtoUrl).catch(() => {
      Alert.alert('Error', 'Could not open email app');
    });
  };

  const handlePrivacyPolicy = () => {
    console.log('[ProfileScreen] User tapped Privacy Policy');
    haptics.light();
    router.push('/legal/privacy');
  };

  const handleTerms = () => {
    console.log('[ProfileScreen] User tapped Terms of Service');
    haptics.light();
    router.push('/legal/terms');
  };

  const handleEditLocation = () => {
    console.log('[ProfileScreen] User tapped Edit Location');
    haptics.light();
    router.push('/location');
  };

  const userEmailText = user?.email || '';
  
  const selectedCurrency = getCurrencyByCode(defaultCurrency);
  const currencyDisplayText = selectedCurrency 
    ? `${selectedCurrency.symbol || selectedCurrency.code} ${selectedCurrency.code}`
    : defaultCurrency;

  const locationDisplayText = userLocation 
    ? `${userLocation.countryName}${userLocation.city ? `, ${userLocation.city}` : ''}`
    : 'Not set';

  const themeDisplayText = themePreference === 'system' ? 'System' : themePreference === 'light' ? 'Light' : 'Dark';
  
  const currentLangInfo = SUPPORTED_LANGUAGES.find(l => l.code === currentLanguage);
  const languageDisplayText = languageMode === 'system' 
    ? t('profile.systemAuto')
    : currentLangInfo?.nativeName || currentLanguage;

  if (loading) {
    return (
      <>
        <StatusBar style={isDark ? 'light' : 'dark'} backgroundColor={theme.colors.background} />
        <Stack.Screen options={{ headerShown: false }} />
        <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
          <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
            <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Profile</Text>
          </View>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.accent} />
          </View>
        </SafeAreaView>
      </>
    );
  }

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} backgroundColor={theme.colors.background} />
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
        <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Profile</Text>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Account Section */}
          <Animated.View entering={FadeInDown.delay(0).springify()} style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>ACCOUNT</Text>
            
            <Card style={styles.card}>
              <View style={styles.profileHeader}>
                <View style={[styles.avatar, { backgroundColor: theme.colors.accent }]}>
                  <Text style={[styles.avatarText, { color: isDark ? theme.colors.text : '#FFFFFF' }]}>{userInitial}</Text>
                </View>
                <View style={styles.profileInfo}>
                  <Text style={[styles.profileName, { color: theme.colors.text }]}>{userName}</Text>
                  <Text style={[styles.profileEmail, { color: theme.colors.textSecondary }]}>{userEmailText}</Text>
                </View>
              </View>

              <Divider />

              <PressableScale
                style={styles.menuItem}
                onPress={handleSignOut}
                hapticFeedback="medium"
              >
                <View style={styles.menuItemLeft}>
                  <IconSymbol
                    ios_icon_name="arrow.right.square.fill"
                    android_material_icon_name="logout"
                    size={24}
                    color={colors.error}
                  />
                  <Text style={[styles.menuItemText, styles.logoutText]}>Logout</Text>
                </View>
              </PressableScale>
            </Card>
          </Animated.View>

          {/* Premium Section */}
          <Animated.View entering={FadeInDown.delay(25).springify()} style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>PREMIUM</Text>
            <PremiumCard />
          </Animated.View>

          {/* Appearance Section */}
          <Animated.View entering={FadeInDown.delay(50).springify()} style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>APPEARANCE</Text>
            
            <Card style={styles.card}>
              <View style={styles.themeSection}>
                <View style={styles.themeSectionHeader}>
                  <IconSymbol
                    ios_icon_name="paintbrush.fill"
                    android_material_icon_name="palette"
                    size={24}
                    color={theme.colors.textSecondary}
                  />
                  <Text style={[styles.menuItemText, { color: theme.colors.text }]}>Theme</Text>
                </View>
                
                <View style={styles.themeButtons}>
                  <PressableScale
                    style={[
                      styles.themeButton,
                      { 
                        backgroundColor: themePreference === 'light' ? theme.colors.accent : theme.colors.surface2,
                        borderColor: themePreference === 'light' ? theme.colors.accent : theme.colors.border,
                      }
                    ]}
                    onPress={() => handleThemeChange('light')}
                    hapticFeedback="selection"
                  >
                    <IconSymbol
                      ios_icon_name="sun.max.fill"
                      android_material_icon_name="light-mode"
                      size={18}
                      color={themePreference === 'light' ? (isDark ? theme.colors.textPrimary : '#FFFFFF') : theme.colors.textSecondary}
                    />
                    <Text style={[
                      styles.themeButtonText,
                      { 
                        color: themePreference === 'light' ? (isDark ? theme.colors.textPrimary : '#FFFFFF') : theme.colors.textSecondary,
                        fontWeight: themePreference === 'light' ? '600' : '500',
                      }
                    ]}>Light</Text>
                  </PressableScale>

                  <PressableScale
                    style={[
                      styles.themeButton,
                      { 
                        backgroundColor: themePreference === 'dark' ? theme.colors.accent : theme.colors.surface2,
                        borderColor: themePreference === 'dark' ? theme.colors.accent : theme.colors.border,
                      }
                    ]}
                    onPress={() => handleThemeChange('dark')}
                    hapticFeedback="selection"
                  >
                    <IconSymbol
                      ios_icon_name="moon.fill"
                      android_material_icon_name="dark-mode"
                      size={18}
                      color={themePreference === 'dark' ? (isDark ? theme.colors.textPrimary : '#FFFFFF') : theme.colors.textSecondary}
                    />
                    <Text style={[
                      styles.themeButtonText,
                      { 
                        color: themePreference === 'dark' ? (isDark ? theme.colors.textPrimary : '#FFFFFF') : theme.colors.textSecondary,
                        fontWeight: themePreference === 'dark' ? '600' : '500',
                      }
                    ]}>Dark</Text>
                  </PressableScale>

                  <PressableScale
                    style={[
                      styles.themeButton,
                      { 
                        backgroundColor: themePreference === 'system' ? theme.colors.accent : theme.colors.surface2,
                        borderColor: themePreference === 'system' ? theme.colors.accent : theme.colors.border,
                      }
                    ]}
                    onPress={() => handleThemeChange('system')}
                    hapticFeedback="selection"
                  >
                    <IconSymbol
                      ios_icon_name="gear"
                      android_material_icon_name="settings"
                      size={18}
                      color={themePreference === 'system' ? (isDark ? theme.colors.textPrimary : '#FFFFFF') : theme.colors.textSecondary}
                    />
                    <Text style={[
                      styles.themeButtonText,
                      { 
                        color: themePreference === 'system' ? (isDark ? theme.colors.textPrimary : '#FFFFFF') : theme.colors.textSecondary,
                        fontWeight: themePreference === 'system' ? '600' : '500',
                      }
                    ]}>System</Text>
                  </PressableScale>
                </View>
              </View>
            </Card>
          </Animated.View>

          {/* Shopping Location Section */}
          <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>SHOPPING LOCATION</Text>
            
            <Card style={styles.card}>
              <PressableScale
                style={styles.menuItem}
                onPress={handleEditLocation}
                hapticFeedback="light"
              >
                <View style={styles.menuItemLeft}>
                  <IconSymbol
                    ios_icon_name="location.fill"
                    android_material_icon_name="location-on"
                    size={24}
                    color={theme.colors.textSecondary}
                  />
                  <View style={styles.locationInfo}>
                    <Text style={[styles.menuItemText, { color: theme.colors.text }]}>Location</Text>
                    <Text style={[styles.locationValue, { color: theme.colors.textSecondary }]}>{locationDisplayText}</Text>
                  </View>
                </View>
                <IconSymbol
                  ios_icon_name="chevron.right"
                  android_material_icon_name="chevron-right"
                  size={20}
                  color={theme.colors.textSecondary}
                />
              </PressableScale>
            </Card>
            
            {!userLocation && (
              <Text style={[styles.locationHint, { color: theme.colors.textSecondary }]}>
                Set your location to see stores that ship to your area
              </Text>
            )}
          </Animated.View>

          {/* Preferences Section */}
          <Animated.View entering={FadeInDown.delay(150).springify()} style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>PREFERENCES</Text>
            
            <Card style={styles.card}>
              <PressableScale
                style={styles.menuItem}
                onPress={() => {
                  haptics.light();
                  setShowCurrencyModal(true);
                }}
                hapticFeedback="light"
              >
                <View style={styles.menuItemLeft}>
                  <IconSymbol
                    ios_icon_name="dollarsign.circle.fill"
                    android_material_icon_name="attach-money"
                    size={24}
                    color={theme.colors.textSecondary}
                  />
                  <Text style={[styles.menuItemText, { color: theme.colors.text }]}>Default Currency</Text>
                </View>
                <View style={styles.menuItemRight}>
                  <Text style={[styles.currencyValue, { color: theme.colors.textSecondary }]}>{currencyDisplayText}</Text>
                  <IconSymbol
                    ios_icon_name="chevron.right"
                    android_material_icon_name="chevron-right"
                    size={20}
                    color={theme.colors.textSecondary}
                  />
                </View>
              </PressableScale>

              <Divider />

              <PressableScale
                style={styles.menuItem}
                onPress={() => {
                  haptics.light();
                  router.push('/language-selector');
                }}
                hapticFeedback="light"
              >
                <View style={styles.menuItemLeft}>
                  <IconSymbol
                    ios_icon_name="globe"
                    android_material_icon_name="language"
                    size={24}
                    color={theme.colors.textSecondary}
                  />
                  <Text style={[styles.menuItemText, { color: theme.colors.text }]}>{t('profile.language')}</Text>
                </View>
                <View style={styles.menuItemRight}>
                  <Text style={[styles.currencyValue, { color: theme.colors.textSecondary }]}>{languageDisplayText}</Text>
                  <IconSymbol
                    ios_icon_name="chevron.right"
                    android_material_icon_name="chevron-right"
                    size={20}
                    color={theme.colors.textSecondary}
                  />
                </View>
              </PressableScale>

              <Divider />

              <PressableScale
                style={styles.menuItem}
                onPress={() => {
                  haptics.light();
                  router.push('/alerts');
                }}
                hapticFeedback="light"
              >
                <View style={styles.menuItemLeft}>
                  <IconSymbol
                    ios_icon_name="bell.fill"
                    android_material_icon_name="notifications"
                    size={24}
                    color={theme.colors.textSecondary}
                  />
                  <Text style={[styles.menuItemText, { color: theme.colors.text }]}>Price Drop Alerts</Text>
                </View>
                <View style={styles.menuItemRight}>
                  <Text style={[styles.currencyValue, { color: theme.colors.textSecondary }]}>
                    {priceDropAlerts ? 'Enabled' : 'Disabled'}
                  </Text>
                  <IconSymbol
                    ios_icon_name="chevron.right"
                    android_material_icon_name="chevron-right"
                    size={20}
                    color={theme.colors.textSecondary}
                  />
                </View>
              </PressableScale>
            </Card>
          </Animated.View>

          {/* Help Section */}
          <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>HELP</Text>
            
            <Card style={styles.card}>
              <PressableScale
                style={styles.menuItem}
                onPress={handleContactSupport}
                hapticFeedback="light"
              >
                <View style={styles.menuItemLeft}>
                  <IconSymbol
                    ios_icon_name="envelope.fill"
                    android_material_icon_name="email"
                    size={24}
                    color={theme.colors.textSecondary}
                  />
                  <Text style={[styles.menuItemText, { color: theme.colors.text }]}>Contact Support</Text>
                </View>
                <IconSymbol
                  ios_icon_name="chevron.right"
                  android_material_icon_name="chevron-right"
                  size={20}
                  color={theme.colors.textSecondary}
                />
              </PressableScale>

              <Divider />

              <PressableScale
                style={styles.menuItem}
                onPress={handlePrivacyPolicy}
                hapticFeedback="light"
              >
                <View style={styles.menuItemLeft}>
                  <IconSymbol
                    ios_icon_name="lock.shield.fill"
                    android_material_icon_name="lock"
                    size={24}
                    color={theme.colors.textSecondary}
                  />
                  <Text style={[styles.menuItemText, { color: theme.colors.text }]}>Privacy Policy</Text>
                </View>
                <IconSymbol
                  ios_icon_name="chevron.right"
                  android_material_icon_name="chevron-right"
                  size={20}
                  color={theme.colors.textSecondary}
                />
              </PressableScale>

              <Divider />

              <PressableScale
                style={styles.menuItem}
                onPress={handleTerms}
                hapticFeedback="light"
              >
                <View style={styles.menuItemLeft}>
                  <IconSymbol
                    ios_icon_name="doc.text.fill"
                    android_material_icon_name="description"
                    size={24}
                    color={theme.colors.textSecondary}
                  />
                  <Text style={[styles.menuItemText, { color: theme.colors.text }]}>Terms of Service</Text>
                </View>
                <IconSymbol
                  ios_icon_name="chevron.right"
                  android_material_icon_name="chevron-right"
                  size={20}
                  color={theme.colors.textSecondary}
                />
              </PressableScale>

              <Divider />

              <PressableScale
                style={styles.menuItem}
                onPress={() => {
                  haptics.light();
                  router.push('/diagnostics');
                }}
                hapticFeedback="light"
              >
                <View style={styles.menuItemLeft}>
                  <IconSymbol
                    ios_icon_name="wrench.and.screwdriver.fill"
                    android_material_icon_name="build"
                    size={24}
                    color={theme.colors.textSecondary}
                  />
                  <Text style={[styles.menuItemText, { color: theme.colors.text }]}>Diagnostics</Text>
                </View>
                <IconSymbol
                  ios_icon_name="chevron.right"
                  android_material_icon_name="chevron-right"
                  size={20}
                  color={theme.colors.textSecondary}
                />
              </PressableScale>
            </Card>
          </Animated.View>

          <View style={styles.bottomPadding} />
        </ScrollView>

        <CurrencyPicker
          visible={showCurrencyModal}
          onClose={() => setShowCurrencyModal(false)}
          onSelect={handleSelectCurrency}
          selectedCurrencyCode={defaultCurrency}
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
            <Pressable 
              style={[styles.modalContent, { backgroundColor: theme.colors.surface }]} 
              onPress={(e) => e.stopPropagation()}
            >
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Sign Out</Text>
              <Text style={[styles.modalMessage, { color: theme.colors.textSecondary }]}>
                Are you sure you want to sign out?
              </Text>
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonCancel, { backgroundColor: theme.colors.card }]}
                  onPress={() => {
                    haptics.light();
                    setShowSignOutModal(false);
                  }}
                >
                  <Text style={[styles.modalButtonText, { color: theme.colors.text }]}>
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

const styles = StyleSheet.create({
  container: {
    ...containerStyles.screen,
  },
  header: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  headerTitle: {
    ...typography.titleLarge,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    ...typography.labelMedium,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.xs,
    letterSpacing: 0.5,
  },
  card: {
    padding: 0,
  },
  profileHeader: {
    ...containerStyles.row,
    padding: spacing.md,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    ...containerStyles.center,
  },
  avatarText: {
    ...typography.titleLarge,
  },
  profileInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  profileName: {
    ...typography.titleMedium,
    marginBottom: spacing.xs,
  },
  profileEmail: {
    ...typography.bodyMedium,
  },
  menuItem: {
    ...containerStyles.spaceBetween,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  menuItemLeft: {
    ...containerStyles.row,
    flex: 1,
  },
  menuItemRight: {
    ...containerStyles.row,
    gap: spacing.xs,
  },
  menuItemText: {
    ...typography.bodyLarge,
  },
  logoutText: {
    color: colors.error,
  },
  currencyValue: {
    ...typography.bodyMedium,
  },
  locationInfo: {
    flex: 1,
  },
  locationValue: {
    ...typography.bodySmall,
    marginTop: spacing.xs,
  },
  locationHint: {
    ...typography.bodySmall,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.xs,
    fontStyle: 'italic',
  },
  themeSection: {
    padding: spacing.md,
  },
  themeSectionHeader: {
    ...containerStyles.row,
    marginBottom: spacing.md,
  },
  themeButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  themeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: 12,
    borderWidth: 2,
  },
  themeButtonText: {
    ...typography.bodyMedium,
  },
  bottomPadding: {
    height: 100,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    borderRadius: 16,
    padding: spacing.lg,
    marginHorizontal: spacing.lg,
    width: '85%',
    maxWidth: 400,
  },
  modalTitle: {
    ...typography.titleLarge,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  modalMessage: {
    ...typography.bodyMedium,
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
    // backgroundColor set dynamically
  },
  modalButtonConfirm: {
    backgroundColor: '#EF4444',
  },
  modalButtonText: {
    ...typography.bodyMedium,
    fontWeight: '600',
  },
  modalButtonTextConfirm: {
    color: '#FFFFFF',
  },
});
