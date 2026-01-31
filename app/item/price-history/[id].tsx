
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { IconSymbol } from '@/components/IconSymbol';
import { colors, typography, spacing } from '@/styles/designSystem';
import { useAuth } from '@/contexts/AuthContext';
import { authenticatedGet } from '@/utils/api';
import { Card } from '@/components/design-system/Card';
import { Divider } from '@/components/design-system/Divider';

interface PriceHistoryEntry {
  id: string;
  price: number;
  currency: string;
  recordedAt: string;
}

interface PriceTrend {
  lowestPrice: number | null;
  highestPrice: number | null;
  firstPrice: number | null;
  latestPrice: number | null;
  currency: string;
}

interface PriceHistoryData {
  trend: PriceTrend;
  history: PriceHistoryEntry[];
}

export default function PriceHistoryScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<PriceHistoryData | null>(null);
  const [itemTitle, setItemTitle] = useState<string>('');

  const fetchPriceHistory = useCallback(async () => {
    console.log('[PriceHistoryScreen] Fetching price history for item:', id);
    try {
      setLoading(true);
      const historyData = await authenticatedGet<PriceHistoryData>(`/api/items/${id}/price-history`);
      setData(historyData);
      
      // Fetch item title
      const itemData = await authenticatedGet<{ title: string }>(`/api/items/${id}`);
      setItemTitle(itemData.title);
      
      console.log('[PriceHistoryScreen] Price history loaded:', historyData.history.length, 'entries');
    } catch (error) {
      console.error('[PriceHistoryScreen] Error fetching price history:', error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id && user) {
      fetchPriceHistory();
    }
  }, [id, user, fetchPriceHistory]);

  if (loading || !data) {
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
            <Text style={styles.loadingText}>Loading...</Text>
          </View>
        </SafeAreaView>
      </>
    );
  }

  const trendData = data.trend;
  const historyEntries = data.history;

  const lowestPriceText = trendData.lowestPrice !== null 
    ? `${trendData.currency} ${trendData.lowestPrice.toFixed(2)}` 
    : 'N/A';
  
  const highestPriceText = trendData.highestPrice !== null 
    ? `${trendData.currency} ${trendData.highestPrice.toFixed(2)}` 
    : 'N/A';
  
  const firstPriceText = trendData.firstPrice !== null 
    ? `${trendData.currency} ${trendData.firstPrice.toFixed(2)}` 
    : 'N/A';
  
  const latestPriceText = trendData.latestPrice !== null 
    ? `${trendData.currency} ${trendData.latestPrice.toFixed(2)}` 
    : 'N/A';

  const priceChange = trendData.firstPrice !== null && trendData.latestPrice !== null
    ? trendData.latestPrice - trendData.firstPrice
    : null;

  const priceChangePercent = trendData.firstPrice !== null && priceChange !== null && trendData.firstPrice !== 0
    ? ((priceChange / trendData.firstPrice) * 100)
    : null;

  const priceChangeText = priceChange !== null
    ? `${priceChange >= 0 ? '+' : ''}${trendData.currency} ${Math.abs(priceChange).toFixed(2)}`
    : 'N/A';

  const priceChangePercentText = priceChangePercent !== null
    ? `${priceChangePercent >= 0 ? '+' : ''}${priceChangePercent.toFixed(1)}%`
    : '';

  const priceChangeColor = priceChange !== null && priceChange < 0 ? '#10B981' : priceChange !== null && priceChange > 0 ? '#EF4444' : colors.text;

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
        <ScrollView style={styles.scrollContent}>
          {/* Item Title */}
          <View style={styles.headerSection}>
            <Text style={styles.itemTitle}>{itemTitle}</Text>
          </View>

          {/* Price Trend Summary */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Price Trend</Text>
            <Card>
              <View style={styles.trendRow}>
                <View style={styles.trendItem}>
                  <Text style={styles.trendLabel}>Current Price</Text>
                  <Text style={styles.trendValue}>{latestPriceText}</Text>
                </View>
                <View style={styles.trendItem}>
                  <Text style={styles.trendLabel}>Change</Text>
                  <Text style={[styles.trendValue, { color: priceChangeColor }]}>
                    {priceChangeText}
                  </Text>
                  {priceChangePercentText && (
                    <Text style={[styles.trendSubtext, { color: priceChangeColor }]}>
                      {priceChangePercentText}
                    </Text>
                  )}
                </View>
              </View>

              <Divider />

              <View style={styles.trendRow}>
                <View style={styles.trendItem}>
                  <Text style={styles.trendLabel}>Lowest Price</Text>
                  <Text style={[styles.trendValue, styles.lowestPrice]}>
                    {lowestPriceText}
                  </Text>
                </View>
                <View style={styles.trendItem}>
                  <Text style={styles.trendLabel}>Highest Price</Text>
                  <Text style={styles.trendValue}>{highestPriceText}</Text>
                </View>
              </View>
            </Card>
          </View>

          {/* Price History Chart Placeholder */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Price Chart</Text>
            <Card>
              <View style={styles.chartPlaceholder}>
                <IconSymbol
                  ios_icon_name="chart.line.uptrend.xyaxis"
                  android_material_icon_name="trending-up"
                  size={48}
                  color={colors.textSecondary}
                />
                <Text style={styles.chartPlaceholderText}>
                  Price chart visualization coming soon
                </Text>
              </View>
            </Card>
          </View>

          {/* Price History List */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Price History</Text>
            {historyEntries.length === 0 ? (
              <Card>
                <View style={styles.emptyState}>
                  <IconSymbol
                    ios_icon_name="clock"
                    android_material_icon_name="schedule"
                    size={48}
                    color={colors.textSecondary}
                  />
                  <Text style={styles.emptyStateText}>No price history yet</Text>
                </View>
              </Card>
            ) : (
              <View style={styles.historyList}>
                {historyEntries.map((entry, index) => {
                  const entryPriceText = `${entry.currency} ${entry.price.toFixed(2)}`;
                  const entryDate = new Date(entry.recordedAt);
                  const entryDateText = entryDate.toLocaleDateString([], {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  });
                  const entryTimeText = entryDate.toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  });

                  return (
                    <Card key={entry.id}>
                      <View style={styles.historyItem}>
                        <View style={styles.historyItemLeft}>
                          <Text style={styles.historyPrice}>{entryPriceText}</Text>
                          <Text style={styles.historyTime}>{entryTimeText}</Text>
                        </View>
                        <Text style={styles.historyDate}>{entryDateText}</Text>
                      </View>
                    </Card>
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
    ...typography.body,
    color: colors.textSecondary,
  },
  scrollContent: {
    flex: 1,
    padding: spacing.lg,
  },
  headerSection: {
    marginBottom: spacing.lg,
  },
  itemTitle: {
    ...typography.h2,
    color: colors.text,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.md,
  },
  trendRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: spacing.md,
  },
  trendItem: {
    alignItems: 'center',
    flex: 1,
  },
  trendLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.xs / 2,
  },
  trendValue: {
    ...typography.h3,
    color: colors.text,
    fontWeight: '700',
  },
  trendSubtext: {
    ...typography.caption,
    marginTop: spacing.xs / 2,
  },
  lowestPrice: {
    color: '#10B981',
  },
  chartPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl * 2,
    gap: spacing.md,
  },
  chartPlaceholderText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  historyList: {
    gap: spacing.sm,
  },
  historyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  historyItemLeft: {
    gap: spacing.xs / 2,
  },
  historyPrice: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },
  historyTime: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  historyDate: {
    ...typography.body,
    color: colors.textSecondary,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xl * 2,
    gap: spacing.md,
  },
  emptyStateText: {
    ...typography.body,
    color: colors.textSecondary,
  },
});
