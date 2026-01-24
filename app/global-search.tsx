
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  Image,
  ImageSourcePropType,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { useAppTheme } from '@/contexts/ThemeContext';
import { IconSymbol } from '@/components/IconSymbol';
import { Card } from '@/components/design-system/Card';
import { EmptyState } from '@/components/design-system/EmptyState';
import { colors, typography, spacing, containerStyles, inputStyles } from '@/styles/designSystem';
import { authenticatedGet } from '@/utils/api';
import { useHaptics } from '@/hooks/useHaptics';

interface SearchResult {
  itemId: string;
  title: string;
  imageUrl: string | null;
  price: number | null;
  currency: string;
  wishlistId: string;
  wishlistName: string;
}

interface SearchResponse {
  results: SearchResult[];
  totalCount: number;
}

function resolveImageSource(source: string | number | ImageSourcePropType | undefined): ImageSourcePropType {
  if (!source) return { uri: '' };
  if (typeof source === 'string') return { uri: source };
  return source as ImageSourcePropType;
}

export default function GlobalSearchScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { theme, isDark } = useAppTheme();
  const haptics = useHaptics();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [priceKnownOnly, setPriceKnownOnly] = useState(false);
  const [onSaleOnly, setOnSaleOnly] = useState(false);
  const [storeDomain, setStoreDomain] = useState('');

  const handleSearch = useCallback(async () => {
    if (!query.trim()) {
      return;
    }

    console.log('[GlobalSearchScreen] Searching for:', query);
    haptics.light();
    setLoading(true);
    setSearched(true);

    try {
      const params = new URLSearchParams({
        q: query.trim(),
        ...(priceKnownOnly && { priceKnown: 'true' }),
        ...(onSaleOnly && { onSale: 'true' }),
        ...(storeDomain && { storeDomain }),
      });

      const data = await authenticatedGet<SearchResponse>(`/api/search/global?${params.toString()}`);
      
      console.log('[GlobalSearchScreen] Search results:', data.totalCount);
      setResults(data.results);
    } catch (error) {
      console.error('[GlobalSearchScreen] Error searching:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [query, priceKnownOnly, onSaleOnly, storeDomain, haptics]);

  const handleItemPress = (item: SearchResult) => {
    console.log('[GlobalSearchScreen] User tapped item:', item.title);
    haptics.light();
    router.push(`/item/${item.itemId}`);
  };

  const renderItem = ({ item }: { item: SearchResult }) => {
    const priceText = item.price 
      ? `${item.currency} ${item.price.toFixed(2)}` 
      : 'No price';

    return (
      <Card
        interactive
        onPress={() => handleItemPress(item)}
        style={styles.resultCard}
      >
        <Image
          source={resolveImageSource(item.imageUrl)}
          style={styles.itemImage}
          resizeMode="cover"
        />
        <View style={styles.itemInfo}>
          <Text style={[styles.itemTitle, { color: theme.colors.text }]} numberOfLines={2}>
            {item.title}
          </Text>
          <Text style={[styles.wishlistName, { color: theme.colors.textSecondary }]} numberOfLines={1}>
            {item.wishlistName}
          </Text>
          <Text style={[styles.itemPrice, { color: theme.colors.accent }]}>
            {priceText}
          </Text>
        </View>
      </Card>
    );
  };

  const totalCountText = `${results.length} ${results.length === 1 ? 'result' : 'results'}`;

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Search',
          headerBackTitle: 'Back',
        }}
      />
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={[]}>
        <View style={styles.searchHeader}>
          <View style={[styles.searchBar, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <IconSymbol
              ios_icon_name="magnifyingglass"
              android_material_icon_name="search"
              size={20}
              color={theme.colors.textSecondary}
            />
            <TextInput
              style={[styles.searchInput, { color: theme.colors.text }]}
              placeholder="Search all wishlists..."
              placeholderTextColor={theme.colors.textTertiary}
              value={query}
              onChangeText={setQuery}
              onSubmitEditing={handleSearch}
              returnKeyType="search"
              autoFocus
            />
            {query.length > 0 && (
              <TouchableOpacity
                onPress={() => {
                  haptics.light();
                  setQuery('');
                  setResults([]);
                  setSearched(false);
                }}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <IconSymbol
                  ios_icon_name="xmark.circle"
                  android_material_icon_name="close"
                  size={20}
                  color={theme.colors.textSecondary}
                />
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.filters}>
            <TouchableOpacity
              style={[
                styles.filterChip,
                { 
                  backgroundColor: priceKnownOnly ? theme.colors.accent : theme.colors.card,
                  borderColor: theme.colors.border,
                }
              ]}
              onPress={() => {
                haptics.selection();
                setPriceKnownOnly(!priceKnownOnly);
              }}
            >
              <Text style={[
                styles.filterText,
                { color: priceKnownOnly ? (isDark ? theme.colors.text : '#FFFFFF') : theme.colors.text }
              ]}>
                Price known
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.filterChip,
                { 
                  backgroundColor: onSaleOnly ? theme.colors.accent : theme.colors.card,
                  borderColor: theme.colors.border,
                }
              ]}
              onPress={() => {
                haptics.selection();
                setOnSaleOnly(!onSaleOnly);
              }}
            >
              <Text style={[
                styles.filterText,
                { color: onSaleOnly ? (isDark ? theme.colors.text : '#FFFFFF') : theme.colors.text }
              ]}>
                On sale
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={theme.colors.accent} />
            <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
              Searching...
            </Text>
          </View>
        ) : searched && results.length === 0 ? (
          <EmptyState
            icon="search"
            title="No results found"
            description={`No items match "${query}"`}
          />
        ) : results.length > 0 ? (
          <>
            <View style={styles.resultsHeader}>
              <Text style={[styles.resultsCount, { color: theme.colors.textSecondary }]}>
                {totalCountText}
              </Text>
            </View>
            <FlatList
              data={results}
              renderItem={renderItem}
              keyExtractor={(item) => item.itemId}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
            />
          </>
        ) : (
          <EmptyState
            icon="search"
            title="Search your wishlists"
            description="Find items across all your wishlists"
          />
        )}
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    ...containerStyles.screen,
    paddingTop: Platform.OS === 'android' ? 48 : 0,
  },
  searchHeader: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  searchBar: {
    ...containerStyles.row,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: spacing.sm,
  },
  searchInput: {
    ...typography.bodyLarge,
    flex: 1,
    paddingVertical: spacing.xs,
  },
  filters: {
    ...containerStyles.row,
    gap: spacing.sm,
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterText: {
    ...typography.bodyMedium,
    fontWeight: '600',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    ...typography.bodyLarge,
    marginTop: spacing.md,
  },
  resultsHeader: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  resultsCount: {
    ...typography.bodyMedium,
    fontWeight: '600',
  },
  listContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xl,
  },
  resultCard: {
    ...containerStyles.row,
    marginBottom: spacing.md,
  },
  itemImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: colors.backgroundAlt,
    marginRight: spacing.md,
  },
  itemInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  itemTitle: {
    ...typography.bodyLarge,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  wishlistName: {
    ...typography.bodySmall,
    marginBottom: spacing.xs,
  },
  itemPrice: {
    ...typography.bodyMedium,
    fontWeight: '700',
  },
});
