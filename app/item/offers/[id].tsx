
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import { IconSymbol } from '@/components/IconSymbol';
import { useAuth } from '@/contexts/AuthContext';
import { useAppTheme } from '@/contexts/ThemeContext';
import { createColors, createTypography, spacing } from '@/styles/designSystem';

interface PriceOffer {
  id: string;
  storeName: string;
  storeDomain: string;
  productUrl: string;
  price: number;
  currency: string;
  originalPrice?: number;
  originalCurrency?: string;
  normalizedPrice?: number;
  normalizedCurrency?: string;
  shippingCost?: number;
  deliveryTime?: string;
  availability: 'in_stock' | 'out_of_stock' | 'limited_stock' | 'unknown';
  confidenceScore?: number;
  createdAt: string;
}

interface ItemInfo {
  id: string;
  title: string;
  imageUrl: string | null;
  currentPrice: number | null;
  currency: string;
}

type SortOption = 'lowest_price' | 'fastest_shipping' | 'newest';

export default function ItemOffersScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { user } = useAuth();
  const { theme } = useAppTheme();
  const colors = createColors(theme);
  const typography = createTypography(theme);

  const [item, setItem] = useState<ItemInfo | null>(null);
  const [offers, setOffers] = useState<PriceOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('lowest_price');

  const fetchItemAndOffers = useCallback(async () => {
    console.log('[ItemOffersScreen] Fetching item and offers');
    try {
      const { authenticatedGet } = await import('@/utils/api');
      
      // Fetch item details
      const itemData = await authenticatedGet<ItemInfo>(`/api/items/${id}`);
      setItem(itemData);
      
      // Fetch offers
      const offersData = await authenticatedGet<{ offers: PriceOffer[] }>(`/api/items/${id}/offers`);
      setOffers(offersData.offers || []);
      
      console.log('[ItemOffersScreen] Loaded', offersData.offers?.length || 0, 'offers');
    } catch (error) {
      console.error('[ItemOffersScreen] Error fetching data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => {
    if (id && user) {
      fetchItemAndOffers();
    }
  }, [id, user, fetchItemAndOffers]);

  const handleRefresh = () => {
    console.log('[ItemOffersScreen] Refreshing offers');
    setRefreshing(true);
    fetchItemAndOffers();
  };

  const handleOpenOffer = async (offer: PriceOffer) => {
    console.log('[ItemOffersScreen] Opening offer:', offer.storeName);
    const { openStoreLink } = await import('@/utils/openStoreLink');
    await openStoreLink(offer.productUrl, {
      source: 'item_offers',
      storeDomain: offer.storeDomain,
      itemId: id as string,
      itemTitle: item?.title,
    });
  };

  const sortedOffers = useMemo(() => {
    const sorted = [...offers];
    
    switch (sortBy) {
      case 'lowest_price':
        sorted.sort((a, b) => {
          const priceA = a.normalizedPrice || a.price;
          const priceB = b.normalizedPrice || b.price;
          return priceA - priceB;
        });
        break;
      case 'fastest_shipping':
        sorted.sort((a, b) => {
          if (!a.deliveryTime && !b.deliveryTime) return 0;
          if (!a.deliveryTime) return 1;
          if (!b.deliveryTime) return -1;
          return a.deliveryTime.localeCompare(b.deliveryTime);
        });
        break;
      case 'newest':
        sorted.sort((a, b) => {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
        break;
    }
    
    return sorted;
  }, [offers, sortBy]);

  const lowestOffer = useMemo(() => {
    if (offers.length === 0) return null;
    return offers.reduce((lowest, offer) => {
      const price = offer.normalizedPrice || offer.price;
      const lowestPrice = lowest.normalizedPrice || lowest.price;
      return price < lowestPrice ? offer : lowest;
    });
  }, [offers]);

  if (loading) {
    return (
      <>
        <Stack.Screen
          options={{
            title: 'Price Offers',
            headerBackTitle: 'Back',
          }}
        />
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.accent} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading offers...</Text>
          </View>
        </SafeAreaView>
      </>
    );
  }

  const itemTitle = item?.title || 'Item';
  const sortOptions: { value: SortOption; label: string; icon: string }[] = [
    { value: 'lowest_price', label: 'Lowest Price', icon: 'arrow-downward' },
    { value: 'fastest_shipping', label: 'Fastest Shipping', icon: 'local-shipping' },
    { value: 'newest', label: 'Newest', icon: 'schedule' },
  ];

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Price Offers',
          headerBackTitle: 'Back',
        }}
      />
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.accent}
            />
          }
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.itemTitle, { color: colors.textPrimary }]} numberOfLines={2}>
              {itemTitle}
            </Text>
            <Text style={[styles.offerCount, { color: colors.textSecondary }]}>
              {offers.length} {offers.length === 1 ? 'offer' : 'offers'} found
            </Text>
          </View>

          {/* Lowest Price Badge */}
          {lowestOffer && (
            <View style={[styles.lowestPriceBadge, { backgroundColor: colors.successLight, borderColor: colors.success }]}>
              <IconSymbol
                ios_icon_name="star.fill"
                android_material_icon_name="star"
                size={20}
                color={colors.success}
              />
              <Text style={[styles.lowestPriceText, { color: colors.success }]}>
                Lowest price: {lowestOffer.currency} {lowestOffer.price.toFixed(2)} at {lowestOffer.storeName}
              </Text>
            </View>
          )}

          {/* Sort Options */}
          <View style={styles.sortSection}>
            <Text style={[styles.sortLabel, { color: colors.textSecondary }]}>Sort by:</Text>
            <View style={styles.sortButtons}>
              {sortOptions.map((option) => {
                const isSelected = sortBy === option.value;
                return (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.sortButton,
                      { 
                        backgroundColor: isSelected ? colors.accent : colors.surface,
                        borderColor: isSelected ? colors.accent : colors.border,
                      },
                    ]}
                    onPress={() => setSortBy(option.value)}
                  >
                    <IconSymbol
                      ios_icon_name={option.icon}
                      android_material_icon_name={option.icon}
                      size={16}
                      color={isSelected ? colors.textInverse : colors.textPrimary}
                    />
                    <Text
                      style={[
                        styles.sortButtonText,
                        { color: isSelected ? colors.textInverse : colors.textPrimary },
                      ]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Offers List */}
          {sortedOffers.length === 0 ? (
            <View style={styles.emptyState}>
              <IconSymbol
                ios_icon_name="magnifyingglass"
                android_material_icon_name="search"
                size={48}
                color={colors.textTertiary}
              />
              <Text style={[styles.emptyStateText, { color: colors.textSecondary }]}>
                No offers available
              </Text>
              <Text style={[styles.emptyStateSubtext, { color: colors.textTertiary }]}>
                Try searching for prices again
              </Text>
            </View>
          ) : (
            <View style={styles.offersList}>
              {sortedOffers.map((offer, index) => {
                const isLowest = lowestOffer?.id === offer.id;
                const priceText = `${offer.currency} ${offer.price.toFixed(2)}`;
                const hasShipping = offer.shippingCost !== undefined && offer.shippingCost !== null;
                const shippingText = hasShipping
                  ? offer.shippingCost === 0
                    ? 'Free shipping'
                    : `+${offer.currency} ${offer.shippingCost.toFixed(2)} shipping`
                  : null;
                const totalPrice = offer.price + (offer.shippingCost || 0);
                const totalPriceText = hasShipping ? `Total: ${offer.currency} ${totalPrice.toFixed(2)}` : null;

                return (
                  <TouchableOpacity
                    key={offer.id}
                    style={[
                      styles.offerCard,
                      {
                        backgroundColor: colors.surface,
                        borderColor: isLowest ? colors.success : colors.border,
                        borderWidth: isLowest ? 2 : 1,
                      },
                    ]}
                    onPress={() => handleOpenOffer(offer)}
                    activeOpacity={0.7}
                  >
                    {isLowest && (
                      <View style={[styles.lowestBadge, { backgroundColor: colors.success }]}>
                        <IconSymbol
                          ios_icon_name="star.fill"
                          android_material_icon_name="star"
                          size={12}
                          color={colors.textInverse}
                        />
                        <Text style={[styles.lowestBadgeText, { color: colors.textInverse }]}>
                          Best Price
                        </Text>
                      </View>
                    )}

                    <View style={styles.offerCardContent}>
                      <View style={styles.offerLeft}>
                        <Text style={[styles.offerStoreName, { color: colors.textPrimary }]}>
                          {offer.storeName}
                        </Text>
                        <Text style={[styles.offerDomain, { color: colors.textSecondary }]}>
                          {offer.storeDomain}
                        </Text>

                        {shippingText && (
                          <View style={styles.offerDetailRow}>
                            <IconSymbol
                              ios_icon_name="shippingbox"
                              android_material_icon_name="local-shipping"
                              size={14}
                              color={colors.textTertiary}
                            />
                            <Text style={[styles.offerDetailText, { color: colors.textTertiary }]}>
                              {shippingText}
                            </Text>
                          </View>
                        )}

                        {offer.deliveryTime && (
                          <View style={styles.offerDetailRow}>
                            <IconSymbol
                              ios_icon_name="clock"
                              android_material_icon_name="schedule"
                              size={14}
                              color={colors.textTertiary}
                            />
                            <Text style={[styles.offerDetailText, { color: colors.textTertiary }]}>
                              {offer.deliveryTime}
                            </Text>
                          </View>
                        )}

                        {offer.availability !== 'in_stock' && (
                          <View style={styles.offerDetailRow}>
                            <IconSymbol
                              ios_icon_name="exclamationmark.triangle"
                              android_material_icon_name="warning"
                              size={14}
                              color={colors.warning}
                            />
                            <Text style={[styles.offerDetailText, { color: colors.warning }]}>
                              {offer.availability === 'out_of_stock'
                                ? 'Out of stock'
                                : offer.availability === 'limited_stock'
                                ? 'Limited stock'
                                : 'Availability unknown'}
                            </Text>
                          </View>
                        )}
                      </View>

                      <View style={styles.offerRight}>
                        <Text style={[styles.offerPrice, { color: colors.accent }]}>
                          {priceText}
                        </Text>
                        {totalPriceText && (
                          <Text style={[styles.offerTotalPrice, { color: colors.textSecondary }]}>
                            {totalPriceText}
                          </Text>
                        )}
                        <IconSymbol
                          ios_icon_name="arrow.up.forward"
                          android_material_icon_name="open-in-new"
                          size={18}
                          color={colors.accent}
                        />
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
  },
  loadingText: {
    fontSize: 16,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
  },
  header: {
    marginBottom: spacing.lg,
  },
  itemTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  offerCount: {
    fontSize: 14,
  },
  lowestPriceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    padding: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: spacing.lg,
  },
  lowestPriceText: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  sortSection: {
    marginBottom: spacing.lg,
  },
  sortLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: spacing.sm,
  },
  sortButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 20,
    borderWidth: 1,
  },
  sortButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  offersList: {
    gap: spacing.md,
  },
  offerCard: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  lowestBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs / 2,
    paddingVertical: spacing.xs / 2,
    paddingHorizontal: spacing.sm,
  },
  lowestBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  offerCardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: spacing.md,
  },
  offerLeft: {
    flex: 1,
    gap: spacing.xs,
  },
  offerStoreName: {
    fontSize: 16,
    fontWeight: '600',
  },
  offerDomain: {
    fontSize: 13,
  },
  offerDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs / 2,
  },
  offerDetailText: {
    fontSize: 12,
  },
  offerRight: {
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  offerPrice: {
    fontSize: 18,
    fontWeight: '700',
  },
  offerTotalPrice: {
    fontSize: 12,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xl * 2,
    gap: spacing.md,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
  },
  emptyStateSubtext: {
    fontSize: 14,
  },
});
