
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconSymbol } from '@/components/IconSymbol';
import { Card } from '@/components/design-system/Card';
import { Divider } from '@/components/design-system/Divider';
import { useAuth } from '@/contexts/AuthContext';
import { useAppTheme } from '@/contexts/ThemeContext';
import { createColors, createTypography, spacing } from '@/styles/designSystem';
import {
  checkAllPermissions,
  openAppSettings,
  getPermissionName,
  getPermissionDescription,
  type PermissionStatus,
} from '@/utils/permissions';
import { authenticatedGet, authenticatedPut } from '@/utils/api';

interface PermissionConsent {
  notifications: boolean;
  camera: boolean;
  photos: boolean;
  location: boolean;
  notificationsAskedAt: string | null;
  cameraAskedAt: string | null;
  photosAskedAt: string | null;
  locationAskedAt: string | null;
}

export default function PermissionsSettingsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { theme } = useAppTheme();
  const colors = createColors(theme);
  const typography = createTypography(theme);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [permissions, setPermissions] = useState<{
    notifications: PermissionStatus;
    camera: PermissionStatus;
    photos: PermissionStatus;
    location: PermissionStatus;
  } | null>(null);
  const [consent, setConsent] = useState<PermissionConsent | null>(null);

  const fetchPermissions = useCallback(async () => {
    console.log('[PermissionsSettings] Fetching permission statuses');
    try {
      const statuses = await checkAllPermissions();
      setPermissions(statuses);
      console.log('[PermissionsSettings] Permission statuses:', statuses);
    } catch (error) {
      console.error('[PermissionsSettings] Error fetching permissions:', error);
    }
  }, []);

  const fetchConsent = useCallback(async () => {
    if (!user?.id) {
      console.log('[PermissionsSettings] No user ID, skipping consent fetch');
      return;
    }

    console.log('[PermissionsSettings] Fetching permission consent');
    try {
      // TODO: Backend Integration - GET /api/users/permissions/consent
      // Returns: { notifications, camera, photos, location, notificationsAskedAt, cameraAskedAt, photosAskedAt, locationAskedAt }
      
      // Mock data for now
      setConsent({
        notifications: false,
        camera: false,
        photos: false,
        location: false,
        notificationsAskedAt: null,
        cameraAskedAt: null,
        photosAskedAt: null,
        locationAskedAt: null,
      });
    } catch (error) {
      console.error('[PermissionsSettings] Error fetching consent:', error);
    }
  }, [user]);

  const loadData = useCallback(async () => {
    await Promise.all([fetchPermissions(), fetchConsent()]);
    setLoading(false);
  }, [fetchPermissions, fetchConsent]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleOpenSettings = async (permissionType: string) => {
    console.log('[PermissionsSettings] User tapped Open Settings for:', permissionType);
    await openAppSettings();
  };

  const getStatusColor = (status: PermissionStatus) => {
    const statusColorText = status.granted ? colors.success : status.status === 'denied' ? colors.error : colors.textSecondary;
    return statusColorText;
  };

  const getStatusText = (status: PermissionStatus) => {
    const statusText = status.granted ? 'Granted' : status.status === 'denied' ? 'Denied' : 'Not Set';
    return statusText;
  };

  const getStatusIcon = (status: PermissionStatus) => {
    const iconName = status.granted ? 'check-circle' : status.status === 'denied' ? 'cancel' : 'help';
    return iconName;
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollContent: {
      padding: spacing.lg,
    },
    header: {
      marginBottom: spacing.xl,
    },
    title: {
      ...typography.h2,
      color: colors.text,
      marginBottom: spacing.xs,
    },
    subtitle: {
      ...typography.body,
      color: colors.textSecondary,
      lineHeight: 22,
    },
    section: {
      marginBottom: spacing.lg,
    },
    sectionTitle: {
      ...typography.h3,
      color: colors.text,
      marginBottom: spacing.md,
    },
    permissionCard: {
      marginBottom: spacing.md,
    },
    permissionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      marginBottom: spacing.sm,
    },
    permissionIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
    },
    permissionInfo: {
      flex: 1,
    },
    permissionName: {
      ...typography.h4,
      color: colors.text,
      marginBottom: spacing.xs,
    },
    permissionDescription: {
      ...typography.caption,
      color: colors.textSecondary,
      lineHeight: 18,
    },
    statusBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      borderRadius: 12,
    },
    statusText: {
      ...typography.caption,
      fontWeight: '600',
    },
    openSettingsButton: {
      marginTop: spacing.md,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
    },
    openSettingsText: {
      ...typography.body,
      color: colors.accent,
      fontWeight: '600',
    },
    infoBox: {
      backgroundColor: colors.surface2,
      padding: spacing.md,
      borderRadius: 12,
      marginTop: spacing.lg,
    },
    infoText: {
      ...typography.caption,
      color: colors.textSecondary,
      lineHeight: 18,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
  });

  if (loading) {
    return (
      <>
        <Stack.Screen
          options={{
            title: 'Permissions',
            headerShown: true,
            headerBackTitle: 'Back',
          }}
        />
        <SafeAreaView style={styles.container} edges={['bottom']}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.accent} />
          </View>
        </SafeAreaView>
      </>
    );
  }

  const notificationsStatus = permissions?.notifications;
  const cameraStatus = permissions?.camera;
  const photosStatus = permissions?.photos;
  const locationStatus = permissions?.location;

  const notificationsColor = notificationsStatus ? getStatusColor(notificationsStatus) : colors.textSecondary;
  const cameraColor = cameraStatus ? getStatusColor(cameraStatus) : colors.textSecondary;
  const photosColor = photosStatus ? getStatusColor(photosStatus) : colors.textSecondary;
  const locationColor = locationStatus ? getStatusColor(locationStatus) : colors.textSecondary;

  const notificationsText = notificationsStatus ? getStatusText(notificationsStatus) : 'Unknown';
  const cameraText = cameraStatus ? getStatusText(cameraStatus) : 'Unknown';
  const photosText = photosStatus ? getStatusText(photosStatus) : 'Unknown';
  const locationText = locationStatus ? getStatusText(locationStatus) : 'Unknown';

  const notificationsIcon = notificationsStatus ? getStatusIcon(notificationsStatus) : 'help';
  const cameraIcon = cameraStatus ? getStatusIcon(cameraStatus) : 'help';
  const photosIcon = photosStatus ? getStatusIcon(photosStatus) : 'help';
  const locationIcon = locationStatus ? getStatusIcon(locationStatus) : 'help';

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Permissions',
          headerShown: true,
          headerBackTitle: 'Back',
        }}
      />
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.accent} />
          }
        >
          <View style={styles.header}>
            <Text style={styles.title}>App Permissions</Text>
            <Text style={styles.subtitle}>
              Manage permissions for My Wishlist. You can change these anytime in your device settings.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Required Permissions</Text>

            <Card style={styles.permissionCard}>
              <View style={styles.permissionHeader}>
                <View style={[styles.permissionIcon, { backgroundColor: colors.accent + '20' }]}>
                  <IconSymbol
                    ios_icon_name="bell.fill"
                    android_material_icon_name="notifications"
                    size={24}
                    color={colors.accent}
                  />
                </View>
                <View style={styles.permissionInfo}>
                  <Text style={styles.permissionName}>Notifications</Text>
                  <Text style={styles.permissionDescription}>
                    {getPermissionDescription('notifications')}
                  </Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: notificationsColor + '20' }]}>
                  <IconSymbol
                    ios_icon_name={notificationsIcon}
                    android_material_icon_name={notificationsIcon}
                    size={16}
                    color={notificationsColor}
                  />
                  <Text style={[styles.statusText, { color: notificationsColor }]}>
                    {notificationsText}
                  </Text>
                </View>
              </View>
              {notificationsStatus && !notificationsStatus.granted && (
                <TouchableOpacity
                  style={styles.openSettingsButton}
                  onPress={() => handleOpenSettings('notifications')}
                >
                  <Text style={styles.openSettingsText}>Open Settings</Text>
                </TouchableOpacity>
              )}
            </Card>

            <Card style={styles.permissionCard}>
              <View style={styles.permissionHeader}>
                <View style={[styles.permissionIcon, { backgroundColor: colors.accent + '20' }]}>
                  <IconSymbol
                    ios_icon_name="camera.fill"
                    android_material_icon_name="camera"
                    size={24}
                    color={colors.accent}
                  />
                </View>
                <View style={styles.permissionInfo}>
                  <Text style={styles.permissionName}>Camera</Text>
                  <Text style={styles.permissionDescription}>
                    {getPermissionDescription('camera')}
                  </Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: cameraColor + '20' }]}>
                  <IconSymbol
                    ios_icon_name={cameraIcon}
                    android_material_icon_name={cameraIcon}
                    size={16}
                    color={cameraColor}
                  />
                  <Text style={[styles.statusText, { color: cameraColor }]}>
                    {cameraText}
                  </Text>
                </View>
              </View>
              {cameraStatus && !cameraStatus.granted && (
                <TouchableOpacity
                  style={styles.openSettingsButton}
                  onPress={() => handleOpenSettings('camera')}
                >
                  <Text style={styles.openSettingsText}>Open Settings</Text>
                </TouchableOpacity>
              )}
            </Card>

            <Card style={styles.permissionCard}>
              <View style={styles.permissionHeader}>
                <View style={[styles.permissionIcon, { backgroundColor: colors.accent + '20' }]}>
                  <IconSymbol
                    ios_icon_name="photo.fill"
                    android_material_icon_name="photo"
                    size={24}
                    color={colors.accent}
                  />
                </View>
                <View style={styles.permissionInfo}>
                  <Text style={styles.permissionName}>Photos</Text>
                  <Text style={styles.permissionDescription}>
                    {getPermissionDescription('photos')}
                  </Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: photosColor + '20' }]}>
                  <IconSymbol
                    ios_icon_name={photosIcon}
                    android_material_icon_name={photosIcon}
                    size={16}
                    color={photosColor}
                  />
                  <Text style={[styles.statusText, { color: photosColor }]}>
                    {photosText}
                  </Text>
                </View>
              </View>
              {photosStatus && !photosStatus.granted && (
                <TouchableOpacity
                  style={styles.openSettingsButton}
                  onPress={() => handleOpenSettings('photos')}
                >
                  <Text style={styles.openSettingsText}>Open Settings</Text>
                </TouchableOpacity>
              )}
            </Card>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Optional Permissions</Text>

            <Card style={styles.permissionCard}>
              <View style={styles.permissionHeader}>
                <View style={[styles.permissionIcon, { backgroundColor: colors.accent + '20' }]}>
                  <IconSymbol
                    ios_icon_name="location.fill"
                    android_material_icon_name="location-on"
                    size={24}
                    color={colors.accent}
                  />
                </View>
                <View style={styles.permissionInfo}>
                  <Text style={styles.permissionName}>Location</Text>
                  <Text style={styles.permissionDescription}>
                    {getPermissionDescription('location')}
                  </Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: locationColor + '20' }]}>
                  <IconSymbol
                    ios_icon_name={locationIcon}
                    android_material_icon_name={locationIcon}
                    size={16}
                    color={locationColor}
                  />
                  <Text style={[styles.statusText, { color: locationColor }]}>
                    {locationText}
                  </Text>
                </View>
              </View>
              {locationStatus && !locationStatus.granted && (
                <TouchableOpacity
                  style={styles.openSettingsButton}
                  onPress={() => handleOpenSettings('location')}
                >
                  <Text style={styles.openSettingsText}>Open Settings</Text>
                </TouchableOpacity>
              )}
            </Card>
          </View>

          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              {Platform.OS === 'ios'
                ? 'To change permissions, go to Settings → My Wishlist and adjust the permissions there.'
                : 'To change permissions, go to Settings → Apps → My Wishlist → Permissions and adjust them there.'}
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}
