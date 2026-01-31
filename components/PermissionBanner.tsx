
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { IconSymbol } from '@/components/IconSymbol';
import { useAppTheme } from '@/contexts/ThemeContext';
import { createColors, createTypography, spacing } from '@/styles/designSystem';
import { getPermissionIcon } from '@/utils/permissions';

interface PermissionBannerProps {
  type: 'notifications' | 'camera' | 'photos' | 'location';
  message: string;
  onDismiss?: () => void;
  onAction?: () => void;
  actionText?: string;
  showDismiss?: boolean;
}

export function PermissionBanner({
  type,
  message,
  onDismiss,
  onAction,
  actionText = 'Enable',
  showDismiss = true,
}: PermissionBannerProps) {
  const router = useRouter();
  const { theme } = useAppTheme();
  const colors = createColors(theme);
  const typography = createTypography(theme);

  const iconName = getPermissionIcon(type);

  const handleAction = () => {
    console.log('[PermissionBanner] User tapped action for:', type);
    if (onAction) {
      onAction();
    } else {
      const routeMap = {
        notifications: '/permissions/notifications',
        camera: '/permissions/camera',
        photos: '/permissions/photos',
        location: '/permissions/location',
      };
      router.push(routeMap[type]);
    }
  };

  const handleDismiss = () => {
    console.log('[PermissionBanner] User dismissed banner for:', type);
    if (onDismiss) {
      onDismiss();
    }
  };

  const styles = StyleSheet.create({
    container: {
      backgroundColor: colors.warning + '15',
      borderLeftWidth: 4,
      borderLeftColor: colors.warning,
      borderRadius: 8,
      padding: spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
    },
    iconContainer: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.warning + '20',
      justifyContent: 'center',
      alignItems: 'center',
    },
    content: {
      flex: 1,
    },
    message: {
      ...typography.body,
      color: colors.text,
      marginBottom: spacing.xs,
    },
    actions: {
      flexDirection: 'row',
      gap: spacing.sm,
      marginTop: spacing.xs,
    },
    actionButton: {
      paddingVertical: spacing.xs,
      paddingHorizontal: spacing.sm,
      borderRadius: 6,
      backgroundColor: colors.warning,
    },
    actionText: {
      ...typography.caption,
      color: colors.textInverse,
      fontWeight: '600',
    },
    dismissButton: {
      paddingVertical: spacing.xs,
      paddingHorizontal: spacing.sm,
    },
    dismissText: {
      ...typography.caption,
      color: colors.textSecondary,
    },
  });

  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <IconSymbol
          ios_icon_name={iconName}
          android_material_icon_name={iconName}
          size={24}
          color={colors.warning}
        />
      </View>
      <View style={styles.content}>
        <Text style={styles.message}>{message}</Text>
        <View style={styles.actions}>
          <TouchableOpacity style={styles.actionButton} onPress={handleAction}>
            <Text style={styles.actionText}>{actionText}</Text>
          </TouchableOpacity>
          {showDismiss && onDismiss && (
            <TouchableOpacity style={styles.dismissButton} onPress={handleDismiss}>
              <Text style={styles.dismissText}>Dismiss</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}
