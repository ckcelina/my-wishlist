
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Switch,
  Alert,
  RefreshControl,
  Modal,
  Pressable,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconSymbol } from '@/components/IconSymbol';
import { useAuth } from '@/contexts/AuthContext';
import { authenticatedGet, authenticatedPut, authenticatedDelete, authenticatedPost } from '@/utils/api';
import { createColors, createTypography, spacing } from '@/styles/designSystem';
import { useAppTheme } from '@/contexts/ThemeContext';
import { Card } from '@/components/design-system/Card';
import { EmptyState } from '@/components/design-system/EmptyState';

interface PriceAlert {
  id: string;
  itemId: string;
  productId: string;
  itemTitle: string;
  currentPrice: number | null;
  desiredPrice: number | null;
  thresholdPercent: number;
  currency: string;
  enabled: boolean;
  wishlistName: string;
  countryCode: string;
  createdAt: string;
}

export default function PriceAlertsScreen() {
  const router = useRouter();
  const { user, authLoading } = useAuth();
  const { theme } = useAppTheme();
  const colors = createColors(theme);
  const typography = createTypography(theme);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [editingAlertId, setEditingAlertId] = useState<string | null>(null);
  const [editingPrice, setEditingPrice] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);

  const fetchAlerts = useCallback(async () => {
    console.log('[PriceAlerts] Fetching price alerts');
    try {
      const response = await authenticatedGet<PriceAlert[]>('/api/price-alerts');
      
      setAlerts(response);
      console.log('[PriceAlerts] Loaded', response.length, 'alerts');
    } catch (error) {
      console.error('[PriceAlerts] Error fetching alerts:', error);
      Alert.alert('Error', 'Failed to load price alerts');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && !user) {
      console.log('[PriceAlerts] User not authenticated, redirecting to auth');
      router.replace('/auth');
      return;
    }

    if (user) {
      fetchAlerts();
    }
  }, [user, authLoading, fetchAlerts, router]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchAlerts();
  }, [fetchAlerts]);

  const handleToggleAlert = useCallback(async (alertId: string, enabled: boolean) => {
    console.log('[PriceAlerts] Toggling alert:', alertId, enabled);
    
    // Optimistic update
    setAlerts(prev => prev.map(alert => 
      alert.id === alertId ? { ...alert, enabled } : alert
    ));
    
    try {
      await authenticatedPut(`/api/price-alerts/${alertId}`, {
        enabled,
      });
      console.log('[PriceAlerts] Alert toggled successfully');
    } catch (error) {
      console.error('[PriceAlerts] Error toggling alert:', error);
      // Revert optimistic update
      setAlerts(prev => prev.map(alert => 
        alert.id === alertId ? { ...alert, enabled: !enabled } : alert
      ));
      Alert.alert('Error', 'Failed to update alert');
    }
  }, []);

  const handleEditPrice = useCallback((alert: PriceAlert) => {
    console.log('[PriceAlerts] Editing price for alert:', alert.id);
    setEditingAlertId(alert.id);
    setEditingPrice(alert.desiredPrice?.toString() || '');
    setShowEditModal(true);
  }, []);

  const handleSavePrice = useCallback(async () => {
    if (!editingAlertId) return;
    
    console.log('[PriceAlerts] Saving price for alert:', editingAlertId);
    
    const price = editingPrice ? parseFloat(editingPrice) : null;
    if (price !== null && (isNaN(price) || price <= 0)) {
      Alert.alert('Invalid Price', 'Please enter a valid price greater than 0, or leave empty for any drop');
      return;
    }
    
    try {
      await authenticatedPut(`/api/price-alerts/${editingAlertId}`, {
        desiredPrice: price,
      });
      
      // Update local state
      setAlerts(prev => prev.map(alert => 
        alert.id === editingAlertId ? { ...alert, desiredPrice: price } : alert
      ));
      
      setShowEditModal(false);
      setEditingAlertId(null);
      setEditingPrice('');
      console.log('[PriceAlerts] Price saved successfully');
    } catch (error) {
      console.error('[PriceAlerts] Error saving price:', error);
      Alert.alert('Error', 'Failed to save target price');
    }
  }, [editingAlertId, editingPrice]);

  const handleCancelEdit = useCallback(() => {
    setShowEditModal(false);
    setEditingAlertId(null);
    setEditingPrice('');
  }, []);

  const handleDeleteAlert = useCallback(async (alertId: string, itemTitle: string) => {
    console.log('[PriceAlerts] Deleting alert:', alertId);
    
    Alert.alert(
      'Remove Price Alert',
      `Remove price alert for "${itemTitle}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await authenticatedDelete(`/api/price-alerts/${alertId}`);
              
              // Remove from local state
              setAlerts(prev => prev.filter(alert => alert.id !== alertId));
              console.log('[PriceAlerts] Alert deleted successfully');
            } catch (error) {
              console.error('[PriceAlerts] Error deleting alert:', error);
              Alert.alert('Error', 'Failed to remove alert');
            }
          },
        },
      ]
    );
  }, []);

  const handleViewItem = useCallback((itemId: string) => {
    console.log('[PriceAlerts] Viewing item:', itemId);
    router.push(`/item/${itemId}`);
  }, [router]);

  if (authLoading || loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  const currentPriceDisplay = (alert: PriceAlert) => {
    if (alert.currentPrice === null) return 'No price';
    return `${alert.currency} ${alert.currentPrice.toFixed(2)}`;
  };

  const targetPriceDisplay = (alert: PriceAlert) => {
    if (alert.desiredPrice === null) {
      const thresholdText = `Any drop (${alert.thresholdPercent}%)`;
      return thresholdText;
    }
    return `${alert.currency} ${alert.desiredPrice.toFixed(2)}`;
  };

  const isPriceBelowTarget = (alert: PriceAlert) => {
    if (alert.currentPrice === null) return false;
    if (alert.desiredPrice !== null) {
      return alert.currentPrice <= alert.desiredPrice;
    }
    // Check threshold percentage
    return false; // We don't have original price to compare
  };

  const editingAlert = alerts.find(a => a.id === editingAlertId);

  return (
    <React.Fragment>
      <Stack.Screen
        options={{
          title: 'Price Alerts',
          headerShown: true,
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
          {/* Header Info */}
          <View style={[styles.headerCard, { backgroundColor: colors.surface }]}>
            <View style={styles.headerIconContainer}>
              <IconSymbol
                ios_icon_name="bell.badge.fill"
                android_material_icon_name="notifications-active"
                size={32}
                color={colors.accent}
              />
            </View>
            <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
              {alerts.length} {alerts.length === 1 ? 'Alert' : 'Alerts'} Active
            </Text>
            <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
              Get notified when prices drop below your target
            </Text>
          </View>

          {/* Alerts List */}
          {alerts.length === 0 ? (
            <EmptyState
              icon="notifications-off"
              title="No Price Alerts"
              message="Add items to your wishlist and enable price tracking to get started"
              actionLabel="Go to Wishlists"
              onAction={() => router.push('/(tabs)/wishlists')}
            />
          ) : (
            <View style={styles.alertsList}>
              {alerts.map((alert) => {
                const belowTarget = isPriceBelowTarget(alert);
                const currentPrice = currentPriceDisplay(alert);
                const targetPrice = targetPriceDisplay(alert);
                
                return (
                  <Card key={alert.id} style={styles.alertCard}>
                    {/* Alert Header */}
                    <View style={styles.alertHeader}>
                      <View style={styles.alertHeaderLeft}>
                        <TouchableOpacity onPress={() => handleViewItem(alert.itemId)}>
                          <Text style={[styles.alertTitle, { color: colors.textPrimary }]}>
                            {alert.itemTitle}
                          </Text>
                        </TouchableOpacity>
                        <Text style={[styles.alertWishlist, { color: colors.textSecondary }]}>
                          {alert.wishlistName}
                        </Text>
                      </View>
                      <Switch
                        value={alert.enabled}
                        onValueChange={(value) => handleToggleAlert(alert.id, value)}
                        trackColor={{ false: colors.border, true: colors.accent }}
                        thumbColor={colors.surface}
                      />
                    </View>

                    {/* Price Info */}
                    {alert.enabled && (
                      <View style={styles.alertPriceSection}>
                        <View style={styles.priceRow}>
                          <Text style={[styles.priceLabel, { color: colors.textSecondary }]}>
                            Current Price
                          </Text>
                          <Text style={[styles.priceValue, { color: colors.textPrimary }]}>
                            {currentPrice}
                          </Text>
                        </View>

                        <View style={styles.priceRow}>
                          <Text style={[styles.priceLabel, { color: colors.textSecondary }]}>
                            Target Price
                          </Text>
                          <TouchableOpacity
                            style={styles.priceValueContainer}
                            onPress={() => handleEditPrice(alert)}
                          >
                            <Text style={[styles.priceValue, { color: belowTarget ? colors.success : colors.textPrimary }]}>
                              {targetPrice}
                            </Text>
                            <IconSymbol
                              ios_icon_name="pencil"
                              android_material_icon_name="edit"
                              size={14}
                              color={colors.textSecondary}
                            />
                          </TouchableOpacity>
                        </View>

                        {/* Price Drop Badge */}
                        {belowTarget && (
                          <View style={[styles.priceBelowBadge, { backgroundColor: colors.successLight }]}>
                            <IconSymbol
                              ios_icon_name="arrow.down.circle.fill"
                              android_material_icon_name="trending-down"
                              size={16}
                              color={colors.success}
                            />
                            <Text style={[styles.priceBelowText, { color: colors.success }]}>
                              Price is below your target!
                            </Text>
                          </View>
                        )}
                      </View>
                    )}

                    {/* Actions */}
                    <View style={styles.alertActions}>
                      <TouchableOpacity
                        style={[styles.alertActionButton, { backgroundColor: colors.background }]}
                        onPress={() => handleViewItem(alert.itemId)}
                      >
                        <IconSymbol
                          ios_icon_name="eye"
                          android_material_icon_name="visibility"
                          size={16}
                          color={colors.textPrimary}
                        />
                        <Text style={[styles.alertActionText, { color: colors.textPrimary }]}>
                          View Item
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.alertActionButton, { backgroundColor: colors.background }]}
                        onPress={() => handleDeleteAlert(alert.id, alert.itemTitle)}
                      >
                        <IconSymbol
                          ios_icon_name="trash"
                          android_material_icon_name="delete"
                          size={16}
                          color={colors.error}
                        />
                        <Text style={[styles.alertActionText, { color: colors.error }]}>
                          Remove
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </Card>
                );
              })}
            </View>
          )}
        </ScrollView>

        {/* Edit Price Modal */}
        <Modal
          visible={showEditModal}
          transparent
          animationType="fade"
          onRequestClose={handleCancelEdit}
        >
          <Pressable style={styles.modalOverlay} onPress={handleCancelEdit}>
            <Pressable style={[styles.editModalContent, { backgroundColor: colors.surface }]} onPress={(e) => e.stopPropagation()}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Set Target Price</Text>
              <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
                {editingAlert?.itemTitle}
              </Text>
              
              <View style={styles.targetPriceInputContainer}>
                <Text style={[styles.targetPriceLabel, { color: colors.textSecondary }]}>
                  Target Price (optional)
                </Text>
                <View style={styles.targetPriceInputRow}>
                  <TextInput
                    style={[styles.targetPriceInput, { backgroundColor: colors.background, color: colors.textPrimary, borderColor: colors.border }]}
                    value={editingPrice}
                    onChangeText={setEditingPrice}
                    placeholder="0.00"
                    placeholderTextColor={colors.textTertiary}
                    keyboardType="decimal-pad"
                    autoFocus
                  />
                  <Text style={[styles.targetPriceCurrency, { color: colors.textPrimary }]}>
                    {editingAlert?.currency || 'USD'}
                  </Text>
                </View>
                <Text style={[styles.targetPriceHint, { color: colors.textTertiary }]}>
                  Leave empty to be notified of any price drop ({editingAlert?.thresholdPercent || 10}% threshold)
                </Text>
              </View>
              
              <View style={styles.editModalActions}>
                <TouchableOpacity
                  style={[styles.editModalButton, { backgroundColor: colors.background, borderColor: colors.border }]}
                  onPress={handleCancelEdit}
                >
                  <Text style={[styles.editModalButtonText, { color: colors.textPrimary }]}>
                    Cancel
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.editModalButton, styles.editModalButtonPrimary, { backgroundColor: colors.accent }]}
                  onPress={handleSavePrice}
                >
                  <Text style={[styles.editModalButtonText, { color: colors.textInverse }]}>
                    Save
                  </Text>
                </TouchableOpacity>
              </View>
            </Pressable>
          </Pressable>
        </Modal>
      </SafeAreaView>
    </React.Fragment>
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
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
  },
  headerCard: {
    padding: spacing.lg,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  headerIconContainer: {
    marginBottom: spacing.md,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  headerSubtitle: {
    fontSize: 14,
    textAlign: 'center',
  },
  alertsList: {
    gap: spacing.md,
  },
  alertCard: {
    padding: spacing.md,
  },
  alertHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  alertHeaderLeft: {
    flex: 1,
    marginRight: spacing.md,
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: spacing.xs / 2,
  },
  alertWishlist: {
    fontSize: 12,
  },
  alertPriceSection: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceLabel: {
    fontSize: 14,
  },
  priceValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  priceValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  priceBelowBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    padding: spacing.sm,
    borderRadius: 8,
  },
  priceBelowText: {
    fontSize: 12,
    fontWeight: '600',
  },
  alertActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  alertActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    padding: spacing.sm,
    borderRadius: 8,
  },
  alertActionText: {
    fontSize: 14,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editModalContent: {
    borderRadius: 16,
    padding: spacing.lg,
    marginHorizontal: spacing.lg,
    maxWidth: 400,
    width: '90%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  modalSubtitle: {
    fontSize: 14,
    marginBottom: spacing.md,
  },
  targetPriceInputContainer: {
    marginVertical: spacing.md,
  },
  targetPriceLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: spacing.xs,
  },
  targetPriceInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  targetPriceInput: {
    flex: 1,
    borderRadius: 8,
    padding: spacing.sm,
    fontSize: 16,
    borderWidth: 1,
  },
  targetPriceCurrency: {
    fontSize: 16,
    fontWeight: '600',
  },
  targetPriceHint: {
    fontSize: 12,
    marginTop: spacing.xs,
    fontStyle: 'italic',
  },
  editModalActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  editModalButton: {
    flex: 1,
    padding: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  editModalButtonPrimary: {
    borderWidth: 0,
  },
  editModalButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
