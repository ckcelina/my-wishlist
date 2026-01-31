
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
import { apiPost } from '@/utils/api';
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
const DEBOUNCE_MS = 400;
const MIN_QUERY_LENGTH = 2;

// Local fallback dataset for common cities
const FALLBACK_CITIES: CityResult[] = [
  { name: 'Amman', region: null, countryCode: 'JO', countryName: 'Jordan', lat: 31.9454, lng: 35.9284, geonameId: '250441' },
  { name: 'Dubai', region: null, countryCode: 'AE', countryName: 'United Arab Emirates', lat: 25.2048, lng: 55.2708, geonameId: '292223' },
  { name: 'London', region: 'England', countryCode: 'GB', countryName: 'United Kingdom', lat: 51.5074, lng: -0.1278, geonameId: '2643743' },
  { name: 'New York', region: 'New York', countryCode: 'US', countryName: 'United States', lat: 40.7128, lng: -74.0060, geonameId: '5128581' },
  { name: 'Paris', region: 'Île-de-France', countryCode: 'FR', countryName: 'France', lat: 48.8566, lng: 2.3522, geonameId: '2988507' },
  { name: 'Tokyo', region: null, countryCode: 'JP', countryName: 'Japan', lat: 35.6762, lng: 139.6503, geonameId: '1850144' },
  { name: 'Berlin', region: null, countryCode: 'DE', countryName: 'Germany', lat: 52.5200, lng: 13.4050, geonameId: '2950159' },
  { name: 'Madrid', region: null, countryCode: 'ES', countryName: 'Spain', lat: 40.4168, lng: -3.7038, geonameId: '3117735' },
  { name: 'Rome', region: 'Lazio', countryCode: 'IT', countryName: 'Italy', lat: 41.9028, lng: 12.4964, geonameId: '3169070' },
  { name: 'Cairo', region: null, countryCode: 'EG', countryName: 'Egypt', lat: 30.0444, lng: 31.2357, geonameId: '360630' },
  { name: 'Riyadh', region: null, countryCode: 'SA', countryName: 'Saudi Arabia', lat: 24.7136, lng: 46.6753, geonameId: '108410' },
  { name: 'Istanbul', region: null, countryCode: 'TR', countryName: 'Turkey', lat: 41.0082, lng: 28.9784, geonameId: '745044' },
  { name: 'Sydney', region: 'New South Wales', countryCode: 'AU', countryName: 'Australia', lat: -33.8688, lng: 151.2093, geonameId: '2147714' },
  { name: 'Toronto', region: 'Ontario', countryCode: 'CA', countryName: 'Canada', lat: 43.6532, lng: -79.3832, geonameId: '6167865' },
  { name: 'Mumbai', region: 'Maharashtra', countryCode: 'IN', countryName: 'India', lat: 19.0760, lng: 72.8777, geonameId: '1275339' },
  { name: 'Singapore', region: null, countryCode: 'SG', countryName: 'Singapore', lat: 1.3521, lng: 103.8198, geonameId: '1880252' },
  { name: 'Hong Kong', region: null, countryCode: 'HK', countryName: 'Hong Kong', lat: 22.3193, lng: 114.1694, geonameId: '1819729' },
  { name: 'Seoul', region: null, countryCode: 'KR', countryName: 'South Korea', lat: 37.5665, lng: 126.9780, geonameId: '1835848' },
  { name: 'Mexico City', region: null, countryCode: 'MX', countryName: 'Mexico', lat: 19.4326, lng: -99.1332, geonameId: '3530597' },
  { name: 'São Paulo', region: 'São Paulo', countryCode: 'BR', countryName: 'Brazil', lat: -23.5505, lng: -46.6333, geonameId: '3448439' },
];

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

  const searchLocalCities = useCallback((query: string): CityResult[] => {
    const lowerQuery = query.toLowerCase();
    return FALLBACK_CITIES.filter(city => 
      city.name.toLowerCase().includes(lowerQuery) ||
      city.countryName.toLowerCase().includes(lowerQuery) ||
      (city.region && city.region.toLowerCase().includes(lowerQuery))
    ).slice(0, 10);
  }, []);

  const searchCities = useCallback(async (query: string) => {
    if (query.length < MIN_QUERY_LENGTH) {
      setResults([]);
      setUsingFallback(false);
      return;
    }

    console.log('[CityPicker] Searching cities:', query, countryCode ? `in ${countryCode}` : 'globally');
    setLoading(true);
    setError(null);
    setUsingFallback(false);

    try {
      // Try cache first
      const cacheKey = `${CACHE_KEY_PREFIX}${query}_${countryCode || 'all'}`;
      const cached = await AsyncStorage.getItem(cacheKey);
      
      if (cached) {
        console.log('[CityPicker] Using cached city results');
        const cachedData = JSON.parse(cached);
        setResults(cachedData.results);
        setLoading(false);
        return;
      }

      // Try API call
      try {
        const response = await apiPost<{ results: CityResult[] }>(
          '/api/location/search-cities',
          {
            query,
            countryCode,
            limit: 10,
          }
        );

        console.log('[CityPicker] City search results from API:', response.results.length);
        setResults(response.results);
        
        // Cache successful results
        await AsyncStorage.setItem(cacheKey, JSON.stringify(response));
      } catch (apiError) {
        console.warn('[CityPicker] API call failed, using local fallback:', apiError);
        
        // Fallback to local dataset
        const localResults = searchLocalCities(query);
        console.log('[CityPicker] Using local fallback, found:', localResults.length, 'cities');
        
        if (localResults.length > 0) {
          setResults(localResults);
          setUsingFallback(true);
        } else {
          setError('No cities found. Try a different search term.');
          setResults([]);
        }
      }
    } catch (err) {
      console.error('[CityPicker] City search error:', err);
      
      // Final fallback to local dataset
      const localResults = searchLocalCities(query);
      if (localResults.length > 0) {
        setResults(localResults);
        setUsingFallback(true);
      } else {
        setError('Failed to search cities. Please try again.');
        setResults([]);
      }
    } finally {
      setLoading(false);
    }
  }, [countryCode, searchLocalCities]);

  useEffect(() => {
    const timer = setTimeout(() => {
      searchCities(searchQuery);
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [searchQuery, searchCities]);

  const handleSelect = (city: CityResult) => {
    console.log('[CityPicker] User selected city:', city.name, city.region, city.countryName);
    onSelect(city);
    setSearchQuery('');
    setResults([]);
    setError(null);
    setUsingFallback(false);
    onClose();
  };

  const handleClose = () => {
    console.log('[CityPicker] User closed city picker');
    setSearchQuery('');
    setResults([]);
    setError(null);
    setUsingFallback(false);
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

  const handleRetry = () => {
    console.log('[CityPicker] User tapped retry for city search');
    setError(null);
    setUsingFallback(false);
    searchCities(searchQuery);
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
            No cities found for "{searchQuery}"
          </Text>
          <Text style={[styles.emptyHint, { color: theme.colors.textSecondary }]}>
            Try searching for a major city nearby
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
              Showing local results
            </Text>
          </View>
        )}

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
