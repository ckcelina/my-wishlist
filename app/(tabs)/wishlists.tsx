
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
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

interface Wishlist {
  id: string;
  name: string;
  isDefault: boolean;
  itemCount: number;
  createdAt: string;
  updatedAt: string;
}

export default function WishlistsScreen() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { isOnline } = useNetworkStatus();
  const [wishlists, setWishlists] = useState<Wishlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [renameModalVisible, setRenameModalVisible] = useState(false);
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [newWishlistName, setNewWishlistName] = useState('');
  const [selectedWishlist, setSelectedWishlist] = useState<Wishlist | null>(null);

  const fetchWishlists = useCallback(async () => {
    if (!user) {
      console.log('[WishlistsScreen] No user, skipping fetch');
      return;
    }

    try {
      console.log('[WishlistsScreen] Fetching wishlists for user:', user.id);
      setError(null);
      
      const response = await supabase
        .from('wishlists')
        .select('*, wishlist_items(count)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

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
      setWishlists(wishlistsData);
    } catch (error: any) {
      console.error('[WishlistsScreen] Error fetching wishlists:', error);
      setError('Failed to load wishlists. Please check your connection and try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        console.log('[WishlistsScreen] No user, redirecting to auth');
        router.replace('/auth');
      } else {
        fetchWishlists();
      }
    }
  }, [user, authLoading, fetchWishlists, router]);

  const handleRefresh = useCallback(() => {
    if (!isOnline) {
      Alert.alert('Offline', 'You are currently offline. Please check your internet connection and try again.');
      return;
    }
    console.log('[WishlistsScreen] User pulled to refresh');
    setRefreshing(true);
    fetchWishlists();
  }, [fetchWishlists, isOnline]);

  const handleCreateWishlist = async () => {
    if (!newWishlistName.trim()) {
      Alert.alert('Error', 'Please enter a wishlist name');
      return;
    }

    if (!isOnline) {
      Alert.alert('Offline', 'You need an internet connection to create a wishlist.');
      return;
    }

    try {
      console.log('[WishlistsScreen] Creating wishlist:', newWishlistName);
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
      fetchWishlists();
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
      fetchWishlists();
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

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <OfflineNotice />
        <View style={styles.header}>
          <Logo size="small" style={styles.logo} />
          <Text style={styles.headerTitle}>Your Wishlists</Text>
        </View>
        <ScrollView style={styles.content}>
          <ListItemSkeleton />
          <ListItemSkeleton />
          <ListItemSkeleton />
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (error) {
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
          onRetry={fetchWishlists}
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

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {wishlists.length === 0 ? (
          <EmptyState
            icon="favorite-border"
            title="Start your first wishlist"
            description="Create a wishlist to save items you love from any app or website"
            actionLabel="Create Wishlist"
            onAction={openCreateModal}
          />
        ) : (
          <View style={styles.listContainer}>
            {wishlists.map((wishlist, index) => {
              const itemCountText = `${wishlist.itemCount} ${wishlist.itemCount === 1 ? 'item' : 'items'}`;
              const lastUpdatedText = formatLastUpdated(wishlist.updatedAt);
              
              return (
                <React.Fragment key={index}>
                  <Card
                    interactive
                    onPress={() => handleWishlistPress(wishlist)}
                    style={styles.wishlistCard}
                  >
                    <View style={styles.cardContent}>
                      <View style={styles.wishlistInfo}>
                        <View style={styles.wishlistHeader}>
                          <Text style={styles.wishlistName}>{wishlist.name}</Text>
                          {wishlist.isDefault && (
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
                        onPress={() => openOverflowMenu(wishlist)}
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
                </React.Fragment>
              );
            })}
          </View>
        )}
        
        <View style={styles.bottomSpacer} />
      </ScrollView>

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
  listContainer: {
    paddingBottom: spacing.md,
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
});
