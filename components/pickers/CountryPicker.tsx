
import React, { useState, useMemo, Fragment } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  SectionList,
  Pressable,
} from 'react-native';
import { IconSymbol } from '@/components/IconSymbol';
import { colors, typography, spacing, inputStyles } from '@/styles/designSystem';
import { useAppTheme } from '@/contexts/ThemeContext';
import { COUNTRIES, Country } from '@/constants/countries';

interface CountryPickerProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (country: { countryName: string; countryCode: string }) => void;
  selectedCountryCode?: string;
}

interface SectionData {
  title: string;
  data: Country[];
}

export function CountryPicker({
  visible,
  onClose,
  onSelect,
  selectedCountryCode,
}: CountryPickerProps) {
  const { theme } = useAppTheme();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredAndGroupedCountries = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    
    const filtered = query
      ? COUNTRIES.filter(
          country =>
            country.name.toLowerCase().includes(query) ||
            country.code.toLowerCase().includes(query)
        )
      : COUNTRIES;

    const grouped: Record<string, Country[]> = {};
    
    filtered.forEach(country => {
      const firstLetter = country.name[0].toUpperCase();
      if (!grouped[firstLetter]) {
        grouped[firstLetter] = [];
      }
      grouped[firstLetter].push(country);
    });

    const sections: SectionData[] = Object.keys(grouped)
      .sort()
      .map(letter => ({
        title: letter,
        data: grouped[letter],
      }));

    return sections;
  }, [searchQuery]);

  const handleSelect = (country: Country) => {
    console.log('User selected country:', country.name, country.code);
    onSelect({
      countryName: country.name,
      countryCode: country.code,
    });
    setSearchQuery('');
    onClose();
  };

  const handleClose = () => {
    console.log('User closed country picker');
    setSearchQuery('');
    onClose();
  };

  const renderCountryItem = ({ item }: { item: Country }) => {
    const isSelected = item.code === selectedCountryCode;
    
    return (
      <TouchableOpacity
        key={item.code}
        style={[
          styles.countryItem,
          { backgroundColor: theme.colors.card },
          isSelected && { backgroundColor: theme.colors.accentLight },
        ]}
        onPress={() => handleSelect(item)}
      >
        <View style={styles.countryContent}>
          <Text style={styles.flag}>{item.flag}</Text>
          <Text
            style={[
              styles.countryName,
              { color: theme.colors.text },
            ]}
          >
            {item.name}
          </Text>
        </View>
        <Text style={[styles.countryCode, { color: theme.colors.textSecondary }]}>
          {item.code}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderSectionHeader = ({ section }: { section: SectionData }) => (
    <View style={[styles.sectionHeader, { backgroundColor: theme.colors.backgroundSecondary }]}>
      <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>
        {section.title}
      </Text>
    </View>
  );

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
            Select Country
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
            placeholder="Search countries..."
            placeholderTextColor={theme.colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        <SectionList
          sections={filteredAndGroupedCountries}
          keyExtractor={item => item.code}
          renderItem={renderCountryItem}
          renderSectionHeader={renderSectionHeader}
          stickySectionHeadersEnabled
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
  sectionHeader: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  sectionTitle: {
    ...typography.labelLarge,
    fontWeight: '600',
  },
  countryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  countryContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  flag: {
    fontSize: 24,
  },
  countryName: {
    ...typography.bodyLarge,
    flex: 1,
  },
  countryCode: {
    ...typography.labelMedium,
  },
});
