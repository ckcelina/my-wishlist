
import React, { useState, useEffect } from 'react';
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
import { searchItem } from '@/utils/supabase-edge-functions';
import { useSmartLocation } from '@/contexts/SmartLocationContext';
import { TravelBanner } from '@/components/TravelBanner';
import { getCountryFlag } from '@/constants/countries';

type SearchStage = 'idle' | 'normalizing' | 'finding_stores' | 'checking_prices' | 'verifying_shipping' | 'choosing_photo' | 'complete' | 'error';
type SearchMode = 'standard' | 'near_me';

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

interface OfferGroup {
  type: 'local' | 'international';
  label: string;
  offers: Offer[];
}

export default function SmartSearchScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { theme } = useAppTheme();
  const colors = createColors(theme);
  const typography = createTypography(theme);
  const params = useLocalSearchParams();
  const { settings, isTraveling, updateActiveSearchCountry } = useSmartLocation();

  // Input state
  const [productName, setProductName] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [originalUrl, setOriginalUrl] = useState('');

  // Search mode
  const [searchMode, setSearchMode] = useState<SearchMode>('standard');

  // Search state
  const [searching, setSearching] = useState(false);
  const [currentStage, setCurrentStage] = useState<SearchStage>('idle');
  const [stageProgress, setStageProgress] = useState(0);
  const [itemDraft, setItemDraft] = useState<ItemDraft | null>(null);
  const [offerGroups, setOfferGroups] = useState<OfferGroup[]>([]);
  const [error, setError] = useState<string | null>(null);

  // UI state
  const [showLocationModal, setShowLocationModal] = useState(false);

  useEffect(() => {
    console.log('[SmartSearch] Initializing');

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
  }, [params, settings]);

  const handleStartSearch = async () => {
    if (!productName.trim()) {
      setError('Please enter a product name');
      return;
    }

    // Get country from Settings
    const searchCountry = settings?.activeSearchCountry || 'US';
    if (!searchCountry) {
      console.log('[SmartSearch] Country not set in Settings, showing modal');
      setShowLocationModal(true);
      return;
    }

    console.log('[SmartSearch] Starting AI Price Search for:', productName);
    console.log('[SmartSearch] Search mode:', searchMode);
    console.log('[SmartSearch] Search country:', searchCountry);
    setSearching(true);
    setError(null);
    setCurrentStage('normalizing');
    setStageProgress(0);

    try {
      // Stage 1: Normalizing query
      setCurrentStage('normalizing');
      setStageProgress(20);
      await new Promise(resolve => setTimeout(resolve, 800));

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
        searchCountry,
        undefined // city is optional
      );

      if (response.error) {
        throw new Error(response.error);
      }

      console.log('[SmartSearch] AI Price Search completed:', response.offers.length, 'offers');

      // Group offers by delivery type
      const localOffers = response.offers.filter(
        offer => offer.shippingCountry === searchCountry && 
        offer.estimatedDelivery && 
        parseInt(offer.estimatedDelivery) < 3
      );
      const internationalOffers = response.offers.filter(
        offer => !localOffers.includes(offer)
      );

      const groups: OfferGroup[] = [];
      if (localOffers.length > 0) {
        groups.push({
          type: 'local',
          label: 'Local pickup / fast delivery',
          offers: localOffers,
        });
      }
      if (internationalOffers.length > 0) {
        groups.push({
          type: 'international',
          label: 'Ships internationally',
          offers: internationalOffers,
        });
      }

      setOfferGroups(groups);

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
              countryAvailability: [searchCountry],
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

  if (!settings) {
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
          {/* Travel Banner */}
          <TravelBanner />

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

          {/* Search Mode Selector */}
          <View style={styles.modeSelector}>
            <TouchableOpacity
              style={[
                styles.modeButton,
                { borderColor: colors.border },
                searchMode === 'standard' && { backgroundColor: colors.accent, borderColor: colors.accent },
              ]}
              onPress={() => setSearchMode('standard')}
              disabled={searching}
            >
              <IconSymbol
                ios_icon_name="globe"
                android_material_icon_name="public"
                size={20}
                color={searchMode === 'standard' ? colors.textInverse : colors.textSecondary}
              />
              <Text
                style={[
                  styles.modeButtonText,
                  { color: searchMode === 'standard' ? colors.textInverse : colors.textSecondary },
                ]}
              >
                Standard Search
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.modeButton,
                { borderColor: colors.border },
                searchMode === 'near_me' && { backgroundColor: colors.accent, borderColor: colors.accent },
              ]}
              onPress={() => setSearchMode('near_me')}
              disabled={searching}
            >
              <IconSymbol
                ios_icon_name="location.fill"
                android_material_icon_name="location-on"
                size={20}
                color={searchMode === 'near_me' ? colors.textInverse : colors.textSecondary}
              />
              <Text
                style={[
                  styles.modeButtonText,
                  { color: searchMode === 'near_me' ? colors.textInverse : colors.textSecondary },
                ]}
              >
                Scan Stores Near Me
              </Text>
            </TouchableOpacity>
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

          {/* Country Info - managed in Settings */}
          <View style={styles.countrySection}>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
              Searching for delivery to:
            </Text>
            <View style={[styles.countryDisplay, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.countryDisplayText, { color: colors.textPrimary }]}>
                {settings?.activeSearchCountry || 'Not set'}
              </Text>
              <TouchableOpacity
                style={styles.changeCountryButton}
                onPress={() => router.push('/location')}
                disabled={searching}
              >
                <Text style={[styles.changeCountryText, { color: colors.accent }]}>
                  Change in Settings
                </Text>
                <IconSymbol
                  ios_icon_name="chevron.right"
                  android_material_icon_name="chevron-right"
                  size={14}
                  color={colors.accent}
                />
              </TouchableOpacity>
            </View>
            {isTraveling && (
              <Text style={[styles.travelHint, { color: colors.textSecondary }]}>
                💡 You're traveling. You can change your search country in Settings.
              </Text>
            )}
          </View>

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
              (searching || !productName.trim() || !settings?.activeSearchCountry) && styles.searchButtonDisabled,
            ]}
            onPress={handleStartSearch}
            disabled={searching || !productName.trim() || !settings?.activeSearchCountry}
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
                  {searchMode === 'near_me' ? 'Scan Stores Near Me' : 'Start Smart Search'}
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
                Searches 6-12 online stores based on your selected country
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
                Groups results by local pickup / fast delivery vs international shipping
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
                Country Required
              </Text>
              <Text style={[styles.modalText, { color: colors.textSecondary }]}>
                To find prices and check shipping, please set your country in Settings.
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
                  <Text style={[styles.modalButtonText, { color: colors.textInverse }]}>Go to Settings</Text>
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
  modeSelector: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  modeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  modeButtonText: {
    fontSize: 14,
    fontWeight: '500',
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
  countrySection: {
    marginBottom: spacing.lg,
  },
  countryDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 8,
    borderWidth: 1,
  },
  countryDisplayText: {
    fontSize: 16,
    fontWeight: '500',
  },
  changeCountryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs / 2,
  },
  changeCountryText: {
    fontSize: 14,
    fontWeight: '500',
  },
  travelHint: {
    fontSize: 13,
    marginTop: spacing.xs,
    lineHeight: 18,
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
