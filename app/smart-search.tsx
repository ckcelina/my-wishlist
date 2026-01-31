
import React, { useState, useEffect, Fragment } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Modal,
  Pressable,
  Platform,
} from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconSymbol } from '@/components/IconSymbol';
import { useAuth } from '@/contexts/AuthContext';
import { useAppTheme } from '@/contexts/ThemeContext';
import { createColors, createTypography, spacing } from '@/styles/designSystem';
import { fetchUserLocation } from '@/lib/supabase-helpers';
import { searchItem } from '@/utils/supabase-edge-functions';

type SearchStage = 'idle' | 'normalizing' | 'finding_stores' | 'checking_prices' | 'verifying_shipping' | 'choosing_photo' | 'complete' | 'error';

interface Offer {
  storeName: string;
  storeDomain: string;
  productUrl: string;
  price: number;
  currency: string;
  availability: 'in_stock' | 'out_of_stock' | 'limited_stock' | 'pre_order' | 'unknown';
  shippingSupported: boolean;
  shippingCountry: string;
  estimatedDelivery?: string | null;
  lastCheckedAt: string;
  originalPrice?: number | null;
  originalCurrency?: string | null;
  shippingCost?: number | null;
  confidenceScore?: number | null;
}

interface ItemDraft {
  title: string;
  brand?: string;
  category?: string;
  best_image_url?: string;
  canonical_product_url?: string;
  offers: Offer[];
}

export default function SmartSearchScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { theme } = useAppTheme();
  const colors = createColors(theme);
  const typography = createTypography(theme);
  const params = useLocalSearchParams();

  // Input state
  const [productName, setProductName] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [originalUrl, setOriginalUrl] = useState('');

  // Search state
  const [searching, setSearching] = useState(false);
  const [currentStage, setCurrentStage] = useState<SearchStage>('idle');
  const [stageProgress, setStageProgress] = useState(0);
  const [itemDraft, setItemDraft] = useState<ItemDraft | null>(null);
  const [error, setError] = useState<string | null>(null);

  // User location
  const [userLocation, setUserLocation] = useState<{ countryCode: string; city: string | null } | null>(null);
  const [loadingLocation, setLoadingLocation] = useState(true);

  // UI state
  const [showLocationModal, setShowLocationModal] = useState(false);

  useEffect(() => {
    console.log('[SmartSearch] Initializing');
    loadUserLocation();

    // Parse params if provided
    if (params.productName) {
      setProductName(params.productName as string);
    }
    if (params.imageUrl) {
      setImageUrl(params.imageUrl as string);
    }
    if (params.originalUrl) {
      setOriginalUrl(params.originalUrl as string);
    }
  }, [params]);

  const loadUserLocation = async () => {
    if (!user) return;

    try {
      console.log('[SmartSearch] Loading user location');
      const locationData = await fetchUserLocation(user.id);

      if (locationData) {
        setUserLocation({
          countryCode: locationData.countryCode,
          city: locationData.city,
        });
        console.log('[SmartSearch] User location loaded:', locationData.countryCode);
      } else {
        console.log('[SmartSearch] No user location set');
      }
    } catch (error) {
      console.error('[SmartSearch] Error loading location:', error);
    } finally {
      setLoadingLocation(false);
    }
  };

  const handleStartSearch = async () => {
    if (!productName.trim()) {
      setError('Please enter a product name');
      return;
    }

    if (!userLocation || !userLocation.countryCode) {
      console.log('[SmartSearch] User location not set, showing modal');
      setShowLocationModal(true);
      return;
    }

    console.log('[SmartSearch] Starting AI Price Search for:', productName);
    setSearching(true);
    setError(null);
    setCurrentStage('normalizing');
    setStageProgress(0);

    try {
      // Stage 1: Normalizing query
      setCurrentStage('normalizing');
      setStageProgress(20);
      await new Promise(resolve => setTimeout(resolve, 800)); // Simulate processing

      // Stage 2: Finding stores
      setCurrentStage('finding_stores');
      setStageProgress(40);
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Stage 3: Checking prices
      setCurrentStage('checking_prices');
      setStageProgress(60);
      await new Promise(resolve => setTimeout(resolve, 1200));

      // Stage 4: Verifying shipping
      setCurrentStage('verifying_shipping');
      setStageProgress(80);
      await new Promise(resolve => setTimeout(resolve, 800));

      // Stage 5: Choosing best photo
      setCurrentStage('choosing_photo');
      setStageProgress(90);
      await new Promise(resolve => setTimeout(resolve, 600));

      // Call Supabase Edge Function for AI Price Search
      console.log('[SmartSearch] Calling search-item Edge Function');
      const response = await searchItem(
        productName.trim(),
        userLocation.countryCode,
        userLocation.city || undefined
      );

      if (response.error) {
        throw new Error(response.error);
      }

      console.log('[SmartSearch] AI Price Search completed:', response.offers.length, 'offers');

      // Create ItemDraft
      const draft: ItemDraft = {
        title: productName.trim(),
        brand: undefined,
        category: undefined,
        best_image_url: response.images[0] || imageUrl.trim() || undefined,
        canonical_product_url: response.canonical || originalUrl.trim() || undefined,
        offers: response.offers,
      };

      setItemDraft(draft);
      setCurrentStage('complete');
      setStageProgress(100);

      // Navigate to import preview with the draft
      setTimeout(() => {
        router.push({
          pathname: '/import-preview',
          params: {
            data: JSON.stringify({
              itemName: draft.title,
              imageUrl: draft.best_image_url || '',
              extractedImages: draft.best_image_url ? [draft.best_image_url] : [],
              storeName: draft.offers[0]?.storeName || '',
              storeDomain: draft.offers[0]?.storeDomain || '',
              price: draft.offers[0]?.price || null,
              currency: draft.offers[0]?.currency || 'USD',
              countryAvailability: [userLocation.countryCode],
              alternativeStores: draft.offers.map(offer => ({
                storeName: offer.storeName,
                storeDomain: offer.storeDomain,
                price: offer.price,
                currency: offer.currency,
                originalPrice: offer.originalPrice || offer.price,
                originalCurrency: offer.originalCurrency || offer.currency,
                shippingCost: offer.shippingCost || null,
                deliveryTime: offer.estimatedDelivery || null,
                availability: offer.availability,
                confidenceScore: offer.confidenceScore || 0.8,
                url: offer.productUrl,
              })),
              sourceUrl: draft.canonical_product_url || '',
              inputType: 'name',
            }),
          },
        });
      }, 500);
    } catch (error: any) {
      console.error('[SmartSearch] AI Price Search failed:', error);
      setError(error.message || 'Failed to search for product prices. Please try again.');
      setCurrentStage('error');
    } finally {
      setSearching(false);
    }
  };

  const handleSetLocation = () => {
    console.log('[SmartSearch] User tapped Set Location');
    setShowLocationModal(false);
    router.push('/location');
  };

  const getStageLabel = (stage: SearchStage): string => {
    const stageLabels: Record<SearchStage, string> = {
      idle: 'Ready to search',
      normalizing: 'Analyzing product...',
      finding_stores: 'Finding stores...',
      checking_prices: 'Checking prices...',
      verifying_shipping: 'Verifying shipping...',
      choosing_photo: 'Choosing best photo...',
      complete: 'Search complete!',
      error: 'Search failed',
    };
    return stageLabels[stage];
  };

  const getStageIcon = (stage: SearchStage): string => {
    const stageIcons: Record<SearchStage, string> = {
      idle: 'search',
      normalizing: 'auto-fix-high',
      finding_stores: 'store',
      checking_prices: 'attach-money',
      verifying_shipping: 'local-shipping',
      choosing_photo: 'image',
      complete: 'check-circle',
      error: 'error',
    };
    return stageIcons[stage];
  };

  if (loadingLocation) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  const stageLabel = getStageLabel(currentStage);
  const stageIcon = getStageIcon(currentStage);

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Smart Item Search',
          headerBackTitle: 'Back',
        }}
      />
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.header}>
            <IconSymbol
              ios_icon_name="magnifyingglass"
              android_material_icon_name="search"
              size={48}
              color={colors.accent}
            />
            <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
              AI-Powered Product Search
            </Text>
            <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
              Find the best prices across multiple stores
            </Text>
          </View>

          {/* Input Fields */}
          <View style={styles.inputSection}>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Product Name *</Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.border }]}
              value={productName}
              onChangeText={setProductName}
              placeholder="e.g., iPhone 15 Pro 256GB"
              placeholderTextColor={colors.textTertiary}
              editable={!searching}
            />

            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Image URL (optional)</Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.border }]}
              value={imageUrl}
              onChangeText={setImageUrl}
              placeholder="https://example.com/image.jpg"
              placeholderTextColor={colors.textTertiary}
              autoCapitalize="none"
              editable={!searching}
            />

            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Original URL (optional)</Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.border }]}
              value={originalUrl}
              onChangeText={setOriginalUrl}
              placeholder="https://example.com/product"
              placeholderTextColor={colors.textTertiary}
              autoCapitalize="none"
              editable={!searching}
            />
          </View>

          {/* Location Info */}
          {userLocation && (
            <View style={[styles.locationCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.locationHeader}>
                <IconSymbol
                  ios_icon_name="location"
                  android_material_icon_name="location-on"
                  size={20}
                  color={colors.accent}
                />
                <Text style={[styles.locationTitle, { color: colors.textPrimary }]}>Shipping Location</Text>
              </View>
              <Text style={[styles.locationText, { color: colors.textSecondary }]}>
                {userLocation.countryCode}{userLocation.city ? `, ${userLocation.city}` : ''}
              </Text>
              <TouchableOpacity onPress={() => router.push('/location')}>
                <Text style={[styles.locationChangeText, { color: colors.accent }]}>Change Location</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Search Progress */}
          {searching && (
            <View style={[styles.progressCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.progressHeader}>
                <IconSymbol
                  ios_icon_name="sparkles"
                  android_material_icon_name={stageIcon}
                  size={24}
                  color={colors.accent}
                />
                <Text style={[styles.progressTitle, { color: colors.textPrimary }]}>{stageLabel}</Text>
              </View>

              <View style={[styles.progressBarContainer, { backgroundColor: colors.border }]}>
                <View
                  style={[
                    styles.progressBar,
                    { backgroundColor: colors.accent, width: `${stageProgress}%` },
                  ]}
                />
              </View>

              <Text style={[styles.progressPercentage, { color: colors.textSecondary }]}>
                {stageProgress}%
              </Text>
            </View>
          )}

          {/* Error Display */}
          {error && (
            <View style={[styles.errorCard, { backgroundColor: colors.errorLight, borderColor: colors.error }]}>
              <View style={styles.errorHeader}>
                <IconSymbol
                  ios_icon_name="exclamationmark.triangle"
                  android_material_icon_name="error"
                  size={20}
                  color={colors.error}
                />
                <Text style={[styles.errorTitle, { color: colors.error }]}>Search Failed</Text>
              </View>
              <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
            </View>
          )}

          {/* Search Button */}
          <TouchableOpacity
            style={[
              styles.searchButton,
              { backgroundColor: colors.accent },
              (searching || !productName.trim()) && styles.searchButtonDisabled,
            ]}
            onPress={handleStartSearch}
            disabled={searching || !productName.trim()}
          >
            {searching ? (
              <ActivityIndicator size="small" color={colors.textInverse} />
            ) : (
              <>
                <IconSymbol
                  ios_icon_name="magnifyingglass"
                  android_material_icon_name="search"
                  size={20}
                  color={colors.textInverse}
                />
                <Text style={[styles.searchButtonText, { color: colors.textInverse }]}>
                  Start Smart Search
                </Text>
              </>
            )}
          </TouchableOpacity>

          {/* Info Section */}
          <View style={styles.infoSection}>
            <Text style={[styles.infoTitle, { color: colors.textPrimary }]}>How it works:</Text>
            <View style={styles.infoItem}>
              <Text style={[styles.infoBullet, { color: colors.accent }]}>1.</Text>
              <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                AI analyzes your product name and extracts key details
              </Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={[styles.infoBullet, { color: colors.accent }]}>2.</Text>
              <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                Searches 6-12 online stores based on your location
              </Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={[styles.infoBullet, { color: colors.accent }]}>3.</Text>
              <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                Compares prices and verifies shipping availability
              </Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={[styles.infoBullet, { color: colors.accent }]}>4.</Text>
              <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                Ranks offers by total cost and reliability
              </Text>
            </View>
          </View>
        </ScrollView>

        {/* Location Required Modal */}
        <Modal
          visible={showLocationModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowLocationModal(false)}
        >
          <Pressable style={styles.modalOverlay} onPress={() => setShowLocationModal(false)}>
            <Pressable style={[styles.modalContent, { backgroundColor: colors.surface }]} onPress={(e) => e.stopPropagation()}>
              <IconSymbol
                ios_icon_name="location"
                android_material_icon_name="location-on"
                size={48}
                color={colors.accent}
              />
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                Shipping Location Required
              </Text>
              <Text style={[styles.modalText, { color: colors.textSecondary }]}>
                To find prices online, we need to know where you want items shipped. Please set your shipping location first.
              </Text>
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonSecondary, { borderColor: colors.border }]}
                  onPress={() => setShowLocationModal(false)}
                >
                  <Text style={[styles.modalButtonText, { color: colors.textPrimary }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonPrimary, { backgroundColor: colors.accent }]}
                  onPress={handleSetLocation}
                >
                  <Text style={[styles.modalButtonText, { color: colors.textInverse }]}>Set Location</Text>
                </TouchableOpacity>
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
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '600',
    marginTop: spacing.md,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 14,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  inputSection: {
    marginBottom: spacing.lg,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: spacing.xs,
    marginTop: spacing.md,
  },
  textInput: {
    borderRadius: 8,
    padding: spacing.sm,
    fontSize: 16,
    borderWidth: 1,
  },
  locationCard: {
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
  },
  locationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  locationTitle: {
    fontSize: 16,
    fontWeight: '500',
  },
  locationText: {
    fontSize: 14,
    marginBottom: spacing.xs,
  },
  locationChangeText: {
    fontSize: 14,
    fontWeight: '500',
  },
  progressCard: {
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  progressTitle: {
    fontSize: 16,
    fontWeight: '500',
  },
  progressBarContainer: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: spacing.xs,
  },
  progressBar: {
    height: '100%',
    borderRadius: 4,
  },
  progressPercentage: {
    fontSize: 12,
    textAlign: 'right',
  },
  errorCard: {
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
  },
  errorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '500',
  },
  errorText: {
    fontSize: 14,
  },
  searchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    padding: spacing.md,
    borderRadius: 12,
    marginBottom: spacing.xl,
  },
  searchButtonDisabled: {
    opacity: 0.5,
  },
  searchButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  infoSection: {
    marginBottom: spacing.xl,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  infoBullet: {
    fontSize: 16,
    fontWeight: '600',
    width: 24,
  },
  infoText: {
    fontSize: 14,
    flex: 1,
    lineHeight: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    borderRadius: 16,
    padding: spacing.xl,
    marginHorizontal: spacing.lg,
    alignItems: 'center',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  modalText: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: spacing.lg,
    lineHeight: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
    width: '100%',
  },
  modalButton: {
    flex: 1,
    padding: spacing.sm,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalButtonSecondary: {
    borderWidth: 1,
  },
  modalButtonPrimary: {},
  modalButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
});
