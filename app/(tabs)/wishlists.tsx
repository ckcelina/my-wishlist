
import { Button } from '@/components/design-system/Button';
import { ConfirmDialog } from '@/components/design-system/ConfirmDialog';
import { getCachedData, setCachedData } from '@/utils/cache';
import { useAuth } from '@/contexts/AuthContext';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { Badge } from '@/components/design-system/Badge';
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
import { dedupeById, normalizeList } from '@/utils/deduplication';
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
      color: colors.text,
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
      color: colors.text,
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
      backgroundColor: colors.accentLight,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      borderRadius: 6,
    },
    defaultBadgeText: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.accent,
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
      color: colors.text,
      marginBottom: spacing.md,
    },
    modalInput: {
      backgroundColor: colors.surface,
      borderWidth: 1.5,
      borderColor: colors.border,
      borderRadius: 12,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.md,
      fontSize: 16,
      color: colors.text,
      marginBottom: spacing.md,
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
      color: colors.text,
    },
    menuItemDanger: {
      color: colors.error,
    },
    createButtonContainer: {
      paddingTop: spacing.lg,
      paddingBottom: spacing.md,
    },
  }), [colors, typography, insets.bottom]);

  const initializeDefaultWishlist = useCallback(async () => {
    if (!user?.id || initializing) {
      console.log('[WishlistsScreen] Cannot initialize default wishlist - user:', user?.id, 'initializing:', initializing);
      return;
    }

    setInitializing(true);
    try {
      console.log('[WishlistsScreen] Creating default wishlist for new user:', user.id);
      
      const wishlistData = {
        user_id: user.id,
        name: 'My Wishlist',
      };
      
      console.log('[WishlistsScreen] Wishlist data:', wishlistData);
      
      const newWishlist = await createWishlist(wishlistData);

      console.log('[WishlistsScreen] Default wishlist created successfully:', newWishlist.id);
      
      // Refresh the list
      await fetchWishlistsFromNetwork();
      
      // Navigate to the new wishlist
      router.push(`/wishlist/${newWishlist.id}`);
    } catch (err) {
      console.error('[WishlistsScreen] Error creating default wishlist:', err);
      console.error('[WishlistsScreen] Error details:', JSON.stringify(err, null, 2));
      
      const errorMessage = err instanceof Error ? err.message : 'Failed to create default wishlist';
      Alert.alert('Error', errorMessage);
    } finally {
      setInitializing(false);
    }
  }, [user, initializing, router]);

  const fetchWishlistsFromNetwork = useCallback(async () => {
    if (!user?.id) {
      console.log('[WishlistsScreen] No user ID, skipping fetch');
      return;
    }

    // Prevent duplicate fetches
    if (isFetchingRef.current) {
      console.log('[WishlistsScreen] Fetch already in progress, skipping');
      return;
    }

    isFetchingRef.current = true;

    try {
      setLoading(true);
      setError(null);

      console.log('[WishlistsScreen] Fetching wishlists from Supabase for user:', user.id);
      const data = await getWishlistWithItemCount(user.id);

      const formattedWishlists: Wishlist[] = data.map((w: any, index: number) => ({
        id: w.id,
        name: w.name,
        isDefault: index === 0,
        itemCount: w.itemCount,
        createdAt: w.createdAt,
        updatedAt: w.updatedAt,
      }));

      // Apply deduplication and normalization
      const normalizedWishlists = normalizeList(formattedWishlists, 'id', 'updatedAt');

      console.log('[WishlistsScreen] Fetched wishlists:', normalizedWishlists.length);

      // Set state with deduplicated data
      setWishlists(normalizedWishlists);
      await setCachedData('wishlists', normalizedWishlists);
      
      // If user has no wishlists, create a default one
      if (normalizedWishlists.length === 0 && !initializing) {
        console.log('[WishlistsScreen] No wishlists found, creating default wishlist');
        await initializeDefaultWishlist();
        return;
      }
    } catch (err) {
      console.error('[WishlistsScreen] Error fetching wishlists:', err);
      console.error('[WishlistsScreen] Error details:', JSON.stringify(err, null, 2));
      setError(err instanceof Error ? err.message : 'Failed to load wishlists');

      // Try to load from cache
      const cached = await getCachedData<Wishlist[]>('wishlists');
      if (cached) {
        console.log('[WishlistsScreen] Using cached wishlists');
        const normalizedCached = dedupeById(cached, 'id');
        setWishlists(normalizedCached);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
      isFetchingRef.current = false;
    }
  }, [user, initializing, initializeDefaultWishlist]);

  // Setup realtime subscription (only once)
  const setupRealtimeSubscription = useCallback(() => {
    if (!user?.id) {
      console.log('[WishlistsScreen] No user, skipping realtime subscription');
      return;
    }

    // Prevent duplicate subscriptions
    if (subscriptionRef.current) {
      console.log('[WishlistsScreen] Realtime subscription already exists, skipping');
      return;
    }

    console.log('[WishlistsScreen] Setting up realtime subscription for user:', user.id);

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
            console.log('[WishlistsScreen] Debounced realtime update - refetching wishlists');
            fetchWishlistsFromNetwork();
          }, 500); // Wait 500ms before refetching
        }
      )
      .subscribe((status) => {
        console.log('[WishlistsScreen] Realtime subscription status:', status);
      });

    subscriptionRef.current = channel;
  }, [user, fetchWishlistsFromNetwork]);

  // Cleanup realtime subscription
  const cleanupRealtimeSubscription = useCallback(() => {
    if (subscriptionRef.current) {
      console.log('[WishlistsScreen] Cleaning up realtime subscription');
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
      console.log('[WishlistsScreen] User authenticated, initializing');
      hasInitializedRef.current = true;
      fetchWishlistsFromNetwork();
      setupRealtimeSubscription();
    }

    // Cleanup on unmount
    return () => {
      console.log('[WishlistsScreen] Component unmounting, cleaning up');
      cleanupRealtimeSubscription();
      hasInitializedRef.current = false;
      isFetchingRef.current = false;
    };
  }, [user, fetchWishlistsFromNetwork, setupRealtimeSubscription, cleanupRealtimeSubscription]);

  const handleRefresh = useCallback(() => {
    console.log('[WishlistsScreen] User triggered refresh');
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
      console.log('[WishlistsScreen] Creating wishlist:', trimmedName, 'for user:', user.id);
      
      const wishlistData = {
        user_id: user.id,
        name: trimmedName,
      };
      
      console.log('[WishlistsScreen] Wishlist data:', wishlistData);
      
      const newWishlist = await createWishlist(wishlistData);
      
      console.log('[WishlistsScreen] Wishlist created successfully:', newWishlist);

      setCreateModalVisible(false);
      setNewWishlistName('');
      handleRefresh();
      Alert.alert('Success', 'Wishlist created successfully');
    } catch (err) {
      console.error('[WishlistsScreen] Error creating wishlist:', err);
      console.error('[WishlistsScreen] Error details:', JSON.stringify(err, null, 2));
      
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
      console.log('[WishlistsScreen] Renaming wishlist:', selectedWishlist.id, 'to:', trimmedName);
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
      console.log('[WishlistsScreen] Deleting wishlist:', selectedWishlist.id);
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
    console.log('[WishlistsScreen] User tapped wishlist:', wishlist.name);
    router.push(`/wishlist/${wishlist.id}`);
  };

  const openOverflowMenu = (wishlist: Wishlist, event: any) => {
    console.log('[WishlistsScreen] Opening overflow menu for:', wishlist.name);
    setSelectedWishlist(wishlist);
    
    const { pageY, pageX } = event.nativeEvent;
    setMenuPosition({ top: pageY, right: 20 });
    setMenuVisible(true);
  };

  const openRenameModal = (wishlist: Wishlist) => {
    console.log('[WishlistsScreen] Opening rename modal for:', wishlist.name);
    setSelectedWishlist(wishlist);
    setRenameWishlistName(wishlist.name);
    setMenuVisible(false);
    setRenameModalVisible(true);
  };

  const openCreateModal = () => {
    console.log('[WishlistsScreen] Opening create wishlist modal');
    setNewWishlistName('');
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
        key={item.id}
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
                  color={colors.text}
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
          keyExtractor={(item, index) => `${item.id}-${index}`}
          ListHeaderComponent={renderHeader}
          ListFooterComponent={renderFooter}
          contentContainerStyle={styles.listContent}
          style={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
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
                  color={colors.text}
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
