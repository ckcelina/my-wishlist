
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { useAuth } from '@/contexts/AuthContext';

interface Item {
  id: string;
  name: string;
  imageUrl: string;
  currentPrice: number;
  currency: string;
  sourceUrl: string;
  createdAt: string;
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
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddItem, setShowAddItem] = useState(false);
  const [itemUrl, setItemUrl] = useState('');
  const [extracting, setExtracting] = useState(false);

  useEffect(() => {
    console.log('WishlistDetailScreen: Component mounted, wishlist ID:', id);
    if (!authLoading && !user) {
      console.log('WishlistDetailScreen: No user found, redirecting to auth');
      router.replace('/auth');
      return;
    }
    if (user && id) {
      fetchItems();
    }
  }, [user, id, authLoading]);

  const fetchItems = async () => {
    console.log('WishlistDetailScreen: Fetching items for wishlist:', id);
    try {
      setLoading(true);
      const { apiGet } = await import('@/utils/api');
      const data = await apiGet<Item[]>(`/api/wishlists/${id}/items`);
      console.log('WishlistDetailScreen: Fetched items:', data.length);
      setItems(data);
    } catch (error) {
      console.error('WishlistDetailScreen: Error fetching items:', error);
      Alert.alert('Error', 'Failed to load items');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    console.log('WishlistDetailScreen: User triggered refresh');
    setRefreshing(true);
    fetchItems();
  };

  const handleAddItem = async () => {
    console.log('WishlistDetailScreen: Adding item from URL:', itemUrl);
    if (!itemUrl.trim()) {
      Alert.alert('Error', 'Please enter a URL');
      return;
    }

    try {
      setExtracting(true);
      const { authenticatedPost } = await import('@/utils/api');
      
      // Extract item data from URL using AI
      const extractedData = await authenticatedPost<{
        name: string;
        imageUrl: string;
        price: string;
        currency: string;
        sourceUrl: string;
      }>('/api/items/extract', { url: itemUrl });
      console.log('WishlistDetailScreen: Extracted item data:', extractedData);

      // Create the item in the wishlist
      const newItem = await authenticatedPost<Item>('/api/items', {
        wishlistId: id,
        name: extractedData.name,
        imageUrl: extractedData.imageUrl,
        currentPrice: extractedData.price,
        currency: extractedData.currency,
        sourceUrl: extractedData.sourceUrl,
      });
      console.log('WishlistDetailScreen: Created item:', newItem.id);
      setItems([newItem, ...items]);
      setItemUrl('');
      setShowAddItem(false);
    } catch (error) {
      console.error('WishlistDetailScreen: Error adding item:', error);
      Alert.alert('Error', 'Failed to add item');
    } finally {
      setExtracting(false);
    }
  };

  const handleDeleteItem = async (itemId: string, itemName: string) => {
    console.log('WishlistDetailScreen: Delete requested for item:', itemId);
    Alert.alert(
      'Delete Item',
      `Remove "${itemName}" from wishlist?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            console.log('WishlistDetailScreen: Deleting item:', itemId);
            try {
              const { authenticatedDelete } = await import('@/utils/api');
              await authenticatedDelete(`/api/items/${itemId}`);
              console.log('WishlistDetailScreen: Item deleted successfully');
              setItems(items.filter(i => i.id !== itemId));
            } catch (error) {
              console.error('WishlistDetailScreen: Error deleting item:', error);
              Alert.alert('Error', 'Failed to delete item');
            }
          },
        },
      ]
    );
  };

  const handleItemPress = (item: Item) => {
    console.log('WishlistDetailScreen: Opening item details:', item.id);
    router.push(`/item/${item.id}`);
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Wishlist',
          headerBackTitle: 'Back',
        }}
      />
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setShowAddItem(true)}
          >
            <IconSymbol
              ios_icon_name="plus"
              android_material_icon_name="add"
              size={20}
              color="#FFFFFF"
            />
            <Text style={styles.addButtonText}>Add Item</Text>
          </TouchableOpacity>
        </View>

        {showAddItem && (
          <View style={styles.addItemContainer}>
            <TextInput
              style={styles.input}
              placeholder="Paste product URL"
              placeholderTextColor={colors.textSecondary}
              value={itemUrl}
              onChangeText={setItemUrl}
              autoFocus
              autoCapitalize="none"
              autoCorrect={false}
            />
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={() => {
                  setShowAddItem(false);
                  setItemUrl('');
                }}
                disabled={extracting}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.createButton]}
                onPress={handleAddItem}
                disabled={extracting}
              >
                <Text style={styles.createButtonText}>
                  {extracting ? 'Extracting...' : 'Add'}
                </Text>
              </TouchableOpacity>
            </View>
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
                Tap &quot;Add Item&quot; to save your first item
              </Text>
            </View>
          ) : (
            items.map((item) => {
              const priceText = `${item.currency} ${item.currentPrice.toFixed(2)}`;
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
                      {item.name}
                    </Text>
                    <View style={styles.priceContainer}>
                      <Text style={styles.itemPrice}>{priceText}</Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => handleDeleteItem(item.id, item.name)}
                  >
                    <IconSymbol
                      ios_icon_name="trash"
                      android_material_icon_name="delete"
                      size={20}
                      color={colors.textSecondary}
                    />
                  </TouchableOpacity>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    gap: 8,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  addItemContainer: {
    backgroundColor: colors.card,
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  input: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: colors.text,
    marginBottom: 12,
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
  createButton: {
    backgroundColor: colors.primary,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
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
  priceContainer: {
    backgroundColor: colors.highlight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  deleteButton: {
    padding: 8,
  },
});
