
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  ImageSourcePropType,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, Stack } from 'expo-router';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';

interface SharedItem {
  id: string;
  title: string;
  imageUrl: string | null;
  currentPrice: number | null;
  currency: string;
}

interface SharedWishlist {
  id: string;
  name: string;
  visibility: string;
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

  const fetchSharedWishlist = useCallback(async () => {
    console.log('SharedWishlistViewScreen: Fetching shared wishlist with slug:', shareSlug);
    try {
      setLoading(true);
      setError(null);
      
      // Fetch shared wishlist data (no authentication required)
      const response = await fetch(
        `https://dp5sm9gseg2u24kanaj9us8ayp8awmu3.app.specular.dev/api/wishlists/shared/${shareSlug}`
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
              data.items.map((item) => {
                const priceText = item.currentPrice 
                  ? `${item.currency} ${item.currentPrice.toFixed(2)}` 
                  : 'No price';
                
                return (
                  <View key={item.id} style={styles.itemCard}>
                    <Image
                      source={resolveImageSource(item.imageUrl)}
                      style={styles.itemImage}
                      resizeMode="cover"
                    />
                    <View style={styles.itemInfo}>
                      <Text style={styles.itemName} numberOfLines={2}>
                        {item.title}
                      </Text>
                      <View style={styles.priceContainer}>
                        <Text style={styles.itemPrice}>{priceText}</Text>
                      </View>
                    </View>
                  </View>
                );
              })
            )}
          </ScrollView>
        ) : null}
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
});
