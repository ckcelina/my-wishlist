
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
import { authenticatedPost } from '@/utils/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface CityResult {
  name: string;
  region: string | null;
  countryCode: string;
  countryName: string;
  lat: number | null;
  lng: number | null;
  geonameId: string | null;
}

interface CityPickerProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (city: CityResult) => void;
  countryCode?: string;
}

const CACHE_KEY_PREFIX = 'city_search_cache_';
const DEBOUNCE_MS = 300;
const MIN_QUERY_LENGTH = 2;

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

  const searchCities = useCallback(async (query: string) => {
    if (query.length < MIN_QUERY_LENGTH) {
      setResults([]);
      return;
    }

    console.log('Searching cities:', query, countryCode ? `in ${countryCode}` : 'globally');
    setLoading(true);
    setError(null);

    try {
      const cacheKey = `${CACHE_KEY_PREFIX}${query}_${countryCode || 'all'}`;
      const cached = await AsyncStorage.getItem(cacheKey);
      
      if (cached) {
        console.log('Using cached city results');
        const cachedData = JSON.parse(cached);
        setResults(cachedData.results);
        setLoading(false);
        return;
      }

      const response = await authenticatedPost<{ results: CityResult[] }>(
        '/api/location/search-cities',
        {
          query,
          countryCode,
          limit: 10,
        }
      );

      console.log('City search results:', response.results.length);
      setResults(response.results);
      
      await AsyncStorage.setItem(cacheKey, JSON.stringify(response));
    } catch (err) {
      console.error('City search error:', err);
      setError('Failed to search cities. Please try again.');
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [countryCode]);

  useEffect(() => {
    const timer = setTimeout(() => {
      searchCities(searchQuery);
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [searchQuery, searchCities]);

  const handleSelect = (city: CityResult) => {
    console.log('User selected city:', city.name, city.region, city.countryName);
    onSelect(city);
    setSearchQuery('');
    setResults([]);
    onClose();
  };

  const handleClose = () => {
    console.log('User closed city picker');
    setSearchQuery('');
    setResults([]);
    setError(null);
    onClose();
  };

  const renderCityItem = ({ item }: { item: CityResult }) => {
    const locationParts = [item.name];
    if (item.region) {
      locationParts.push(item.region);
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

  const renderEmptyState = () => {
    if (loading) {
      return null;
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
            No cities found
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
          />
          {loading && <ActivityIndicator size="small" color={theme.colors.accent} />}
        </View>

        <FlatList
          data={results}
          keyExtractor={(item, index) => `${item.geonameId || index}`}
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
    gap: spacing.md,
  },
  emptyText: {
    ...typography.bodyMedium,
    textAlign: 'center',
  },
});
