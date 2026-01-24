
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Image,
  ImageSourcePropType,
  ActivityIndicator,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconSymbol } from '@/components/IconSymbol';
import { colors, typography, spacing } from '@/styles/designSystem';
import { useAuth } from '@/contexts/AuthContext';
import { authenticatedGet } from '@/utils/api';
import { EmptyState } from '@/components/design-system/EmptyState';
import { ErrorState } from '@/components/design-system/ErrorState';

interface OnSaleItem {
  id: string;
  title: string;
  imageUrl: string | null;
  wishlistId: string;
  wishlistName: string;
  currentPrice: number;
  previousPrice: number;
  currency: string;
  percentageChange: number;
  lowestPrice: boolean;
}

function resolveImageSource(source: string | number | ImageSourcePropType | undefined): ImageSourcePropType {
  if (!source) return { uri: '' };
  if (typeof source === 'string') return { uri: source };
  return source as ImageSourcePropType;
}

export default function OnSaleScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [items, setItems] = useState<OnSaleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchOnSaleItems = useCallback(async () => {
    console.log('[OnSaleScreen] Fetching on-sale items');
    try {
      setError(null);
      const data = await authenticatedGet<{ items: OnSaleItem[] }>('/api/items/on-sale');
      console.log('[OnSaleScreen] Fetched on-sale items:', data.items.length);
      setItems(data.items);
    } catch (error: any) {
      console.error('[OnSaleScreen] Error fetching on-sale items:', error);
      setError('Failed to load on-sale items. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchOnSaleItems();
    }
  }, [user, fetchOnSaleItems]);

  const handleRefresh = useCallback(() => {
    console.log('[OnSaleScreen] User pulled to refresh');
    setRefreshing(true);
    fetchOnSaleItems();
  }, [fetchOnSaleItems]);

  const handleItemPress = (item: OnSaleItem) => {
    console.log('[OnSaleScreen] User tapped item:', item.title);
    router.push(`/item/${item.id}`);
  };

  if (loading) {
    return (
      <>
        <Stack.Screen
          options={{
            title: 'On Sale',
            headerBackTitle: 'Back',
          }}
        />
        <SafeAreaView style={styles.container} edges={['bottom']}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.accent} />
            <Text style={styles.loadingText}>Loading deals...</Text>
          </View>
        </SafeAreaView>
      </>
    );
  }

  if (error) {
    return (
      <>
        <Stack.Screen
          options={{
            title: 'On Sale',
            headerBackTitle: 'Back',
          }}
        />
        <SafeAreaView style={styles.container} edges={['bottom']}>
          <ErrorState
            title="Failed to load deals"
            message={error}
            onRetry={fetchOnSaleItems}
          />
        </SafeAreaView>
      </>
    );
  }

  const totalSavingsText = items.length > 0
    ? `${items.length} ${items.length === 1 ? 'item' : 'items'} on sale`
    : '';

  return (
    <>
      <Stack.Screen
        options={{
          title: 'On Sale',
          headerBackTitle: 'Back',
        }}
      />
      <SafeAreaView style={styles.container} edges={['bottom']}>
        {items.length === 0 ? (
          <EmptyState
            icon="local-offer"
            title="No items on sale"
            description="When prices drop on your wishlist items, they'll appear here"
            actionLabel="Browse Wishlists"
            onAction={() => router.push('/(tabs)/wishlists')}
          />
        ) : (
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
            }
          >
            <View style={styles.header}>
              <IconSymbol
                ios_icon_name="tag.fill"
                android_material_icon_name="local-offer"
                size={32}
                color={colors.success}
              />
              <Text style={styles.headerTitle}>Great Deals!</Text>
              <Text style={styles.headerSubtitle}>{totalSavingsText}</Text>
            </View>

            <View style={styles.itemsList}>
              {items.map((item) => {
                const currentPriceText = `${item.currency} ${item.currentPrice.toFixed(2)}`;
                const previousPriceText = `${item.currency} ${item.previousPrice.toFixed(2)}`;
                const percentageText = `${Math.abs(item.percentageChange).toFixed(0)}% off`;
                const savingsAmount = item.previousPrice - item.currentPrice;
                const savingsText = `Save ${item.currency} ${savingsAmount.toFixed(2)}`;

                return (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.itemCard}
                    onPress={() => handleItemPress(item)}
                    activeOpacity={0.7}
                  >
                    {item.lowestPrice && (
                      <View style={styles.lowestPriceBadge}>
                        <IconSymbol
                          ios_icon_name="star.fill"
                          android_material_icon_name="star"
                          size={14}
                          color={colors.warning}
                        />
                        <Text style={styles.lowestPriceText}>Lowest Price</Text>
                      </View>
                    )}

                    <View style={styles.itemContent}>
                      {item.imageUrl ? (
                        <Image
                          source={resolveImageSource(item.imageUrl)}
                          style={styles.itemImage}
                          resizeMode="cover"
                        />
                      ) : (
                        <View style={[styles.itemImage, styles.placeholderImage]}>
                          <IconSymbol
                            ios_icon_name="photo"
                            android_material_icon_name="image"
                            size={32}
                            color={colors.textSecondary}
                          />
                        </View>
                      )}

                      <View style={styles.itemInfo}>
                        <Text style={styles.itemTitle} numberOfLines={2}>{item.title}</Text>
                        <Text style={styles.wishlistName} numberOfLines={1}>{item.wishlistName}</Text>

                        <View style={styles.priceRow}>
                          <View style={styles.priceInfo}>
                            <Text style={styles.currentPrice}>{currentPriceText}</Text>
                            <Text style={styles.previousPrice}>{previousPriceText}</Text>
                          </View>
                          <View style={styles.savingsBadge}>
                            <Text style={styles.percentageText}>{percentageText}</Text>
                            <Text style={styles.savingsText}>{savingsText}</Text>
                          </View>
                        </View>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
        )}
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
  },
  loadingText: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  headerTitle: {
    ...typography.titleLarge,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  headerSubtitle: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
  },
  itemsList: {
    gap: spacing.md,
  },
  itemCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.shadowDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  lowestPriceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.warning + '20',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: spacing.sm,
    gap: 4,
  },
  lowestPriceText: {
    ...typography.bodySmall,
    color: colors.warning,
    fontWeight: '600',
  },
  itemContent: {
    flexDirection: 'row',
  },
  itemImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
    marginRight: spacing.md,
  },
  placeholderImage: {
    backgroundColor: colors.backgroundAlt,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemInfo: {
    flex: 1,
  },
  itemTitle: {
    ...typography.bodyLarge,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  wishlistName: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  priceInfo: {
    gap: 4,
  },
  currentPrice: {
    ...typography.titleSmall,
    color: colors.success,
    fontWeight: '700',
  },
  previousPrice: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    textDecorationLine: 'line-through',
  },
  savingsBadge: {
    backgroundColor: colors.success + '20',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 8,
    alignItems: 'flex-end',
  },
  percentageText: {
    ...typography.bodyMedium,
    color: colors.success,
    fontWeight: '700',
  },
  savingsText: {
    ...typography.bodySmall,
    color: colors.success,
    fontWeight: '600',
  },
});
