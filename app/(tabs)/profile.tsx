
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  Platform,
  TouchableOpacity,
  Switch,
  Modal,
  Pressable,
  Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { IconSymbol } from '@/components/IconSymbol';
import { Button } from '@/components/design-system/Button';
import { Card } from '@/components/design-system/Card';
import { Divider } from '@/components/design-system/Divider';
import { colors, typography, spacing, containerStyles } from '@/styles/designSystem';
import { authenticatedGet, authenticatedPut } from '@/utils/api';

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

export default function ProfileScreen() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  
  const [priceDropAlerts, setPriceDropAlerts] = useState(false);
  const [defaultCurrency, setDefaultCurrency] = useState('USD');
  const [loading, setLoading] = useState(true);
  const [showCurrencyModal, setShowCurrencyModal] = useState(false);

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
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchSettings();
    }
  }, [user, fetchSettings]);

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
    } catch (error) {
      console.error('[ProfileScreen] Error updating settings:', error);
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
    setDefaultCurrency(currencyCode);
    setShowCurrencyModal(false);
    await updateSettings({ defaultCurrency: currencyCode });
  };

  const handleSignOut = async () => {
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
              console.log('[ProfileScreen] User tapped Sign Out');
              await signOut();
              console.log('[ProfileScreen] Sign out successful, navigating to auth');
              router.replace('/auth');
            } catch (error: any) {
              console.error('[ProfileScreen] Sign out error:', error);
              Alert.alert('Error', 'Failed to sign out');
            }
          },
        },
      ]
    );
  };

  const handleContactSupport = () => {
    console.log('[ProfileScreen] User tapped Contact Support');
    const email = 'support@mywishlist.app';
    const subject = 'Support Request';
    const mailtoUrl = `mailto:${email}?subject=${encodeURIComponent(subject)}`;
    Linking.openURL(mailtoUrl).catch(() => {
      Alert.alert('Error', 'Could not open email app');
    });
  };

  const handlePrivacyPolicy = () => {
    console.log('[ProfileScreen] User tapped Privacy Policy');
    Alert.alert('Privacy Policy', 'Privacy policy coming soon.');
  };

  const handleTerms = () => {
    console.log('[ProfileScreen] User tapped Terms of Service');
    Alert.alert('Terms of Service', 'Terms of service coming soon.');
  };

  const userNameText = user?.name || 'User';
  const userEmailText = user?.email || '';
  const userInitial = userNameText.charAt(0).toUpperCase();
  
  const selectedCurrency = CURRENCY_OPTIONS.find(c => c.code === defaultCurrency) || CURRENCY_OPTIONS[0];
  const currencyDisplayText = `${selectedCurrency.symbol} ${selectedCurrency.code}`;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Account Section */}
        <View style={styles.section}>
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

            <TouchableOpacity
              style={styles.menuItem}
              onPress={handleSignOut}
              activeOpacity={0.7}
            >
              <View style={styles.menuItemLeft}>
                <IconSymbol
                  ios_icon_name="arrow.right.square"
                  android_material_icon_name="logout"
                  size={24}
                  color={colors.error}
                />
                <Text style={[styles.menuItemText, styles.logoutText]}>Logout</Text>
              </View>
            </TouchableOpacity>
          </Card>
        </View>

        {/* Preferences Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>PREFERENCES</Text>
          
          <Card style={styles.card}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => setShowCurrencyModal(true)}
              activeOpacity={0.7}
            >
              <View style={styles.menuItemLeft}>
                <IconSymbol
                  ios_icon_name="dollarsign.circle"
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
            </TouchableOpacity>

            <Divider />

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => router.push('/alerts')}
              activeOpacity={0.7}
            >
              <View style={styles.menuItemLeft}>
                <IconSymbol
                  ios_icon_name="bell"
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
            </TouchableOpacity>
          </Card>
        </View>

        {/* Help Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>HELP</Text>
          
          <Card style={styles.card}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={handleContactSupport}
              activeOpacity={0.7}
            >
              <View style={styles.menuItemLeft}>
                <IconSymbol
                  ios_icon_name="envelope"
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
            </TouchableOpacity>

            <Divider />

            <TouchableOpacity
              style={styles.menuItem}
              onPress={handlePrivacyPolicy}
              activeOpacity={0.7}
            >
              <View style={styles.menuItemLeft}>
                <IconSymbol
                  ios_icon_name="lock.shield"
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
            </TouchableOpacity>

            <Divider />

            <TouchableOpacity
              style={styles.menuItem}
              onPress={handleTerms}
              activeOpacity={0.7}
            >
              <View style={styles.menuItemLeft}>
                <IconSymbol
                  ios_icon_name="doc.text"
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
            </TouchableOpacity>
          </Card>
        </View>

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
          onPress={() => setShowCurrencyModal(false)}
        >
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Currency</Text>
              <TouchableOpacity
                onPress={() => setShowCurrencyModal(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <IconSymbol
                  ios_icon_name="xmark"
                  android_material_icon_name="close"
                  size={24}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.currencyList} showsVerticalScrollIndicator={false}>
              {CURRENCY_OPTIONS.map((currency, index) => (
                <React.Fragment key={currency.code}>
                  <TouchableOpacity
                    style={styles.currencyItem}
                    onPress={() => handleSelectCurrency(currency.code)}
                    activeOpacity={0.7}
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
                        ios_icon_name="checkmark"
                        android_material_icon_name="check"
                        size={24}
                        color={colors.primary}
                      />
                    )}
                  </TouchableOpacity>
                  {index < CURRENCY_OPTIONS.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    ...containerStyles.screen,
    paddingTop: Platform.OS === 'android' ? 48 : 0,
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
