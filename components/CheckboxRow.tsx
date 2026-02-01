
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ImageSourcePropType,
} from 'react-native';
import { IconSymbol } from './IconSymbol';
import { useAppTheme } from '@/contexts/ThemeContext';
import { createColors, createTypography, spacing } from '@/styles/designSystem';

interface CheckboxRowProps {
  id: string;
  title: string;
  notes?: string | null;
  completed: boolean;
  rowType: 'TEXT' | 'ITEM';
  imageUrl?: string | null;
  currentPrice?: number | null;
  currency?: string;
  assignedTo?: string | null;
  reservedBy?: string | null;
  onToggleComplete: (id: string, completed: boolean) => void;
  onPress?: () => void;
}

function resolveImageSource(source: string | number | ImageSourcePropType | undefined): ImageSourcePropType {
  if (!source) return { uri: '' };
  if (typeof source === 'string') return { uri: source };
  return source as ImageSourcePropType;
}

export function CheckboxRow({
  id,
  title,
  notes,
  completed,
  rowType,
  imageUrl,
  currentPrice,
  currency,
  assignedTo,
  reservedBy,
  onToggleComplete,
  onPress,
}: CheckboxRowProps) {
  const { theme } = useAppTheme();
  const colors = createColors(theme);
  const typography = createTypography(theme);

  const priceText = currentPrice && currency ? `${currency} ${currentPrice.toFixed(2)}` : null;

  const styles = StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: spacing.md,
      marginBottom: spacing.sm,
      borderWidth: 1,
      borderColor: completed ? colors.border : colors.border,
      opacity: completed ? 0.6 : 1,
    },
    checkbox: {
      width: 24,
      height: 24,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: completed ? colors.accent : colors.border,
      backgroundColor: completed ? colors.accent : 'transparent',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: spacing.md,
    },
    content: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
    },
    image: {
      width: 60,
      height: 60,
      borderRadius: 8,
      backgroundColor: colors.surface2,
    },
    textContent: {
      flex: 1,
    },
    title: {
      ...typography.body,
      fontWeight: '600',
      color: colors.textPrimary,
      textDecorationLine: completed ? 'line-through' : 'none',
      marginBottom: spacing.xs,
    },
    notes: {
      ...typography.caption,
      color: colors.textSecondary,
      marginBottom: spacing.xs,
    },
    metadata: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: spacing.xs,
    },
    badge: {
      paddingHorizontal: spacing.sm,
      paddingVertical: 2,
      borderRadius: 4,
      backgroundColor: colors.accentLight,
    },
    badgeText: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.accent,
    },
    price: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    assignedBadge: {
      backgroundColor: colors.surface2,
    },
    assignedText: {
      fontSize: 11,
      fontWeight: '500',
      color: colors.textSecondary,
    },
    reservedBadge: {
      backgroundColor: '#FEE2E2',
    },
    reservedText: {
      fontSize: 11,
      fontWeight: '600',
      color: '#EF4444',
    },
  });

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <TouchableOpacity
        style={styles.checkbox}
        onPress={() => onToggleComplete(id, !completed)}
        activeOpacity={0.7}
      >
        {completed && (
          <IconSymbol
            ios_icon_name="checkmark"
            android_material_icon_name="check"
            size={16}
            color="#FFFFFF"
          />
        )}
      </TouchableOpacity>

      <View style={styles.content}>
        {rowType === 'ITEM' && imageUrl && (
          <Image
            source={resolveImageSource(imageUrl)}
            style={styles.image}
            resizeMode="cover"
          />
        )}

        <View style={styles.textContent}>
          <Text style={styles.title} numberOfLines={2}>
            {title}
          </Text>

          {notes && (
            <Text style={styles.notes} numberOfLines={1}>
              {notes}
            </Text>
          )}

          <View style={styles.metadata}>
            {rowType === 'ITEM' && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>Item</Text>
              </View>
            )}

            {priceText && (
              <Text style={styles.price}>{priceText}</Text>
            )}

            {assignedTo && (
              <View style={styles.assignedBadge}>
                <Text style={styles.assignedText}>Assigned to {assignedTo}</Text>
              </View>
            )}

            {reservedBy && (
              <View style={styles.reservedBadge}>
                <Text style={styles.reservedText}>Reserved by {reservedBy}</Text>
              </View>
            )}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}
