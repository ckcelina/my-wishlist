
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
import { Card } from '@/components/design-system/Card';
import { Divider } from '@/components/design-system/Divider';
import { createColors, createTypography, spacing } from '@/styles/designSystem';
import { authenticatedGet, authenticatedPost, authenticatedDelete } from '@/utils/api';
import { useHaptics } from '@/hooks/useHaptics';
import { useAppTheme } from '@/contexts/ThemeContext';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { CountryPicker } from '@/components/pickers/CountryPicker';
import { CityPicker } from '@/components/pickers/CityPicker';
import { getCountryFlag } from '@/constants/countries';
import debounce from 'lodash.debounce';
import { determineDefaultLocation, preloadCitiesForCountry } from '@/src/services/locationBootstrap';

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
  const { theme, isDark } = useAppTheme();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasLocation, setHasLocation] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

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
  
  const [preloadedCities, setPreloadedCities] = useState<CityResult[]>([]);
  const [bootstrapComplete, setBootstrapComplete] = useState(false);
  
  const showAreaFields = COUNTRIES_WITH_AREA_SUPPORT.includes(countryCode);

  const colors = createColors(theme);
  const typography = createTypography(theme);

  const styles = StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.background,
    },
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollContent: {
      flexGrow: 1,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.lg,
      paddingBottom: spacing.xxl,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    header: {
      marginBottom: spacing.lg,
    },
    title: {
      ...typography.h2,
      color: colors.text,
      marginBottom: spacing.xs,
    },
    description: {
      ...typography.body,
      color: colors.textSecondary,
      lineHeight: 22,
    },
    section: {
      marginBottom: spacing.lg,
    },
    sectionTitle: {
      ...typography.h3,
      color: colors.text,
      marginBottom: spacing.md,
    },
    settingRow: {
      paddingVertical: spacing.md,
    },
    label: {
      ...typography.labelLarge,
      color: colors.text,
      marginBottom: spacing.xs,
    },
    required: {
      color: colors.error,
    },
    hint: {
      ...typography.caption,
      color: colors.textSecondary,
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
      backgroundColor: colors.surface2,
      borderColor: colors.border,
    },
    pickerButtonText: {
      ...typography.bodyLarge,
      flex: 1,
    },
    pickerButtonTextSelected: {
      color: colors.text,
    },
    pickerButtonTextPlaceholder: {
      color: colors.textSecondary,
    },
    selectedDetails: {
      ...typography.caption,
      color: colors.textSecondary,
      marginTop: spacing.xs,
      marginLeft: spacing.md,
    },
    textInput: {
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.md,
      borderRadius: 12,
      borderWidth: 1.5,
      backgroundColor: colors.surface2,
      borderColor: colors.border,
      color: colors.text,
      ...typography.bodyLarge,
    },
    saveButtonContainer: {
      marginTop: spacing.md,
      marginBottom: spacing.lg,
    },
    deleteButtonContainer: {
      marginTop: spacing.sm,
    },
    unsavedBadge: {
      backgroundColor: colors.warningLight,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      borderRadius: 8,
      alignSelf: 'flex-start',
      marginBottom: spacing.md,
    },
    unsavedBadgeText: {
      ...typography.labelSmall,
      color: colors.warning,
      fontWeight: '600',
    },
  });

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
        
        // Preload cities for saved country
        if (data.countryCode) {
          console.log('[LocationScreen] Preloading cities for saved country:', data.countryCode);
          const cities = await preloadCitiesForCountry(data.countryCode);
          setPreloadedCities(cities);
        }
      } else {
        console.log('[LocationScreen] No location set, running bootstrap');
        setHasLocation(false);
        
        // Run automatic location detection
        const bootstrap = await determineDefaultLocation();
        
        if (bootstrap.countryCode && bootstrap.countryName) {
          console.log('[LocationScreen] Bootstrap detected country:', bootstrap.countryName);
          setCountryCode(bootstrap.countryCode);
          setCountryName(bootstrap.countryName);
          setPreloadedCities(bootstrap.topCities);
          setHasUnsavedChanges(true);
          
          // Show toast to inform user
          setToastMessage(`Detected location: ${bootstrap.countryName}`);
          setToastType('success');
          setToastVisible(true);
        } else {
          console.log('[LocationScreen] Bootstrap could not detect country');
        }
      }
    } catch (error: any) {
      console.error('[LocationScreen] Error fetching location:', error);
      
      // If the error is a 404, it means no location is set (not an error)
      if (error.message && error.message.includes('404')) {
        console.log('[LocationScreen] No location set (404), running bootstrap');
        setHasLocation(false);
        
        // Run automatic location detection
        try {
          const bootstrap = await determineDefaultLocation();
          
          if (bootstrap.countryCode && bootstrap.countryName) {
            console.log('[LocationScreen] Bootstrap detected country:', bootstrap.countryName);
            setCountryCode(bootstrap.countryCode);
            setCountryName(bootstrap.countryName);
            setPreloadedCities(bootstrap.topCities);
            setHasUnsavedChanges(true);
            
            // Show toast to inform user
            setToastMessage(`Detected location: ${bootstrap.countryName}`);
            setToastType('success');
            setToastVisible(true);
          } else {
            console.log('[LocationScreen] Bootstrap could not detect country');
          }
        } catch (bootstrapError) {
          console.error('[LocationScreen] Bootstrap failed:', bootstrapError);
        }
      } else {
        // For other errors, show a toast but don't block the UI
        console.error('[LocationScreen] Failed to fetch location:', error.message);
        setToastMessage('Unable to load location. You can still set it.');
        setToastType('error');
        setToastVisible(true);
      }
    } finally {
      setLoading(false);
      setBootstrapComplete(true);
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchLocation();
    }
  }, [user, fetchLocation]);

  const handleSaveLocation = async () => {
    if (!countryCode || !countryName) {
      console.log('[LocationScreen] Cannot save: missing country');
      haptics.warning();
      Alert.alert('Country Required', 'Please select a country before saving');
      return;
    }

    console.log('[LocationScreen] Saving location:', {
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
      setHasUnsavedChanges(false);
      
      setToastMessage('Location saved successfully');
      setToastType('success');
      setToastVisible(true);
      haptics.success();
    } catch (error: any) {
      console.error('[LocationScreen] Error saving location:', error);
      
      const errorMessage = error.message || 'Failed to save location';
      setToastMessage(errorMessage.includes('Backend URL') ? 'Unable to save location. Please try again later.' : 'Failed to save location');
      setToastType('error');
      setToastVisible(true);
      haptics.error();
    } finally {
      setSaving(false);
    }
  };

  const handleSelectCountry = async (country: { countryName: string; countryCode: string }) => {
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
    setHasUnsavedChanges(true);
    
    // Preload cities for newly selected country
    console.log('[LocationScreen] Preloading cities for selected country:', country.countryCode);
    const cities = await preloadCitiesForCountry(country.countryCode);
    setPreloadedCities(cities);
  };

  const handleSelectCity = (cityResult: CityResult) => {
    console.log('[LocationScreen] User selected city:', cityResult);
    haptics.selection();
    setCity(cityResult.name);
    setRegion(cityResult.region || '');
    setGeonameId(cityResult.geonameId);
    setLat(cityResult.lat);
    setLng(cityResult.lng);
    setHasUnsavedChanges(true);
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
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <Stack.Screen
          options={{
            title: 'Shopping Location',
            headerShown: true,
          }}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
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

      <ScrollView 
        style={styles.container} 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInDown.delay(0)} style={styles.header}>
          <Text style={styles.title}>Shopping Location</Text>
          <Text style={styles.description}>
            Set your location to see stores that ship to your area and get accurate delivery options.
          </Text>
        </Animated.View>

        {hasUnsavedChanges && (
          <Animated.View entering={FadeInDown.delay(50)} style={styles.unsavedBadge}>
            <Text style={styles.unsavedBadgeText}>Unsaved Changes</Text>
          </Animated.View>
        )}

        <Animated.View entering={FadeInDown.delay(100)} style={styles.section}>
          <Text style={styles.sectionTitle}>Location Details</Text>
          <Card>
            <View style={styles.settingRow}>
              <Text style={styles.label}>
                Country
                <Text style={styles.required}> *</Text>
              </Text>
              <Text style={styles.hint}>Required for store availability</Text>

              <TouchableOpacity
                style={styles.pickerButton}
                onPress={() => {
                  haptics.light();
                  setShowCountryPicker(true);
                }}
              >
                <Text style={[styles.pickerButtonText, countryName ? styles.pickerButtonTextSelected : styles.pickerButtonTextPlaceholder]}>
                  {countryDisplayText}
                </Text>
                <IconSymbol
                  ios_icon_name="chevron.right"
                  android_material_icon_name="arrow-forward"
                  size={20}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>
            </View>

            <Divider />

            <View style={styles.settingRow}>
              <Text style={styles.label}>City</Text>
              <Text style={styles.hint}>Optional - For more accurate results</Text>

              <TouchableOpacity
                style={styles.pickerButton}
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
                <Text style={[styles.pickerButtonText, city ? styles.pickerButtonTextSelected : styles.pickerButtonTextPlaceholder]}>
                  {cityDisplayText}
                </Text>
                <IconSymbol
                  ios_icon_name="chevron.right"
                  android_material_icon_name="arrow-forward"
                  size={20}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>

              {city && region && (
                <Text style={styles.selectedDetails}>
                  {region}
                </Text>
              )}
            </View>

            {showAreaFields && (
              <>
                <Divider />

                <View style={styles.settingRow}>
                  <Text style={styles.label}>Area / District</Text>
                  <Text style={styles.hint}>Optional - Neighborhood or district</Text>

                  <TextInput
                    style={styles.textInput}
                    value={area}
                    onChangeText={(text) => {
                      setArea(text);
                      setHasUnsavedChanges(true);
                    }}
                    placeholder="e.g., Downtown, Marina District"
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>

                <Divider />

                <View style={styles.settingRow}>
                  <Text style={styles.label}>Address Line</Text>
                  <Text style={styles.hint}>Optional - Street address or building</Text>

                  <TextInput
                    style={styles.textInput}
                    value={addressLine}
                    onChangeText={(text) => {
                      setAddressLine(text);
                      setHasUnsavedChanges(true);
                    }}
                    placeholder="e.g., 123 Main Street, Building A"
                    placeholderTextColor={colors.textSecondary}
                    multiline
                    numberOfLines={2}
                  />
                </View>
              </>
            )}
          </Card>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(200)} style={styles.saveButtonContainer}>
          <Button
            title={saving ? 'Saving...' : 'Save Location'}
            onPress={handleSaveLocation}
            variant="primary"
            disabled={saving || !countryCode}
          />
        </Animated.View>

        {hasLocation && (
          <Animated.View entering={FadeInDown.delay(300)} style={styles.deleteButtonContainer}>
            <Button
              title="Remove Location"
              onPress={handleDelete}
              variant="secondary"
            />
          </Animated.View>
        )}
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
        preloadedCities={preloadedCities}
      />
    </SafeAreaView>
  );
}
