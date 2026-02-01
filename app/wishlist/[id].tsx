
import React, { useState, useEffect, useCallback, useMemo, Fragment } from 'react';
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
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { IconSymbol } from '@/components/IconSymbol';
import { useAuth } from '@/contexts/AuthContext';
import { useAppTheme } from '@/contexts/ThemeContext';
import { createColors, createTypography, spacing } from '@/styles/designSystem';
import * as Clipboard from 'expo-clipboard';
import { ListItemSkeleton } from '@/components/design-system/LoadingSkeleton';
import { ErrorState } from '@/components/design-system/ErrorState';
import { ConfirmDialog } from '@/components/design-system/ConfirmDialog';
import { EmptyState } from '@/components/design-system/EmptyState';
import { OfflineNotice } from '@/components/design-system/OfflineNotice';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { dedupeById, normalizeList } from '@/utils/deduplication';

interface Item {
  id: string;
  title: string;
  imageUrl: string;
  currentPrice: number | null;
  currency: string;
  originalUrl: string | null;
  createdAt: string;
  lastCheckedAt?: string | null;
  sourceDomain?: string | null;
}

interface Wishlist {
  id: string;
  name: string;
  isDefault: boolean;
  itemCount: number;
  createdAt: string;
  allowReservations?: boolean;
  hideReservedItems?: boolean;
  showReserverNames?: boolean;
}

interface Reservation {
  id: string;
  itemId: string;
  itemTitle: string;
  reservedByName: string;
  reservedAt: string;
  status: string;
}

interface PriceDropInfo {
  [itemId: string]: {
    priceDropped: boolean;
    percentageChange: number | null;
  };
}

type SortOption = 'Recently added' | 'Price: Low to High' | 'Price: High to Low';
type GroupByOption = 'None' | 'Store' | 'Category' | 'Price Range';

function resolveImageSource(source: string | number | ImageSourcePropType | undefined): ImageSourcePropType {
  if (!source) return { uri: '' };
  if (typeof source === 'string') return { uri: source };
  return source as ImageSourcePropType;
}

// Helper function to infer category from title
function inferCategory(title: string): string {
  const lowerTitle = title.toLowerCase();
  
  if (lowerTitle.includes('beauty') || lowerTitle.includes('makeup') || lowerTitle.includes('skincare') || lowerTitle.includes('cosmetic')) {
    return 'Beauty';
  }
  if (lowerTitle.includes('dress') || lowerTitle.includes('shirt') || lowerTitle.includes('pants') || lowerTitle.includes('clothing') || lowerTitle.includes('fashion')) {
    return 'Clothing';
  }
  if (lowerTitle.includes('phone') || lowerTitle.includes('laptop') || lowerTitle.includes('headphones') || lowerTitle.includes('electronics') || lowerTitle.includes('computer')) {
    return 'Electronics';
  }
  if (lowerTitle.includes('home') || lowerTitle.includes('decor') || lowerTitle.includes('furniture') || lowerTitle.includes('kitchen')) {
    return 'Home & Kitchen';
  }
  if (lowerTitle.includes('book') || lowerTitle.includes('novel') || lowerTitle.includes('magazine')) {
    return 'Books';
  }
  if (lowerTitle.includes('toy') || lowerTitle.includes('game') || lowerTitle.includes('puzzle')) {
    return 'Toys & Games';
  }
  if (lowerTitle.includes('sport') || lowerTitle.includes('fitness') || lowerTitle.includes('exercise') || lowerTitle.includes('outdoor')) {
    return 'Sports & Outdoors';
  }
  if (lowerTitle.includes('food') || lowerTitle.includes('snack') || lowerTitle.includes('drink') || lowerTitle.includes('beverage')) {
    return 'Food & Beverage';
  }
  
  return 'Other';
}

// Helper function to get price range
function getPriceRange(price: number | null): string {
  if (!price) return 'No Price';
  
  if (price < 25) return 'Under $25';
  if (price < 50) return '$25 - $50';
  if (price < 100) return '$50 - $100';
  if (price < 250) return '$100 - $250';
  return 'Over $250';
}

// Helper function to extract store name from domain
function getStoreName(domain: string | null): string {
  if (!domain) return 'Other Stores';
  
  // Remove common TLDs and www
  const cleaned = domain.replace(/^www\./, '').replace(/\.(com|net|org|co\.uk|ca|au)$/, '');
  
  // Capitalize first letter
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

export default function WishlistDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { user, loading: authLoading } = useAuth();
  const { isOnline } = useNetworkStatus();
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useAppTheme();
  
  const colors = useMemo(() => createColors(theme), [theme]);
  const typography = useMemo(() => createTypography(theme), [theme]);
  
  const [wishlist, setWishlist] = useState<Wishlist | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showSortModal, setShowSortModal] = useState(false);
  const [showGroupByModal, setShowGroupByModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showStopSharingConfirm, setShowStopSharingConfirm] = useState(false);
  const [newName, setNewName] = useState('');
  const [priceDropInfo, setPriceDropInfo] = useState<PriceDropInfo>({});
  const [shareVisibility, setShareVisibility] = useState<'public' | 'unlisted'>('public');
  const [shareLoading, setShareLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOption, setSortOption] = useState<SortOption>('Recently added');
  const [groupByOption, setGroupByOption] = useState<GroupByOption>('Category');
  const [refreshingPrices, setRefreshingPrices] = useState(false);
  const [existingShareSlug, setExistingShareSlug] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState<string>('');
  const [showReservationSettings, setShowReservationSettings] = useState(false);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loadingReservations, setLoadingReservations] = useState(false);
  const [allowReservations, setAllowReservations] = useState(false);
  const [hideReservedItems, setHideReservedItems] = useState(false);
  const [showReserverNames, setShowReserverNames] = useState(false);
  const [savingReservationSettings, setSavingReservationSettings] = useState(false);

  const fetchWishlistAndItems = useCallback(async () => {
    console.log('WishlistDetailScreen: Fetching wishlist and items for:', id);
    
    if (!user) {
      console.log('WishlistDetailScreen: No user authenticated, cannot fetch wishlist');
      setError('Please sign in to view your wishlists.');
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const { fetchWishlistById, fetchWishlistItems } = await import('@/lib/supabase-helpers');
      
      const wishlistData = await fetchWishlistById(id as string);
      console.log('WishlistDetailScreen: Fetched wishlist:', wishlistData.name);
      
      const mappedWishlist: Wishlist = {
        id: wishlistData.id,
        name: wishlistData.name,
        isDefault: false,
        itemCount: 0,
        createdAt: wishlistData.created_at,
        allowReservations: false,
        hideReservedItems: false,
        showReserverNames: false,
      };
      
      setWishlist(mappedWishlist);
      setNewName(mappedWishlist.name);
      
      // Set reservation settings from wishlist data
      setAllowReservations(mappedWishlist.allowReservations || false);
      setHideReservedItems(mappedWishlist.hideReservedItems || false);
      setShowReserverNames(mappedWishlist.showReserverNames || false);
      
      const itemsData = await fetchWishlistItems(id as string);
      console.log('WishlistDetailScreen: Fetched items:', itemsData.length);
      
      const mappedItems: Item[] = itemsData.map(item => ({
        id: item.id,
        title: item.title,
        imageUrl: item.image_url || '',
        currentPrice: item.current_price ? parseFloat(item.current_price) : null,
        currency: item.currency,
        originalUrl: item.original_url,
        createdAt: item.created_at,
        lastCheckedAt: item.last_checked_at,
        sourceDomain: item.source_domain,
      }));
      
      // Apply deduplication to prevent duplicate items
      const deduplicatedItems = dedupeById(mappedItems, 'id');
      setItems(deduplicatedItems);

      // Price drop info - for now, we'll skip this since it requires backend API
      // This can be added later when price tracking is implemented
      setPriceDropInfo({});
    } catch (error: any) {
      console.error('WishlistDetailScreen: Error fetching data:', error);
      
      // Provide more specific error messages
      if (error.message?.includes('JWT') || error.message?.includes('auth')) {
        setError('Your session has expired. Please sign in again.');
      } else if (!isOnline) {
        setError('You are offline. Please check your internet connection and try again.');
      } else {
        setError('Failed to load wishlist. Please try again.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id, user, isOnline]);

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

  const groupedItems = useMemo(() => {
    console.log('WishlistDetailScreen: Grouping items by:', groupByOption);
    
    if (groupByOption === 'None') {
      return { 'All Items': items };
    }

    const groups: { [key: string]: Item[] } = {};

    items.forEach(item => {
      let groupKey: string;

      switch (groupByOption) {
        case 'Store':
          groupKey = getStoreName(item.sourceDomain);
          break;
        case 'Category':
          groupKey = inferCategory(item.title);
          break;
        case 'Price Range':
          groupKey = getPriceRange(item.currentPrice);
          break;
        default:
          groupKey = 'All Items';
      }

      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(item);
    });

    return groups;
  }, [items, groupByOption]);

  const filteredAndSortedGroups = useMemo(() => {
    console.log('WishlistDetailScreen: Filtering and sorting groups with search:', searchTerm, 'sort:', sortOption);
    
    const result: { [key: string]: Item[] } = {};

    Object.entries(groupedItems).forEach(([groupName, groupItems]) => {
      let filtered = groupItems;
      
      if (searchTerm.trim()) {
        const searchLower = searchTerm.toLowerCase();
        filtered = groupItems.filter(item => 
          item.title.toLowerCase().includes(searchLower)
        );
      }

      if (filtered.length === 0) {
        return; // Skip empty groups
      }

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

      result[groupName] = sorted;
    });

    return result;
  }, [groupedItems, searchTerm, sortOption]);

  const totalItemCount = useMemo(() => {
    return Object.values(filteredAndSortedGroups).reduce((sum, group) => sum + group.length, 0);
  }, [filteredAndSortedGroups]);

  const handleRefresh = () => {
    if (!isOnline) {
      Alert.alert('Offline', 'You are currently offline. Please check your internet connection and try again.');
      return;
    }
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

    if (!isOnline) {
      Alert.alert('Offline', 'You need an internet connection to rename a wishlist.');
      return;
    }

    try {
      const { updateWishlist } = await import('@/lib/supabase-helpers');
      const updated = await updateWishlist(id as string, {
        name: newName.trim(),
      });
      console.log('WishlistDetailScreen: Wishlist renamed successfully');
      
      const mappedWishlist: Wishlist = {
        id: updated.id,
        name: updated.name,
        isDefault: wishlist?.isDefault || false,
        itemCount: wishlist?.itemCount || 0,
        createdAt: updated.created_at,
        allowReservations: wishlist?.allowReservations || false,
        hideReservedItems: wishlist?.hideReservedItems || false,
        showReserverNames: wishlist?.showReserverNames || false,
      };
      
      setWishlist(mappedWishlist);
      setShowRenameModal(false);
      setShowMenu(false);
    } catch (error) {
      console.error('WishlistDetailScreen: Error renaming wishlist:', error);
      Alert.alert('Error', 'Failed to rename wishlist');
    }
  };

  const handleDeleteWishlist = async () => {
    console.log('WishlistDetailScreen: Deleting wishlist:', id);
    
    if (!isOnline) {
      Alert.alert('Offline', 'You need an internet connection to delete a wishlist.');
      setShowDeleteConfirm(false);
      return;
    }

    try {
      const { deleteWishlist } = await import('@/lib/supabase-helpers');
      await deleteWishlist(id as string);
      console.log('WishlistDetailScreen: Wishlist deleted successfully');
      setShowDeleteConfirm(false);
      router.back();
    } catch (error) {
      console.error('WishlistDetailScreen: Error deleting wishlist:', error);
      Alert.alert('Error', 'Failed to delete wishlist');
    }
  };

  const openRenameModal = () => {
    console.log('WishlistDetailScreen: Opening rename modal');
    setShowMenu(false);
    setShowRenameModal(true);
  };

  const openShareModal = async () => {
    console.log('WishlistDetailScreen: Opening share modal');
    setShowMenu(false);
    
    try {
      const { fetchSharedWishlistByWishlistId } = await import('@/lib/supabase-helpers');
      const shareData = await fetchSharedWishlistByWishlistId(id as string);
      
      if (shareData) {
        console.log('WishlistDetailScreen: Existing share found:', shareData.share_slug);
        setExistingShareSlug(shareData.share_slug);
        setShareVisibility((shareData.visibility as 'public' | 'unlisted') || 'public');
        
        const baseUrl = 'https://mywishlist.app';
        const url = `${baseUrl}/shared/${shareData.share_slug}`;
        setShareUrl(url);
      } else {
        console.log('WishlistDetailScreen: No existing share found');
        setExistingShareSlug(null);
        setShareUrl('');
      }
    } catch (error) {
      console.log('WishlistDetailScreen: No existing share or error fetching:', error);
      setExistingShareSlug(null);
      setShareUrl('');
    }
    
    setShowShareModal(true);
  };

  const openReservationSettings = async () => {
    console.log('WishlistDetailScreen: Opening reservation settings');
    setShowMenu(false);
    setLoadingReservations(true);
    
    try {
      // For now, reservations are not implemented in Supabase
      // This can be added later when the backend adds reservation support
      console.log('WishlistDetailScreen: Reservations not yet implemented');
      setReservations([]);
    } catch (error) {
      console.error('WishlistDetailScreen: Error fetching reservations:', error);
      setReservations([]);
    } finally {
      setLoadingReservations(false);
    }
    
    setShowReservationSettings(true);
  };

  const handleSaveReservationSettings = async () => {
    console.log('WishlistDetailScreen: Saving reservation settings');
    
    if (!isOnline) {
      Alert.alert('Offline', 'You need an internet connection to update reservation settings.');
      return;
    }

    setSavingReservationSettings(true);
    
    try {
      // For now, reservation settings are not implemented in Supabase
      // This can be added later when the backend adds reservation support
      console.log('WishlistDetailScreen: Reservation settings not yet implemented');
      
      // Update local wishlist state
      if (wishlist) {
        setWishlist({
          ...wishlist,
          allowReservations,
          hideReservedItems,
          showReserverNames,
        });
      }
      
      Alert.alert('Success', 'Reservation settings updated (local only)');
    } catch (error) {
      console.error('WishlistDetailScreen: Error saving reservation settings:', error);
      Alert.alert('Error', 'Failed to save reservation settings');
    } finally {
      setSavingReservationSettings(false);
    }
  };

  const openSortModal = () => {
    console.log('WishlistDetailScreen: Opening sort modal');
    setShowSortModal(true);
  };

  const openGroupByModal = () => {
    console.log('WishlistDetailScreen: Opening group by modal');
    setShowGroupByModal(true);
  };

  const handleSortSelect = (option: SortOption) => {
    console.log('WishlistDetailScreen: Sort option selected:', option);
    setSortOption(option);
    setShowSortModal(false);
  };

  const handleGroupBySelect = (option: GroupByOption) => {
    console.log('WishlistDetailScreen: Group by option selected:', option);
    setGroupByOption(option);
    setShowGroupByModal(false);
  };

  const handleCreateOrUpdateShare = async () => {
    console.log('WishlistDetailScreen: Creating/updating share with visibility:', shareVisibility);
    
    if (!isOnline) {
      Alert.alert('Offline', 'You need an internet connection to create a share link.');
      return;
    }

    setShareLoading(true);
    
    try {
      const { createSharedWishlist, updateSharedWishlist, generateShareSlug } = await import('@/lib/supabase-helpers');
      
      if (existingShareSlug) {
        // Update existing share
        await updateSharedWishlist(id as string, {
          visibility: shareVisibility,
        });
        console.log('WishlistDetailScreen: Share updated');
        Alert.alert('Success', 'Visibility updated successfully!');
      } else {
        // Create new share
        const shareSlug = generateShareSlug();
        await createSharedWishlist({
          wishlist_id: id as string,
          share_slug: shareSlug,
          visibility: shareVisibility,
        });
        
        console.log('WishlistDetailScreen: Share created:', shareSlug);
        setExistingShareSlug(shareSlug);
        
        const baseUrl = 'https://mywishlist.app';
        const url = `${baseUrl}/shared/${shareSlug}`;
        setShareUrl(url);
        
        Alert.alert('Success', 'Share link created successfully!');
      }
    } catch (error) {
      console.error('WishlistDetailScreen: Error creating share link:', error);
      Alert.alert('Error', 'Failed to create share link');
    } finally {
      setShareLoading(false);
    }
  };

  const handleRegenerateShare = async () => {
    console.log('WishlistDetailScreen: Regenerating share link');
    
    if (!isOnline) {
      Alert.alert('Offline', 'You need an internet connection to regenerate the share link.');
      return;
    }

    Alert.alert(
      'Regenerate Link',
      'This will create a new link and invalidate the old one. Anyone with the old link will no longer be able to access this wishlist.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Regenerate',
          style: 'destructive',
          onPress: async () => {
            setShareLoading(true);
            try {
              const { deleteSharedWishlist, createSharedWishlist, generateShareSlug } = await import('@/lib/supabase-helpers');
              
              // Delete old share
              await deleteSharedWishlist(id as string);
              
              // Create new share
              const shareSlug = generateShareSlug();
              await createSharedWishlist({
                wishlist_id: id as string,
                share_slug: shareSlug,
                visibility: shareVisibility,
              });
              
              console.log('WishlistDetailScreen: Share regenerated:', shareSlug);
              
              setExistingShareSlug(shareSlug);
              
              const baseUrl = 'https://mywishlist.app';
              const url = `${baseUrl}/shared/${shareSlug}`;
              setShareUrl(url);
              
              Alert.alert('Success', 'New share link generated!');
            } catch (error) {
              console.error('WishlistDetailScreen: Error regenerating share link:', error);
              Alert.alert('Error', 'Failed to regenerate share link');
            } finally {
              setShareLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleCopyLink = async () => {
    console.log('WishlistDetailScreen: Copying share link');
    if (!shareUrl) {
      Alert.alert('Error', 'No share link available');
      return;
    }
    
    try {
      await Clipboard.setStringAsync(shareUrl);
      Alert.alert('Copied', 'Share link copied to clipboard');
    } catch (error) {
      console.error('WishlistDetailScreen: Error copying link:', error);
      Alert.alert('Error', 'Failed to copy link');
    }
  };

  const handleShareLink = async () => {
    console.log('WishlistDetailScreen: Sharing link via system share');
    if (!shareUrl) {
      Alert.alert('Error', 'No share link available');
      return;
    }
    
    try {
      await Share.share({
        message: `Check out my wishlist: ${wishlist?.name}\n${shareUrl}`,
        url: shareUrl,
      });
    } catch (error) {
      console.error('WishlistDetailScreen: Error sharing:', error);
    }
  };

  const handleStopSharing = async () => {
    console.log('WishlistDetailScreen: Stopping sharing');
    
    if (!isOnline) {
      Alert.alert('Offline', 'You need an internet connection to stop sharing.');
      setShowStopSharingConfirm(false);
      return;
    }

    setShareLoading(true);
    try {
      const { deleteSharedWishlist } = await import('@/lib/supabase-helpers');
      await deleteSharedWishlist(id as string);
      
      console.log('WishlistDetailScreen: Sharing stopped');
      setExistingShareSlug(null);
      setShareUrl('');
      setShowShareModal(false);
      setShowStopSharingConfirm(false);
      
      Alert.alert('Success', 'Sharing has been disabled');
    } catch (error) {
      console.error('WishlistDetailScreen: Error stopping sharing:', error);
      Alert.alert('Error', 'Failed to stop sharing');
    } finally {
      setShareLoading(false);
    }
  };

  const handleRefreshPrices = async () => {
    console.log('WishlistDetailScreen: Refreshing prices for wishlist:', id);
    
    if (!isOnline) {
      Alert.alert('Offline', 'You need an internet connection to refresh prices.');
      return;
    }

    setRefreshingPrices(true);
    
    try {
      // For now, price refresh is not implemented in Supabase
      // This can be added later when the backend adds price tracking support
      console.log('WishlistDetailScreen: Price refresh not yet implemented');
      
      Alert.alert(
        'Coming Soon',
        'Price refresh feature will be available soon!',
        [{ text: 'OK' }]
      );
      
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
  const resultCountText = `${totalItemCount} ${totalItemCount === 1 ? 'item' : 'items'}`;
  const groupCount = Object.keys(filteredAndSortedGroups).length;
  
  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    safeContainer: {
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
      backgroundColor: colors.surface,
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
      backgroundColor: colors.surface,
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
    groupingIndicator: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    groupingText: {
      fontSize: 12,
      fontWeight: '500',
      color: colors.accent,
      backgroundColor: colors.accentLight,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
    },
    sortIndicator: {
      fontSize: 12,
      fontWeight: '500',
      color: colors.accent,
      backgroundColor: colors.accentLight,
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
      paddingBottom: insets.bottom + 100,
    },
    groupHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 12,
      paddingHorizontal: 4,
      marginTop: 8,
    },
    groupTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.text,
    },
    groupCount: {
      fontSize: 14,
      fontWeight: '500',
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
    priceRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      flexWrap: 'wrap',
    },
    priceContainer: {
      backgroundColor: colors.accentLight,
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
      backgroundColor: isDark ? 'rgba(52,199,89,0.2)' : '#D1FAE5',
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
      bottom: insets.bottom + 24,
      right: 24,
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: colors.accent,
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
      backgroundColor: colors.surface,
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
      backgroundColor: colors.surface,
      borderRadius: 12,
      marginHorizontal: 20,
      padding: 20,
      width: '80%',
      maxWidth: 400,
    },
    sortModalContainer: {
      backgroundColor: colors.surface,
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
      backgroundColor: colors.surface2,
      borderRadius: 8,
      padding: 16,
      marginBottom: 12,
      borderWidth: 2,
      borderColor: 'transparent',
    },
    sortOptionSelected: {
      borderColor: colors.accent,
      backgroundColor: colors.accentLight,
    },
    sortOptionText: {
      fontSize: 16,
      fontWeight: '500',
      color: colors.text,
    },
    sortOptionTextSelected: {
      fontWeight: '600',
      color: colors.accent,
    },
    shareModalContainer: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      marginHorizontal: 20,
      padding: 20,
      width: '90%',
      maxWidth: 450,
      maxHeight: '80%',
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
      backgroundColor: colors.surface2,
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
      backgroundColor: colors.surface2,
      borderRadius: 8,
      padding: 16,
      marginBottom: 12,
      borderWidth: 2,
      borderColor: 'transparent',
    },
    visibilityOptionSelected: {
      borderColor: colors.accent,
      backgroundColor: colors.accentLight,
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
      color: colors.accent,
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
      backgroundColor: colors.surface2,
    },
    cancelButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
    },
    saveButton: {
      backgroundColor: colors.accent,
    },
    saveButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: isDark ? '#2b1f19' : '#FFFFFF',
    },
    shareLinkContainer: {
      marginTop: 16,
      marginBottom: 12,
    },
    shareLinkLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 8,
    },
    shareLinkBox: {
      backgroundColor: colors.surface2,
      borderRadius: 8,
      padding: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    shareLinkText: {
      fontSize: 13,
      color: colors.textSecondary,
      fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    },
    shareActionsContainer: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 16,
    },
    shareActionButton: {
      flex: 1,
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surface2,
      borderRadius: 8,
      paddingVertical: 12,
      paddingHorizontal: 8,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 6,
    },
    shareActionText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.accent,
    },
    deleteShareButton: {
      backgroundColor: isDark ? 'rgba(239,68,68,0.2)' : '#FEE2E2',
    },
    deleteShareButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: '#EF4444',
    },
    shareModalScroll: {
      maxHeight: 500,
    },
    updateButton: {
      backgroundColor: colors.accent,
      marginTop: 8,
      marginBottom: 16,
    },
    reservationModalContainer: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      marginHorizontal: 20,
      padding: 20,
      width: '90%',
      maxWidth: 450,
      maxHeight: '80%',
    },
    reservationModalScroll: {
      maxHeight: 500,
    },
    settingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.surface2,
      borderRadius: 8,
      padding: 16,
      marginBottom: 12,
    },
    settingInfo: {
      flex: 1,
      marginRight: 12,
    },
    settingTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 4,
    },
    settingDescription: {
      fontSize: 13,
      color: colors.textSecondary,
      lineHeight: 18,
    },
    toggle: {
      width: 50,
      height: 30,
      borderRadius: 15,
      backgroundColor: colors.border,
      padding: 2,
      justifyContent: 'center',
    },
    toggleActive: {
      backgroundColor: colors.accent,
    },
    toggleThumb: {
      width: 26,
      height: 26,
      borderRadius: 13,
      backgroundColor: '#FFFFFF',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 2,
      elevation: 2,
    },
    toggleThumbActive: {
      alignSelf: 'flex-end',
    },
    reservationsLoading: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
      gap: 12,
    },
    reservationsLoadingText: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    reservationsSection: {
      marginTop: 16,
    },
    reservationsSectionTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 12,
    },
    reservationCard: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.surface2,
      borderRadius: 8,
      padding: 12,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: colors.border,
    },
    reservationInfo: {
      flex: 1,
    },
    reservationItemTitle: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 4,
    },
    reservationDetails: {
      fontSize: 13,
      color: colors.textSecondary,
      marginBottom: 2,
    },
    reservationDate: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    noReservations: {
      alignItems: 'center',
      justifyContent: 'center',
      padding: 32,
      gap: 12,
    },
    noReservationsText: {
      fontSize: 14,
      color: colors.textSecondary,
    },
  }), [colors, isDark, insets.bottom]);

  if (loading && !wishlist) {
    return (
      <View style={styles.container}>
        <Stack.Screen
          options={{
            headerShown: true,
            title: 'Loading...',
            headerBackTitle: 'Back',
          }}
        />
        <SafeAreaView style={styles.safeContainer} edges={['top', 'bottom']}>
          <OfflineNotice />
          <View style={styles.searchSortContainer}>
            <View style={styles.searchContainer}>
              <View style={{ width: 20, height: 20, backgroundColor: colors.backgroundAlt, borderRadius: 10 }} />
              <View style={{ flex: 1, height: 20, backgroundColor: colors.backgroundAlt, borderRadius: 4 }} />
            </View>
            <View style={{ width: 44, height: 44, backgroundColor: colors.backgroundAlt, borderRadius: 12 }} />
          </View>
          <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
            <ListItemSkeleton />
            <ListItemSkeleton />
            <ListItemSkeleton />
          </ScrollView>
        </SafeAreaView>
      </View>
    );
  }

  if (error) {
    const isAuthError = error.includes('sign in') || error.includes('session has expired');
    
    return (
      <View style={styles.container}>
        <Stack.Screen
          options={{
            headerShown: true,
            title: 'Error',
            headerBackTitle: 'Back',
          }}
        />
        <SafeAreaView style={styles.safeContainer} edges={['top', 'bottom']}>
          <OfflineNotice />
          <ErrorState
            message={error}
            onRetry={isAuthError ? undefined : fetchWishlistAndItems}
          />
          {isAuthError && (
            <View style={{ paddingHorizontal: 20, paddingBottom: 20 }}>
              <TouchableOpacity
                style={[styles.button, styles.saveButton, { width: '100%' }]}
                onPress={() => router.replace('/auth')}
              >
                <Text style={styles.saveButtonText}>Sign In</Text>
              </TouchableOpacity>
            </View>
          )}
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
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
      <SafeAreaView style={styles.safeContainer} edges={['top', 'bottom']}>
        <OfflineNotice />
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
          <TouchableOpacity
            style={styles.sortButton}
            onPress={openGroupByModal}
          >
            <IconSymbol
              ios_icon_name="square.grid.2x2"
              android_material_icon_name="grid-view"
              size={20}
              color={colors.text}
            />
          </TouchableOpacity>
        </View>

        {(hasSearchOrSort || groupByOption !== 'None') && (
          <View style={styles.resultCountContainer}>
            <Text style={styles.resultCountText}>{resultCountText}</Text>
            <View style={styles.groupingIndicator}>
              {groupByOption !== 'None' && (
                <Text style={styles.groupingText}>{groupByOption}</Text>
              )}
              {sortOption !== 'Recently added' && (
                <Text style={styles.sortIndicator}>{sortOption}</Text>
              )}
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
          {totalItemCount === 0 ? (
            searchTerm.trim() ? (
              <EmptyState
                icon="search"
                title="No items found"
                description="Try a different search term"
              />
            ) : (
              <EmptyState
                icon="card-giftcard"
                title="No items yet"
                description="Add items from any app or website using the share button"
                actionLabel="Add Item"
                onAction={handleAddItem}
              />
            )
          ) : (
            Object.entries(filteredAndSortedGroups).map(([groupName, groupItems]) => (
              <Fragment key={groupName}>
                {groupByOption !== 'None' && (
                  <View style={styles.groupHeader}>
                    <Text style={styles.groupTitle}>{groupName}</Text>
                    <Text style={styles.groupCount}>
                      {groupItems.length} {groupItems.length === 1 ? 'item' : 'items'}
                    </Text>
                  </View>
                )}
                
                {groupItems.map((item) => {
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
                })}
              </Fragment>
            ))
          )}
        </ScrollView>

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
                onPress={openReservationSettings}
              >
                <IconSymbol
                  ios_icon_name="gift"
                  android_material_icon_name="card-giftcard"
                  size={20}
                  color={colors.text}
                />
                <Text style={styles.menuItemText}>Reservation Settings</Text>
              </TouchableOpacity>
              <View style={styles.menuDivider} />
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  setShowMenu(false);
                  setShowDeleteConfirm(true);
                }}
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

        <ConfirmDialog
          visible={showDeleteConfirm}
          title="Delete Wishlist"
          message={`Are you sure you want to delete "${wishlistName}"? This will also delete all items in it. This action cannot be undone.`}
          confirmLabel="Delete"
          cancelLabel="Cancel"
          onConfirm={handleDeleteWishlist}
          onCancel={() => setShowDeleteConfirm(false)}
          destructive
          icon="delete"
        />

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

        {/* Group By Modal */}
        <Modal
          visible={showGroupByModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowGroupByModal(false)}
        >
          <Pressable
            style={styles.modalOverlay}
            onPress={() => setShowGroupByModal(false)}
          >
            <View style={styles.sortModalContainer}>
              <Text style={styles.modalTitle}>Group Items By</Text>
              
              <TouchableOpacity
                style={[
                  styles.sortOption,
                  groupByOption === 'None' && styles.sortOptionSelected,
                ]}
                onPress={() => handleGroupBySelect('None')}
              >
                <Text style={[
                  styles.sortOptionText,
                  groupByOption === 'None' && styles.sortOptionTextSelected,
                ]}>
                  None
                </Text>
                {groupByOption === 'None' && (
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
                  groupByOption === 'Store' && styles.sortOptionSelected,
                ]}
                onPress={() => handleGroupBySelect('Store')}
              >
                <Text style={[
                  styles.sortOptionText,
                  groupByOption === 'Store' && styles.sortOptionTextSelected,
                ]}>
                  Store
                </Text>
                {groupByOption === 'Store' && (
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
                  groupByOption === 'Category' && styles.sortOptionSelected,
                ]}
                onPress={() => handleGroupBySelect('Category')}
              >
                <Text style={[
                  styles.sortOptionText,
                  groupByOption === 'Category' && styles.sortOptionTextSelected,
                ]}>
                  Category
                </Text>
                {groupByOption === 'Category' && (
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
                  groupByOption === 'Price Range' && styles.sortOptionSelected,
                ]}
                onPress={() => handleGroupBySelect('Price Range')}
              >
                <Text style={[
                  styles.sortOptionText,
                  groupByOption === 'Price Range' && styles.sortOptionTextSelected,
                ]}>
                  Price Range
                </Text>
                {groupByOption === 'Price Range' && (
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

        {/* Share Modal - keeping existing implementation */}
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
                {existingShareSlug ? 'Manage your share settings' : 'Choose who can view this wishlist'}
              </Text>
              
              <TouchableOpacity
                style={[
                  styles.visibilityOption,
                  shareVisibility === 'public' && styles.visibilityOptionSelected,
                ]}
                onPress={() => setShareVisibility('public')}
                disabled={shareLoading}
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
                disabled={shareLoading}
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

              {existingShareSlug ? (
                <ScrollView style={styles.shareModalScroll}>
                  <View style={styles.shareLinkContainer}>
                    <Text style={styles.shareLinkLabel}>Share Link</Text>
                    <View style={styles.shareLinkBox}>
                      <Text style={styles.shareLinkText} numberOfLines={1}>
                        {shareUrl}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.shareActionsContainer}>
                    <TouchableOpacity
                      style={styles.shareActionButton}
                      onPress={handleCopyLink}
                      disabled={shareLoading}
                    >
                      <IconSymbol
                        ios_icon_name="doc.on.doc"
                        android_material_icon_name="content-copy"
                        size={20}
                        color={colors.primary}
                      />
                      <Text style={styles.shareActionText}>Copy Link</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.shareActionButton}
                      onPress={handleShareLink}
                      disabled={shareLoading}
                    >
                      <IconSymbol
                        ios_icon_name="square.and.arrow.up"
                        android_material_icon_name="share"
                        size={20}
                        color={colors.primary}
                      />
                      <Text style={styles.shareActionText}>Share</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.shareActionButton}
                      onPress={handleRegenerateShare}
                      disabled={shareLoading}
                    >
                      <IconSymbol
                        ios_icon_name="arrow.clockwise"
                        android_material_icon_name="refresh"
                        size={20}
                        color={colors.primary}
                      />
                      <Text style={styles.shareActionText}>Regenerate</Text>
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity
                    style={[styles.button, styles.updateButton]}
                    onPress={handleCreateOrUpdateShare}
                    disabled={shareLoading}
                  >
                    {shareLoading ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.saveButtonText}>Update Visibility</Text>
                    )}
                  </TouchableOpacity>

                  <View style={styles.buttonRow}>
                    <TouchableOpacity
                      style={[styles.button, styles.cancelButton]}
                      onPress={() => setShowShareModal(false)}
                      disabled={shareLoading}
                    >
                      <Text style={styles.cancelButtonText}>Close</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.button, styles.deleteShareButton]}
                      onPress={() => setShowStopSharingConfirm(true)}
                      disabled={shareLoading}
                    >
                      <Text style={styles.deleteShareButtonText}>
                        Stop Sharing
                      </Text>
                    </TouchableOpacity>
                  </View>
                </ScrollView>
              ) : (
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
                    onPress={handleCreateOrUpdateShare}
                    disabled={shareLoading}
                  >
                    {shareLoading ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.saveButtonText}>Create Link</Text>
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </Pressable>
          </Pressable>
        </Modal>

        <ConfirmDialog
          visible={showStopSharingConfirm}
          title="Stop Sharing"
          message="This will delete the share link. Anyone with the link will no longer be able to access this wishlist."
          confirmLabel="Stop Sharing"
          cancelLabel="Cancel"
          onConfirm={handleStopSharing}
          onCancel={() => setShowStopSharingConfirm(false)}
          destructive
          icon="link"
        />

        {/* Reservation Settings Modal - keeping existing implementation */}
        <Modal
          visible={showReservationSettings}
          transparent
          animationType="fade"
          onRequestClose={() => setShowReservationSettings(false)}
        >
          <Pressable
            style={styles.modalOverlay}
            onPress={() => setShowReservationSettings(false)}
          >
            <Pressable style={styles.reservationModalContainer}>
              <Text style={styles.modalTitle}>Reservation Settings</Text>
              <Text style={styles.modalSubtitle}>
                Allow guests to reserve items on shared wishlists
              </Text>

              <ScrollView style={styles.reservationModalScroll}>
                {/* Allow Reservations Toggle */}
                <View style={styles.settingRow}>
                  <View style={styles.settingInfo}>
                    <Text style={styles.settingTitle}>Allow Reservations</Text>
                    <Text style={styles.settingDescription}>
                      Let guests reserve items to avoid duplicate gifts
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[
                      styles.toggle,
                      allowReservations && styles.toggleActive,
                    ]}
                    onPress={() => setAllowReservations(!allowReservations)}
                    disabled={savingReservationSettings}
                  >
                    <View
                      style={[
                        styles.toggleThumb,
                        allowReservations && styles.toggleThumbActive,
                      ]}
                    />
                  </TouchableOpacity>
                </View>

                {allowReservations && (
                  <>
                    {/* Hide Reserved Items Toggle */}
                    <View style={styles.settingRow}>
                      <View style={styles.settingInfo}>
                        <Text style={styles.settingTitle}>Hide Reserved Items</Text>
                        <Text style={styles.settingDescription}>
                          Reserved items won't be visible to other guests
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={[
                          styles.toggle,
                          hideReservedItems && styles.toggleActive,
                        ]}
                        onPress={() => setHideReservedItems(!hideReservedItems)}
                        disabled={savingReservationSettings}
                      >
                        <View
                          style={[
                            styles.toggleThumb,
                            hideReservedItems && styles.toggleThumbActive,
                          ]}
                        />
                      </TouchableOpacity>
                    </View>

                    {/* Show Reserver Names Toggle */}
                    <View style={styles.settingRow}>
                      <View style={styles.settingInfo}>
                        <Text style={styles.settingTitle}>Show Reserver Names</Text>
                        <Text style={styles.settingDescription}>
                          Guests can see who reserved each item
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={[
                          styles.toggle,
                          showReserverNames && styles.toggleActive,
                        ]}
                        onPress={() => setShowReserverNames(!showReserverNames)}
                        disabled={savingReservationSettings}
                      >
                        <View
                          style={[
                            styles.toggleThumb,
                            showReserverNames && styles.toggleThumbActive,
                          ]}
                        />
                      </TouchableOpacity>
                    </View>

                    {/* Current Reservations */}
                    {loadingReservations ? (
                      <View style={styles.reservationsLoading}>
                        <ActivityIndicator size="small" color={colors.primary} />
                        <Text style={styles.reservationsLoadingText}>Loading reservations...</Text>
                      </View>
                    ) : reservations.length > 0 ? (
                      <View style={styles.reservationsSection}>
                        <Text style={styles.reservationsSectionTitle}>
                          Current Reservations ({reservations.length})
                        </Text>
                        {reservations.map((reservation) => (
                          <View key={reservation.id} style={styles.reservationCard}>
                            <View style={styles.reservationInfo}>
                              <Text style={styles.reservationItemTitle} numberOfLines={1}>
                                {reservation.itemTitle}
                              </Text>
                              <Text style={styles.reservationDetails}>
                                Reserved by {reservation.reservedByName}
                              </Text>
                              <Text style={styles.reservationDate}>
                                {new Date(reservation.reservedAt).toLocaleDateString()}
                              </Text>
                            </View>
                            <IconSymbol
                              ios_icon_name="checkmark.circle.fill"
                              android_material_icon_name="check-circle"
                              size={24}
                              color="#10B981"
                            />
                          </View>
                        ))}
                      </View>
                    ) : (
                      <View style={styles.noReservations}>
                        <IconSymbol
                          ios_icon_name="gift"
                          android_material_icon_name="card-giftcard"
                          size={32}
                          color={colors.textSecondary}
                        />
                        <Text style={styles.noReservationsText}>No reservations yet</Text>
                      </View>
                    )}
                  </>
                )}
              </ScrollView>

              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={[styles.button, styles.cancelButton]}
                  onPress={() => setShowReservationSettings(false)}
                  disabled={savingReservationSettings}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.button, styles.saveButton]}
                  onPress={handleSaveReservationSettings}
                  disabled={savingReservationSettings}
                >
                  {savingReservationSettings ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.saveButtonText}>Save Settings</Text>
                  )}
                </TouchableOpacity>
              </View>
            </Pressable>
          </Pressable>
        </Modal>
      </SafeAreaView>
    </View>
  );
}
