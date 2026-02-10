
import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  ImageSourcePropType,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { IconSymbol } from '@/components/IconSymbol';
import { useAppTheme } from '@/contexts/ThemeContext';
import { createColors, spacing } from '@/styles/designSystem';
import { useAuth } from '@/contexts/AuthContext';
import { useSmartLocation } from '@/contexts/SmartLocationContext';
import { makeTiles, identifyProductFromImageTiles } from '@/utils/image-tiling';

// Helper to resolve image sources
function resolveImageSource(source: string | number | ImageSourcePropType | undefined): ImageSourcePropType {
  if (!source) return { uri: '' };
  if (typeof source === 'string') return { uri: source };
  return source as ImageSourcePropType;
}

export default function ImagePreviewScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { theme } = useAppTheme();
  const colors = createColors(theme);
  const { user } = useAuth();
  const { userLocation } = useSmartLocation();

  const imageUri = params.imageUri as string;
  const [searching, setSearching] = useState(false);
  const [searchProgress, setSearchProgress] = useState('');

  console.log('[ImagePreview] Screen mounted with imageUri:', imageUri);

  if (!imageUri) {
    Alert.alert('Error', 'No image provided');
    router.back();
    return null;
  }

  const handleSearchFullImage = async () => {
    if (!user) {
      Alert.alert('Sign In Required', 'Please sign in to search for products.');
      router.push('/auth');
      return;
    }

    console.log('[ImagePreview] Searching full image');
    setSearching(true);
    setSearchProgress('Analyzing image...');

    try {
      const result = await identifyProductFromImageTiles(
        imageUri,
        1, // 1x1 grid = full image
        (progress) => {
          console.log('[ImagePreview] Progress:', progress);
          setSearchProgress(progress);
        }
      );

      console.log('[ImagePreview] Search complete:', result.status);

      if (result.status === 'error') {
        if (result.error === 'AUTH_REQUIRED') {
          Alert.alert('Session Expired', result.message || 'Please sign in again.', [
            { text: 'OK', onPress: () => router.push('/auth') }
          ]);
          return;
        }

        Alert.alert('Search Failed', result.message || 'Could not analyze image.', [
          { text: 'Try Again' },
          { text: 'Add Manually', onPress: () => handleAddManually() }
        ]);
        return;
      }

      if (result.status === 'no_results' || result.aggregatedItems.length === 0) {
        Alert.alert(
          'No Products Found',
          result.message || 'No matches found. Try cropping or better lighting.',
          [
            { text: 'Try Parts', onPress: () => handleSearchParts(2) },
            { text: 'Add Manually', onPress: () => handleAddManually() }
          ]
        );
        return;
      }

      // Navigate to import preview with results
      router.push({
        pathname: '/import-preview',
        params: {
          identifiedItems: JSON.stringify(result.aggregatedItems),
          identifiedProduct: JSON.stringify({
            title: result.query || 'Product',
            brand: result.aggregatedItems[0]?.title,
            confidence: result.confidence,
          }),
          message: result.message,
        },
      });
    } catch (error: any) {
      console.error('[ImagePreview] Search error:', error);
      Alert.alert('Error', error.message || 'Failed to search image');
    } finally {
      setSearching(false);
      setSearchProgress('');
    }
  };

  const handleSearchParts = async (gridSize: 2 | 3) => {
    if (!user) {
      Alert.alert('Sign In Required', 'Please sign in to search for products.');
      router.push('/auth');
      return;
    }

    console.log(`[ImagePreview] Searching image parts (${gridSize}x${gridSize})`);
    setSearching(true);
    setSearchProgress(`Splitting image into ${gridSize * gridSize} parts...`);

    try {
      const result = await identifyProductFromImageTiles(
        imageUri,
        gridSize,
        (progress) => {
          console.log('[ImagePreview] Progress:', progress);
          setSearchProgress(progress);
        }
      );

      console.log('[ImagePreview] Search complete:', result.status);

      if (result.status === 'error') {
        if (result.error === 'AUTH_REQUIRED') {
          Alert.alert('Session Expired', result.message || 'Please sign in again.', [
            { text: 'OK', onPress: () => router.push('/auth') }
          ]);
          return;
        }

        Alert.alert('Search Failed', result.message || 'Could not analyze image.', [
          { text: 'Try Again' },
          { text: 'Add Manually', onPress: () => handleAddManually() }
        ]);
        return;
      }

      if (result.status === 'no_results' || result.aggregatedItems.length === 0) {
        const nextGrid = gridSize === 2 ? 3 : null;
        const buttons = nextGrid
          ? [
              { text: 'Try 3x3', onPress: () => handleSearchParts(3) },
              { text: 'Add Manually', onPress: () => handleAddManually() }
            ]
          : [
              { text: 'Try Again', onPress: () => handleSearchFullImage() },
              { text: 'Add Manually', onPress: () => handleAddManually() }
            ];

        Alert.alert(
          'No Products Found',
          result.message || 'No matches found in image parts.',
          buttons
        );
        return;
      }

      // Navigate to import preview with results
      router.push({
        pathname: '/import-preview',
        params: {
          identifiedItems: JSON.stringify(result.aggregatedItems),
          identifiedProduct: JSON.stringify({
            title: result.query || 'Product',
            brand: result.aggregatedItems[0]?.title,
            confidence: result.confidence,
          }),
          message: result.message,
        },
      });
    } catch (error: any) {
      console.error('[ImagePreview] Search error:', error);
      Alert.alert('Error', error.message || 'Failed to search image parts');
    } finally {
      setSearching(false);
      setSearchProgress('');
    }
  };

  const handleAddManually = () => {
    const countryCode = userLocation?.countryCode || 'US';
    const currencyCode = userLocation?.currencyCode || 'USD';

    router.push({
      pathname: '/import-preview',
      params: {
        data: JSON.stringify({
          itemName: '',
          imageUrl: imageUri,
          extractedImages: JSON.stringify([imageUri]),
          storeName: '',
          storeDomain: '',
          price: null,
          currency: currencyCode,
          countryAvailability: JSON.stringify([countryCode]),
          sourceUrl: '',
          inputType: 'manual',
        }),
      },
    });
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          title: 'Preview',
          headerShown: true,
        }}
      />
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Image Preview */}
          <View style={styles.imageContainer}>
            <Image
              source={resolveImageSource(imageUri)}
              style={styles.image}
              resizeMode="contain"
            />
          </View>

          {/* Search Options */}
          {searching ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[styles.loadingText, { color: colors.text }]}>
                {searchProgress}
              </Text>
            </View>
          ) : (
            <View style={styles.actionsContainer}>
              <Text style={[styles.actionsTitle, { color: colors.text }]}>
                How would you like to search?
              </Text>

              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: colors.primary }]}
                onPress={handleSearchFullImage}
              >
                <IconSymbol
                  ios_icon_name="photo"
                  android_material_icon_name="image"
                  size={24}
                  color={colors.background}
                />
                <View style={styles.actionButtonText}>
                  <Text style={[styles.actionButtonTitle, { color: colors.background }]}>
                    Search this image
                  </Text>
                  <Text style={[styles.actionButtonSubtitle, { color: colors.background, opacity: 0.8 }]}>
                    Analyze the full image
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }]}
                onPress={() => handleSearchParts(2)}
              >
                <IconSymbol
                  ios_icon_name="square.grid.2x2"
                  android_material_icon_name="grid-on"
                  size={24}
                  color={colors.primary}
                />
                <View style={styles.actionButtonText}>
                  <Text style={[styles.actionButtonTitle, { color: colors.text }]}>
                    Search parts (2×2)
                  </Text>
                  <Text style={[styles.actionButtonSubtitle, { color: colors.textSecondary }]}>
                    Split into 4 tiles for better results
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }]}
                onPress={() => handleSearchParts(3)}
              >
                <IconSymbol
                  ios_icon_name="square.grid.3x3"
                  android_material_icon_name="grid-on"
                  size={24}
                  color={colors.primary}
                />
                <View style={styles.actionButtonText}>
                  <Text style={[styles.actionButtonTitle, { color: colors.text }]}>
                    Search parts (3×3)
                  </Text>
                  <Text style={[styles.actionButtonSubtitle, { color: colors.textSecondary }]}>
                    Split into 9 tiles for detailed search
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.secondaryButton, { borderColor: colors.border }]}
                onPress={handleAddManually}
              >
                <Text style={[styles.secondaryButtonText, { color: colors.text }]}>
                  Add manually instead
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  imageContainer: {
    width: '100%',
    height: 400,
    backgroundColor: '#000',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: 16,
    textAlign: 'center',
  },
  actionsContainer: {
    padding: spacing.lg,
  },
  actionsTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: spacing.lg,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    borderRadius: 12,
    marginBottom: spacing.md,
  },
  actionButtonText: {
    flex: 1,
    marginLeft: spacing.md,
  },
  actionButtonTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: spacing.xs / 2,
  },
  actionButtonSubtitle: {
    fontSize: 14,
  },
  secondaryButton: {
    padding: spacing.md,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
});
