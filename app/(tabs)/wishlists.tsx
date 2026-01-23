
import React, { useState, useEffect } from 'react';
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
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { useAuth } from '@/contexts/AuthContext';

interface Wishlist {
  id: string;
  name: string;
  isDefault: boolean;
  itemCount: number;
  createdAt: string;
}

export default function WishlistsScreen() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [wishlists, setWishlists] = useState<Wishlist[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [selectedWishlist, setSelectedWishlist] = useState<Wishlist | null>(null);
  const [wishlistName, setWishlistName] = useState('');

  useEffect(() => {
    console.log('WishlistsScreen: Component mounted, user:', user?.email);
    if (!loading && !user) {
      console.log('WishlistsScreen: No user found, redirecting to auth');
      router.replace('/auth');
      return;
    }
    if (user) {
      fetchWishlists();
    }
  }, [user, loading]);

  const fetchWishlists = async () => {
    console.log('WishlistsScreen: Fetching wishlists');
    try {
      setDataLoading(true);
      const { authenticatedGet } = await import('@/utils/api');
      const data = await authenticatedGet<Wishlist[]>('/api/wishlists');
      console.log('WishlistsScreen: Fetched wishlists:', data.length);
      setWishlists(data);
    } catch (error) {
      console.error('WishlistsScreen: Error fetching wishlists:', error);
      Alert.alert('Error', 'Failed to load wishlists');
    } finally {
      setDataLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    console.log('WishlistsScreen: User triggered refresh');
    setRefreshing(true);
    fetchWishlists();
  };

  const handleCreateWishlist = async () => {
    console.log('WishlistsScreen: Creating new wishlist:', wishlistName);
    if (!wishlistName.trim()) {
      Alert.alert('Error', 'Please enter a wishlist name');
      return;
    }

    try {
      const { authenticatedPost } = await import('@/utils/api');
      const newWishlist = await authenticatedPost<Wishlist>('/api/wishlists', { 
        name: wishlistName 
      });
      console.log('WishlistsScreen: Created wishlist:', newWishlist.id);
      setWishlists([...wishlists, { ...newWishlist, itemCount: 0, isDefault: false }]);
      setWishlistName('');
      setShowCreateModal(false);
    } catch (error) {
      console.error('WishlistsScreen: Error creating wishlist:', error);
      Alert.alert('Error', 'Failed to create wishlist');
    }
  };

  const handleRenameWishlist = async () => {
    console.log('WishlistsScreen: Renaming wishlist:', selectedWishlist?.id);
    if (!wishlistName.trim()) {
      Alert.alert('Error', 'Please enter a wishlist name');
      return;
    }

    if (!selectedWishlist) {
      return;
    }

    try {
      const { authenticatedPut } = await import('@/utils/api');
      await authenticatedPut(`/api/wishlists/${selectedWishlist.id}`, { 
        name: wishlistName 
      });
      console.log('WishlistsScreen: Renamed wishlist successfully');
      setWishlists(wishlists.map(w => 
        w.id === selectedWishlist.id ? { ...w, name: wishlistName } : w
      ));
      setWishlistName('');
      setShowRenameModal(false);
      setSelectedWishlist(null);
    } catch (error) {
      console.error('WishlistsScreen: Error renaming wishlist:', error);
      Alert.alert('Error', 'Failed to rename wishlist');
    }
  };

  const handleDeleteWishlist = async (wishlist: Wishlist) => {
    console.log('WishlistsScreen: Delete requested for wishlist:', wishlist.id);
    setShowContextMenu(false);
    
    Alert.alert(
      'Delete Wishlist',
      `Are you sure you want to delete "${wishlist.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            console.log('WishlistsScreen: Deleting wishlist:', wishlist.id);
            try {
              const { authenticatedDelete } = await import('@/utils/api');
              await authenticatedDelete(`/api/wishlists/${wishlist.id}`);
              console.log('WishlistsScreen: Wishlist deleted successfully');
              setWishlists(wishlists.filter(w => w.id !== wishlist.id));
            } catch (error) {
              console.error('WishlistsScreen: Error deleting wishlist:', error);
              Alert.alert('Error', 'Failed to delete wishlist');
            }
          },
        },
      ]
    );
  };

  const handleWishlistPress = (wishlist: Wishlist) => {
    console.log('WishlistsScreen: Opening wishlist:', wishlist.id);
    router.push(`/wishlist/${wishlist.id}`);
  };

  const handleWishlistLongPress = (wishlist: Wishlist) => {
    console.log('WishlistsScreen: Long press on wishlist:', wishlist.id);
    setSelectedWishlist(wishlist);
    setShowContextMenu(true);
  };

  const openRenameModal = () => {
    if (selectedWishlist) {
      setWishlistName(selectedWishlist.name);
      setShowContextMenu(false);
      setShowRenameModal(true);
    }
  };

  const openCreateModal = () => {
    console.log('WishlistsScreen: Opening create modal');
    setWishlistName('');
    setShowCreateModal(true);
  };

  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyContainer}>
          <IconSymbol
            ios_icon_name="heart.slash"
            android_material_icon_name="heart-broken"
            size={64}
            color={colors.textSecondary}
          />
          <Text style={styles.emptyText}>Please sign in to view your wishlists</Text>
        </View>
      </SafeAreaView>
    );
  }

  const emptyText = 'No wishlists yet';
  const emptySubtext = 'Tap the + button to create your first wishlist';
  const loadingText = 'Loading wishlists...';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Wishlists</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={openCreateModal}
        >
          <IconSymbol
            ios_icon_name="plus"
            android_material_icon_name="add"
            size={24}
            color={colors.primary}
          />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {dataLoading && wishlists.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>{loadingText}</Text>
          </View>
        ) : wishlists.length === 0 ? (
          <View style={styles.emptyContainer}>
            <IconSymbol
              ios_icon_name="heart"
              android_material_icon_name="favorite-border"
              size={64}
              color={colors.textSecondary}
            />
            <Text style={styles.emptyText}>{emptyText}</Text>
            <Text style={styles.emptySubtext}>{emptySubtext}</Text>
          </View>
        ) : (
          wishlists.map((wishlist) => {
            const itemCountText = `${wishlist.itemCount} ${wishlist.itemCount === 1 ? 'item' : 'items'}`;
            return (
              <TouchableOpacity
                key={wishlist.id}
                style={styles.wishlistCard}
                onPress={() => handleWishlistPress(wishlist)}
                onLongPress={() => handleWishlistLongPress(wishlist)}
                activeOpacity={0.7}
              >
                <View style={styles.wishlistIcon}>
                  <IconSymbol
                    ios_icon_name="heart.fill"
                    android_material_icon_name="favorite"
                    size={28}
                    color={colors.primary}
                  />
                </View>
                <View style={styles.wishlistInfo}>
                  <Text style={styles.wishlistName}>{wishlist.name}</Text>
                  <Text style={styles.wishlistCount}>{itemCountText}</Text>
                </View>
                <TouchableOpacity
                  style={styles.menuButton}
                  onPress={() => handleWishlistLongPress(wishlist)}
                >
                  <IconSymbol
                    ios_icon_name="ellipsis"
                    android_material_icon_name="more-vert"
                    size={20}
                    color={colors.textSecondary}
                  />
                </TouchableOpacity>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      {/* Create Wishlist Modal */}
      <Modal
        visible={showCreateModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCreateModal(false)}
      >
        <Pressable 
          style={styles.modalOverlay}
          onPress={() => setShowCreateModal(false)}
        >
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>Create Wishlist</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Wishlist name"
              placeholderTextColor={colors.textSecondary}
              value={wishlistName}
              onChangeText={setWishlistName}
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowCreateModal(false);
                  setWishlistName('');
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.createButton]}
                onPress={handleCreateWishlist}
              >
                <Text style={styles.createButtonText}>Create</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Rename Wishlist Modal */}
      <Modal
        visible={showRenameModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowRenameModal(false)}
      >
        <Pressable 
          style={styles.modalOverlay}
          onPress={() => setShowRenameModal(false)}
        >
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>Rename Wishlist</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Wishlist name"
              placeholderTextColor={colors.textSecondary}
              value={wishlistName}
              onChangeText={setWishlistName}
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowRenameModal(false);
                  setWishlistName('');
                  setSelectedWishlist(null);
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.createButton]}
                onPress={handleRenameWishlist}
              >
                <Text style={styles.createButtonText}>Rename</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Context Menu Modal */}
      <Modal
        visible={showContextMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowContextMenu(false)}
      >
        <Pressable 
          style={styles.modalOverlay}
          onPress={() => setShowContextMenu(false)}
        >
          <Pressable style={styles.contextMenu} onPress={(e) => e.stopPropagation()}>
            <TouchableOpacity
              style={styles.contextMenuItem}
              onPress={openRenameModal}
            >
              <IconSymbol
                ios_icon_name="pencil"
                android_material_icon_name="edit"
                size={20}
                color={colors.text}
              />
              <Text style={styles.contextMenuText}>Rename</Text>
            </TouchableOpacity>
            <View style={styles.contextMenuDivider} />
            <TouchableOpacity
              style={styles.contextMenuItem}
              onPress={() => selectedWishlist && handleDeleteWishlist(selectedWishlist)}
            >
              <IconSymbol
                ios_icon_name="trash"
                android_material_icon_name="delete"
                size={20}
                color={colors.accent}
              />
              <Text style={[styles.contextMenuText, styles.deleteText]}>Delete</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: Platform.OS === 'android' ? 48 : 0,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.text,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.backgroundAlt,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
  wishlistCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.04)',
    elevation: 2,
  },
  wishlistIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.backgroundAlt,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  wishlistInfo: {
    flex: 1,
  },
  wishlistName: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  wishlistCount: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  menuButton: {
    padding: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 24,
    width: '85%',
    maxWidth: 400,
    boxShadow: '0px 10px 40px rgba(0, 0, 0, 0.2)',
    elevation: 5,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 20,
    textAlign: 'center',
  },
  modalInput: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: colors.text,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: colors.backgroundAlt,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  createButton: {
    backgroundColor: colors.primary,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  contextMenu: {
    backgroundColor: colors.card,
    borderRadius: 16,
    width: '70%',
    maxWidth: 300,
    overflow: 'hidden',
    boxShadow: '0px 10px 40px rgba(0, 0, 0, 0.2)',
    elevation: 5,
  },
  contextMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  contextMenuText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  deleteText: {
    color: colors.accent,
  },
  contextMenuDivider: {
    height: 1,
    backgroundColor: colors.border,
  },
});
