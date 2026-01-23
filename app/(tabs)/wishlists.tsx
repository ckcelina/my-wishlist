
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
import { Button } from '@/components/design-system/Button';
import { Card } from '@/components/design-system/Card';
import { EmptyState } from '@/components/design-system/EmptyState';
import { ListItemSkeleton } from '@/components/design-system/LoadingSkeleton';
import { Badge } from '@/components/design-system/Badge';
import { colors, typography, spacing, containerStyles, inputStyles } from '@/styles/designSystem';
import { supabase } from '@/lib/supabase';

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
  const [wishlists, setWishlists] = useState<Wishlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [renameModalVisible, setRenameModalVisible] = useState(false);
  const [newWishlistName, setNewWishlistName] = useState('');
  const [selectedWishlist, setSelectedWishlist] = useState<Wishlist | null>(null);

  const fetchWishlists = useCallback(async () => {
    if (!user) {
      console.log('[WishlistsScreen] No user, skipping fetch');
      return;
    }

    try {
      console.log('[WishlistsScreen] Fetching wishlists for user:', user.id);
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
      Alert.alert('Error', 'Failed to load wishlists');
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
    console.log('[WishlistsScreen] User pulled to refresh');
    setRefreshing(true);
    fetchWishlists();
  }, [fetchWishlists]);

  const handleCreateWishlist = async () => {
    if (!newWishlistName.trim()) {
      Alert.alert('Error', 'Please enter a wishlist name');
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
      Alert.alert('Error', 'Failed to create wishlist');
    }
  };

  const handleRenameWishlist = async () => {
    if (!selectedWishlist || !newWishlistName.trim()) {
      Alert.alert('Error', 'Please enter a wishlist name');
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
      Alert.alert('Error', 'Failed to rename wishlist');
    }
  };

  const handleDeleteWishlist = (wishlist: Wishlist) => {
    if (wishlist.isDefault) {
      Alert.alert('Error', 'Cannot delete default wishlist');
      return;
    }

    const itemText = wishlist.itemCount === 1 ? 'item' : 'items';
    const message = wishlist.itemCount > 0
      ? `Are you sure you want to delete "${wishlist.name}"? This will also delete ${wishlist.itemCount} ${itemText}.`
      : `Are you sure you want to delete "${wishlist.name}"?`;

    Alert.alert(
      'Delete Wishlist',
      message,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('[WishlistsScreen] Deleting wishlist:', wishlist.id);
              const response = await supabase
                .from('wishlists')
                .delete()
                .eq('id', wishlist.id);

              if (response.error) throw response.error;

              console.log('[WishlistsScreen] Wishlist deleted successfully');
              fetchWishlists();
            } catch (error: any) {
              console.error('[WishlistsScreen] Error deleting wishlist:', error);
              Alert.alert('Error', 'Failed to delete wishlist');
            }
          },
        },
      ]
    );
  };

  const handleWishlistPress = (wishlist: Wishlist) => {
    console.log('[WishlistsScreen] User tapped wishlist:', wishlist.name);
    router.push(`/wishlist/${wishlist.id}`);
  };

  const openOverflowMenu = (wishlist: Wishlist) => {
    console.log('[WishlistsScreen] User tapped overflow menu for:', wishlist.name);
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
          onPress: () => handleDeleteWishlist(wishlist),
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
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
      return `${diffMins}m ago`;
    }
    if (diffHours < 24) {
      return `${diffHours}h ago`;
    }
    if (diffDays < 7) {
      return `${diffDays}d ago`;
    }
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Wishlists</Text>
        </View>
        <ScrollView style={styles.content}>
          <ListItemSkeleton />
          <ListItemSkeleton />
          <ListItemSkeleton />
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Wishlists</Text>
        <TouchableOpacity onPress={openCreateModal} style={styles.headerButton}>
          <IconSymbol
            ios_icon_name="add"
            android_material_icon_name="add"
            size={28}
            color={colors.primary}
          />
        </TouchableOpacity>
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
            title="Create your first wishlist"
            description="Start saving items you love by creating your first wishlist"
            actionLabel="New Wishlist"
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

      <View style={styles.fabContainer}>
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
      </View>

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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    ...containerStyles.screen,
    paddingTop: Platform.OS === 'android' ? 48 : 0,
  },
  header: {
    ...containerStyles.spaceBetween,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    ...typography.titleLarge,
  },
  headerButton: {
    padding: spacing.xs,
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
  fabContainer: {
    position: 'absolute',
    bottom: 100,
    right: spacing.md,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    ...containerStyles.center,
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
