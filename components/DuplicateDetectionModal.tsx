
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
  Image,
  ImageSourcePropType,
  TouchableOpacity,
} from 'react-native';
import { IconSymbol } from './IconSymbol';
import { colors, typography, spacing } from '@/styles/designSystem';

interface DuplicateItem {
  id: string;
  title: string;
  imageUrl: string | null;
  currentPrice: number | null;
  currency: string;
  originalUrl: string | null;
  similarity: number;
}

interface DuplicateDetectionModalProps {
  visible: boolean;
  newItem: {
    title: string;
    imageUrl: string | null;
    currentPrice: number | null;
    currency: string;
  };
  duplicates: DuplicateItem[];
  onAddAnyway: () => void;
  onReplace: (duplicateId: string) => void;
  onCancel: () => void;
}

function resolveImageSource(source: string | number | ImageSourcePropType | undefined): ImageSourcePropType {
  if (!source) return { uri: '' };
  if (typeof source === 'string') return { uri: source };
  return source as ImageSourcePropType;
}

export function DuplicateDetectionModal({
  visible,
  newItem,
  duplicates,
  onAddAnyway,
  onReplace,
  onCancel,
}: DuplicateDetectionModalProps) {
  const newItemPriceText = newItem.currentPrice 
    ? `${newItem.currency} ${newItem.currentPrice.toFixed(2)}`
    : 'No price';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onCancel}
    >
      <Pressable style={styles.overlay} onPress={onCancel}>
        <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
          <View style={styles.header}>
            <IconSymbol
              ios_icon_name="exclamationmark.triangle.fill"
              android_material_icon_name="warning"
              size={32}
              color={colors.warning}
            />
            <Text style={styles.title}>Possible Duplicate</Text>
            <Text style={styles.subtitle}>
              This looks like something already in your wishlist
            </Text>
          </View>

          <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* New Item Card */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>New Item</Text>
              <View style={styles.itemCard}>
                {newItem.imageUrl ? (
                  <Image
                    source={resolveImageSource(newItem.imageUrl)}
                    style={styles.itemImage}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={[styles.itemImage, styles.placeholderImage]}>
                    <IconSymbol
                      ios_icon_name="photo"
                      android_material_icon_name="image"
                      size={32}
                      color={colors.textSecondary}
                    />
                  </View>
                )}
                <View style={styles.itemInfo}>
                  <Text style={styles.itemTitle} numberOfLines={2}>{newItem.title}</Text>
                  <Text style={styles.itemPrice}>{newItemPriceText}</Text>
                </View>
              </View>
            </View>

            {/* Existing Items */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>
                {duplicates.length === 1 ? 'Existing Item' : 'Existing Items'}
              </Text>
              {duplicates.map((duplicate) => {
                const duplicatePriceText = duplicate.currentPrice
                  ? `${duplicate.currency} ${duplicate.currentPrice.toFixed(2)}`
                  : 'No price';
                const similarityPercent = Math.round(duplicate.similarity * 100);

                return (
                  <View key={duplicate.id} style={styles.itemCard}>
                    {duplicate.imageUrl ? (
                      <Image
                        source={resolveImageSource(duplicate.imageUrl)}
                        style={styles.itemImage}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={[styles.itemImage, styles.placeholderImage]}>
                        <IconSymbol
                          ios_icon_name="photo"
                          android_material_icon_name="image"
                          size={32}
                          color={colors.textSecondary}
                        />
                      </View>
                    )}
                    <View style={styles.itemInfo}>
                      <Text style={styles.itemTitle} numberOfLines={2}>{duplicate.title}</Text>
                      <Text style={styles.itemPrice}>{duplicatePriceText}</Text>
                      <View style={styles.similarityBadge}>
                        <Text style={styles.similarityText}>{similarityPercent}% similar</Text>
                      </View>
                    </View>
                    <TouchableOpacity
                      style={styles.replaceButton}
                      onPress={() => onReplace(duplicate.id)}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Text style={styles.replaceButtonText}>Replace</Text>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          </ScrollView>

          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.button, styles.secondaryButton]}
              onPress={onCancel}
              activeOpacity={0.7}
            >
              <Text style={styles.secondaryButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.primaryButton]}
              onPress={onAddAnyway}
              activeOpacity={0.7}
            >
              <Text style={styles.primaryButtonText}>Add Anyway</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    paddingBottom: spacing.xl,
  },
  header: {
    alignItems: 'center',
    paddingTop: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    ...typography.titleMedium,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  scrollContent: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionLabel: {
    ...typography.labelMedium,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  itemCard: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
    alignItems: 'center',
  },
  itemImage: {
    width: 64,
    height: 64,
    borderRadius: 8,
    marginRight: spacing.md,
  },
  placeholderImage: {
    backgroundColor: colors.backgroundAlt,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemInfo: {
    flex: 1,
  },
  itemTitle: {
    ...typography.bodyLarge,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  itemPrice: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  similarityBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.warning + '20',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 6,
  },
  similarityText: {
    ...typography.bodySmall,
    color: colors.warning,
    fontWeight: '600',
  },
  replaceButton: {
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    marginLeft: spacing.sm,
  },
  replaceButtonText: {
    ...typography.bodyMedium,
    color: colors.textInverse,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  button: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  primaryButton: {
    backgroundColor: colors.accent,
  },
  primaryButtonText: {
    ...typography.bodyLarge,
    fontWeight: '600',
    color: colors.textInverse,
  },
  secondaryButton: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  secondaryButtonText: {
    ...typography.bodyLarge,
    fontWeight: '600',
    color: colors.text,
  },
});
