
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

      console.log('[WishlistsScreen] Wishlist created successfully');
      setCreateModalVisible(false);
      setNewWishlistName('');
      fetchWishlists();
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

    Alert.alert(
      'Delete Wishlist',
      `Are you sure you want to delete "${wishlist.name}"? This will also delete all items in this wishlist.`,
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

  const handleWishlistLongPress = (wishlist: Wishlist) => {
    console.log('[WishlistsScreen] User long-pressed wishlist:', wishlist.name);
    Alert.alert(
      wishlist.name,
      'What would you like to do?',
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
    setNewWishlistName('');
    setCreateModalVisible(true);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>My Wishlists</Text>
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
        <Text style={styles.headerTitle}>My Wishlists</Text>
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
            title="No Wishlists Yet"
            description="Create your first wishlist to start saving items you love"
            actionLabel="Create Wishlist"
            onAction={openCreateModal}
          />
        ) : (
          <View style={styles.listContainer}>
            {wishlists.map((wishlist, index) => {
              const itemCountText = `${wishlist.itemCount} ${wishlist.itemCount === 1 ? 'item' : 'items'}`;
              
              return (
                <React.Fragment key={index}>
                  <Card
                    key={index}
                    interactive
                    onPress={() => handleWishlistPress(wishlist)}
                    style={styles.wishlistCard}
                  >
                    <TouchableOpacity
                      onLongPress={() => handleWishlistLongPress(wishlist)}
                      activeOpacity={1}
                    >
                      <View style={styles.wishlistHeader}>
                        <View style={styles.wishlistInfo}>
                          <Text style={styles.wishlistName}>{wishlist.name}</Text>
                          {wishlist.isDefault && (
                            <Badge label="Default" variant="info" />
                          )}
                        </View>
                        <IconSymbol
                          ios_icon_name="chevron-right"
                          android_material_icon_name="chevron-right"
                          size={24}
                          color={colors.textTertiary}
                        />
                      </View>
                      <Text style={styles.itemCount}>{itemCountText}</Text>
                    </TouchableOpacity>
                  </Card>
                </React.Fragment>
              );
            })}
          </View>
        )}
      </ScrollView>

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
              placeholderTextColor={colors.textTertiary}
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
              placeholderTextColor={colors.textTertiary}
              value={newWishlistName}
              onChangeText={setNewWishlistName}
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
    paddingBottom: 100,
  },
  wishlistCard: {
    marginBottom: spacing.md,
  },
  wishlistHeader: {
    ...containerStyles.spaceBetween,
    marginBottom: spacing.sm,
  },
  wishlistInfo: {
    ...containerStyles.row,
    flex: 1,
  },
  wishlistName: {
    ...typography.titleSmall,
    flex: 1,
  },
  itemCount: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
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
