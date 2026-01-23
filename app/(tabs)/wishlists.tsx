
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
  const [showNewWishlist, setShowNewWishlist] = useState(false);
  const [newWishlistName, setNewWishlistName] = useState('');

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
    console.log('WishlistsScreen: Creating new wishlist:', newWishlistName);
    if (!newWishlistName.trim()) {
      Alert.alert('Error', 'Please enter a wishlist name');
      return;
    }

    try {
      const { authenticatedPost } = await import('@/utils/api');
      const newWishlist = await authenticatedPost<Wishlist>('/api/wishlists', { 
        name: newWishlistName 
      });
      console.log('WishlistsScreen: Created wishlist:', newWishlist.id);
      setWishlists([...wishlists, newWishlist]);
      setNewWishlistName('');
      setShowNewWishlist(false);
    } catch (error) {
      console.error('WishlistsScreen: Error creating wishlist:', error);
      Alert.alert('Error', 'Failed to create wishlist');
    }
  };

  const handleDeleteWishlist = async (id: string, name: string) => {
    console.log('WishlistsScreen: Delete requested for wishlist:', id);
    Alert.alert(
      'Delete Wishlist',
      `Are you sure you want to delete "${name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            console.log('WishlistsScreen: Deleting wishlist:', id);
            try {
              const { authenticatedDelete } = await import('@/utils/api');
              await authenticatedDelete(`/api/wishlists/${id}`);
              console.log('WishlistsScreen: Wishlist deleted successfully');
              setWishlists(wishlists.filter(w => w.id !== id));
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

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>My Wishlists</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowNewWishlist(true)}
        >
          <IconSymbol
            ios_icon_name="plus"
            android_material_icon_name="add"
            size={24}
            color={colors.primary}
          />
        </TouchableOpacity>
      </View>

      {showNewWishlist && (
        <View style={styles.newWishlistContainer}>
          <TextInput
            style={styles.input}
            placeholder="Wishlist name"
            placeholderTextColor={colors.textSecondary}
            value={newWishlistName}
            onChangeText={setNewWishlistName}
            autoFocus
          />
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={() => {
                setShowNewWishlist(false);
                setNewWishlistName('');
              }}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.createButton]}
              onPress={handleCreateWishlist}
            >
              <Text style={styles.createButtonText}>Create</Text>
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
        {dataLoading && wishlists.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Loading wishlists...</Text>
          </View>
        ) : wishlists.length === 0 ? (
          <View style={styles.emptyContainer}>
            <IconSymbol
              ios_icon_name="heart"
              android_material_icon_name="favorite-border"
              size={64}
              color={colors.textSecondary}
            />
            <Text style={styles.emptyText}>No wishlists yet</Text>
            <Text style={styles.emptySubtext}>
              Tap the + button to create your first wishlist
            </Text>
          </View>
        ) : (
          wishlists.map((wishlist) => {
            const itemCountText = `${wishlist.itemCount} ${wishlist.itemCount === 1 ? 'item' : 'items'}`;
            return (
              <TouchableOpacity
                key={wishlist.id}
                style={styles.wishlistCard}
                onPress={() => handleWishlistPress(wishlist)}
              >
                <View style={styles.wishlistIcon}>
                  <IconSymbol
                    ios_icon_name="heart.fill"
                    android_material_icon_name="favorite"
                    size={32}
                    color={colors.primary}
                  />
                </View>
                <View style={styles.wishlistInfo}>
                  <View style={styles.wishlistHeader}>
                    <Text style={styles.wishlistName}>{wishlist.name}</Text>
                    {wishlist.isDefault && (
                      <View style={styles.defaultBadge}>
                        <Text style={styles.defaultBadgeText}>Default</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.wishlistCount}>{itemCountText}</Text>
                </View>
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => handleDeleteWishlist(wishlist.id, wishlist.name)}
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
  newWishlistContainer: {
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
  wishlistCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
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
  wishlistHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  wishlistName: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  defaultBadge: {
    backgroundColor: colors.highlight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  defaultBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
  },
  wishlistCount: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
  deleteButton: {
    padding: 8,
  },
});
