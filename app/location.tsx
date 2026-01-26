
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { IconSymbol } from '@/components/IconSymbol';
import { Button } from '@/components/design-system/Button';
import { Toast } from '@/components/design-system/Toast';
import { colors, typography, spacing, containerStyles } from '@/styles/designSystem';
import { authenticatedGet, authenticatedPost, authenticatedDelete } from '@/utils/api';
import { useHaptics } from '@/hooks/useHaptics';
import { useAppTheme } from '@/contexts/ThemeContext';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { CountryPicker } from '@/components/pickers/CountryPicker';
import { CityPicker } from '@/components/pickers/CityPicker';
import { getCountryFlag } from '@/constants/countries';
import debounce from 'lodash.debounce';

interface UserLocation {
  id: string;
  userId: string;
  countryCode: string;
  countryName: string;
  city: string | null;
  region: string | null;
  postalCode: string | null;
  geonameId: string | null;
  lat: number | null;
  lng: number | null;
  area: string | null;
  addressLine: string | null;
  updatedAt: string;
}

// Countries that support area/address fields
const COUNTRIES_WITH_AREA_SUPPORT = [
  'AE', 'SA', 'KW', 'QA', 'BH', 'OM', 'IN', 'PK', 'BD', 'PH', 'ID', 'MY', 'SG', 'TH', 'VN',
];

interface CityResult {
  name: string;
  region: string | null;
  countryCode: string;
  countryName: string;
  lat: number | null;
  lng: number | null;
  geonameId: string | null;
}

export default function LocationScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const haptics = useHaptics();
  const { theme } = useAppTheme();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasLocation, setHasLocation] = useState(false);

  const [countryCode, setCountryCode] = useState('');
  const [countryName, setCountryName] = useState('');
  const [city, setCity] = useState('');
  const [region, setRegion] = useState('');
  const [geonameId, setGeonameId] = useState<string | null>(null);
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [area, setArea] = useState('');
  const [addressLine, setAddressLine] = useState('');

  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [showCityPicker, setShowCityPicker] = useState(false);
  
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');
  
  const showAreaFields = COUNTRIES_WITH_AREA_SUPPORT.includes(countryCode);

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
        setGeonameId(data.geonameId);
        setLat(data.lat);
        setLng(data.lng);
        setArea(data.area || '');
        setAddressLine(data.addressLine || '');
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

  const saveLocation = async (showToast: boolean = true) => {
    if (!countryCode || !countryName) {
      console.log('[LocationScreen] Cannot save: missing country');
      return;
    }

    console.log('[LocationScreen] Autosaving location:', {
      countryCode,
      countryName,
      city,
      region,
    });

    setSaving(true);
    try {
      await authenticatedPost('/api/users/location', {
        countryCode,
        countryName,
        city: city || undefined,
        region: region || undefined,
        geonameId: geonameId || undefined,
        lat: lat || undefined,
        lng: lng || undefined,
        area: area || undefined,
        addressLine: addressLine || undefined,
      });

      console.log('[LocationScreen] Location saved successfully');
      setHasLocation(true);
      
      if (showToast) {
        setToastMessage('Location saved');
        setToastType('success');
        setToastVisible(true);
        haptics.success();
      }
    } catch (error) {
      console.error('[LocationScreen] Error saving location:', error);
      
      if (showToast) {
        setToastMessage('Failed to save location');
        setToastType('error');
        setToastVisible(true);
        haptics.error();
      }
    } finally {
      setSaving(false);
    }
  };

  // Debounced autosave function
  const debouncedSave = useRef(
    debounce((showToast: boolean) => {
      saveLocation(showToast);
    }, 400)
  ).current;

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      debouncedSave.cancel();
    };
  }, [debouncedSave]);

  const handleSelectCountry = (country: { countryName: string; countryCode: string }) => {
    console.log('[LocationScreen] User selected country:', country.countryCode, country.countryName);
    haptics.selection();
    setCountryCode(country.countryCode);
    setCountryName(country.countryName);
    setCity('');
    setRegion('');
    setGeonameId(null);
    setLat(null);
    setLng(null);
    setArea('');
    setAddressLine('');
    
    // Autosave after country selection
    setTimeout(() => {
      debouncedSave(true);
    }, 100);
  };

  const handleSelectCity = (cityResult: CityResult) => {
    console.log('[LocationScreen] User selected city:', cityResult);
    haptics.selection();
    setCity(cityResult.name);
    setRegion(cityResult.region || '');
    setGeonameId(cityResult.geonameId);
    setLat(cityResult.lat);
    setLng(cityResult.lng);
    
    // Autosave after city selection
    setTimeout(() => {
      debouncedSave(true);
    }, 100);
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

  const countryFlag = getCountryFlag(countryCode);
  const countryDisplayText = countryName ? `${countryFlag} ${countryName}` : 'Select Country';
  const cityDisplayText = city || 'Select City (Optional)';

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
        <Stack.Screen
          options={{
            title: 'Shopping Location',
            headerShown: true,
          }}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.accent} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <Stack.Screen
        options={{
          title: 'Shopping Location',
          headerShown: true,
        }}
      />

      <Toast
        visible={toastVisible}
        message={toastMessage}
        type={toastType}
        onHide={() => setToastVisible(false)}
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInDown.delay(0).springify()}>
          <Text style={[styles.description, { color: theme.colors.textSecondary }]}>
            Set your location to see stores that ship to your area and get accurate delivery options.
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.section}>
          <Text style={[styles.label, { color: theme.colors.text }]}>
            Country
            <Text style={styles.required}> *</Text>
          </Text>
          <Text style={[styles.hint, { color: theme.colors.textSecondary }]}>
            Required - Saves automatically
          </Text>

          <TouchableOpacity
            style={[styles.pickerButton, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
            onPress={() => {
              haptics.light();
              setShowCountryPicker(true);
            }}
          >
            <Text style={[styles.pickerButtonText, { color: countryName ? theme.colors.text : theme.colors.textSecondary }]}>
              {countryDisplayText}
            </Text>
            <IconSymbol
              ios_icon_name="chevron.right"
              android_material_icon_name="arrow-forward"
              size={20}
              color={theme.colors.textSecondary}
            />
          </TouchableOpacity>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.section}>
          <Text style={[styles.label, { color: theme.colors.text }]}>City</Text>
          <Text style={[styles.hint, { color: theme.colors.textSecondary }]}>
            Optional - Saves automatically
          </Text>

          <TouchableOpacity
            style={[styles.pickerButton, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
            onPress={() => {
              if (!countryCode) {
                haptics.warning();
                Alert.alert('Select Country First', 'Please select a country before choosing a city');
                return;
              }
              haptics.light();
              setShowCityPicker(true);
            }}
            disabled={!countryCode}
          >
            <Text style={[styles.pickerButtonText, { color: city ? theme.colors.text : theme.colors.textSecondary }]}>
              {cityDisplayText}
            </Text>
            <IconSymbol
              ios_icon_name="chevron.right"
              android_material_icon_name="arrow-forward"
              size={20}
              color={theme.colors.textSecondary}
            />
          </TouchableOpacity>

          {city && region && (
            <Text style={[styles.selectedDetails, { color: theme.colors.textSecondary }]}>
              {region}
            </Text>
          )}
        </Animated.View>

        {showAreaFields && (
          <>
            <Animated.View entering={FadeInDown.delay(300).springify()} style={styles.section}>
              <Text style={[styles.label, { color: theme.colors.text }]}>Area / District</Text>
              <Text style={[styles.hint, { color: theme.colors.textSecondary }]}>
                Optional - Neighborhood or district for more accurate delivery
              </Text>

              <TextInput
                style={[styles.textInput, { backgroundColor: theme.colors.card, borderColor: theme.colors.border, color: theme.colors.text }]}
                value={area}
                onChangeText={(text) => {
                  setArea(text);
                  debouncedSave(false);
                }}
                placeholder="e.g., Downtown, Marina District"
                placeholderTextColor={theme.colors.textSecondary}
              />
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(350).springify()} style={styles.section}>
              <Text style={[styles.label, { color: theme.colors.text }]}>Address Line</Text>
              <Text style={[styles.hint, { color: theme.colors.textSecondary }]}>
                Optional - Street address or building details
              </Text>

              <TextInput
                style={[styles.textInput, { backgroundColor: theme.colors.card, borderColor: theme.colors.border, color: theme.colors.text }]}
                value={addressLine}
                onChangeText={(text) => {
                  setAddressLine(text);
                  debouncedSave(false);
                }}
                placeholder="e.g., 123 Main Street, Building A"
                placeholderTextColor={theme.colors.textSecondary}
                multiline
                numberOfLines={2}
              />
            </Animated.View>
          </>
        )}

        {hasLocation && (
          <Animated.View entering={FadeInDown.delay(400).springify()} style={styles.buttonContainer}>
            <Button
              title="Remove Location"
              onPress={handleDelete}
              variant="secondary"
            />
          </Animated.View>
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>

      <CountryPicker
        visible={showCountryPicker}
        onClose={() => setShowCountryPicker(false)}
        onSelect={handleSelectCountry}
        selectedCountryCode={countryCode}
      />

      <CityPicker
        visible={showCityPicker}
        onClose={() => setShowCityPicker(false)}
        onSelect={handleSelectCity}
        countryCode={countryCode}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    ...containerStyles.screen,
    paddingTop: Platform.OS === 'android' ? 48 : 0,
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
    marginBottom: spacing.sm,
  },
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  pickerButtonText: {
    ...typography.bodyLarge,
    flex: 1,
  },
  selectedDetails: {
    ...typography.bodySmall,
    marginTop: spacing.xs,
    marginLeft: spacing.md,
  },
  textInput: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: 12,
    borderWidth: 1.5,
    ...typography.bodyLarge,
  },
  buttonContainer: {
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  bottomPadding: {
    height: 100,
  },
});
