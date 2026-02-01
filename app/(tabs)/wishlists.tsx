
import { Button } from '@/components/design-system/Button';
import { ConfirmDialog } from '@/components/design-system/ConfirmDialog';
import { getCachedData, setCachedData } from '@/utils/cache';
import { useAuth } from '@/contexts/AuthContext';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { ListItemSkeleton } from '@/components/design-system/LoadingSkeleton';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { createColors, createTypography, spacing } from '@/styles/designSystem';
import { supabase } from '@/lib/supabase';
import { getWishlistWithItemCount, createWishlist, updateWishlist, deleteWishlist } from '@/lib/supabase-helpers';
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'expo-router';
import { OfflineNotice } from '@/components/design-system/OfflineNotice';
import { ErrorState } from '@/components/design-system/ErrorState';
import { Logo } from '@/components/Logo';
import { IconSymbol } from '@/components/IconSymbol';
import { Card } from '@/components/design-system/Card';
import { useAppTheme } from '@/contexts/ThemeContext';
import { dedupeById } from '@/utils/deduplication';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  RefreshControl,
  Platform,
  Modal,
  Pressable,
  Switch,
} from 'react-native';
import { EmptyState } from '@/components/design-system/EmptyState';

interface Wishlist {
  id: string;
  name: string;
  isDefault: boolean;
  itemCount: number;
  createdAt: string;
  updatedAt: string;
}

const PAGE_SIZE = 20;
const TAB_BAR_HEIGHT = 80; // FloatingTabBar height

export default function WishlistsScreen() {
  const [wishlists, setWishlists] = useState<Wishlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initializing, setInitializing] = useState(false);

  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [renameModalVisible, setRenameModalVisible] = useState(false);
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, right: 0 });
  const [selectedWishlist, setSelectedWishlist] = useState<Wishlist | null>(null);
  const [newWishlistName, setNewWishlistName] = useState('');
  const [renameWishlistName, setRenameWishlistName] = useState('');
  const [setAsDefault, setSetAsDefault] = useState(false); // New state for "Set as default" toggle

  const { user } = useAuth();
  const router = useRouter();
  const { isConnected } = useNetworkStatus();
  const { theme } = useAppTheme();
  const insets = useSafeAreaInsets();
  
  const colors = useMemo(() => createColors(theme), [theme]);
  const typography = useMemo(() => createTypography(theme), [theme]);

  // Refs to prevent duplicate subscriptions and fetches
  const subscriptionRef = useRef<any>(null);
  const isFetchingRef = useRef(false);
  const hasInitializedRef = useRef(false);
  const realtimeDebounceRef = useRef<NodeJS.Timeout | null>(null);

  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.lg,
      paddingBottom: spacing.md,
    },
    headerTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.md,
    },
    logo: {
      width: 120,
      height: 40,
    },
    title: {
      ...typography.h1,
      color: colors.textPrimary,
      marginBottom: spacing.xs,
    },
    subtitle: {
      ...typography.body,
      color: colors.textSecondary,
    },
    list: {
      flex: 1,
    },
    listContent: {
      flexGrow: 1,
      paddingHorizontal: spacing.lg,
      paddingBottom: insets.bottom + TAB_BAR_HEIGHT + spacing.xl,
    },
    wishlistCard: {
      marginBottom: spacing.md,
    },
    wishlistContent: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    wishlistLeft: {
      flex: 1,
    },
    wishlistName: {
      ...typography.h3,
      color: colors.textPrimary,
      marginBottom: spacing.xs,
    },
    wishlistMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    wishlistMetaText: {
      ...typography.caption,
      color: colors.textSecondary,
    },
    wishlistRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    defaultBadge: {
      backgroundColor: colors.accent,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      borderRadius: 6,
    },
    defaultBadgeText: {
      fontSize: 11,
      fontWeight: '600',
      color: '#FFFFFF',
    },
    moreButton: {
      padding: spacing.sm,
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: spacing.xl,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalContent: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: spacing.lg,
      width: '85%',
      maxWidth: 400,
    },
    modalTitle: {
      ...typography.h2,
      color: colors.textPrimary,
      marginBottom: spacing.md,
    },
    modalInput: {
      backgroundColor: colors.surface2,
      borderWidth: 1.5,
      borderColor: colors.border,
      borderRadius: 12,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.md,
      fontSize: 16,
      color: colors.textPrimary,
      marginBottom: spacing.md,
    },
    modalToggleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: spacing.sm,
      marginBottom: spacing.md,
    },
    modalToggleLabel: {
      ...typography.body,
      color: colors.textPrimary,
      flex: 1,
    },
    modalButtons: {
      flexDirection: 'row',
      gap: spacing.sm,
    },
    modalButton: {
      flex: 1,
    },
    menuOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    menuContent: {
      position: 'absolute',
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: spacing.xs,
      minWidth: 200,
      ...Platform.select({
        ios: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.25,
          shadowRadius: 8,
        },
        android: {
          elevation: 8,
        },
      }),
    },
    menuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: spacing.md,
      borderRadius: 8,
      gap: spacing.sm,
    },
    menuItemText: {
      ...typography.body,
      color: colors.textPrimary,
    },
    menuItemDanger: {
      color: colors.error,
    },
    createButtonContainer: {
      paddingTop: spacing.lg,
      paddingBottom: spacing.md,
    },
    createButton: {
      backgroundColor: colors.accent,
      borderWidth: 0,
    },
    createButtonText: {
      color: '#FFFFFF',
      fontWeight: '600',
    },
  }), [colors, typography, insets.bottom]);

  const fetchWishlistsFromNetwork = useCallback(async () => {
    if (!user?.id || isFetchingRef.current) {
      return;
    }

    isFetchingRef.current = true;

    try {
      setLoading(true);
      setError(null);

      const data = await getWishlistWithItemCount(user.id);

      // Map data and preserve is_default from database
      const formattedWishlists: Wishlist[] = data.map((w: any) => ({
        id: w.id,
        name: w.name,
        isDefault: w.isDefault || false, // Read from DB, not from array position
        itemCount: w.itemCount,
        createdAt: w.createdAt,
        updatedAt: w.updatedAt,
      }));

      console.log('[WishlistsScreen] Fetched wishlists:', formattedWishlists.map(w => ({ id: w.id, name: w.name, isDefault: w.isDefault })));

      // Apply deduplication
      const deduplicatedWishlists = dedupeById(formattedWishlists, 'id');

      // Set state with deduplicated data
      setWishlists(deduplicatedWishlists);
      await setCachedData('wishlists', deduplicatedWishlists);
      
      // If user has no wishlists, create a default one
      if (deduplicatedWishlists.length === 0 && !initializing && !hasInitializedRef.current) {
        hasInitializedRef.current = true;
        await initializeDefaultWishlist();
        return;
      }
    } catch (err) {
      console.error('[WishlistsScreen] Error fetching wishlists:', err);
      setError(err instanceof Error ? err.message : 'Failed to load wishlists');

      // Try to load from cache
      const cached = await getCachedData<Wishlist[]>('wishlists');
      if (cached) {
        const deduplicatedCached = dedupeById(cached, 'id');
        setWishlists(deduplicatedCached);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
      isFetchingRef.current = false;
    }
  }, [user, initializing]);

  const initializeDefaultWishlist = useCallback(async () => {
    if (!user?.id || initializing || hasInitializedRef.current) {
      return;
    }

    setInitializing(true);
    try {
      console.log('[WishlistsScreen] Creating first default wishlist for new user');
      const wishlistData = {
        user_id: user.id,
        name: 'My Wishlist',
        is_default: true, // First wishlist is always default
      };
      
      const newWishlist = await createWishlist(wishlistData);
      console.log('[WishlistsScreen] First wishlist created:', newWishlist.id, 'is_default:', newWishlist.is_default);
      
      // Refresh the list
      await fetchWishlistsFromNetwork();
      
      // Navigate to the new wishlist
      router.push(`/wishlist/${newWishlist.id}`);
    } catch (err) {
      console.error('[WishlistsScreen] Error creating default wishlist:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to create default wishlist';
      Alert.alert('Error', errorMessage);
    } finally {
      setInitializing(false);
    }
  }, [user, initializing, router, fetchWishlistsFromNetwork]);

  // Setup realtime subscription (only once)
  const setupRealtimeSubscription = useCallback(() => {
    if (!user?.id || subscriptionRef.current) {
      return;
    }

    const channel = supabase
      .channel('wishlists-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'wishlists',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('[WishlistsScreen] Realtime update received:', payload.eventType);
          // Debounce realtime updates to prevent multiple rapid fetches
          if (realtimeDebounceRef.current) {
            clearTimeout(realtimeDebounceRef.current);
          }

          realtimeDebounceRef.current = setTimeout(() => {
            if (!isFetchingRef.current && user?.id) {
              isFetchingRef.current = true;
              getWishlistWithItemCount(user.id).then((data) => {
                const formattedWishlists: Wishlist[] = data.map((w: any) => ({
                  id: w.id,
                  name: w.name,
                  isDefault: w.isDefault || false, // Read from DB
                  itemCount: w.itemCount,
                  createdAt: w.createdAt,
                  updatedAt: w.updatedAt,
                }));
                console.log('[WishlistsScreen] Realtime update - wishlists:', formattedWishlists.map(w => ({ id: w.id, name: w.name, isDefault: w.isDefault })));
                const deduplicatedWishlists = dedupeById(formattedWishlists, 'id');
                setWishlists(deduplicatedWishlists);
                setCachedData('wishlists', deduplicatedWishlists);
              }).catch((err) => {
                console.error('[WishlistsScreen] Realtime update error:', err);
              }).finally(() => {
                isFetchingRef.current = false;
              });
            }
          }, 500); // Wait 500ms before refetching
        }
      )
      .subscribe();

    subscriptionRef.current = channel;
  }, [user]);

  // Cleanup realtime subscription
  const cleanupRealtimeSubscription = useCallback(() => {
    if (subscriptionRef.current) {
      supabase.removeChannel(subscriptionRef.current);
      subscriptionRef.current = null;
    }

    if (realtimeDebounceRef.current) {
      clearTimeout(realtimeDebounceRef.current);
      realtimeDebounceRef.current = null;
    }
  }, []);

  // Initial fetch and subscription setup
  useEffect(() => {
    if (user && !hasInitializedRef.current) {
      hasInitializedRef.current = true;
      fetchWishlistsFromNetwork();
      setupRealtimeSubscription();
    }

    // Cleanup on unmount
    return () => {
      cleanupRealtimeSubscription();
      hasInitializedRef.current = false;
      isFetchingRef.current = false;
    };
  }, [user, fetchWishlistsFromNetwork, setupRealtimeSubscription, cleanupRealtimeSubscription]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchWishlistsFromNetwork();
  }, [fetchWishlistsFromNetwork]);

  const handleCreateWishlist = async () => {
    const trimmedName = newWishlistName.trim();
    
    if (!trimmedName) {
      Alert.alert('Error', 'Please enter a wishlist name');
      return;
    }

    if (!user?.id) {
      Alert.alert('Error', 'You must be logged in to create a wishlist');
      return;
    }

    try {
      console.log('[WishlistsScreen] Creating new wishlist:', trimmedName, 'setAsDefault:', setAsDefault);
      
      const wishlistData = {
        user_id: user.id,
        name: trimmedName,
        is_default: setAsDefault, // Only set as default if user explicitly toggled it
      };
      
      // Create wishlist (the helper function handles the default logic)
      const newWishlist = await createWishlist(wishlistData);
      console.log('[WishlistsScreen] Wishlist created:', newWishlist.id, 'is_default:', newWishlist.is_default);

      setCreateModalVisible(false);
      setNewWishlistName('');
      setSetAsDefault(false); // Reset toggle
      handleRefresh();
      Alert.alert('Success', 'Wishlist created successfully');
    } catch (err) {
      console.error('[WishlistsScreen] Error creating wishlist:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to create wishlist';
      Alert.alert('Error', errorMessage);
    }
  };

  const handleRenameWishlist = async () => {
    const trimmedName = renameWishlistName.trim();
    
    if (!trimmedName || !selectedWishlist) {
      Alert.alert('Error', 'Please enter a wishlist name');
      return;
    }

    try {
      await updateWishlist(selectedWishlist.id, {
        name: trimmedName,
      });

      setRenameModalVisible(false);
      setRenameWishlistName('');
      setSelectedWishlist(null);
      handleRefresh();
      Alert.alert('Success', 'Wishlist renamed successfully');
    } catch (err) {
      console.error('[WishlistsScreen] Error renaming wishlist:', err);
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to rename wishlist');
    }
  };

  const handleDeleteWishlist = async () => {
    if (!selectedWishlist) return;

    try {
      await deleteWishlist(selectedWishlist.id);

      setDeleteDialogVisible(false);
      setSelectedWishlist(null);
      handleRefresh();
      Alert.alert('Success', 'Wishlist deleted successfully');
    } catch (err) {
      console.error('[WishlistsScreen] Error deleting wishlist:', err);
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to delete wishlist');
    }
  };

  const handleWishlistPress = (wishlist: Wishlist) => {
    router.push(`/wishlist/${wishlist.id}`);
  };

  const openOverflowMenu = (wishlist: Wishlist, event: any) => {
    setSelectedWishlist(wishlist);
    
    const { pageY, pageX } = event.nativeEvent;
    setMenuPosition({ top: pageY, right: 20 });
    setMenuVisible(true);
  };

  const openRenameModal = (wishlist: Wishlist) => {
    setSelectedWishlist(wishlist);
    setRenameWishlistName(wishlist.name);
    setMenuVisible(false);
    setRenameModalVisible(true);
  };

  const openCreateModal = () => {
    setNewWishlistName('');
    setSetAsDefault(false); // Default to OFF
    setCreateModalVisible(true);
  };

  const formatLastUpdated = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) {
      return 'Just now';
    }
    if (diffMins < 60) {
      const minsText = diffMins === 1 ? 'min' : 'mins';
      return `${diffMins} ${minsText} ago`;
    }
    if (diffHours < 24) {
      const hoursText = diffHours === 1 ? 'hour' : 'hours';
      return `${diffHours} ${hoursText} ago`;
    }
    if (diffDays < 7) {
      const daysText = diffDays === 1 ? 'day' : 'days';
      return `${diffDays} ${daysText} ago`;
    }
    return date.toLocaleDateString();
  };

  const renderWishlistItem = ({ item, index }: { item: Wishlist; index: number }) => {
    const itemCountText = item.itemCount === 1 ? 'item' : 'items';
    const lastUpdatedText = formatLastUpdated(item.updatedAt);
    const itemCountDisplay = `${item.itemCount}`;

    return (
      <TouchableOpacity
        key={`wishlist-${item.id}`}
        onPress={() => handleWishlistPress(item)}
        activeOpacity={0.7}
      >
        <Card style={styles.wishlistCard}>
          <View style={styles.wishlistContent}>
            <View style={styles.wishlistLeft}>
              <Text style={styles.wishlistName}>{item.name}</Text>
              <View style={styles.wishlistMeta}>
                <Text style={styles.wishlistMetaText}>{itemCountDisplay}</Text>
                <Text style={styles.wishlistMetaText}> </Text>
                <Text style={styles.wishlistMetaText}>{itemCountText}</Text>
                <Text style={styles.wishlistMetaText}> • </Text>
                <Text style={styles.wishlistMetaText}>{lastUpdatedText}</Text>
              </View>
            </View>
            <View style={styles.wishlistRight}>
              {item.isDefault && (
                <View style={styles.defaultBadge}>
                  <Text style={styles.defaultBadgeText}>Default</Text>
                </View>
              )}
              <TouchableOpacity
                style={styles.moreButton}
                onPress={(e) => {
                  e.stopPropagation();
                  openOverflowMenu(item, e);
                }}
              >
                <IconSymbol
                  ios_icon_name="ellipsis"
                  android_material_icon_name="more-vert"
                  size={24}
                  color={colors.icon}
                />
              </TouchableOpacity>
            </View>
          </View>
        </Card>
      </TouchableOpacity>
    );
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerTop}>
        <Logo style={styles.logo} />
      </View>
      <Text style={styles.title}>My Wishlists</Text>
      <Text style={styles.subtitle}>
        Organize your items into different wishlists
      </Text>
    </View>
  );

  const renderFooter = () => {
    return (
      <View style={styles.createButtonContainer}>
        <Button
          title="Create Wishlist"
          onPress={openCreateModal}
          variant="primary"
          style={styles.createButton}
        />
      </View>
    );
  };

  if (loading && wishlists.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        {renderHeader()}
        <View style={styles.list}>
          <ListItemSkeleton />
          <ListItemSkeleton />
          <ListItemSkeleton />
        </View>
      </SafeAreaView>
    );
  }

  if (error && wishlists.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        {!isConnected && <OfflineNotice />}
        {renderHeader()}
        <ErrorState
          message={error}
          onRetry={() => fetchWishlistsFromNetwork()}
        />
      </SafeAreaView>
    );
  }

  if (wishlists.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        {renderHeader()}
        <EmptyState
          icon="favorite-border"
          title="No wishlists yet"
          message="Create your first wishlist to start saving items"
          actionLabel="Create Wishlist"
          onAction={openCreateModal}
        />

        <Modal
          visible={createModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setCreateModalVisible(false)}
        >
          <Pressable style={styles.modalOverlay} onPress={() => setCreateModalVisible(false)}>
            <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
              <Text style={styles.modalTitle}>Create Wishlist</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Wishlist name"
                placeholderTextColor={colors.textSecondary}
                value={newWishlistName}
                onChangeText={setNewWishlistName}
                autoFocus
              />
              <View style={styles.modalToggleRow}>
                <Text style={styles.modalToggleLabel}>Set as default</Text>
                <Switch
                  value={setAsDefault}
                  onValueChange={setSetAsDefault}
                  trackColor={{ false: colors.border, true: colors.accent }}
                  thumbColor={colors.surface}
                />
              </View>
              <View style={styles.modalButtons}>
                <Button
                  title="Cancel"
                  onPress={() => setCreateModalVisible(false)}
                  variant="secondary"
                  style={styles.modalButton}
                />
                <Button
                  title="Create"
                  onPress={handleCreateWishlist}
                  variant="primary"
                  style={styles.modalButton}
                />
              </View>
            </Pressable>
          </Pressable>
        </Modal>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.container} edges={['top']}>
        {!isConnected && <OfflineNotice />}
        <FlatList
          data={wishlists}
          renderItem={renderWishlistItem}
          keyExtractor={(item) => `wishlist-${item.id}`}
          ListHeaderComponent={renderHeader}
          ListFooterComponent={renderFooter}
          contentContainerStyle={styles.listContent}
          style={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.accent}
            />
          }
          removeClippedSubviews={false}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={5}
        />

        <Modal
          visible={createModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setCreateModalVisible(false)}
        >
          <Pressable style={styles.modalOverlay} onPress={() => setCreateModalVisible(false)}>
            <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
              <Text style={styles.modalTitle}>Create Wishlist</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Wishlist name"
                placeholderTextColor={colors.textSecondary}
                value={newWishlistName}
                onChangeText={setNewWishlistName}
                autoFocus
              />
              <View style={styles.modalToggleRow}>
                <Text style={styles.modalToggleLabel}>Set as default</Text>
                <Switch
                  value={setAsDefault}
                  onValueChange={setSetAsDefault}
                  trackColor={{ false: colors.border, true: colors.accent }}
                  thumbColor={colors.surface}
                />
              </View>
              <View style={styles.modalButtons}>
                <Button
                  title="Cancel"
                  onPress={() => setCreateModalVisible(false)}
                  variant="secondary"
                  style={styles.modalButton}
                />
                <Button
                  title="Create"
                  onPress={handleCreateWishlist}
                  variant="primary"
                  style={styles.modalButton}
                />
              </View>
            </Pressable>
          </Pressable>
        </Modal>

        <Modal
          visible={renameModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setRenameModalVisible(false)}
        >
          <Pressable style={styles.modalOverlay} onPress={() => setRenameModalVisible(false)}>
            <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
              <Text style={styles.modalTitle}>Rename Wishlist</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Wishlist name"
                placeholderTextColor={colors.textSecondary}
                value={renameWishlistName}
                onChangeText={setRenameWishlistName}
                autoFocus
              />
              <View style={styles.modalButtons}>
                <Button
                  title="Cancel"
                  onPress={() => setRenameModalVisible(false)}
                  variant="secondary"
                  style={styles.modalButton}
                />
                <Button
                  title="Rename"
                  onPress={handleRenameWishlist}
                  variant="primary"
                  style={styles.modalButton}
                />
              </View>
            </Pressable>
          </Pressable>
        </Modal>

        <Modal
          visible={menuVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setMenuVisible(false)}
        >
          <Pressable style={styles.menuOverlay} onPress={() => setMenuVisible(false)}>
            <View style={[styles.menuContent, { top: menuPosition.top, right: menuPosition.right }]}>
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => selectedWishlist && openRenameModal(selectedWishlist)}
              >
                <IconSymbol
                  ios_icon_name="pencil"
                  android_material_icon_name="edit"
                  size={20}
                  color={colors.icon}
                />
                <Text style={styles.menuItemText}>Rename</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  setMenuVisible(false);
                  setDeleteDialogVisible(true);
                }}
              >
                <IconSymbol
                  ios_icon_name="trash"
                  android_material_icon_name="delete"
                  size={20}
                  color={colors.error}
                />
                <Text style={[styles.menuItemText, styles.menuItemDanger]}>Delete</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Modal>

        <ConfirmDialog
          visible={deleteDialogVisible}
          title="Delete Wishlist"
          message={`Are you sure you want to delete "${selectedWishlist?.name}"? This will also delete all items in this wishlist.`}
          confirmText="Delete"
          cancelText="Cancel"
          onConfirm={handleDeleteWishlist}
          onCancel={() => setDeleteDialogVisible(false)}
          destructive
        />
      </SafeAreaView>
    </View>
  );
}
