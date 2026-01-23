
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
  Image,
  ImageSourcePropType,
  Platform,
  Modal,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { useAuth } from '@/contexts/AuthContext';

interface Item {
  id: string;
  title: string;
  imageUrl: string;
  currentPrice: number | null;
  currency: string;
  originalUrl: string | null;
  createdAt: string;
  lastCheckedAt?: string | null;
}

interface Wishlist {
  id: string;
  name: string;
  isDefault: boolean;
  itemCount: number;
  createdAt: string;
}

interface PriceDropInfo {
  [itemId: string]: {
    priceDropped: boolean;
    percentageChange: number | null;
  };
}

function resolveImageSource(source: string | number | ImageSourcePropType | undefined): ImageSourcePropType {
  if (!source) return { uri: '' };
  if (typeof source === 'string') return { uri: source };
  return source as ImageSourcePropType;
}

export default function WishlistDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { user, loading: authLoading } = useAuth();
  const [wishlist, setWishlist] = useState<Wishlist | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [priceDropInfo, setPriceDropInfo] = useState<PriceDropInfo>({});

  useEffect(() => {
    console.log('WishlistDetailScreen: Component mounted, wishlist ID:', id);
    if (!authLoading && !user) {
      console.log('WishlistDetailScreen: No user found, redirecting to auth');
      router.replace('/auth');
      return;
    }
    if (user && id) {
      fetchWishlistAndItems();
    }
  }, [user, id, authLoading]);

  const fetchWishlistAndItems = async () => {
    console.log('WishlistDetailScreen: Fetching wishlist and items for:', id);
    try {
      setLoading(true);
      const { authenticatedGet } = await import('@/utils/api');
      
      // Fetch wishlist details
      const wishlistData = await authenticatedGet<Wishlist>(`/api/wishlists/${id}`);
      console.log('WishlistDetailScreen: Fetched wishlist:', wishlistData.name);
      setWishlist(wishlistData);
      setNewName(wishlistData.name);
      
      // Fetch items
      const itemsData = await authenticatedGet<Item[]>(`/api/wishlists/${id}/items`);
      console.log('WishlistDetailScreen: Fetched items:', itemsData.length);
      setItems(itemsData);

      // Fetch price drop info for each item
      const priceDropData: PriceDropInfo = {};
      await Promise.all(
        itemsData.map(async (item) => {
          try {
            const dropInfo = await authenticatedGet<{
              priceDropped: boolean;
              originalPrice: number | null;
              currentPrice: number | null;
              percentageChange: number | null;
            }>(`/api/items/${item.id}/price-dropped`);
            priceDropData[item.id] = {
              priceDropped: dropInfo.priceDropped,
              percentageChange: dropInfo.percentageChange,
            };
          } catch (error) {
            console.error('WishlistDetailScreen: Error fetching price drop info for item:', item.id, error);
          }
        })
      );
      setPriceDropInfo(priceDropData);
    } catch (error) {
      console.error('WishlistDetailScreen: Error fetching data:', error);
      Alert.alert('Error', 'Failed to load wishlist');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    console.log('WishlistDetailScreen: User triggered refresh');
    setRefreshing(true);
    fetchWishlistAndItems();
  };

  const handleAddItem = () => {
    console.log('WishlistDetailScreen: Navigating to Add Item screen with wishlistId:', id);
    router.push(`/(tabs)/add?wishlistId=${id}`);
  };

  const handleItemPress = (item: Item) => {
    console.log('WishlistDetailScreen: Opening item details:', item.id);
    router.push(`/item/${item.id}`);
  };

  const handleRenameWishlist = async () => {
    console.log('WishlistDetailScreen: Renaming wishlist to:', newName);
    if (!newName.trim()) {
      Alert.alert('Error', 'Wishlist name cannot be empty');
      return;
    }

    try {
      const { authenticatedPut } = await import('@/utils/api');
      const updated = await authenticatedPut<Wishlist>(`/api/wishlists/${id}`, {
        name: newName.trim(),
      });
      console.log('WishlistDetailScreen: Wishlist renamed successfully');
      setWishlist(updated);
      setShowRenameModal(false);
      setShowMenu(false);
    } catch (error) {
      console.error('WishlistDetailScreen: Error renaming wishlist:', error);
      Alert.alert('Error', 'Failed to rename wishlist');
    }
  };

  const handleDeleteWishlist = () => {
    console.log('WishlistDetailScreen: Delete wishlist requested');
    setShowMenu(false);
    
    const wishlistName = wishlist?.name || 'this wishlist';
    
    Alert.alert(
      'Delete Wishlist',
      `Are you sure you want to delete "${wishlistName}"? This will also delete all items in it.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            console.log('WishlistDetailScreen: Deleting wishlist:', id);
            try {
              const { authenticatedDelete } = await import('@/utils/api');
              await authenticatedDelete(`/api/wishlists/${id}`);
              console.log('WishlistDetailScreen: Wishlist deleted successfully');
              router.back();
            } catch (error) {
              console.error('WishlistDetailScreen: Error deleting wishlist:', error);
              Alert.alert('Error', 'Failed to delete wishlist');
            }
          },
        },
      ]
    );
  };

  const openRenameModal = () => {
    console.log('WishlistDetailScreen: Opening rename modal');
    setShowMenu(false);
    setShowRenameModal(true);
  };

  const wishlistName = wishlist?.name || 'Wishlist';

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: wishlistName,
          headerBackTitle: 'Back',
          headerRight: () => (
            <TouchableOpacity
              onPress={() => setShowMenu(true)}
              style={styles.headerButton}
            >
              <IconSymbol
                ios_icon_name="ellipsis.circle"
                android_material_icon_name="more-vert"
                size={24}
                color={colors.text}
              />
            </TouchableOpacity>
          ),
        }}
      />
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
        >
          {loading && items.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Loading items...</Text>
            </View>
          ) : items.length === 0 ? (
            <View style={styles.emptyContainer}>
              <IconSymbol
                ios_icon_name="gift"
                android_material_icon_name="card-giftcard"
                size={64}
                color={colors.textSecondary}
              />
              <Text style={styles.emptyText}>No items yet</Text>
              <Text style={styles.emptySubtext}>
                Tap the + button to add your first item
              </Text>
            </View>
          ) : (
            items.map((item) => {
              const priceText = item.currentPrice 
                ? `${item.currency} ${item.currentPrice.toFixed(2)}` 
                : 'No price';
              const dropInfo = priceDropInfo[item.id];
              const hasPriceDrop = dropInfo?.priceDropped === true;
              const percentageChange = dropInfo?.percentageChange;
              
              return (
                <TouchableOpacity
                  key={item.id}
                  style={styles.itemCard}
                  onPress={() => handleItemPress(item)}
                >
                  <Image
                    source={resolveImageSource(item.imageUrl)}
                    style={styles.itemImage}
                    resizeMode="cover"
                  />
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemName} numberOfLines={2}>
                      {item.title}
                    </Text>
                    <View style={styles.priceRow}>
                      <View style={styles.priceContainer}>
                        <Text style={styles.itemPrice}>{priceText}</Text>
                      </View>
                      {hasPriceDrop && percentageChange && (
                        <View style={styles.priceDropBadge}>
                          <IconSymbol
                            ios_icon_name="arrow.down"
                            android_material_icon_name="arrow-downward"
                            size={12}
                            color="#10B981"
                          />
                          <Text style={styles.priceDropText}>
                            {Math.abs(percentageChange).toFixed(0)}% off
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                  <IconSymbol
                    ios_icon_name="chevron.right"
                    android_material_icon_name="chevron-right"
                    size={20}
                    color={colors.textSecondary}
                  />
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>

        {/* Floating Action Button */}
        <TouchableOpacity
          style={styles.fab}
          onPress={handleAddItem}
          activeOpacity={0.8}
        >
          <IconSymbol
            ios_icon_name="plus"
            android_material_icon_name="add"
            size={28}
            color="#FFFFFF"
          />
        </TouchableOpacity>

        {/* Menu Modal */}
        <Modal
          visible={showMenu}
          transparent
          animationType="fade"
          onRequestClose={() => setShowMenu(false)}
        >
          <Pressable
            style={styles.modalOverlay}
            onPress={() => setShowMenu(false)}
          >
            <View style={styles.menuContainer}>
              <TouchableOpacity
                style={styles.menuItem}
                onPress={openRenameModal}
              >
                <IconSymbol
                  ios_icon_name="pencil"
                  android_material_icon_name="edit"
                  size={20}
                  color={colors.text}
                />
                <Text style={styles.menuItemText}>Rename Wishlist</Text>
              </TouchableOpacity>
              <View style={styles.menuDivider} />
              <TouchableOpacity
                style={styles.menuItem}
                onPress={handleDeleteWishlist}
              >
                <IconSymbol
                  ios_icon_name="trash"
                  android_material_icon_name="delete"
                  size={20}
                  color="#EF4444"
                />
                <Text style={[styles.menuItemText, styles.deleteText]}>
                  Delete Wishlist
                </Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Modal>

        {/* Rename Modal */}
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
            <Pressable style={styles.renameModalContainer}>
              <Text style={styles.modalTitle}>Rename Wishlist</Text>
              <TextInput
                style={styles.input}
                placeholder="Wishlist name"
                placeholderTextColor={colors.textSecondary}
                value={newName}
                onChangeText={setNewName}
                autoFocus
                autoCapitalize="words"
              />
              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={[styles.button, styles.cancelButton]}
                  onPress={() => {
                    setShowRenameModal(false);
                    setNewName(wishlist?.name || '');
                  }}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.button, styles.saveButton]}
                  onPress={handleRenameWishlist}
                >
                  <Text style={styles.saveButtonText}>Save</Text>
                </TouchableOpacity>
              </View>
            </Pressable>
          </Pressable>
        </Modal>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerButton: {
    padding: 8,
    marginRight: 8,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
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
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  itemImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: colors.backgroundAlt,
    marginRight: 12,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  priceContainer: {
    backgroundColor: colors.highlight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  priceDropBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    gap: 4,
  },
  priceDropText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#10B981',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuContainer: {
    backgroundColor: colors.card,
    borderRadius: 12,
    marginHorizontal: 20,
    width: '80%',
    maxWidth: 300,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  menuItemText: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
  },
  deleteText: {
    color: '#EF4444',
  },
  menuDivider: {
    height: 1,
    backgroundColor: colors.border,
  },
  renameModalContainer: {
    backgroundColor: colors.card,
    borderRadius: 12,
    marginHorizontal: 20,
    padding: 20,
    width: '80%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16,
    textAlign: 'center',
  },
  input: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: colors.text,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
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
  saveButton: {
    backgroundColor: colors.primary,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
