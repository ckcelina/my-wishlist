
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Pressable } from 'react-native';
import { IconSymbol } from './IconSymbol';
import { useAppTheme } from '@/contexts/ThemeContext';
import { createColors, createTypography, spacing } from '@/styles/designSystem';
import { CountryPicker } from './pickers/CountryPicker';
import { getCountryFlag } from '@/constants/countries';

interface CountrySelectorProps {
  label: string;
  selectedCountryCode: string;
  selectedCountryName: string;
  onSelect: (country: { countryCode: string; countryName: string }) => void;
  disabled?: boolean;
}

export function CountrySelector({
  label,
  selectedCountryCode,
  selectedCountryName,
  onSelect,
  disabled = false,
}: CountrySelectorProps) {
  const { theme } = useAppTheme();
  const [showPicker, setShowPicker] = useState(false);

  const countryFlag = getCountryFlag(selectedCountryCode);
  const displayText = selectedCountryName ? `${countryFlag} ${selectedCountryName}` : 'Select Country';

  return (
    <>
      <View style={styles.container}>
        <Text style={[styles.label, { color: theme.colors.text }]}>{label}</Text>
        <TouchableOpacity
          style={[
            styles.button,
            { backgroundColor: theme.colors.card, borderColor: theme.colors.border },
            disabled && styles.buttonDisabled,
          ]}
          onPress={() => !disabled && setShowPicker(true)}
          disabled={disabled}
        >
          <Text
            style={[
              styles.buttonText,
              { color: selectedCountryName ? theme.colors.text : theme.colors.textSecondary },
            ]}
          >
            {displayText}
          </Text>
          <IconSymbol
            ios_icon_name="chevron.right"
            android_material_icon_name="arrow-forward"
            size={20}
            color={theme.colors.textSecondary}
          />
        </TouchableOpacity>
      </View>

      <CountryPicker
        visible={showPicker}
        onClose={() => setShowPicker(false)}
        onSelect={(country) => {
          onSelect(country);
          setShowPicker(false);
        }}
        selectedCountryCode={selectedCountryCode}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    fontSize: 16,
    flex: 1,
  },
});
