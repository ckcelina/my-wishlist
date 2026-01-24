
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { IconSymbol } from '@/components/IconSymbol';
import { colors, typography, spacing } from '@/styles/designSystem';

export default function PhotosPermissionScreen() {
  const router = useRouter();

  const handleContinue = async () => {
    console.log('[PhotosPermissionScreen] User tapped Continue');
    
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status === 'granted') {
        console.log('[PhotosPermissionScreen] Photos permission granted');
        router.back();
      } else {
        console.log('[PhotosPermissionScreen] Photos permission denied');
        Alert.alert(
          'Permission Denied',
          'Photo library access is required to select images. Please enable it in your device settings.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => {
              // On iOS, this will open the app settings
            }},
          ]
        );
      }
    } catch (error) {
      console.error('[PhotosPermissionScreen] Error requesting photos permission:', error);
      Alert.alert('Error', 'Failed to request photos permission');
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Photo Library Access',
          headerBackTitle: 'Back',
        }}
      />
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <IconSymbol
              ios_icon_name="photo.fill"
              android_material_icon_name="photo"
              size={80}
              color={colors.accent}
            />
          </View>

          <Text style={styles.title}>Photo Library Access</Text>
          <Text style={styles.description}>
            My Wishlist needs access to your photo library to let you select product images for your wishlist items.
          </Text>

          <View style={styles.features}>
            <View style={styles.feature}>
              <IconSymbol
                ios_icon_name="checkmark.circle.fill"
                android_material_icon_name="check-circle"
                size={24}
                color={colors.success}
              />
              <Text style={styles.featureText}>Choose product photos</Text>
            </View>
            <View style={styles.feature}>
              <IconSymbol
                ios_icon_name="checkmark.circle.fill"
                android_material_icon_name="check-circle"
                size={24}
                color={colors.success}
              />
              <Text style={styles.featureText}>Add images to wishlist items</Text>
            </View>
          </View>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleContinue}
            activeOpacity={0.7}
          >
            <Text style={styles.primaryButtonText}>Continue</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Text style={styles.secondaryButtonText}>Not Now</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl,
    alignItems: 'center',
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.accent + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  title: {
    ...typography.titleLarge,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  description: {
    ...typography.bodyLarge,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: 24,
  },
  features: {
    width: '100%',
    gap: spacing.md,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  featureText: {
    ...typography.bodyLarge,
    flex: 1,
  },
  actions: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
    gap: spacing.md,
  },
  primaryButton: {
    backgroundColor: colors.accent,
    paddingVertical: spacing.md,
    borderRadius: 12,
    alignItems: 'center',
    minHeight: 48,
  },
  primaryButtonText: {
    ...typography.bodyLarge,
    fontWeight: '600',
    color: colors.textInverse,
  },
  secondaryButton: {
    paddingVertical: spacing.md,
    alignItems: 'center',
    minHeight: 48,
  },
  secondaryButtonText: {
    ...typography.bodyLarge,
    color: colors.textSecondary,
  },
});
