
import React, { useState, useEffect, useCallback } from 'react';
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
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { IconSymbol } from '@/components/IconSymbol';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/design-system/Button';
import { Card } from '@/components/design-system/Card';
import { EmptyState } from '@/components/design-system/EmptyState';
import { ListItemSkeleton } from '@/components/design-system/LoadingSkeleton';
import { Badge } from '@/components/design-system/Badge';
import { ErrorState } from '@/components/design-system/ErrorState';
import { ConfirmDialog } from '@/components/design-system/ConfirmDialog';
import { OfflineNotice } from '@/components/design-system/OfflineNotice';
import { colors, typography, spacing, containerStyles, inputStyles } from '@/styles/designSystem';
import { supabase } from '@/lib/supabase';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { getCachedData, setCachedData } from '@/utils/cache';

interface Wishlist {
  id: string;
  name: string;
  isDefault: boolean;
  itemCount: number;
  createdAt: string;
  updatedAt: string;
}

const PAGE_SIZE = 20;

export default function WishlistsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { isOnline } = useNetworkStatus();
  const [wishlists, setWishlists] = useState<Wishlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [renameModalVisible, setRenameModalVisible] = useState(false);
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [newWishlistName, setNewWishlistName] = useState('');
  const [selectedWishlist, setSelectedWishlist] = useState<Wishlist | null>(null);
  const [creatingWishlist, setCreatingWishlist] = useState(false);

  const fetchWishlists = useCallback(async (pageNum: number = 0, append: boolean = false) => {
    if (!user) {
      console.log('[WishlistsScreen] No user, skipping fetch');
      return;
    }

    try {
      console.log('[WishlistsScreen] Fetching wishlists page:', pageNum);
      
      // Try to load from cache first
      if (pageNum === 0 && !append) {
        const cached = await getCachedData<Wishlist[]>('wishlists');
        if (cached) {
          console.log('[WishlistsScreen] Loaded from cache:', cached.length);
          setWishlists(cached);
          setLoading(false);
          
          // Fetch fresh data in background
          if (isOnline) {
            fetchWishlistsFromNetwork(pageNum, append);
          }
          return;
        }
      }
      
      if (!isOnline && pageNum === 0) {
        setError('You are offline. Showing cached data.');
        setLoading(false);
        return;
      }
      
      await fetchWishlistsFromNetwork(pageNum, append);
    } catch (error: any) {
      console.error('[WishlistsScreen] Error fetching wishlists:', error);
      setError('Failed to load wishlists. Please check your connection and try again.');
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, [user, isOnline]);

  const fetchWishlistsFromNetwork = async (pageNum: number, append: boolean) => {
    if (!user) return;
    
    setError(null);
    
    const from = pageNum * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    
    const response = await supabase
      .from('wishlists')
      .select('*, wishlist_items(count)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (response.error) throw response.error;

    const wishlistsData = response.data.map((w: any) => ({
      id: w.id,
      name: w.name,
      isDefault: w.is_default,
      itemCount: w.wishlist_items?.[0]?.count || 0,
      createdAt: w.created_at,
      updatedAt: w.updated_at,
    }));

    console.log('[WishlistsScreen] Fetched wishlists:', wishlistsData.length);
    
    if (append) {
      setWishlists(prev => [...prev, ...wishlistsData]);
    } else {
      setWishlists(wishlistsData);
      // Cache first page
      if (pageNum === 0) {
        await setCachedData('wishlists', wishlistsData);
      }
    }
    
    setHasMore(wishlistsData.length === PAGE_SIZE);
    setLoading(false);
    setRefreshing(false);
    setLoadingMore(false);
  };

  useEffect(() => {
    console.log('[WishlistsScreen] Component mounted, user:', user?.id);
    fetchWishlists(0, false);
  }, [user]);

  const handleRefresh = useCallback(() => {
    if (!isOnline) {
      Alert.alert('Offline', 'You are currently offline. Please check your internet connection and try again.');
      return;
    }
    console.log('[WishlistsScreen] User pulled to refresh');
    setRefreshing(true);
    setPage(0);
    setHasMore(true);
    fetchWishlists(0, false);
  }, [fetchWishlists, isOnline]);

  const handleLoadMore = useCallback(() => {
    if (loadingMore || !hasMore || !isOnline) return;
    
    console.log('[WishlistsScreen] Loading more wishlists');
    setLoadingMore(true);
    const nextPage = page + 1;
    setPage(nextPage);
    fetchWishlists(nextPage, true);
  }, [loadingMore, hasMore, page, fetchWishlists, isOnline]);

  const handleCreateWishlist = async () => {
    if (!newWishlistName.trim()) {
      Alert.alert('Error', 'Please enter a wishlist name');
      return;
    }

    if (!isOnline) {
      Alert.alert('Offline', 'You need an internet connection to create a wishlist.');
      return;
    }

    if (creatingWishlist) return;

    try {
      console.log('[WishlistsScreen] Creating wishlist:', newWishlistName);
      setCreatingWishlist(true);
      
      const response = await supabase
        .from('wishlists')
        .insert({
          user_id: user?.id,
          name: newWishlistName.trim(),
          is_default: false,
        })
        .select()
        .single();

      if (response.error) throw response.error;

      console.log('[WishlistsScreen] Wishlist created successfully, opening it');
      setCreateModalVisible(false);
      setNewWishlistName('');
      
      router.push(`/wishlist/${response.data.id}`);
    } catch (error: any) {
      console.error('[WishlistsScreen] Error creating wishlist:', error);
      Alert.alert('Error', 'Failed to create wishlist. Please try again.');
    } finally {
      setCreatingWishlist(false);
    }
  };

  const handleRenameWishlist = async () => {
    if (!selectedWishlist || !newWishlistName.trim()) {
      Alert.alert('Error', 'Please enter a wishlist name');
      return;
    }

    if (!isOnline) {
      Alert.alert('Offline', 'You need an internet connection to rename a wishlist.');
      return;
    }

    try {
      console.log('[WishlistsScreen] Renaming wishlist:', selectedWishlist.id);
      const response = await supabase
        .from('wishlists')
        .update({ name: newWishlistName.trim() })
        .eq('id', selectedWishlist.id);

      if (response.error) throw response.error;

      console.log('[WishlistsScreen] Wishlist renamed successfully');
      setRenameModalVisible(false);
      setNewWishlistName('');
      setSelectedWishlist(null);
      handleRefresh();
    } catch (error: any) {
      console.error('[WishlistsScreen] Error renaming wishlist:', error);
      Alert.alert('Error', 'Failed to rename wishlist. Please try again.');
    }
  };

  const handleDeleteWishlist = async () => {
    if (!selectedWishlist) return;

    if (!isOnline) {
      Alert.alert('Offline', 'You need an internet connection to delete a wishlist.');
      setDeleteConfirmVisible(false);
      return;
    }

    try {
      console.log('[WishlistsScreen] Deleting wishlist:', selectedWishlist.id);
      const response = await supabase
        .from('wishlists')
        .delete()
        .eq('id', selectedWishlist.id);

      if (response.error) throw response.error;

      console.log('[WishlistsScreen] Wishlist deleted successfully');
      setDeleteConfirmVisible(false);
      setSelectedWishlist(null);
      handleRefresh();
    } catch (error: any) {
      console.error('[WishlistsScreen] Error deleting wishlist:', error);
      Alert.alert('Error', 'Failed to delete wishlist. Please try again.');
    }
  };

  const handleWishlistPress = (wishlist: Wishlist) => {
    console.log('[WishlistsScreen] User tapped wishlist:', wishlist.name);
    router.push(`/wishlist/${wishlist.id}`);
  };

  const openOverflowMenu = (wishlist: Wishlist) => {
    console.log('[WishlistsScreen] User tapped overflow menu for:', wishlist.name);
    
    if (wishlist.isDefault) {
      Alert.alert(
        wishlist.name,
        'Choose an action',
        [
          {
            text: 'Rename',
            onPress: () => openRenameModal(wishlist),
          },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
    } else {
      Alert.alert(
        wishlist.name,
        'Choose an action',
        [
          {
            text: 'Rename',
            onPress: () => openRenameModal(wishlist),
          },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: () => {
              setSelectedWishlist(wishlist);
              setDeleteConfirmVisible(true);
            },
          },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
    }
  };

  const openRenameModal = (wishlist: Wishlist) => {
    setSelectedWishlist(wishlist);
    setNewWishlistName(wishlist.name);
    setRenameModalVisible(true);
  };

  const openCreateModal = () => {
    console.log('[WishlistsScreen] User tapped New Wishlist button');
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
      const minsText = `${diffMins}m ago`;
      return minsText;
    }
    if (diffHours < 24) {
      const hoursText = `${diffHours}h ago`;
      return hoursText;
    }
    if (diffDays < 7) {
      const daysText = `${diffDays}d ago`;
      return daysText;
    }
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const renderWishlistItem = ({ item, index }: { item: Wishlist; index: number }) => {
    const itemCountText = `${item.itemCount} ${item.itemCount === 1 ? 'item' : 'items'}`;
    const lastUpdatedText = formatLastUpdated(item.updatedAt);
    
    return (
      <Card
        interactive
        onPress={() => handleWishlistPress(item)}
        style={styles.wishlistCard}
      >
        <View style={styles.cardContent}>
          <View style={styles.wishlistInfo}>
            <View style={styles.wishlistHeader}>
              <Text style={styles.wishlistName}>{item.name}</Text>
              {item.isDefault && (
                <Badge label="Default" variant="info" />
              )}
            </View>
            
            <View style={styles.wishlistMeta}>
              <Text style={styles.itemCount}>{itemCountText}</Text>
              <Text style={styles.metaDivider}>•</Text>
              <Text style={styles.lastUpdated}>{lastUpdatedText}</Text>
            </View>
          </View>
          
          <TouchableOpacity
            onPress={() => openOverflowMenu(item)}
            style={styles.overflowButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <IconSymbol
              ios_icon_name="more-vert"
              android_material_icon_name="more-vert"
              size={24}
              color={colors.textTertiary}
            />
          </TouchableOpacity>
        </View>
      </Card>
    );
  };

  const renderHeader = () => (
    <TouchableOpacity
      style={styles.importButton}
      onPress={() => {
        console.log('[WishlistsScreen] User tapped Import Wishlist button');
        router.push('/import-wishlist');
      }}
      activeOpacity={0.7}
    >
      <IconSymbol
        ios_icon_name="download"
        android_material_icon_name="download"
        size={20}
        color={colors.accent}
      />
      <Text style={styles.importButtonText}>Import Wishlist</Text>
    </TouchableOpacity>
  );

  const renderFooter = () => {
    if (!loadingMore) return <View style={styles.bottomSpacer} />;
    
    return (
      <View style={styles.loadingMore}>
        <ListItemSkeleton />
      </View>
    );
  };

  if (loading && wishlists.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <OfflineNotice />
        <View style={styles.header}>
          <Logo size="small" style={styles.logo} />
          <Text style={styles.headerTitle}>Your Wishlists</Text>
        </View>
        <View style={styles.content}>
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
        <OfflineNotice />
        <View style={styles.header}>
          <Logo size="small" style={styles.logo} />
          <Text style={styles.headerTitle}>Your Wishlists</Text>
        </View>
        <ErrorState
          title="Failed to load wishlists"
          message={error}
          onRetry={() => handleRefresh()}
        />
      </SafeAreaView>
    );
  }

  const deleteMessage = selectedWishlist 
    ? selectedWishlist.itemCount > 0
      ? `Are you sure you want to delete "${selectedWishlist.name}"? This will also delete ${selectedWishlist.itemCount} ${selectedWishlist.itemCount === 1 ? 'item' : 'items'}. This action cannot be undone.`
      : `Are you sure you want to delete "${selectedWishlist.name}"? This action cannot be undone.`
    : '';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <OfflineNotice />
      
      <View style={styles.header}>
        <Logo size="small" style={styles.logo} />
        <Text style={styles.headerTitle}>Your Wishlists</Text>
      </View>

      {wishlists.length === 0 ? (
        <View style={styles.content}>
          <EmptyState
            icon="favorite-border"
            title="Start your first wishlist"
            description="Create a wishlist to save items you love from any app or website"
            actionLabel="Create Wishlist"
            onAction={openCreateModal}
            secondaryActionLabel="Bring your existing wishlists"
            onSecondaryAction={() => {
              console.log('[WishlistsScreen] User tapped Import Wishlist from empty state');
              router.push('/import-wishlist');
            }}
          />
        </View>
      ) : (
        <FlatList
          data={wishlists}
          renderItem={renderWishlistItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={renderHeader}
          ListFooterComponent={renderFooter}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
        />
      )}

      <TouchableOpacity
        style={styles.fab}
        onPress={openCreateModal}
        activeOpacity={0.8}
      >
        <IconSymbol
          ios_icon_name="add"
          android_material_icon_name="add"
          size={28}
          color={colors.textInverse}
        />
      </TouchableOpacity>

      <Modal
        visible={createModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCreateModalVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setCreateModalVisible(false)}>
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>New Wishlist</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Wishlist name"
              placeholderTextColor={colors.textTertiary}
              value={newWishlistName}
              onChangeText={setNewWishlistName}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleCreateWishlist}
              editable={!creatingWishlist}
            />
            <View style={styles.modalButtons}>
              <Button
                title="Cancel"
                onPress={() => setCreateModalVisible(false)}
                variant="secondary"
                style={styles.modalButton}
                disabled={creatingWishlist}
              />
              <Button
                title={creatingWishlist ? 'Creating...' : 'Create'}
                onPress={handleCreateWishlist}
                variant="primary"
                style={styles.modalButton}
                disabled={creatingWishlist}
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
              placeholderTextColor={colors.textTertiary}
              value={newWishlistName}
              onChangeText={setNewWishlistName}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleRenameWishlist}
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

      <ConfirmDialog
        visible={deleteConfirmVisible}
        title="Delete Wishlist"
        message={deleteMessage}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={handleDeleteWishlist}
        onCancel={() => {
          setDeleteConfirmVisible(false);
          setSelectedWishlist(null);
        }}
        destructive
        icon="delete"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    ...containerStyles.screen,
    paddingTop: Platform.OS === 'android' ? 48 : 0,
  },
  header: {
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  logo: {
    marginBottom: spacing.sm,
  },
  headerTitle: {
    ...typography.titleLarge,
    textAlign: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  listContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  wishlistCard: {
    marginBottom: spacing.md,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  wishlistInfo: {
    flex: 1,
    marginRight: spacing.sm,
  },
  wishlistHeader: {
    ...containerStyles.row,
    marginBottom: spacing.xs,
  },
  wishlistName: {
    ...typography.titleSmall,
    flex: 1,
  },
  wishlistMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  itemCount: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
  },
  metaDivider: {
    ...typography.bodyMedium,
    color: colors.textTertiary,
  },
  lastUpdated: {
    ...typography.bodyMedium,
    color: colors.textTertiary,
  },
  overflowButton: {
    padding: spacing.xs,
  },
  bottomSpacer: {
    height: 100,
  },
  loadingMore: {
    paddingVertical: spacing.md,
  },
  fab: {
    position: 'absolute',
    bottom: 100,
    right: spacing.md,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.shadowDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 6,
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
    ...typography.titleMedium,
    marginBottom: spacing.md,
  },
  modalInput: {
    ...inputStyles.base,
    marginBottom: spacing.lg,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  modalButton: {
    flex: 1,
  },
  importButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.accent,
    gap: spacing.sm,
  },
  importButtonText: {
    ...typography.bodyLarge,
    fontWeight: '600',
    color: colors.accent,
  },
});
