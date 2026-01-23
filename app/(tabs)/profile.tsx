
import React from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { IconSymbol } from '@/components/IconSymbol';
import { Button } from '@/components/design-system/Button';
import { Card } from '@/components/design-system/Card';
import { Divider } from '@/components/design-system/Divider';
import { colors, typography, spacing, containerStyles } from '@/styles/designSystem';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, signOut } = useAuth();

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

  const userNameText = user?.name || 'User';
  const userEmailText = user?.email || '';
  const userInitial = userNameText.charAt(0).toUpperCase();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
      </View>

      <ScrollView style={styles.content}>
        <Card style={styles.profileCard}>
          <View style={styles.profileHeader}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{userInitial}</Text>
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{userNameText}</Text>
              <Text style={styles.profileEmail}>{userEmailText}</Text>
            </View>
          </View>
        </Card>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          
          <Card style={styles.menuCard}>
            <View style={styles.menuItem}>
              <View style={styles.menuItemLeft}>
                <IconSymbol
                  ios_icon_name="person"
                  android_material_icon_name="person"
                  size={24}
                  color={colors.textSecondary}
                />
                <Text style={styles.menuItemText}>Edit Profile</Text>
              </View>
              <IconSymbol
                ios_icon_name="chevron-right"
                android_material_icon_name="chevron-right"
                size={20}
                color={colors.textTertiary}
              />
            </View>

            <Divider />

            <View style={styles.menuItem}>
              <View style={styles.menuItemLeft}>
                <IconSymbol
                  ios_icon_name="notifications"
                  android_material_icon_name="notifications"
                  size={24}
                  color={colors.textSecondary}
                />
                <Text style={styles.menuItemText}>Notifications</Text>
              </View>
              <IconSymbol
                ios_icon_name="chevron-right"
                android_material_icon_name="chevron-right"
                size={20}
                color={colors.textTertiary}
              />
            </View>

            <Divider />

            <View style={styles.menuItem}>
              <View style={styles.menuItemLeft}>
                <IconSymbol
                  ios_icon_name="lock"
                  android_material_icon_name="lock"
                  size={24}
                  color={colors.textSecondary}
                />
                <Text style={styles.menuItemText}>Privacy</Text>
              </View>
              <IconSymbol
                ios_icon_name="chevron-right"
                android_material_icon_name="chevron-right"
                size={20}
                color={colors.textTertiary}
              />
            </View>
          </Card>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          
          <Card style={styles.menuCard}>
            <View style={styles.menuItem}>
              <View style={styles.menuItemLeft}>
                <IconSymbol
                  ios_icon_name="help"
                  android_material_icon_name="help"
                  size={24}
                  color={colors.textSecondary}
                />
                <Text style={styles.menuItemText}>Help & Support</Text>
              </View>
              <IconSymbol
                ios_icon_name="chevron-right"
                android_material_icon_name="chevron-right"
                size={20}
                color={colors.textTertiary}
              />
            </View>

            <Divider />

            <View style={styles.menuItem}>
              <View style={styles.menuItemLeft}>
                <IconSymbol
                  ios_icon_name="info"
                  android_material_icon_name="info"
                  size={24}
                  color={colors.textSecondary}
                />
                <Text style={styles.menuItemText}>About</Text>
              </View>
              <IconSymbol
                ios_icon_name="chevron-right"
                android_material_icon_name="chevron-right"
                size={20}
                color={colors.textTertiary}
              />
            </View>
          </Card>
        </View>

        <View style={styles.signOutContainer}>
          <Button
            title="Sign Out"
            onPress={handleSignOut}
            variant="destructive"
          />
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>
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
  profileCard: {
    marginBottom: spacing.lg,
  },
  profileHeader: {
    ...containerStyles.row,
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
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    ...typography.labelLarge,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  menuCard: {
    padding: 0,
  },
  menuItem: {
    ...containerStyles.spaceBetween,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  menuItemLeft: {
    ...containerStyles.row,
  },
  menuItemText: {
    ...typography.bodyLarge,
  },
  signOutContainer: {
    marginTop: spacing.xl,
    marginBottom: spacing.lg,
  },
  bottomPadding: {
    height: 100,
  },
});
