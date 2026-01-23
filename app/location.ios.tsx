
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { IconSymbol } from '@/components/IconSymbol';
import { Button } from '@/components/design-system/Button';
import { Card } from '@/components/design-system/Card';
import { colors, typography, spacing, containerStyles, inputStyles } from '@/styles/designSystem';
import { authenticatedGet, authenticatedPost, authenticatedDelete } from '@/utils/api';
import { useHaptics } from '@/hooks/useHaptics';
import Animated, { FadeInDown } from 'react-native-reanimated';

// Common countries for quick selection
const COMMON_COUNTRIES = [
  { code: 'US', name: 'United States' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'CA', name: 'Canada' },
  { code: 'AU', name: 'Australia' },
  { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' },
  { code: 'IT', name: 'Italy' },
  { code: 'ES', name: 'Spain' },
  { code: 'JP', name: 'Japan' },
  { code: 'CN', name: 'China' },
  { code: 'IN', name: 'India' },
  { code: 'BR', name: 'Brazil' },
  { code: 'MX', name: 'Mexico' },
  { code: 'AE', name: 'United Arab Emirates' },
  { code: 'SA', name: 'Saudi Arabia' },
  { code: 'JO', name: 'Jordan' },
];

interface UserLocation {
  id: string;
  userId: string;
  countryCode: string;
  countryName: string;
  city: string | null;
  region: string | null;
  postalCode: string | null;
  updatedAt: string;
}

export default function LocationScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const haptics = useHaptics();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasLocation, setHasLocation] = useState(false);

  const [countryCode, setCountryCode] = useState('');
  const [countryName, setCountryName] = useState('');
  const [city, setCity] = useState('');
  const [region, setRegion] = useState('');
  const [postalCode, setPostalCode] = useState('');

  const fetchLocation = useCallback(async () => {
    console.log('[LocationScreen] Fetching user location');
    try {
      const data = await authenticatedGet<UserLocation | null>('/api/users/location');
      
      if (data) {
        console.log('[LocationScreen] Location found:', data);
        setHasLocation(true);
        setCountryCode(data.countryCode);
        setCountryName(data.countryName);
        setCity(data.city || '');
        setRegion(data.region || '');
        setPostalCode(data.postalCode || '');
      } else {
        console.log('[LocationScreen] No location set');
        setHasLocation(false);
      }
    } catch (error) {
      console.error('[LocationScreen] Error fetching location:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchLocation();
    }
  }, [user, fetchLocation]);

  const handleSelectCountry = (code: string, name: string) => {
    console.log('[LocationScreen] User selected country:', code, name);
    haptics.selection();
    setCountryCode(code);
    setCountryName(name);
  };

  const handleSave = async () => {
    if (!countryCode || !countryName) {
      haptics.warning();
      Alert.alert('Required Field', 'Please select a country');
      return;
    }

    console.log('[LocationScreen] Saving location:', {
      countryCode,
      countryName,
      city,
      region,
      postalCode,
    });

    setSaving(true);
    try {
      await authenticatedPost('/api/users/location', {
        countryCode,
        countryName,
        city: city || undefined,
        region: region || undefined,
        postalCode: postalCode || undefined,
      });

      console.log('[LocationScreen] Location saved successfully');
      haptics.success();
      Alert.alert('Success', 'Your shopping location has been saved', [
        {
          text: 'OK',
          onPress: () => router.back(),
        },
      ]);
    } catch (error) {
      console.error('[LocationScreen] Error saving location:', error);
      haptics.error();
      Alert.alert('Error', 'Failed to save location');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    haptics.warning();
    Alert.alert(
      'Remove Location',
      'Are you sure you want to remove your shopping location? This will limit available store options.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => haptics.light(),
        },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            console.log('[LocationScreen] Removing location');
            try {
              await authenticatedDelete('/api/users/location');
              console.log('[LocationScreen] Location removed');
              haptics.success();
              router.back();
            } catch (error) {
              console.error('[LocationScreen] Error removing location:', error);
              haptics.error();
              Alert.alert('Error', 'Failed to remove location');
            }
          },
        },
      ]
    );
  };

  const isFormValid = countryCode && countryName;
  const selectedCountryText = countryName || 'Select Country';

  if (loading) {
    return (
      <>
        <Stack.Screen
          options={{
            title: 'Shopping Location',
            headerShown: true,
          }}
        />
        <View style={styles.container}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Shopping Location',
          headerShown: true,
        }}
      />
      <View style={styles.container}>
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <Animated.View entering={FadeInDown.delay(0).springify()}>
            <Text style={styles.description}>
              Set your location to see stores that ship to your area and get accurate delivery options.
            </Text>
          </Animated.View>

          {/* Country Selection */}
          <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.section}>
            <Text style={styles.label}>
              Country
              <Text style={styles.required}> *</Text>
            </Text>
            <Text style={styles.hint}>Required - Select your country</Text>

            <Card style={styles.countryGrid}>
              {COMMON_COUNTRIES.map((country) => {
                const isSelected = countryCode === country.code;
                return (
                  <Button
                    key={country.code}
                    title={country.name}
                    onPress={() => handleSelectCountry(country.code, country.name)}
                    variant={isSelected ? 'primary' : 'secondary'}
                    style={styles.countryButton}
                  />
                );
              })}
            </Card>
          </Animated.View>

          {/* City */}
          <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.section}>
            <Text style={styles.label}>City</Text>
            <Text style={styles.hint}>Optional - May be required for some stores</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter city"
              placeholderTextColor={colors.textTertiary}
              value={city}
              onChangeText={setCity}
              autoCapitalize="words"
            />
          </Animated.View>

          {/* Region/State */}
          <Animated.View entering={FadeInDown.delay(300).springify()} style={styles.section}>
            <Text style={styles.label}>Region / State</Text>
            <Text style={styles.hint}>Optional</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter region or state"
              placeholderTextColor={colors.textTertiary}
              value={region}
              onChangeText={setRegion}
              autoCapitalize="words"
            />
          </Animated.View>

          {/* Postal Code */}
          <Animated.View entering={FadeInDown.delay(400).springify()} style={styles.section}>
            <Text style={styles.label}>Postal Code</Text>
            <Text style={styles.hint}>Optional</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter postal code"
              placeholderTextColor={colors.textTertiary}
              value={postalCode}
              onChangeText={setPostalCode}
              autoCapitalize="characters"
            />
          </Animated.View>

          {/* Save Button */}
          <Animated.View entering={FadeInDown.delay(500).springify()} style={styles.buttonContainer}>
            <Button
              title={saving ? 'Saving...' : 'Save Location'}
              onPress={handleSave}
              disabled={!isFormValid || saving}
              loading={saving}
            />

            {hasLocation && (
              <Button
                title="Remove Location"
                onPress={handleDelete}
                variant="secondary"
                style={styles.deleteButton}
              />
            )}
          </Animated.View>

          <View style={styles.bottomPadding} />
        </ScrollView>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    ...containerStyles.screen,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  description: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
    lineHeight: 22,
  },
  section: {
    marginBottom: spacing.lg,
  },
  label: {
    ...typography.labelLarge,
    marginBottom: spacing.xs,
  },
  required: {
    color: colors.error,
  },
  hint: {
    ...typography.bodySmall,
    color: colors.textTertiary,
    marginBottom: spacing.sm,
  },
  input: {
    ...inputStyles.base,
  },
  countryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    padding: spacing.sm,
  },
  countryButton: {
    minWidth: '48%',
    flexGrow: 1,
  },
  buttonContainer: {
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  deleteButton: {
    marginTop: spacing.xs,
  },
  bottomPadding: {
    height: 100,
  },
});
