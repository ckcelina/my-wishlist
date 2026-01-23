
import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  Share,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { useAuth } from '@/contexts/AuthContext';
import * as Clipboard from 'expo-clipboard';

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

type SortOption = 'Recently added' | 'Price: Low to High' | 'Price: High to Low';

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
  const [showShareModal, setShowShareModal] = useState(false);
  const [showSortModal, setShowSortModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [priceDropInfo, setPriceDropInfo] = useState<PriceDropInfo>({});
  const [shareVisibility, setShareVisibility] = useState<'public' | 'unlisted'>('public');
  const [shareLoading, setShareLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOption, setSortOption] = useState<SortOption>('Recently added');
  const [refreshingPrices, setRefreshingPrices] = useState(false);

  const fetchWishlistAndItems = useCallback(async () => {
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
  }, [id]);

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
  }, [user, id, authLoading, fetchWishlistAndItems, router]);

  // Filter and sort items
  const filteredAndSortedItems = useMemo(() => {
    console.log('WishlistDetailScreen: Filtering and sorting items with search:', searchTerm, 'sort:', sortOption);
    
    // Filter by search term
    let filtered = items;
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      filtered = items.filter(item => 
        item.title.toLowerCase().includes(searchLower)
      );
    }

    // Sort items
    const sorted = [...filtered];
    if (sortOption === 'Recently added') {
      sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } else if (sortOption === 'Price: Low to High') {
      sorted.sort((a, b) => {
        const priceA = a.currentPrice ?? Infinity;
        const priceB = b.currentPrice ?? Infinity;
        return priceA - priceB;
      });
    } else if (sortOption === 'Price: High to Low') {
      sorted.sort((a, b) => {
        const priceA = a.currentPrice ?? -Infinity;
        const priceB = b.currentPrice ?? -Infinity;
        return priceB - priceA;
      });
    }

    return sorted;
  }, [items, searchTerm, sortOption]);

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

  const openShareModal = () => {
    console.log('WishlistDetailScreen: Opening share modal');
    setShowMenu(false);
    setShowShareModal(true);
  };

  const openSortModal = () => {
    console.log('WishlistDetailScreen: Opening sort modal');
    setShowSortModal(true);
  };

  const handleSortSelect = (option: SortOption) => {
    console.log('WishlistDetailScreen: Sort option selected:', option);
    setSortOption(option);
    setShowSortModal(false);
  };

  const handleShareWishlist = async () => {
    console.log('WishlistDetailScreen: Sharing wishlist with visibility:', shareVisibility);
    setShareLoading(true);
    
    try {
      const { authenticatedPost } = await import('@/utils/api');
      
      const response = await authenticatedPost<{
        shareSlug: string;
        visibility: string;
        shareUrl: string;
      }>(`/api/wishlists/${id}/share`, {
        visibility: shareVisibility,
      });
      
      console.log('WishlistDetailScreen: Share created:', response.shareSlug);
      
      const shareUrl = response.shareUrl;
      
      setShowShareModal(false);
      
      // Share the link
      if (Platform.OS === 'web') {
        await Clipboard.setStringAsync(shareUrl);
        Alert.alert('Link Copied', 'Share link has been copied to clipboard');
      } else {
        try {
          await Share.share({
            message: `Check out my wishlist: ${wishlist?.name}\n${shareUrl}`,
            url: shareUrl,
          });
        } catch (error) {
          console.error('WishlistDetailScreen: Error sharing:', error);
        }
      }
    } catch (error) {
      console.error('WishlistDetailScreen: Error creating share link:', error);
      Alert.alert('Error', 'Failed to create share link');
    } finally {
      setShareLoading(false);
    }
  };

  const handleRefreshPrices = async () => {
    console.log('WishlistDetailScreen: Refreshing prices for wishlist:', id);
    setRefreshingPrices(true);
    
    try {
      const { authenticatedPost } = await import('@/utils/api');
      
      const response = await authenticatedPost<{
        success: boolean;
        itemsChecked: number;
        itemsUpdated: number;
        priceDrops: Array<{
          itemId: string;
          oldPrice: number;
          newPrice: number;
          percentageChange: number;
        }>;
      }>(`/api/wishlists/${id}/refresh-prices`, {});
      
      console.log('WishlistDetailScreen: Price refresh complete:', response);
      
      // Show result to user
      const itemsCheckedText = `${response.itemsChecked} ${response.itemsChecked === 1 ? 'item' : 'items'}`;
      const itemsUpdatedText = `${response.itemsUpdated} ${response.itemsUpdated === 1 ? 'price' : 'prices'}`;
      
      if (response.priceDrops.length > 0) {
        const priceDropsText = response.priceDrops.length === 1 
          ? '1 price drop detected!' 
          : `${response.priceDrops.length} price drops detected!`;
        Alert.alert(
          'Prices Updated',
          `Checked ${itemsCheckedText}. Updated ${itemsUpdatedText}.\n\n${priceDropsText}`,
          [{ text: 'OK' }]
        );
      } else if (response.itemsUpdated > 0) {
        Alert.alert(
          'Prices Updated',
          `Checked ${itemsCheckedText}. Updated ${itemsUpdatedText}.`,
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert(
          'Prices Checked',
          `Checked ${itemsCheckedText}. No price changes detected.`,
          [{ text: 'OK' }]
        );
      }
      
      // Refresh the list to show updated prices
      await fetchWishlistAndItems();
    } catch (error) {
      console.error('WishlistDetailScreen: Error refreshing prices:', error);
      Alert.alert('Error', 'Failed to refresh prices. Please try again.');
    } finally {
      setRefreshingPrices(false);
    }
  };

  const wishlistName = wishlist?.name || 'Wishlist';
  const hasSearchOrSort = searchTerm.trim() !== '' || sortOption !== 'Recently added';
  const resultCountText = `${filteredAndSortedItems.length} ${filteredAndSortedItems.length === 1 ? 'item' : 'items'}`;

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: wishlistName,
          headerBackTitle: 'Back',
          headerRight: () => (
            <View style={styles.headerButtons}>
              <TouchableOpacity
                onPress={handleRefreshPrices}
                style={styles.headerButton}
                disabled={refreshingPrices}
              >
                <IconSymbol
                  ios_icon_name="arrow.clockwise"
                  android_material_icon_name="refresh"
                  size={24}
                  color={refreshingPrices ? colors.textSecondary : colors.text}
                />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={openShareModal}
                style={styles.headerButton}
              >
                <IconSymbol
                  ios_icon_name="square.and.arrow.up"
                  android_material_icon_name="share"
                  size={24}
                  color={colors.text}
                />
              </TouchableOpacity>
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
            </View>
          ),
        }}
      />
      <SafeAreaView style={styles.container} edges={['bottom']}>
        {/* Search and Sort Bar */}
        <View style={styles.searchSortContainer}>
          <View style={styles.searchContainer}>
            <IconSymbol
              ios_icon_name="magnifyingglass"
              android_material_icon_name="search"
              size={20}
              color={colors.textSecondary}
            />
            <TextInput
              style={styles.searchInput}
              placeholder="Search items..."
              placeholderTextColor={colors.textSecondary}
              value={searchTerm}
              onChangeText={setSearchTerm}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {searchTerm.length > 0 && (
              <TouchableOpacity onPress={() => setSearchTerm('')}>
                <IconSymbol
                  ios_icon_name="xmark.circle.fill"
                  android_material_icon_name="cancel"
                  size={20}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity
            style={styles.sortButton}
            onPress={openSortModal}
          >
            <IconSymbol
              ios_icon_name="arrow.up.arrow.down"
              android_material_icon_name="sort"
              size={20}
              color={colors.text}
            />
          </TouchableOpacity>
        </View>

        {/* Result count when filtering/sorting */}
        {hasSearchOrSort && (
          <View style={styles.resultCountContainer}>
            <Text style={styles.resultCountText}>{resultCountText}</Text>
            {sortOption !== 'Recently added' && (
              <Text style={styles.sortIndicator}>{sortOption}</Text>
            )}
          </View>
        )}

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
          ) : filteredAndSortedItems.length === 0 ? (
            <View style={styles.emptyContainer}>
              <IconSymbol
                ios_icon_name="gift"
                android_material_icon_name="card-giftcard"
                size={64}
                color={colors.textSecondary}
              />
              {searchTerm.trim() ? (
                <>
                  <Text style={styles.emptyText}>No items found</Text>
                  <Text style={styles.emptySubtext}>
                    Try a different search term
                  </Text>
                </>
              ) : (
                <>
                  <Text style={styles.emptyText}>No items yet</Text>
                  <Text style={styles.emptySubtext}>
                    Tap the + button to add your first item
                  </Text>
                </>
              )}
            </View>
          ) : (
            filteredAndSortedItems.map((item) => {
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

        {/* Sort Modal */}
        <Modal
          visible={showSortModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowSortModal(false)}
        >
          <Pressable
            style={styles.modalOverlay}
            onPress={() => setShowSortModal(false)}
          >
            <View style={styles.sortModalContainer}>
              <Text style={styles.modalTitle}>Sort Items</Text>
              
              <TouchableOpacity
                style={[
                  styles.sortOption,
                  sortOption === 'Recently added' && styles.sortOptionSelected,
                ]}
                onPress={() => handleSortSelect('Recently added')}
              >
                <Text style={[
                  styles.sortOptionText,
                  sortOption === 'Recently added' && styles.sortOptionTextSelected,
                ]}>
                  Recently added
                </Text>
                {sortOption === 'Recently added' && (
                  <IconSymbol
                    ios_icon_name="checkmark"
                    android_material_icon_name="check"
                    size={20}
                    color={colors.primary}
                  />
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.sortOption,
                  sortOption === 'Price: Low to High' && styles.sortOptionSelected,
                ]}
                onPress={() => handleSortSelect('Price: Low to High')}
              >
                <Text style={[
                  styles.sortOptionText,
                  sortOption === 'Price: Low to High' && styles.sortOptionTextSelected,
                ]}>
                  Price: Low to High
                </Text>
                {sortOption === 'Price: Low to High' && (
                  <IconSymbol
                    ios_icon_name="checkmark"
                    android_material_icon_name="check"
                    size={20}
                    color={colors.primary}
                  />
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.sortOption,
                  sortOption === 'Price: High to Low' && styles.sortOptionSelected,
                ]}
                onPress={() => handleSortSelect('Price: High to Low')}
              >
                <Text style={[
                  styles.sortOptionText,
                  sortOption === 'Price: High to Low' && styles.sortOptionTextSelected,
                ]}>
                  Price: High to Low
                </Text>
                {sortOption === 'Price: High to Low' && (
                  <IconSymbol
                    ios_icon_name="checkmark"
                    android_material_icon_name="check"
                    size={20}
                    color={colors.primary}
                  />
                )}
              </TouchableOpacity>
            </View>
          </Pressable>
        </Modal>

        {/* Share Modal */}
        <Modal
          visible={showShareModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowShareModal(false)}
        >
          <Pressable
            style={styles.modalOverlay}
            onPress={() => setShowShareModal(false)}
          >
            <Pressable style={styles.shareModalContainer}>
              <Text style={styles.modalTitle}>Share Wishlist</Text>
              <Text style={styles.modalSubtitle}>
                Choose who can view this wishlist
              </Text>
              
              <TouchableOpacity
                style={[
                  styles.visibilityOption,
                  shareVisibility === 'public' && styles.visibilityOptionSelected,
                ]}
                onPress={() => setShareVisibility('public')}
              >
                <View style={styles.visibilityOptionContent}>
                  <IconSymbol
                    ios_icon_name="globe"
                    android_material_icon_name="public"
                    size={24}
                    color={shareVisibility === 'public' ? colors.primary : colors.text}
                  />
                  <View style={styles.visibilityTextContainer}>
                    <Text style={[
                      styles.visibilityTitle,
                      shareVisibility === 'public' && styles.visibilityTitleSelected,
                    ]}>
                      Public
                    </Text>
                    <Text style={styles.visibilityDescription}>
                      Anyone with the link can view
                    </Text>
                  </View>
                </View>
                {shareVisibility === 'public' && (
                  <IconSymbol
                    ios_icon_name="checkmark.circle.fill"
                    android_material_icon_name="check-circle"
                    size={24}
                    color={colors.primary}
                  />
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.visibilityOption,
                  shareVisibility === 'unlisted' && styles.visibilityOptionSelected,
                ]}
                onPress={() => setShareVisibility('unlisted')}
              >
                <View style={styles.visibilityOptionContent}>
                  <IconSymbol
                    ios_icon_name="link"
                    android_material_icon_name="link"
                    size={24}
                    color={shareVisibility === 'unlisted' ? colors.primary : colors.text}
                  />
                  <View style={styles.visibilityTextContainer}>
                    <Text style={[
                      styles.visibilityTitle,
                      shareVisibility === 'unlisted' && styles.visibilityTitleSelected,
                    ]}>
                      Unlisted
                    </Text>
                    <Text style={styles.visibilityDescription}>
                      Only people with the link can view
                    </Text>
                  </View>
                </View>
                {shareVisibility === 'unlisted' && (
                  <IconSymbol
                    ios_icon_name="checkmark.circle.fill"
                    android_material_icon_name="check-circle"
                    size={24}
                    color={colors.primary}
                  />
                )}
              </TouchableOpacity>

              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={[styles.button, styles.cancelButton]}
                  onPress={() => setShowShareModal(false)}
                  disabled={shareLoading}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.button, styles.saveButton]}
                  onPress={handleShareWishlist}
                  disabled={shareLoading}
                >
                  <Text style={styles.saveButtonText}>
                    {shareLoading ? 'Creating...' : 'Share'}
                  </Text>
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
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerButton: {
    padding: 8,
  },
  searchSortContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
    gap: 12,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
    padding: 0,
  },
  sortButton: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  resultCountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  resultCountText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  sortIndicator: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.primary,
    backgroundColor: colors.highlight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
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
  sortModalContainer: {
    backgroundColor: colors.card,
    borderRadius: 12,
    marginHorizontal: 20,
    padding: 20,
    width: '80%',
    maxWidth: 400,
  },
  sortOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.backgroundAlt,
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  sortOptionSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.highlight,
  },
  sortOptionText: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
  },
  sortOptionTextSelected: {
    fontWeight: '600',
    color: colors.primary,
  },
  shareModalContainer: {
    backgroundColor: colors.card,
    borderRadius: 12,
    marginHorizontal: 20,
    padding: 20,
    width: '85%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 20,
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
  visibilityOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.backgroundAlt,
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  visibilityOptionSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.highlight,
  },
  visibilityOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  visibilityTextContainer: {
    flex: 1,
  },
  visibilityTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  visibilityTitleSelected: {
    color: colors.primary,
  },
  visibilityDescription: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
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
