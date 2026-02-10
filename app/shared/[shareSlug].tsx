
import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
import { ErrorState } from '@/components/design-system/ErrorState';
import { EmptyState } from '@/components/design-system/EmptyState';
import { useAppTheme } from '@/contexts/ThemeContext';
import { createColors, createTypography, spacing } from '@/styles/designSystem';

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

// Helper to safely render any value in Text components
function renderValue(value: any): string {
  if (value === null || value === undefined) {
    return '-';
  }
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return '[Object]';
    }
  }
  return String(value);
}

export default function SharedWishlistViewScreen() {
  const { shareSlug } = useLocalSearchParams();
  const { theme, isDark } = useAppTheme();
  
  const colors = useMemo(() => createColors(theme), [theme]);
  const typography = useMemo(() => createTypography(theme), [theme]);
  
  const [data, setData] = useState<SharedWishlistData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [renderError, setRenderError] = useState<Error | null>(null);
  const [reserveModalVisible, setReserveModalVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState<SharedItem | null>(null);
  const [guestName, setGuestName] = useState('');
  const [reserving, setReserving] = useState(false);

  const fetchSharedWishlist = useCallback(async () => {
    console.log('SharedWishlistViewScreen: Fetching shared wishlist with slug:', shareSlug);
    
    if (!shareSlug || typeof shareSlug !== 'string') {
      console.error('SharedWishlistViewScreen: Invalid share slug');
      setError('Invalid share link');
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      // Import Supabase helpers
      const { fetchSharedWishlist: getSharedWishlist, fetchWishlistItems, fetchWishlistById } = await import('@/lib/supabase-helpers');
      
      // Fetch shared wishlist data from Supabase
      console.log('SharedWishlistViewScreen: Calling fetchSharedWishlist');
      const sharedData = await getSharedWishlist(shareSlug);
      
      if (!sharedData) {
        console.log('SharedWishlistViewScreen: No shared wishlist found');
        throw new Error('Wishlist not found or no longer shared');
      }
      
      console.log('SharedWishlistViewScreen: Shared data:', sharedData);
      
      // Fetch the actual wishlist details
      const wishlistData = await fetchWishlistById(sharedData.wishlist_id);
      console.log('SharedWishlistViewScreen: Wishlist data:', wishlistData);
      
      // Fetch items
      const itemsData = await fetchWishlistItems(sharedData.wishlist_id);
      console.log('SharedWishlistViewScreen: Items count:', itemsData.length);
      
      // Map to frontend format
      const mappedWishlist: SharedWishlist = {
        id: wishlistData.id,
        name: wishlistData.name,
        visibility: sharedData.visibility || 'public',
        allowReservations: false, // Reservations not yet implemented
        hideReservedItems: false,
        showReserverNames: false,
      };
      
      const mappedItems: SharedItem[] = itemsData.map(item => ({
        id: item.id,
        title: item.title,
        imageUrl: item.image_url,
        currentPrice: item.current_price ? parseFloat(item.current_price.toString()) : null,
        currency: item.currency,
        isReserved: false, // Reservations not yet implemented
        reservedByName: undefined,
      }));
      
      setData({
        wishlist: mappedWishlist,
        items: mappedItems,
      });
      
      console.log('SharedWishlistViewScreen: Successfully loaded wishlist:', mappedWishlist.name);
    } catch (err) {
      console.error('SharedWishlistViewScreen: Error loading shared wishlist:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to load wishlist. The link may be invalid or expired.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [shareSlug]);

  useEffect(() => {
    console.log('SharedWishlistViewScreen: Component mounted, shareSlug:', shareSlug);
    fetchSharedWishlist();
  }, [shareSlug, fetchSharedWishlist]);

  const handleReservePress = (item: SharedItem) => {
    console.log('SharedWishlistViewScreen: User tapped Reserve for:', item.title);
    Alert.alert(
      'Coming Soon',
      'Item reservations will be available soon!',
      [{ text: 'OK' }]
    );
  };

  const handleRetry = () => {
    console.log('SharedWishlistViewScreen: User tapped Retry');
    fetchSharedWishlist();
  };

  const handleRetryRender = () => {
    console.log('SharedWishlistViewScreen: User tapped Retry Render');
    setRenderError(null);
  };

  const wishlistName = data?.wishlist.name || 'Shared Wishlist';
  const itemCount = data?.items.length || 0;
  const itemCountText = `${itemCount} ${itemCount === 1 ? 'item' : 'items'}`;

  const styles = useMemo(() => StyleSheet.create({
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
      backgroundColor: colors.surface2,
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
    itemCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
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
      backgroundColor: colors.surface2,
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
      backgroundColor: colors.accentLight,
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
      color: '#10B981',
    },
    reserveButton: {
      backgroundColor: colors.accent,
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
    debugContainer: {
      backgroundColor: colors.surface2,
      padding: 12,
      borderRadius: 8,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    debugTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 8,
    },
    debugText: {
      fontSize: 12,
      color: colors.textSecondary,
      fontFamily: 'monospace',
      marginBottom: 4,
    },
    renderErrorContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 40,
    },
    renderErrorTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: '#EF4444',
      marginBottom: 12,
      textAlign: 'center',
    },
    renderErrorMessage: {
      fontSize: 14,
      color: colors.text,
      marginBottom: 24,
      textAlign: 'center',
      fontFamily: 'monospace',
      backgroundColor: colors.surface2,
      padding: 12,
      borderRadius: 8,
    },
    retryButton: {
      backgroundColor: colors.accent,
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 8,
    },
    retryButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: '#FFFFFF',
    },
  }), [colors]);

  // Render guard for the body content
  const renderBodyContent = () => {
    // If there's a render error, show fallback UI
    if (renderError) {
      const errorMessage = renderError.message || 'Unknown render error';
      return (
        <View style={styles.renderErrorContainer}>
          <IconSymbol
            ios_icon_name="exclamationmark.triangle"
            android_material_icon_name="warning"
            size={48}
            color="#EF4444"
          />
          <Text style={styles.renderErrorTitle}>Share Mode failed to render</Text>
          <Text style={styles.renderErrorMessage}>{errorMessage}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={handleRetryRender}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }

    try {
      // Loading state
      if (loading) {
        const loadingBoolText = String(loading);
        return (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={colors.accent} />
            <Text style={styles.loadingText}>Loading shared wishlist...</Text>
          </View>
        );
      }

      // Error state
      if (error) {
        const errorText = renderValue(error);
        return (
          <ErrorState
            message={errorText}
            onRetry={handleRetry}
          />
        );
      }

      // Empty state (no data)
      if (!data) {
        return (
          <EmptyState
            icon="link"
            title="Wishlist not found"
            description="This share link may be invalid or expired"
            actionLabel="Try Again"
            onAction={handleRetry}
          />
        );
      }

      // Main UI rendering logic for the shared wishlist
      const wishlistId = renderValue(data.wishlist.id);
      const loadingBool = renderValue(loading);
      const errorStr = renderValue(error);
      const shareLink = data.wishlist.id ? `app.com/shared/${shareSlug}` : '-';
      const shareLinkText = renderValue(shareLink);
      const collaboratorsLength = renderValue(0); // No collaborators yet

      const visibilityIcon = data.wishlist.visibility === 'public' ? 'globe' : 'link';
      const visibilityAndroidIcon = data.wishlist.visibility === 'public' ? 'public' : 'link';
      const visibilityLabel = data.wishlist.visibility === 'public' ? 'Public' : 'Unlisted';

      return (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Debug UI */}
          <View style={styles.debugContainer}>
            <Text style={styles.debugTitle}>🔍 Debug Info</Text>
            <Text style={styles.debugText}>wishlistId: {wishlistId}</Text>
            <Text style={styles.debugText}>loading: {loadingBool}</Text>
            <Text style={styles.debugText}>error: {errorStr}</Text>
            <Text style={styles.debugText}>shareLink: {shareLinkText}</Text>
            <Text style={styles.debugText}>collaborators length: {collaboratorsLength}</Text>
          </View>

          {/* Actual Share UI */}
          <View style={styles.header}>
            <Text style={styles.wishlistName}>{data.wishlist.name}</Text>
            <View style={styles.visibilityBadge}>
              <IconSymbol
                ios_icon_name={visibilityIcon}
                android_material_icon_name={visibilityAndroidIcon}
                size={14}
                color={colors.textSecondary}
              />
              <Text style={styles.visibilityText}>{visibilityLabel}</Text>
            </View>
            <Text style={styles.itemCount}>{itemCountText}</Text>
          </View>

          {data.items.length === 0 ? (
            <EmptyState
              icon="card-giftcard"
              title="No items yet"
              description="This wishlist doesn't have any items yet"
            />
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
                            color="#10B981"
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
      );
    } catch (e: any) {
      console.error('SharedWishlistViewScreen: Render error caught:', e);
      // Set render error state to trigger fallback UI on next render
      setRenderError(e);
      // Return minimal fallback to prevent further errors
      return (
        <View style={styles.centerContainer}>
          <Text style={styles.loadingText}>Recovering from error...</Text>
        </View>
      );
    }
  };

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
        {renderBodyContent()}
      </SafeAreaView>
    </>
  );
}
