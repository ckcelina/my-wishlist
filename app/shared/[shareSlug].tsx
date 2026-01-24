
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  ImageSourcePropType,
  ActivityIndicator,
  TextInput,
  Alert,
  Modal,
  Pressable,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, Stack } from 'expo-router';
import { IconSymbol } from '@/components/IconSymbol';
import { Button } from '@/components/design-system/Button';
import { colors } from '@/styles/commonStyles';
import { BACKEND_URL } from '@/utils/api';

interface SharedItem {
  id: string;
  title: string;
  imageUrl: string | null;
  currentPrice: number | null;
  currency: string;
  isReserved?: boolean;
  reservedByName?: string;
}

interface SharedWishlist {
  id: string;
  name: string;
  visibility: string;
  allowReservations: boolean;
  hideReservedItems: boolean;
  showReserverNames: boolean;
}

interface SharedWishlistData {
  wishlist: SharedWishlist;
  items: SharedItem[];
}

function resolveImageSource(source: string | number | ImageSourcePropType | undefined): ImageSourcePropType {
  if (!source) return { uri: '' };
  if (typeof source === 'string') return { uri: source };
  return source as ImageSourcePropType;
}

export default function SharedWishlistViewScreen() {
  const { shareSlug } = useLocalSearchParams();
  const [data, setData] = useState<SharedWishlistData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reserveModalVisible, setReserveModalVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState<SharedItem | null>(null);
  const [guestName, setGuestName] = useState('');
  const [reserving, setReserving] = useState(false);

  const fetchSharedWishlist = useCallback(async () => {
    console.log('SharedWishlistViewScreen: Fetching shared wishlist with slug:', shareSlug);
    try {
      setLoading(true);
      setError(null);
      
      // Fetch shared wishlist data (no authentication required)
      const response = await fetch(
        `${BACKEND_URL}/api/wishlists/shared/${shareSlug}`
      );
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Wishlist not found or no longer shared');
        }
        throw new Error('Failed to load wishlist');
      }
      
      const wishlistData = await response.json() as SharedWishlistData;
      
      console.log('SharedWishlistViewScreen: Loaded wishlist:', wishlistData.wishlist.name);
      console.log('SharedWishlistViewScreen: Items count:', wishlistData.items.length);
      setData(wishlistData);
    } catch (err) {
      console.error('SharedWishlistViewScreen: Error loading shared wishlist:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to load wishlist. The link may be invalid or expired.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [shareSlug]);

  useEffect(() => {
    console.log('SharedWishlistViewScreen: Loading shared wishlist:', shareSlug);
    fetchSharedWishlist();
  }, [shareSlug, fetchSharedWishlist]);

  const handleReservePress = (item: SharedItem) => {
    console.log('SharedWishlistViewScreen: User tapped Reserve for:', item.title);
    setSelectedItem(item);
    setReserveModalVisible(true);
  };

  const handleReserve = async () => {
    if (!guestName.trim()) {
      Alert.alert('Error', 'Please enter your name');
      return;
    }

    if (!selectedItem) return;

    console.log('SharedWishlistViewScreen: Reserving item:', selectedItem.title);
    setReserving(true);

    try {
      const response = await fetch(
        `${BACKEND_URL}/api/shared/${shareSlug}/reserve`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            itemId: selectedItem.id,
            guestName: guestName.trim(),
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to reserve item');
      }

      console.log('SharedWishlistViewScreen: Item reserved successfully');
      Alert.alert('Success', 'Item reserved successfully!');
      setReserveModalVisible(false);
      setGuestName('');
      setSelectedItem(null);
      fetchSharedWishlist();
    } catch (error) {
      console.error('SharedWishlistViewScreen: Error reserving item:', error);
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to reserve item');
    } finally {
      setReserving(false);
    }
  };

  const handleUnreserve = async (item: SharedItem) => {
    console.log('SharedWishlistViewScreen: Unreserving item:', item.title);

    try {
      const response = await fetch(
        `${BACKEND_URL}/api/shared/${shareSlug}/reserve/${item.id}`,
        {
          method: 'DELETE',
        }
      );

      if (!response.ok) {
        throw new Error('Failed to unreserve item');
      }

      console.log('SharedWishlistViewScreen: Item unreserved successfully');
      Alert.alert('Success', 'Reservation removed');
      fetchSharedWishlist();
    } catch (error) {
      console.error('SharedWishlistViewScreen: Error unreserving item:', error);
      Alert.alert('Error', 'Failed to remove reservation');
    }
  };

  const wishlistName = data?.wishlist.name || 'Shared Wishlist';

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: wishlistName,
          headerBackTitle: 'Back',
        }}
      />
      <SafeAreaView style={styles.container} edges={['bottom']}>
        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Loading wishlist...</Text>
          </View>
        ) : error ? (
          <View style={styles.centerContainer}>
            <IconSymbol
              ios_icon_name="exclamationmark.triangle"
              android_material_icon_name="error"
              size={64}
              color={colors.textSecondary}
            />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : data ? (
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
          >
            <View style={styles.header}>
              <Text style={styles.wishlistName}>{data.wishlist.name}</Text>
              <View style={styles.visibilityBadge}>
                <IconSymbol
                  ios_icon_name={data.wishlist.visibility === 'public' ? 'globe' : 'link'}
                  android_material_icon_name={data.wishlist.visibility === 'public' ? 'public' : 'link'}
                  size={14}
                  color={colors.textSecondary}
                />
                <Text style={styles.visibilityText}>
                  {data.wishlist.visibility === 'public' ? 'Public' : 'Unlisted'}
                </Text>
              </View>
              <Text style={styles.itemCount}>
                {data.items.length} {data.items.length === 1 ? 'item' : 'items'}
              </Text>
            </View>

            {data.items.length === 0 ? (
              <View style={styles.emptyContainer}>
                <IconSymbol
                  ios_icon_name="gift"
                  android_material_icon_name="card-giftcard"
                  size={64}
                  color={colors.textSecondary}
                />
                <Text style={styles.emptyText}>No items in this wishlist</Text>
              </View>
            ) : (
              data.items
                .filter(item => !data.wishlist.hideReservedItems || !item.isReserved)
                .map((item) => {
                  const priceText = item.currentPrice 
                    ? `${item.currency} ${item.currentPrice.toFixed(2)}` 
                    : 'No price';
                  
                  const showReserverName = data.wishlist.showReserverNames && item.reservedByName;
                  const reservedText = showReserverName 
                    ? `Reserved by ${item.reservedByName}` 
                    : 'Reserved';
                  
                  return (
                    <View key={item.id} style={styles.itemCard}>
                      <Image
                        source={resolveImageSource(item.imageUrl)}
                        style={[styles.itemImage, item.isReserved && styles.itemImageReserved]}
                        resizeMode="cover"
                      />
                      <View style={styles.itemInfo}>
                        <Text style={[styles.itemName, item.isReserved && styles.itemNameReserved]} numberOfLines={2}>
                          {item.title}
                        </Text>
                        <View style={styles.priceContainer}>
                          <Text style={styles.itemPrice}>{priceText}</Text>
                        </View>
                        {item.isReserved && (
                          <View style={styles.reservedBadge}>
                            <IconSymbol
                              ios_icon_name="checkmark.circle"
                              android_material_icon_name="check-circle"
                              size={16}
                              color={colors.success}
                            />
                            <Text style={styles.reservedText}>{reservedText}</Text>
                          </View>
                        )}
                      </View>
                      {data.wishlist.allowReservations && !item.isReserved && (
                        <TouchableOpacity
                          style={styles.reserveButton}
                          onPress={() => handleReservePress(item)}
                        >
                          <Text style={styles.reserveButtonText}>Reserve</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  );
                })
            )}
          </ScrollView>
        ) : null}

        {/* Reserve Modal */}
        <Modal
          visible={reserveModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setReserveModalVisible(false)}
        >
          <Pressable
            style={styles.modalOverlay}
            onPress={() => setReserveModalVisible(false)}
          >
            <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
              <Text style={styles.modalTitle}>Reserve Item</Text>
              <Text style={styles.modalDescription}>
                Enter your name to reserve this item. The owner will see who reserved it.
              </Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Your name"
                placeholderTextColor={colors.textSecondary}
                value={guestName}
                onChangeText={setGuestName}
                autoFocus
                returnKeyType="done"
                onSubmitEditing={handleReserve}
                editable={!reserving}
              />
              <View style={styles.modalButtons}>
                <Button
                  title="Cancel"
                  onPress={() => setReserveModalVisible(false)}
                  variant="secondary"
                  style={styles.modalButton}
                  disabled={reserving}
                />
                <Button
                  title={reserving ? 'Reserving...' : 'Reserve'}
                  onPress={handleReserve}
                  variant="primary"
                  style={styles.modalButton}
                  disabled={reserving}
                />
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
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  loadingText: {
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: 16,
  },
  errorText: {
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: 16,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 24,
    alignItems: 'center',
  },
  wishlistName: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  visibilityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.backgroundAlt,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 8,
  },
  visibilityText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'capitalize',
  },
  itemCount: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 80,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: 16,
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
  itemImageReserved: {
    opacity: 0.5,
  },
  itemNameReserved: {
    opacity: 0.7,
  },
  reservedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
  },
  reservedText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.success,
  },
  reserveButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginLeft: 12,
  },
  reserveButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 24,
    width: '85%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  modalDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 16,
    lineHeight: 20,
  },
  modalInput: {
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
  },
});
