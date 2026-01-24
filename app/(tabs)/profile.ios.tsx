
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  Switch,
  Modal,
  Pressable,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { IconSymbol } from '@/components/IconSymbol';
import { Button } from '@/components/design-system/Button';
import { Card } from '@/components/design-system/Card';
import { Divider } from '@/components/design-system/Divider';
import { PressableScale } from '@/components/design-system/PressableScale';
import { colors, typography, spacing, containerStyles } from '@/styles/designSystem';
import { authenticatedGet, authenticatedPut } from '@/utils/api';
import { useHaptics } from '@/hooks/useHaptics';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';

const CURRENCY_OPTIONS = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc' },
  { code: 'CNY', symbol: '¥', name: 'Chinese Yuan' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
];

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
  const haptics = useHaptics();
  
  const [priceDropAlerts, setPriceDropAlerts] = useState(false);
  const [defaultCurrency, setDefaultCurrency] = useState('USD');
  const [loading, setLoading] = useState(true);
  const [showCurrencyModal, setShowCurrencyModal] = useState(false);
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);

  const fetchSettings = useCallback(async () => {
    console.log('[ProfileScreen] Fetching user settings');
    try {
      const data = await authenticatedGet<{
        priceDropAlertsEnabled: boolean;
        defaultCurrency: string;
      }>('/api/users/settings');
      
      console.log('[ProfileScreen] Settings fetched:', data);
      setPriceDropAlerts(data.priceDropAlertsEnabled || false);
      setDefaultCurrency(data.defaultCurrency || 'USD');
    } catch (error) {
      console.error('[ProfileScreen] Error fetching settings:', error);
    }
  }, []);

  const fetchLocation = useCallback(async () => {
    console.log('[ProfileScreen] Fetching user location');
    try {
      const data = await authenticatedGet<UserLocation | null>('/api/users/location');
      console.log('[ProfileScreen] Location fetched:', data);
      setUserLocation(data);
    } catch (error) {
      console.error('[ProfileScreen] Error fetching location:', error);
    }
  }, []);

  useEffect(() => {
    if (user) {
      Promise.all([fetchSettings(), fetchLocation()]).finally(() => {
        setLoading(false);
      });
    }
  }, [user, fetchSettings, fetchLocation]);

  const updateSettings = async (updates: { priceDropAlertsEnabled?: boolean; defaultCurrency?: string }) => {
    console.log('[ProfileScreen] Updating settings:', updates);
    try {
      const data = await authenticatedPut<{
        priceDropAlertsEnabled: boolean;
        defaultCurrency: string;
      }>('/api/users/settings', updates);
      
      console.log('[ProfileScreen] Settings updated:', data);
      setPriceDropAlerts(data.priceDropAlertsEnabled || false);
      setDefaultCurrency(data.defaultCurrency || 'USD');
      haptics.success();
    } catch (error) {
      console.error('[ProfileScreen] Error updating settings:', error);
      haptics.error();
      Alert.alert('Error', 'Failed to update settings');
    }
  };

  const handleTogglePriceAlerts = async (value: boolean) => {
    console.log('[ProfileScreen] User toggled price alerts:', value);
    setPriceDropAlerts(value);
    await updateSettings({ priceDropAlertsEnabled: value });
  };

  const handleSelectCurrency = async (currencyCode: string) => {
    console.log('[ProfileScreen] User selected currency:', currencyCode);
    haptics.selection();
    setDefaultCurrency(currencyCode);
    setShowCurrencyModal(false);
    await updateSettings({ defaultCurrency: currencyCode });
  };

  const handleSignOut = async () => {
    haptics.warning();
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { 
          text: 'Cancel', 
          style: 'cancel',
          onPress: () => haptics.light(),
        },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('[ProfileScreen] User tapped Sign Out');
              haptics.medium();
              await signOut();
              console.log('[ProfileScreen] Sign out successful');
              // Navigation is handled by AuthGate in _layout.tsx
            } catch (error: any) {
              console.error('[ProfileScreen] Sign out error:', error);
              haptics.error();
              Alert.alert('Error', 'Failed to sign out');
            }
          },
        },
      ]
    );
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
    Alert.alert('Privacy Policy', 'Privacy policy coming soon.');
  };

  const handleTerms = () => {
    console.log('[ProfileScreen] User tapped Terms of Service');
    haptics.light();
    Alert.alert('Terms of Service', 'Terms of service coming soon.');
  };

  const handleEditLocation = () => {
    console.log('[ProfileScreen] User tapped Edit Location');
    haptics.light();
    router.push('/location');
  };

  const userNameText = user?.name || 'User';
  const userEmailText = user?.email || '';
  const userInitial = userNameText.charAt(0).toUpperCase();
  
  const selectedCurrency = CURRENCY_OPTIONS.find(c => c.code === defaultCurrency) || CURRENCY_OPTIONS[0];
  const currencyDisplayText = `${selectedCurrency.symbol} ${selectedCurrency.code}`;

  const locationDisplayText = userLocation 
    ? `${userLocation.countryName}${userLocation.city ? `, ${userLocation.city}` : ''}`
    : 'Not set';

  if (loading) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Profile</Text>
          </View>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Profile</Text>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Account Section */}
          <Animated.View entering={FadeInDown.delay(0).springify()} style={styles.section}>
            <Text style={styles.sectionTitle}>ACCOUNT</Text>
            
            <Card style={styles.card}>
              <View style={styles.profileHeader}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{userInitial}</Text>
                </View>
                <View style={styles.profileInfo}>
                  <Text style={styles.profileName}>{userNameText}</Text>
                  <Text style={styles.profileEmail}>{userEmailText}</Text>
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

          {/* Shopping Location Section */}
          <Animated.View entering={FadeInDown.delay(50).springify()} style={styles.section}>
            <Text style={styles.sectionTitle}>SHOPPING LOCATION</Text>
            
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
                    color={colors.textSecondary}
                  />
                  <View style={styles.locationInfo}>
                    <Text style={styles.menuItemText}>Location</Text>
                    <Text style={styles.locationValue}>{locationDisplayText}</Text>
                  </View>
                </View>
                <IconSymbol
                  ios_icon_name="chevron.right"
                  android_material_icon_name="chevron-right"
                  size={20}
                  color={colors.textTertiary}
                />
              </PressableScale>
            </Card>
            
            {!userLocation && (
              <Text style={styles.locationHint}>
                Set your location to see stores that ship to your area
              </Text>
            )}
          </Animated.View>

          {/* Preferences Section */}
          <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.section}>
            <Text style={styles.sectionTitle}>PREFERENCES</Text>
            
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
                    color={colors.textSecondary}
                  />
                  <Text style={styles.menuItemText}>Default Currency</Text>
                </View>
                <View style={styles.menuItemRight}>
                  <Text style={styles.currencyValue}>{currencyDisplayText}</Text>
                  <IconSymbol
                    ios_icon_name="chevron.right"
                    android_material_icon_name="chevron-right"
                    size={20}
                    color={colors.textTertiary}
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
                    color={colors.textSecondary}
                  />
                  <Text style={styles.menuItemText}>Price Drop Alerts</Text>
                </View>
                <View style={styles.menuItemRight}>
                  <Text style={styles.currencyValue}>
                    {priceDropAlerts ? 'Enabled' : 'Disabled'}
                  </Text>
                  <IconSymbol
                    ios_icon_name="chevron.right"
                    android_material_icon_name="chevron-right"
                    size={20}
                    color={colors.textTertiary}
                  />
                </View>
              </PressableScale>
            </Card>
          </Animated.View>

          {/* Help Section */}
          <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.section}>
            <Text style={styles.sectionTitle}>HELP</Text>
            
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
                    color={colors.textSecondary}
                  />
                  <Text style={styles.menuItemText}>Contact Support</Text>
                </View>
                <IconSymbol
                  ios_icon_name="chevron.right"
                  android_material_icon_name="chevron-right"
                  size={20}
                  color={colors.textTertiary}
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
                    color={colors.textSecondary}
                  />
                  <Text style={styles.menuItemText}>Privacy Policy</Text>
                </View>
                <IconSymbol
                  ios_icon_name="chevron.right"
                  android_material_icon_name="chevron-right"
                  size={20}
                  color={colors.textTertiary}
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
                    color={colors.textSecondary}
                  />
                  <Text style={styles.menuItemText}>Terms of Service</Text>
                </View>
                <IconSymbol
                  ios_icon_name="chevron.right"
                  android_material_icon_name="chevron-right"
                  size={20}
                  color={colors.textTertiary}
                />
              </PressableScale>
            </Card>
          </Animated.View>

          <View style={styles.bottomPadding} />
        </ScrollView>

        {/* Currency Selection Modal */}
        <Modal
          visible={showCurrencyModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowCurrencyModal(false)}
        >
          <Pressable
            style={styles.modalOverlay}
            onPress={() => {
              haptics.light();
              setShowCurrencyModal(false);
            }}
          >
            <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Currency</Text>
                <TouchableOpacity
                  onPress={() => {
                    haptics.light();
                    setShowCurrencyModal(false);
                  }}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <IconSymbol
                    ios_icon_name="xmark.circle.fill"
                    android_material_icon_name="close"
                    size={24}
                    color={colors.textSecondary}
                  />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.currencyList} showsVerticalScrollIndicator={false}>
                {CURRENCY_OPTIONS.map((currency, index) => (
                  <React.Fragment key={currency.code}>
                    <PressableScale
                      style={styles.currencyItem}
                      onPress={() => handleSelectCurrency(currency.code)}
                      hapticFeedback="selection"
                    >
                      <View style={styles.currencyItemLeft}>
                        <Text style={styles.currencySymbol}>{currency.symbol}</Text>
                        <View>
                          <Text style={styles.currencyCode}>{currency.code}</Text>
                          <Text style={styles.currencyName}>{currency.name}</Text>
                        </View>
                      </View>
                      {defaultCurrency === currency.code && (
                        <IconSymbol
                          ios_icon_name="checkmark.circle.fill"
                          android_material_icon_name="check"
                          size={24}
                          color={colors.primary}
                        />
                      )}
                    </PressableScale>
                    {index < CURRENCY_OPTIONS.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </ScrollView>
            </Pressable>
          </Pressable>
        </Modal>
      </View>
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
    borderBottomColor: colors.border,
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
    color: colors.textTertiary,
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
    backgroundColor: colors.primary,
    ...containerStyles.center,
  },
  avatarText: {
    ...typography.titleLarge,
    color: colors.textInverse,
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
    color: colors.textSecondary,
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
    color: colors.textSecondary,
  },
  locationInfo: {
    flex: 1,
  },
  locationValue: {
    ...typography.bodySmall,
    color: colors.textTertiary,
    marginTop: spacing.xs,
  },
  locationHint: {
    ...typography.bodySmall,
    color: colors.textTertiary,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.xs,
    fontStyle: 'italic',
  },
  bottomPadding: {
    height: 100,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '70%',
    paddingBottom: spacing.xl,
  },
  modalHeader: {
    ...containerStyles.spaceBetween,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    ...typography.titleMedium,
  },
  currencyList: {
    paddingHorizontal: spacing.lg,
  },
  currencyItem: {
    ...containerStyles.spaceBetween,
    paddingVertical: spacing.md,
  },
  currencyItemLeft: {
    ...containerStyles.row,
    gap: spacing.md,
  },
  currencySymbol: {
    ...typography.titleMedium,
    color: colors.textSecondary,
    width: 32,
    textAlign: 'center',
  },
  currencyCode: {
    ...typography.bodyLarge,
    fontWeight: '600',
  },
  currencyName: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
});
