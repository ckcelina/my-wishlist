
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, Stack } from 'expo-router';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { useAuth } from '@/contexts/AuthContext';

interface PriceHistoryEntry {
  id: string;
  price: number;
  currency: string;
  recordedAt: string;
}

interface PriceTrendSummary {
  lowestPrice: number | null;
  highestPrice: number | null;
  firstRecordedPrice: number | null;
  latestRecordedPrice: number | null;
  currency: string;
}

export default function PriceHistoryScreen() {
  const { id } = useLocalSearchParams();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [priceHistory, setPriceHistory] = useState<PriceHistoryEntry[]>([]);
  const [itemTitle, setItemTitle] = useState<string>('');
  const [summary, setSummary] = useState<PriceTrendSummary | null>(null);

  const fetchPriceHistory = useCallback(async () => {
    console.log('PriceHistoryScreen: Fetching price history for item:', id);
    try {
      setLoading(true);
      const { authenticatedGet } = await import('@/utils/api');
      
      // Fetch item details to get title
      const itemData = await authenticatedGet<{ title: string; currency: string }>(`/api/items/${id}`);
      setItemTitle(itemData.title);
      
      // Fetch price history with trend summary from new endpoint
      const priceHistoryData = await authenticatedGet<{
        trend: {
          lowestPrice: number | null;
          highestPrice: number | null;
          firstPrice: number | null;
          latestPrice: number | null;
          currency: string;
        };
        history: PriceHistoryEntry[];
      }>(`/api/items/${id}/price-history`);
      
      console.log('PriceHistoryScreen: Fetched', priceHistoryData.history.length, 'price history entries');
      
      // Sort by newest first (already sorted by backend, but ensure it)
      const sortedHistory = [...priceHistoryData.history].sort((a, b) => 
        new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime()
      );
      setPriceHistory(sortedHistory);
      
      // Use the trend summary from the backend
      if (priceHistoryData.trend) {
        setSummary({
          lowestPrice: priceHistoryData.trend.lowestPrice,
          highestPrice: priceHistoryData.trend.highestPrice,
          firstRecordedPrice: priceHistoryData.trend.firstPrice,
          latestRecordedPrice: priceHistoryData.trend.latestPrice,
          currency: priceHistoryData.trend.currency,
        });
      }
    } catch (error) {
      console.error('PriceHistoryScreen: Error fetching price history:', error);
      Alert.alert('Error', 'Failed to load price history');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    console.log('PriceHistoryScreen: Component mounted, item ID:', id);
    if (id) {
      fetchPriceHistory();
    }
  }, [id, fetchPriceHistory]);

  if (loading) {
    return (
      <>
        <Stack.Screen
          options={{
            headerShown: true,
            title: 'Price History',
            headerBackTitle: 'Back',
          }}
        />
        <SafeAreaView style={styles.container}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Loading price history...</Text>
          </View>
        </SafeAreaView>
      </>
    );
  }

  const formatPrice = (price: number, currency: string) => {
    return `${currency} ${price.toFixed(2)}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString([], { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    const dateText = date.toLocaleDateString([], { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
    const timeText = date.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
    return `${dateText} at ${timeText}`;
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Price History',
          headerBackTitle: 'Back',
        }}
      />
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          {/* Item Title */}
          {itemTitle && (
            <View style={styles.titleSection}>
              <Text style={styles.itemTitle}>{itemTitle}</Text>
            </View>
          )}

          {/* Price Trend Summary */}
          {summary && (
            <View style={styles.summarySection}>
              <View style={styles.summaryHeader}>
                <IconSymbol
                  ios_icon_name="chart.line.uptrend.xyaxis"
                  android_material_icon_name="trending-up"
                  size={24}
                  color={colors.primary}
                />
                <Text style={styles.summaryTitle}>Price Trend</Text>
              </View>

              <View style={styles.summaryGrid}>
                {/* Lowest Price */}
                <View style={styles.summaryCard}>
                  <View style={styles.summaryCardHeader}>
                    <IconSymbol
                      ios_icon_name="arrow.down.circle.fill"
                      android_material_icon_name="arrow-downward"
                      size={20}
                      color="#10B981"
                    />
                    <Text style={styles.summaryCardLabel}>Lowest Price</Text>
                  </View>
                  <Text style={styles.summaryCardValue}>
                    {summary.lowestPrice !== null 
                      ? formatPrice(summary.lowestPrice, summary.currency)
                      : 'N/A'}
                  </Text>
                </View>

                {/* Highest Price */}
                <View style={styles.summaryCard}>
                  <View style={styles.summaryCardHeader}>
                    <IconSymbol
                      ios_icon_name="arrow.up.circle.fill"
                      android_material_icon_name="arrow-upward"
                      size={20}
                      color="#EF4444"
                    />
                    <Text style={styles.summaryCardLabel}>Highest Price</Text>
                  </View>
                  <Text style={styles.summaryCardValue}>
                    {summary.highestPrice !== null 
                      ? formatPrice(summary.highestPrice, summary.currency)
                      : 'N/A'}
                  </Text>
                </View>

                {/* First Recorded Price */}
                <View style={styles.summaryCard}>
                  <View style={styles.summaryCardHeader}>
                    <IconSymbol
                      ios_icon_name="clock.fill"
                      android_material_icon_name="schedule"
                      size={20}
                      color={colors.primary}
                    />
                    <Text style={styles.summaryCardLabel}>First Recorded</Text>
                  </View>
                  <Text style={styles.summaryCardValue}>
                    {summary.firstRecordedPrice !== null 
                      ? formatPrice(summary.firstRecordedPrice, summary.currency)
                      : 'N/A'}
                  </Text>
                </View>

                {/* Latest Recorded Price */}
                <View style={styles.summaryCard}>
                  <View style={styles.summaryCardHeader}>
                    <IconSymbol
                      ios_icon_name="clock.badge.checkmark.fill"
                      android_material_icon_name="check-circle"
                      size={20}
                      color={colors.primary}
                    />
                    <Text style={styles.summaryCardLabel}>Latest Price</Text>
                  </View>
                  <Text style={styles.summaryCardValue}>
                    {summary.latestRecordedPrice !== null 
                      ? formatPrice(summary.latestRecordedPrice, summary.currency)
                      : 'N/A'}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Price History List */}
          <View style={styles.historySection}>
            <View style={styles.historyHeader}>
              <Text style={styles.historyTitle}>Price History</Text>
              <Text style={styles.historyCount}>
                {priceHistory.length}
                {priceHistory.length === 1 ? ' entry' : ' entries'}
              </Text>
            </View>

            {priceHistory.length === 0 ? (
              <View style={styles.emptyState}>
                <IconSymbol
                  ios_icon_name="chart.line.uptrend.xyaxis"
                  android_material_icon_name="trending-up"
                  size={48}
                  color={colors.textSecondary}
                />
                <Text style={styles.emptyStateText}>No price history yet</Text>
                <Text style={styles.emptyStateSubtext}>
                  Price history will appear here after price checks
                </Text>
              </View>
            ) : (
              <View style={styles.historyList}>
                {priceHistory.map((entry, index) => {
                  const priceText = formatPrice(entry.price, entry.currency);
                  const dateText = formatDate(entry.recordedAt);
                  const timeText = formatTime(entry.recordedAt);
                  
                  // Determine if price went up or down compared to previous entry
                  let priceChange = null;
                  if (index < priceHistory.length - 1) {
                    const previousPrice = priceHistory[index + 1].price;
                    if (entry.price < previousPrice) {
                      priceChange = 'down';
                    } else if (entry.price > previousPrice) {
                      priceChange = 'up';
                    }
                  }
                  
                  return (
                    <View key={entry.id} style={styles.historyItem}>
                      <View style={styles.historyItemLeft}>
                        <View style={styles.priceRow}>
                          <Text style={styles.historyPrice}>{priceText}</Text>
                          {priceChange === 'down' && (
                            <View style={styles.priceChangeBadge}>
                              <IconSymbol
                                ios_icon_name="arrow.down"
                                android_material_icon_name="arrow-downward"
                                size={12}
                                color="#10B981"
                              />
                            </View>
                          )}
                          {priceChange === 'up' && (
                            <View style={[styles.priceChangeBadge, styles.priceChangeBadgeUp]}>
                              <IconSymbol
                                ios_icon_name="arrow.up"
                                android_material_icon_name="arrow-upward"
                                size={12}
                                color="#EF4444"
                              />
                            </View>
                          )}
                        </View>
                        <Text style={styles.historyTime}>{timeText}</Text>
                      </View>
                      <Text style={styles.historyDate}>{dateText}</Text>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        </ScrollView>
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
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  titleSection: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
  },
  itemTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
  },
  summarySection: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  summaryTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: colors.card,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  summaryCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  summaryCardLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  summaryCardValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  historySection: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  historyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  historyCount: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  emptyStateText: {
    fontSize: 16,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  historyList: {
    gap: 12,
  },
  historyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.card,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  historyItemLeft: {
    gap: 4,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  historyPrice: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  priceChangeBadge: {
    backgroundColor: '#D1FAE5',
    borderRadius: 12,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  priceChangeBadgeUp: {
    backgroundColor: '#FEE2E2',
  },
  historyTime: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  historyDate: {
    fontSize: 14,
    color: colors.textSecondary,
  },
});
