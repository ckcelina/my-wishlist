
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

// Expanded local fallback dataset for common cities worldwide
const FALLBACK_CITIES: CityResult[] = [
  // Middle East
  { name: 'Amman', region: null, countryCode: 'JO', countryName: 'Jordan', lat: 31.9454, lng: 35.9284, geonameId: '250441' },
  { name: 'Dubai', region: null, countryCode: 'AE', countryName: 'United Arab Emirates', lat: 25.2048, lng: 55.2708, geonameId: '292223' },
  { name: 'Abu Dhabi', region: null, countryCode: 'AE', countryName: 'United Arab Emirates', lat: 24.4539, lng: 54.3773, geonameId: '292968' },
  { name: 'Riyadh', region: null, countryCode: 'SA', countryName: 'Saudi Arabia', lat: 24.7136, lng: 46.6753, geonameId: '108410' },
  { name: 'Jeddah', region: null, countryCode: 'SA', countryName: 'Saudi Arabia', lat: 21.5433, lng: 39.1728, geonameId: '105343' },
  { name: 'Cairo', region: null, countryCode: 'EG', countryName: 'Egypt', lat: 30.0444, lng: 31.2357, geonameId: '360630' },
  { name: 'Istanbul', region: null, countryCode: 'TR', countryName: 'Turkey', lat: 41.0082, lng: 28.9784, geonameId: '745044' },
  { name: 'Doha', region: null, countryCode: 'QA', countryName: 'Qatar', lat: 25.2854, lng: 51.5310, geonameId: '290030' },
  { name: 'Kuwait City', region: null, countryCode: 'KW', countryName: 'Kuwait', lat: 29.3759, lng: 47.9774, geonameId: '285787' },
  { name: 'Muscat', region: null, countryCode: 'OM', countryName: 'Oman', lat: 23.5880, lng: 58.3829, geonameId: '287286' },
  { name: 'Manama', region: null, countryCode: 'BH', countryName: 'Bahrain', lat: 26.2285, lng: 50.5860, geonameId: '290340' },
  { name: 'Beirut', region: null, countryCode: 'LB', countryName: 'Lebanon', lat: 33.8886, lng: 35.4955, geonameId: '276781' },
  
  // Europe
  { name: 'London', region: 'England', countryCode: 'GB', countryName: 'United Kingdom', lat: 51.5074, lng: -0.1278, geonameId: '2643743' },
  { name: 'Paris', region: 'Île-de-France', countryCode: 'FR', countryName: 'France', lat: 48.8566, lng: 2.3522, geonameId: '2988507' },
  { name: 'Berlin', region: null, countryCode: 'DE', countryName: 'Germany', lat: 52.5200, lng: 13.4050, geonameId: '2950159' },
  { name: 'Madrid', region: null, countryCode: 'ES', countryName: 'Spain', lat: 40.4168, lng: -3.7038, geonameId: '3117735' },
  { name: 'Rome', region: 'Lazio', countryCode: 'IT', countryName: 'Italy', lat: 41.9028, lng: 12.4964, geonameId: '3169070' },
  { name: 'Amsterdam', region: null, countryCode: 'NL', countryName: 'Netherlands', lat: 52.3676, lng: 4.9041, geonameId: '2759794' },
  { name: 'Brussels', region: null, countryCode: 'BE', countryName: 'Belgium', lat: 50.8503, lng: 4.3517, geonameId: '2800866' },
  { name: 'Vienna', region: null, countryCode: 'AT', countryName: 'Austria', lat: 48.2082, lng: 16.3738, geonameId: '2761369' },
  { name: 'Warsaw', region: null, countryCode: 'PL', countryName: 'Poland', lat: 52.2297, lng: 21.0122, geonameId: '756135' },
  { name: 'Stockholm', region: null, countryCode: 'SE', countryName: 'Sweden', lat: 59.3293, lng: 18.0686, geonameId: '2673730' },
  
  // Americas
  { name: 'New York', region: 'New York', countryCode: 'US', countryName: 'United States', lat: 40.7128, lng: -74.0060, geonameId: '5128581' },
  { name: 'Los Angeles', region: 'California', countryCode: 'US', countryName: 'United States', lat: 34.0522, lng: -118.2437, geonameId: '5368361' },
  { name: 'Chicago', region: 'Illinois', countryCode: 'US', countryName: 'United States', lat: 41.8781, lng: -87.6298, geonameId: '4887398' },
  { name: 'Toronto', region: 'Ontario', countryCode: 'CA', countryName: 'Canada', lat: 43.6532, lng: -79.3832, geonameId: '6167865' },
  { name: 'Mexico City', region: null, countryCode: 'MX', countryName: 'Mexico', lat: 19.4326, lng: -99.1332, geonameId: '3530597' },
  { name: 'São Paulo', region: 'São Paulo', countryCode: 'BR', countryName: 'Brazil', lat: -23.5505, lng: -46.6333, geonameId: '3448439' },
  { name: 'Buenos Aires', region: null, countryCode: 'AR', countryName: 'Argentina', lat: -34.6037, lng: -58.3816, geonameId: '3435910' },
  
  // Asia
  { name: 'Tokyo', region: null, countryCode: 'JP', countryName: 'Japan', lat: 35.6762, lng: 139.6503, geonameId: '1850144' },
  { name: 'Seoul', region: null, countryCode: 'KR', countryName: 'South Korea', lat: 37.5665, lng: 126.9780, geonameId: '1835848' },
  { name: 'Beijing', region: null, countryCode: 'CN', countryName: 'China', lat: 39.9042, lng: 116.4074, geonameId: '1816670' },
  { name: 'Shanghai', region: null, countryCode: 'CN', countryName: 'China', lat: 31.2304, lng: 121.4737, geonameId: '1796236' },
  { name: 'Hong Kong', region: null, countryCode: 'HK', countryName: 'Hong Kong', lat: 22.3193, lng: 114.1694, geonameId: '1819729' },
  { name: 'Singapore', region: null, countryCode: 'SG', countryName: 'Singapore', lat: 1.3521, lng: 103.8198, geonameId: '1880252' },
  { name: 'Mumbai', region: 'Maharashtra', countryCode: 'IN', countryName: 'India', lat: 19.0760, lng: 72.8777, geonameId: '1275339' },
  { name: 'Delhi', region: null, countryCode: 'IN', countryName: 'India', lat: 28.7041, lng: 77.1025, geonameId: '1273294' },
  { name: 'Bangkok', region: null, countryCode: 'TH', countryName: 'Thailand', lat: 13.7563, lng: 100.5018, geonameId: '1609350' },
  { name: 'Jakarta', region: null, countryCode: 'ID', countryName: 'Indonesia', lat: -6.2088, lng: 106.8456, geonameId: '1642911' },
  { name: 'Manila', region: null, countryCode: 'PH', countryName: 'Philippines', lat: 14.5995, lng: 120.9842, geonameId: '1701668' },
  { name: 'Kuala Lumpur', region: null, countryCode: 'MY', countryName: 'Malaysia', lat: 3.1390, lng: 101.6869, geonameId: '1735161' },
  
  // Oceania
  { name: 'Sydney', region: 'New South Wales', countryCode: 'AU', countryName: 'Australia', lat: -33.8688, lng: 151.2093, geonameId: '2147714' },
  { name: 'Melbourne', region: 'Victoria', countryCode: 'AU', countryName: 'Australia', lat: -37.8136, lng: 144.9631, geonameId: '2158177' },
  { name: 'Auckland', region: null, countryCode: 'NZ', countryName: 'New Zealand', lat: -36.8485, lng: 174.7633, geonameId: '2193733' },
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

  const searchLocalCities = useCallback((query: string, filterCountry?: string): CityResult[] => {
    const lowerQuery = query.toLowerCase();
    let filtered = FALLBACK_CITIES.filter(city => 
      city.name.toLowerCase().includes(lowerQuery) ||
      city.countryName.toLowerCase().includes(lowerQuery) ||
      (city.region && city.region.toLowerCase().includes(lowerQuery))
    );

    // Filter by country if specified
    if (filterCountry) {
      filtered = filtered.filter(city => city.countryCode === filterCountry);
    }

    return filtered.slice(0, 10);
  }, []);

  const searchCities = useCallback(async (query: string) => {
    if (query.length < MIN_QUERY_LENGTH) {
      setResults([]);
      setUsingFallback(false);
      setError(null);
      return;
    }

    if (__DEV__) {
      console.log('[CityPicker] Searching cities:', query, countryCode ? `in ${countryCode}` : 'globally');
    }
    
    setLoading(true);
    setError(null);
    setUsingFallback(false);

    try {
      // Try cache first
      const cacheKey = `${CACHE_KEY_PREFIX}${query}_${countryCode || 'all'}`;
      const cached = await AsyncStorage.getItem(cacheKey);
      
      if (cached) {
        if (__DEV__) {
          console.log('[CityPicker] Using cached city results');
        }
        const cachedData = JSON.parse(cached);
        setResults(cachedData.results);
        setLoading(false);
        return;
      }

      // Try API call
      try {
        if (__DEV__) {
          console.log('[CityPicker] Making API request to /api/location/search-cities');
          console.log('[CityPicker] Request body:', { query, countryCode, limit: 10 });
        }

        const response = await apiPost<{ results: CityResult[] }>(
          '/api/location/search-cities',
          {
            query,
            countryCode,
            limit: 10,
          }
        );

        if (__DEV__) {
          console.log('[CityPicker] API response received:', response);
        }

        if (response.results && response.results.length > 0) {
          if (__DEV__) {
            console.log('[CityPicker] City search results from API:', response.results.length);
          }
          setResults(response.results);
          
          // Cache successful results
          await AsyncStorage.setItem(cacheKey, JSON.stringify(response));
        } else {
          // API returned empty results - use local fallback
          if (__DEV__) {
            console.log('[CityPicker] API returned no results, using local fallback');
          }
          const localResults = searchLocalCities(query, countryCode);
          
          if (localResults.length > 0) {
            setResults(localResults);
            setUsingFallback(true);
          } else {
            setResults([]);
            setError(null); // Don't show error if we just have no matches
          }
        }
      } catch (apiError: any) {
        if (__DEV__) {
          console.error('[CityPicker] API call failed:', apiError);
          console.error('[CityPicker] Error details:', {
            message: apiError.message,
            stack: apiError.stack,
          });
        }
        
        // Fallback to local dataset on API error
        const localResults = searchLocalCities(query, countryCode);
        
        if (localResults.length > 0) {
          if (__DEV__) {
            console.log('[CityPicker] Using local fallback, found:', localResults.length, 'cities');
          }
          setResults(localResults);
          setUsingFallback(true);
        } else {
          // No local results either - show helpful error
          setResults([]);
          setError('No cities found. Try a different search term or select country only.');
        }
      }
    } catch (err) {
      console.error('[CityPicker] City search error:', err);
      
      // Final fallback to local dataset
      const localResults = searchLocalCities(query, countryCode);
      if (localResults.length > 0) {
        setResults(localResults);
        setUsingFallback(true);
      } else {
        setError('Unable to search cities. Try a different search term.');
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
    if (__DEV__) {
      console.log('[CityPicker] User tapped retry for city search');
    }
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
              Showing local results (online search unavailable)
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
