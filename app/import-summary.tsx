
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconSymbol } from '@/components/IconSymbol';
import { colors, typography, spacing, containerStyles } from '@/styles/designSystem';

interface CreatedWishlist {
  id: string;
  name: string;
  itemCount: number;
}

export default function ImportSummaryScreen() {
  const router = useRouter();
  const { wishlists: wishlistsParam, failedItems: failedItemsParam } = useLocalSearchParams();

  const wishlists: CreatedWishlist[] = wishlistsParam && typeof wishlistsParam === 'string'
    ? JSON.parse(wishlistsParam)
    : [];

  const failedItems: string[] = failedItemsParam && typeof failedItemsParam === 'string'
    ? JSON.parse(failedItemsParam)
    : [];

  const totalItems = wishlists.reduce((sum, w) => sum + w.itemCount, 0);
  const successMessage = `Successfully imported ${totalItems} items into ${wishlists.length} wishlists`;

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Import Complete',
          headerBackTitle: 'Back',
          headerLeft: () => null,
        }}
      />
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          {/* Success Icon */}
          <View style={styles.iconContainer}>
            <View style={styles.iconCircle}>
              <IconSymbol
                ios_icon_name="checkmark"
                android_material_icon_name="check"
                size={48}
                color={colors.success}
              />
            </View>
          </View>

          {/* Success Message */}
          <Text style={styles.title}>Import Complete!</Text>
          <Text style={styles.subtitle}>{successMessage}</Text>

          {/* Created Wishlists */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Created Wishlists</Text>
            {wishlists.map((wishlist, index) => {
              const itemCountText = `${wishlist.itemCount} ${wishlist.itemCount === 1 ? 'item' : 'items'}`;
              
              return (
                <TouchableOpacity
                  key={index}
                  style={styles.wishlistCard}
                  onPress={() => {
                    console.log('[ImportSummary] Opening wishlist:', wishlist.id);
                    router.replace(`/wishlist/${wishlist.id}`);
                  }}
                  activeOpacity={0.7}
                >
                  <View style={styles.wishlistIcon}>
                    <IconSymbol
                      ios_icon_name="list.bullet"
                      android_material_icon_name="list"
                      size={24}
                      color={colors.accent}
                    />
                  </View>
                  <View style={styles.wishlistInfo}>
                    <Text style={styles.wishlistName}>{wishlist.name}</Text>
                    <Text style={styles.wishlistCount}>{itemCountText}</Text>
                  </View>
                  <IconSymbol
                    ios_icon_name="chevron.right"
                    android_material_icon_name="chevron-right"
                    size={20}
                    color={colors.textTertiary}
                  />
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Failed Items (if any) */}
          {failedItems.length > 0 && (
            <View style={styles.section}>
              <View style={styles.warningHeader}>
                <IconSymbol
                  ios_icon_name="exclamationmark.triangle"
                  android_material_icon_name="warning"
                  size={20}
                  color={colors.warning}
                />
                <Text style={styles.warningTitle}>Some items could not be imported</Text>
              </View>
              {failedItems.map((item, index) => (
                <View key={index} style={styles.failedItem}>
                  <Text style={styles.failedItemText}>{item}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => {
                console.log('[ImportSummary] Navigating to wishlists');
                router.replace('/(tabs)/wishlists');
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.primaryButtonText}>View All Wishlists</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => {
                console.log('[ImportSummary] Navigating to home');
                router.replace('/(tabs)/(home)');
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.secondaryButtonText}>Go to Home</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    ...containerStyles.screen,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingTop: spacing.xl,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.successLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...typography.displayMedium,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.bodyLarge,
    textAlign: 'center',
    color: colors.textSecondary,
    marginBottom: spacing.xl,
    lineHeight: 24,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    ...typography.titleMedium,
    marginBottom: spacing.md,
  },
  wishlistCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  wishlistIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  wishlistInfo: {
    flex: 1,
  },
  wishlistName: {
    ...typography.bodyLarge,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  wishlistCount: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  warningHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.md,
    backgroundColor: colors.warningLight,
    borderRadius: 8,
    padding: spacing.sm,
  },
  warningTitle: {
    ...typography.bodyMedium,
    color: colors.warning,
    fontWeight: '500',
    flex: 1,
  },
  failedItem: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: spacing.sm,
    marginBottom: spacing.xs,
    borderLeftWidth: 3,
    borderLeftColor: colors.error,
  },
  failedItemText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  actions: {
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  primaryButton: {
    backgroundColor: colors.accent,
    borderRadius: 12,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.shadowMedium,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 2,
  },
  primaryButtonText: {
    ...typography.buttonLarge,
    color: colors.textInverse,
  },
  secondaryButton: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  secondaryButtonText: {
    ...typography.buttonMedium,
    color: colors.textPrimary,
  },
});
