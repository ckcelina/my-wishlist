
import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  FlatList,
  Pressable,
} from 'react-native';
import { IconSymbol } from '@/components/IconSymbol';
import { colors, typography, spacing, inputStyles } from '@/styles/designSystem';
import { useAppTheme } from '@/contexts/ThemeContext';
import { CURRENCIES, Currency } from '@/constants/currencies';

interface CurrencyPickerProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (currency: { currencyCode: string; currencyName: string }) => void;
  selectedCurrencyCode?: string;
}

export function CurrencyPicker({
  visible,
  onClose,
  onSelect,
  selectedCurrencyCode,
}: CurrencyPickerProps) {
  const { theme } = useAppTheme();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredCurrencies = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    
    if (!query) {
      return CURRENCIES;
    }
    
    return CURRENCIES.filter(
      currency =>
        currency.code.toLowerCase().includes(query) ||
        currency.name.toLowerCase().includes(query) ||
        currency.symbol?.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  const handleSelect = (currency: Currency) => {
    console.log('User selected currency:', currency.code, currency.name);
    onSelect({
      currencyCode: currency.code,
      currencyName: currency.name,
    });
    setSearchQuery('');
    onClose();
  };

  const handleClose = () => {
    console.log('User closed currency picker');
    setSearchQuery('');
    onClose();
  };

  const renderCurrencyItem = ({ item }: { item: Currency }) => {
    const isSelected = item.code === selectedCurrencyCode;
    
    return (
      <TouchableOpacity
        style={[
          styles.currencyItem,
          { backgroundColor: theme.colors.card },
          isSelected && { backgroundColor: theme.colors.accentLight },
        ]}
        onPress={() => handleSelect(item)}
      >
        <View style={styles.currencyContent}>
          <View style={styles.currencyMain}>
            <Text style={[styles.currencyCode, { color: theme.colors.text }]}>
              {item.code}
            </Text>
            {item.symbol && (
              <Text style={[styles.currencySymbol, { color: theme.colors.textSecondary }]}>
                {item.symbol}
              </Text>
            )}
          </View>
          <Text style={[styles.currencyName, { color: theme.colors.textSecondary }]}>
            {item.name}
          </Text>
        </View>
        {isSelected && (
          <IconSymbol
            ios_icon_name="checkmark"
            android_material_icon_name="check"
            size={20}
            color={theme.colors.accent}
          />
        )}
      </TouchableOpacity>
    );
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
            Select Currency
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
            placeholder="Search by code or name..."
            placeholderTextColor={theme.colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="characters"
            autoCorrect={false}
          />
        </View>

        <FlatList
          data={filteredCurrencies}
          keyExtractor={item => item.code}
          renderItem={renderCurrencyItem}
          contentContainerStyle={styles.listContent}
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
  },
  currencyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  currencyContent: {
    flex: 1,
    gap: spacing.xs,
  },
  currencyMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  currencyCode: {
    ...typography.bodyLarge,
    fontWeight: '600',
  },
  currencySymbol: {
    ...typography.bodyMedium,
  },
  currencyName: {
    ...typography.bodySmall,
  },
});
