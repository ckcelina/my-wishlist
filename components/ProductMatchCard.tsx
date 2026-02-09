
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ImageSourcePropType } from 'react-native';
import { IconSymbol } from './IconSymbol';
import { colors, typography, spacing } from '@/styles/designSystem';

interface ProductMatch {
  id: string;
  title: string;
  imageUrl: string;
  price: number;
  currency: string;
  store: string;
  confidence: number;
}

interface ProductMatchCardProps {
  match: ProductMatch;
  onSelect: (match: ProductMatch) => void;
  onDismiss: (matchId: string) => void;
}

function resolveImageSource(source: string | number | ImageSourcePropType | undefined): ImageSourcePropType {
  if (!source) {
    return { uri: '' };
  }
  if (typeof source === 'string') {
    return { uri: source };
  }
  return source as ImageSourcePropType;
}

export function ProductMatchCard({ match, onSelect, onDismiss }: ProductMatchCardProps) {
  const confidenceText = `${Math.round(match.confidence * 100)}% match`;
  const priceText = `${match.currency} ${match.price.toFixed(2)}`;

  return (
    <View style={styles.container}>
      <Image source={resolveImageSource(match.imageUrl)} style={styles.image} />
      <View style={styles.content}>
        <Text style={styles.title}>{match.title}</Text>
        <Text style={styles.store}>{match.store}</Text>
        <Text style={styles.price}>{priceText}</Text>
        <Text style={styles.confidence}>{confidenceText}</Text>
      </View>
      <View style={styles.actions}>
        <TouchableOpacity onPress={() => onSelect(match)} style={styles.selectButton}>
          <IconSymbol ios_icon_name="checkmark" android_material_icon_name="check" size={20} color={colors.background} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => onDismiss(match.id)} style={styles.dismissButton}>
          <IconSymbol ios_icon_name="xmark" android_material_icon_name="close" size={20} color={colors.text} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: 12,
    marginBottom: spacing.md,
  },
  image: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  content: {
    flex: 1,
    marginLeft: spacing.md,
  },
  title: {
    ...typography.h3,
    color: colors.text,
  },
  store: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  price: {
    ...typography.body,
    color: colors.text,
    marginTop: spacing.xs,
  },
  confidence: {
    ...typography.caption,
    color: colors.success,
    marginTop: spacing.xs,
  },
  actions: {
    flexDirection: 'column',
    gap: spacing.sm,
  },
  selectButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    padding: spacing.sm,
  },
  dismissButton: {
    backgroundColor: colors.border,
    borderRadius: 8,
    padding: spacing.sm,
  },
});
