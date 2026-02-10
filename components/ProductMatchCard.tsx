
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ImageSourcePropType,
} from 'react-native';
import { IconSymbol } from '@/components/IconSymbol';
import { createColors, createTypography, spacing } from '@/styles/designSystem';
import { useAppTheme } from '@/contexts/ThemeContext';

// Helper to resolve image sources (handles both local require() and remote URLs)
function resolveImageSource(source: string | number | ImageSourcePropType | undefined): ImageSourcePropType {
  if (!source) return { uri: '' };
  if (typeof source === 'string') return { uri: source };
  return source as ImageSourcePropType;
}

export interface ProductMatch {
  id: string;
  name: string;
  brand: string | null;
  category: string | null;
  imageUrl: string;
  topPrice: {
    amount: number;
    currency: string;
  };
  store: {
    name: string;
    domain: string;
    logoUrl: string | null;
  };
  priceRange: {
    min: number;
    max: number;
    currency: string;
  } | null;
  storeSuggestions: Array<{
    storeName: string;
    storeDomain: string;
    price: number;
    currency: string;
    url: string;
  }>;
  confidenceScore: number;
}

interface ProductMatchCardProps {
  product: ProductMatch;
  onSelect: (product: ProductMatch) => void;
  selected?: boolean;
}

export function ProductMatchCard({ product, onSelect, selected }: ProductMatchCardProps) {
  const { theme } = useAppTheme();
  const colors = createColors(theme);
  const typography = createTypography(theme);

  const priceDisplay = `${product.topPrice.currency} ${product.topPrice.amount.toFixed(2)}`;
  const brandText = product.brand || 'Unknown Brand';
  const storeText = product.store.name;
  const confidencePercentage = Math.round(product.confidenceScore * 100);

  return (
    <TouchableOpacity
      style={[
        styles.card,
        { backgroundColor: colors.surface, borderColor: selected ? colors.accent : colors.border },
        selected && styles.selectedCard,
      ]}
      onPress={() => onSelect(product)}
      activeOpacity={0.7}
    >
      {/* Product Image */}
      <View style={styles.imageContainer}>
        <Image
          source={resolveImageSource(product.imageUrl)}
          style={styles.productImage}
          resizeMode="cover"
        />
        {selected && (
          <View style={[styles.selectedBadge, { backgroundColor: colors.accent }]}>
            <IconSymbol
              ios_icon_name="checkmark"
              android_material_icon_name="check"
              size={16}
              color={colors.textInverse}
            />
          </View>
        )}
        {/* Confidence Score Badge */}
        <View style={[styles.confidenceBadge, { backgroundColor: colors.background }]}>
          <Text style={[styles.confidenceText, { color: colors.textPrimary }]}>
            {confidencePercentage}%
          </Text>
        </View>
      </View>

      {/* Product Info */}
      <View style={styles.infoContainer}>
        <Text style={[styles.productName, { color: colors.textPrimary }]} numberOfLines={2}>
          {product.name}
        </Text>
        
        <Text style={[styles.brandText, { color: colors.textSecondary }]} numberOfLines={1}>
          {brandText}
        </Text>

        {/* Price */}
        <View style={styles.priceRow}>
          <Text style={[styles.priceText, { color: colors.accent }]}>
            {priceDisplay}
          </Text>
          {product.priceRange && (
            <Text style={[styles.priceRangeText, { color: colors.textTertiary }]}>
              ({product.priceRange.min.toFixed(0)}-{product.priceRange.max.toFixed(0)})
            </Text>
          )}
        </View>

        {/* Store Info */}
        <View style={styles.storeRow}>
          {product.store.logoUrl ? (
            <Image
              source={resolveImageSource(product.store.logoUrl)}
              style={styles.storeLogo}
              resizeMode="contain"
            />
          ) : (
            <View style={[styles.storeLogoPlaceholder, { backgroundColor: colors.border }]}>
              <IconSymbol
                ios_icon_name="storefront"
                android_material_icon_name="store"
                size={12}
                color={colors.textTertiary}
              />
            </View>
          )}
          <Text style={[styles.storeText, { color: colors.textSecondary }]} numberOfLines={1}>
            {storeText}
          </Text>
        </View>

        {/* Additional Stores Count */}
        {product.storeSuggestions.length > 1 && (
          <Text style={[styles.additionalStoresText, { color: colors.textTertiary }]}>
            +{product.storeSuggestions.length - 1} more {product.storeSuggestions.length - 1 === 1 ? 'store' : 'stores'}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: 2,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  selectedCard: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  imageContainer: {
    width: '100%',
    height: 180,
    position: 'relative',
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  selectedBadge: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confidenceBadge: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs / 2,
    borderRadius: 12,
  },
  confidenceText: {
    fontSize: 11,
    fontWeight: '600',
  },
  infoContainer: {
    padding: spacing.md,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: spacing.xs / 2,
    lineHeight: 22,
  },
  brandText: {
    fontSize: 13,
    marginBottom: spacing.sm,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  priceText: {
    fontSize: 18,
    fontWeight: '700',
  },
  priceRangeText: {
    fontSize: 12,
  },
  storeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs / 2,
  },
  storeLogo: {
    width: 20,
    height: 20,
    borderRadius: 4,
  },
  storeLogoPlaceholder: {
    width: 20,
    height: 20,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  storeText: {
    fontSize: 13,
    flex: 1,
  },
  additionalStoresText: {
    fontSize: 12,
    fontStyle: 'italic',
  },
});
