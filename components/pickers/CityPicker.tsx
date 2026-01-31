
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  FlatList,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { IconSymbol } from '@/components/IconSymbol';
import { colors, typography, spacing, inputStyles } from '@/styles/designSystem';
import { useAppTheme } from '@/contexts/ThemeContext';
import { searchCities, CityResult } from '@/src/services/citySearch';
import debounce from 'lodash.debounce';

interface CityPickerProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (city: CityResult) => void;
  countryCode?: string;
}

const DEBOUNCE_MS = 350; // 250-400ms as per requirements
const MIN_QUERY_LENGTH = 2;
const RESULT_LIMIT = 20; // Limit results to 20 as per requirements

export function CityPicker({
  visible,
  onClose,
  onSelect,
  countryCode,
}: CityPickerProps) {
  const { theme } = useAppTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<CityResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usingFallback, setUsingFallback] = useState(false);

  // Debounced search function
  const debouncedSearch = useCallback(
    debounce(async (query: string) => {
      if (query.length < MIN_QUERY_LENGTH) {
        setResults([]);
        setUsingFallback(false);
        setError(null);
        setLoading(false);
        return;
      }

      if (__DEV__) {
        console.log('[CityPicker] Searching cities:', query, countryCode ? `in ${countryCode}` : 'globally');
      }

      setLoading(true);
      setError(null);
      setUsingFallback(false);

      try {
        const response = await searchCities(query, countryCode, RESULT_LIMIT);

        if (__DEV__) {
          console.log(`[CityPicker] Search complete: ${response.cities.length} cities from ${response.source}`);
        }

        setResults(response.cities);
        setUsingFallback(response.source === 'local');

        if (response.cities.length === 0) {
          setError(null); // Don't show error for no results
        }
      } catch (err: any) {
        console.error('[CityPicker] City search error:', err);
        setError('City search is temporarily unavailable. You can still select your country.');
        setResults([]);
        setUsingFallback(false);
      } finally {
        setLoading(false);
      }
    }, DEBOUNCE_MS),
    [countryCode]
  );

  // Trigger search when query changes
  useEffect(() => {
    if (searchQuery.length >= MIN_QUERY_LENGTH) {
      setLoading(true); // Show loading immediately
      debouncedSearch(searchQuery);
    } else {
      setResults([]);
      setUsingFallback(false);
      setError(null);
      setLoading(false);
    }

    // Cleanup debounce on unmount
    return () => {
      debouncedSearch.cancel();
    };
  }, [searchQuery, debouncedSearch]);

  const handleSelect = (city: CityResult) => {
    if (__DEV__) {
      console.log('[CityPicker] User selected city:', city.name, city.region, city.countryName);
    }
    onSelect(city);
    setSearchQuery('');
    setResults([]);
    setError(null);
    setUsingFallback(false);
    onClose();
  };

  const handleClose = () => {
    if (__DEV__) {
      console.log('[CityPicker] User closed city picker');
    }
    setSearchQuery('');
    setResults([]);
    setError(null);
    setUsingFallback(false);
    onClose();
  };

  const renderCityItem = ({ item }: { item: CityResult }) => {
    const locationParts = [item.name];
    const region = item.region || item.admin1;
    if (region) {
      locationParts.push(region);
    }
    locationParts.push(item.countryName);
    const locationText = locationParts.join(', ');

    return (
      <TouchableOpacity
        style={[styles.cityItem, { backgroundColor: theme.colors.card }]}
        onPress={() => handleSelect(item)}
      >
        <View style={styles.cityContent}>
          <Text style={[styles.cityName, { color: theme.colors.text }]}>
            {item.name}
          </Text>
          <Text style={[styles.cityDetails, { color: theme.colors.textSecondary }]}>
            {locationText}
          </Text>
        </View>
        <IconSymbol
          ios_icon_name="chevron.right"
          android_material_icon_name="arrow-forward"
          size={20}
          color={theme.colors.textSecondary}
        />
      </TouchableOpacity>
    );
  };

  const handleRetry = () => {
    if (__DEV__) {
      console.log('[CityPicker] User tapped retry for city search');
    }
    setError(null);
    setUsingFallback(false);
    if (searchQuery.length >= MIN_QUERY_LENGTH) {
      debouncedSearch(searchQuery);
    }
  };

  const renderEmptyState = () => {
    if (loading) {
      return (
        <View style={styles.emptyState}>
          <ActivityIndicator size="large" color={theme.colors.accent} />
          <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
            Searching cities...
          </Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.emptyState}>
          <IconSymbol
            ios_icon_name="exclamationmark.triangle"
            android_material_icon_name="warning"
            size={48}
            color={theme.colors.textSecondary}
          />
          <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
            {error}
          </Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: theme.colors.accent }]}
            onPress={handleRetry}
          >
            <Text style={[styles.retryButtonText, { color: '#FFFFFF' }]}>
              Retry
            </Text>
          </TouchableOpacity>
          <Text style={[styles.emptyHint, { color: theme.colors.textSecondary }]}>
            You can still select your country without a city
          </Text>
        </View>
      );
    }

    if (searchQuery.length < MIN_QUERY_LENGTH) {
      return (
        <View style={styles.emptyState}>
          <IconSymbol
            ios_icon_name="magnifyingglass"
            android_material_icon_name="search"
            size={48}
            color={theme.colors.textSecondary}
          />
          <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
            Type at least 2 characters to search
          </Text>
          <Text style={[styles.emptyHint, { color: theme.colors.textSecondary }]}>
            Search for your city or major city nearby
          </Text>
        </View>
      );
    }

    if (results.length === 0) {
      return (
        <View style={styles.emptyState}>
          <IconSymbol
            ios_icon_name="location.slash"
            android_material_icon_name="location-off"
            size={48}
            color={theme.colors.textSecondary}
          />
          <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
            No cities found for "{searchQuery}"
          </Text>
          <Text style={[styles.emptyHint, { color: theme.colors.textSecondary }]}>
            Try searching for a major city nearby, or skip this step
          </Text>
        </View>
      );
    }

    return null;
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
          <Text style={[styles.title, { color: theme.colors.text }]}>
            Select City
          </Text>
          <Pressable onPress={handleClose} style={styles.closeButton}>
            <IconSymbol
              ios_icon_name="xmark"
              android_material_icon_name="close"
              size={24}
              color={theme.colors.text}
            />
          </Pressable>
        </View>

        <View style={styles.searchContainer}>
          <IconSymbol
            ios_icon_name="magnifyingglass"
            android_material_icon_name="search"
            size={20}
            color={theme.colors.textSecondary}
          />
          <TextInput
            style={[
              styles.searchInput,
              {
                color: theme.colors.text,
                backgroundColor: theme.colors.card,
              },
            ]}
            placeholder="Search cities..."
            placeholderTextColor={theme.colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="words"
            autoCorrect={false}
            autoFocus
          />
          {loading && <ActivityIndicator size="small" color={theme.colors.accent} />}
        </View>

        {usingFallback && results.length > 0 && (
          <View style={[styles.fallbackBanner, { backgroundColor: theme.colors.surface2 }]}>
            <IconSymbol
              ios_icon_name="info.circle"
              android_material_icon_name="info"
              size={16}
              color={theme.colors.textSecondary}
            />
            <Text style={[styles.fallbackText, { color: theme.colors.textSecondary }]}>
              Offline results
            </Text>
          </View>
        )}

        <FlatList
          data={results}
          keyExtractor={(item, index) => `${item.geonameId || item.id || index}`}
          renderItem={renderCityItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={renderEmptyState}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  title: {
    ...typography.titleLarge,
  },
  closeButton: {
    padding: spacing.sm,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    ...inputStyles.base,
    paddingVertical: spacing.sm,
  },
  fallbackBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
  },
  fallbackText: {
    ...typography.bodySmall,
    fontStyle: 'italic',
    flex: 1,
  },
  listContent: {
    paddingBottom: spacing.xl,
    flexGrow: 1,
  },
  cityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  cityContent: {
    flex: 1,
    gap: spacing.xs,
  },
  cityName: {
    ...typography.bodyLarge,
    fontWeight: '600',
  },
  cityDetails: {
    ...typography.bodySmall,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  emptyText: {
    ...typography.bodyMedium,
    textAlign: 'center',
  },
  emptyHint: {
    ...typography.bodySmall,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  retryButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: 12,
    marginTop: spacing.md,
  },
  retryButtonText: {
    ...typography.bodyMedium,
    fontWeight: '600',
  },
});
