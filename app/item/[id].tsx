
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Image,
  ImageSourcePropType,
  Linking,
  Platform,
  ActivityIndicator,
  Modal,
  Pressable,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation } from '@/contexts/LocationContext';
import { supabase } from '@/lib/supabase';
import { authenticatedPost } from '@/utils/api';
import { appendAffiliateId } from '@/utils/affiliateLinks';

interface PriceHistoryEntry {
  price: string;
  recordedAt: string;
}

interface ItemDetail {
  id: string;
  title: string;
  imageUrl: string | null;
  currentPrice: string | null;
  currency: string;
  originalUrl: string | null;
  sourceDomain: string | null;
  notes: string | null;
  priceHistory: PriceHistoryEntry[];
  lastCheckedAt?: string | null;
  trackingEnabled?: boolean;
  trackingFrequency?: 'daily' | 'weekly';
}

interface OtherStore {
  storeName: string;
  domain: string;
  price: number;
  currency: string;
  url: string;
}

interface UnavailableStore {
  storeName: string;
  domain: string;
  price: number;
  currency: string;
  url: string;
  reason: string;
  reasonCode: string;
}

interface PriceDropInfo {
  priceDropped: boolean;
  originalPrice: number | null;
  currentPrice: number | null;
  percentageChange: number | null;
}

interface FilteredStoresResponse {
  stores: OtherStore[];
  unavailableStores?: UnavailableStore[];
  userLocation: { countryCode: string; city: string | null } | null;
  hasLocation: boolean;
  cityRequired?: boolean;
  message?: string;
}

function resolveImageSource(source: string | number | ImageSourcePropType | undefined): ImageSourcePropType {
  if (!source) return { uri: '' };
  if (typeof source === 'string') return { uri: source };
  return source as ImageSourcePropType;
}

export default function ItemDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { user } = useAuth();
  const { countryCode } = useLocation();
  const [item, setItem] = useState<ItemDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [otherStores, setOtherStores] = useState<OtherStore[]>([]);
  const [unavailableStores, setUnavailableStores] = useState<UnavailableStore[]>([]);
  const [showUnavailableStores, setShowUnavailableStores] = useState(false);
  const [loadingStores, setLoadingStores] = useState(false);
  const [checkingPrice, setCheckingPrice] = useState(false);
  const [priceDropInfo, setPriceDropInfo] = useState<PriceDropInfo | null>(null);
  const [hasUserLocation, setHasUserLocation] = useState(true);
  const [cityRequired, setCityRequired] = useState(false);
  const [storesMessage, setStoresMessage] = useState<string | null>(null);
  const [userDefaultCurrency, setUserDefaultCurrency] = useState<string>('USD');
  const [convertedPrice, setConvertedPrice] = useState<string | null>(null);
  
  // Target price alert state
  const [alertEnabled, setAlertEnabled] = useState(false);
  const [alertPrice, setAlertPrice] = useState<string>('');
  const [savingAlert, setSavingAlert] = useState(false);

  // Edit form state
  const [editedTitle, setEditedTitle] = useState('');
  const [editedPrice, setEditedPrice] = useState('');
  const [editedCurrency, setEditedCurrency] = useState('USD');
  const [editedNotes, setEditedNotes] = useState('');
  const [editedImageUrl, setEditedImageUrl] = useState('');

  const fetchOtherStores = useCallback(async () => {
    console.log('[ItemDetailScreen] Fetching filtered stores based on user location');
    try {
      setLoadingStores(true);
      
      // Call the new filtered endpoint
      const data = await authenticatedPost<FilteredStoresResponse>(
        `/api/items/${id}/find-other-stores-filtered`,
        {}
      );
      
      console.log('[ItemDetailScreen] Filtered stores response:', data);
      setOtherStores(data.stores || []);
      setUnavailableStores(data.unavailableStores || []);
      setHasUserLocation(data.hasLocation);
      setCityRequired(data.cityRequired || false);
      setStoresMessage(data.message || null);
    } catch (error) {
      console.error('[ItemDetailScreen] Error fetching filtered stores:', error);
      setOtherStores([]);
      setUnavailableStores([]);
      setStoresMessage('Failed to load stores');
    } finally {
      setLoadingStores(false);
    }
  }, [id]);

  const fetchUserSettings = useCallback(async () => {
    try {
      const { authenticatedGet } = await import('@/utils/api');
      const settings = await authenticatedGet<{ defaultCurrency: string }>('/api/users/settings');
      setUserDefaultCurrency(settings.defaultCurrency || 'USD');
      console.log('[ItemDetailScreen] User default currency:', settings.defaultCurrency);
    } catch (error) {
      console.error('[ItemDetailScreen] Error fetching user settings:', error);
    }
  }, []);

  const fetchConvertedPrice = useCallback(async (itemPrice: string, itemCurrency: string) => {
    if (itemCurrency === userDefaultCurrency) {
      setConvertedPrice(null);
      return;
    }

    try {
      const { convertCurrency } = await import('@/utils/formatMoney');
      const amount = parseFloat(itemPrice);
      if (isNaN(amount)) {
        setConvertedPrice(null);
        return;
      }

      const converted = await convertCurrency(amount, itemCurrency, userDefaultCurrency);
      if (converted !== null) {
        const { formatMoney } = await import('@/utils/formatMoney');
        const formatted = formatMoney(converted, userDefaultCurrency);
        setConvertedPrice(formatted);
        console.log('[ItemDetailScreen] Converted price:', formatted);
      } else {
        setConvertedPrice(null);
      }
    } catch (error) {
      console.error('[ItemDetailScreen] Error converting price:', error);
      setConvertedPrice(null);
    }
  }, [userDefaultCurrency]);

  const fetchItem = useCallback(async () => {
    console.log('[ItemDetailScreen] Fetching item details');
    try {
      setLoading(true);
      const { authenticatedGet } = await import('@/utils/api');
      const data = await authenticatedGet<ItemDetail & { alertEnabled?: boolean; alertPrice?: number | null }>(`/api/items/${id}`);
      console.log('[ItemDetailScreen] Fetched item:', data.title);
      setItem(data);
      
      // Set alert state
      setAlertEnabled(data.alertEnabled || false);
      setAlertPrice(data.alertPrice ? data.alertPrice.toString() : '');
      
      // Fetch currency conversion if needed
      if (data.currentPrice && data.currency) {
        fetchConvertedPrice(data.currentPrice, data.currency);
      }
      
      // Fetch filtered alternatives after item is loaded
      fetchOtherStores();
    } catch (error) {
      console.error('[ItemDetailScreen] Error fetching item:', error);
      Alert.alert('Error', 'Failed to load item details');
    } finally {
      setLoading(false);
    }
  }, [id, fetchOtherStores, fetchConvertedPrice]);

  const fetchPriceDropInfo = useCallback(async () => {
    console.log('[ItemDetailScreen] Fetching price drop info');
    try {
      const { authenticatedGet } = await import('@/utils/api');
      const data = await authenticatedGet<PriceDropInfo>(`/api/items/${id}/price-dropped`);
      console.log('[ItemDetailScreen] Price drop info:', data);
      setPriceDropInfo(data);
    } catch (error) {
      console.error('[ItemDetailScreen] Error fetching price drop info:', error);
    }
  }, [id]);

  useEffect(() => {
    console.log('[ItemDetailScreen] Component mounted, item ID:', id);
    if (id) {
      fetchUserSettings();
      fetchItem();
      fetchPriceDropInfo();
    }
  }, [id, fetchUserSettings, fetchItem, fetchPriceDropInfo]);

  const handleCheckPrice = async () => {
    console.log('[ItemDetailScreen] Manually checking price');
    if (!item?.originalUrl) {
      Alert.alert('No URL', 'This item does not have an original URL to check the price from.');
      return;
    }

    try {
      setCheckingPrice(true);
      const { authenticatedPost } = await import('@/utils/api');
      const result = await authenticatedPost<{
        success: boolean;
        priceChanged: boolean;
        oldPrice: number | null;
        newPrice: number | null;
        lastCheckedAt: string;
      }>(`/api/items/${id}/check-price`, {});
      
      console.log('[ItemDetailScreen] Price check result:', result);
      
      if (result.success) {
        if (result.priceChanged) {
          const oldPriceText = result.oldPrice ? `${item.currency} ${result.oldPrice.toFixed(2)}` : 'N/A';
          const newPriceText = result.newPrice ? `${item.currency} ${result.newPrice.toFixed(2)}` : 'N/A';
          
          Alert.alert(
            'Price Updated!',
            `Price changed from ${oldPriceText} to ${newPriceText}`,
            [{ text: 'OK', onPress: () => {
              fetchItem();
              fetchPriceDropInfo();
            }}]
          );
        } else {
          Alert.alert('Price Checked', 'The price has not changed since the last check.');
        }
      } else {
        Alert.alert('Check Failed', 'Could not retrieve the current price. The page may have changed or is unavailable.');
      }
    } catch (error) {
      console.error('[ItemDetailScreen] Error checking price:', error);
      Alert.alert('Error', 'Failed to check price. Please try again later.');
    } finally {
      setCheckingPrice(false);
    }
  };

  const handleEditPress = () => {
    if (!item) return;
    console.log('[ItemDetailScreen] Opening edit modal');
    setEditedTitle(item.title);
    setEditedPrice(item.currentPrice || '');
    setEditedCurrency(item.currency);
    setEditedNotes(item.notes || '');
    setEditedImageUrl(item.imageUrl || '');
    setShowEditModal(true);
  };

  const uploadImage = async (imageUri: string): Promise<string | null> => {
    console.log('[ItemDetailScreen] Uploading image to backend:', imageUri);
    try {
      const { authenticatedPost } = await import('@/utils/api');
      
      // Create form data
      const formData = new FormData();
      const filename = imageUri.split('/').pop() || 'image.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';
      
      formData.append('image', {
        uri: imageUri,
        name: filename,
        type,
      } as any);

      const response = await fetch(
        `${(await import('expo-constants')).default.expoConfig?.extra?.backendUrl}/api/upload/image`,
        {
          method: 'POST',
          body: formData,
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to upload image');
      }

      const data = await response.json();
      console.log('[ItemDetailScreen] Image uploaded successfully:', data.url);
      return data.url;
    } catch (error) {
      console.error('[ItemDetailScreen] Error uploading image:', error);
      Alert.alert('Upload Error', 'Failed to upload image. Please try again.');
      return null;
    }
  };

  const handlePickImage = async () => {
    console.log('[ItemDetailScreen] Picking image');
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const imageUri = result.assets[0].uri;
        console.log('[ItemDetailScreen] Image selected:', imageUri);
        setEditedImageUrl(imageUri);
      }
    } catch (error) {
      console.error('[ItemDetailScreen] Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const handleRemoveImage = () => {
    console.log('[ItemDetailScreen] Removing image');
    setEditedImageUrl('');
  };

  const handleSaveEdit = async () => {
    console.log('[ItemDetailScreen] Saving item changes');
    if (!editedTitle.trim()) {
      Alert.alert('Error', 'Item title cannot be empty');
      return;
    }

    const newPrice = editedPrice.trim() ? parseFloat(editedPrice) : null;
    if (editedPrice.trim() && (isNaN(newPrice!) || newPrice! < 0)) {
      Alert.alert('Error', 'Please enter a valid price');
      return;
    }

    try {
      setSaving(true);
      
      // Upload image if it's a local file (starts with file://)
      let finalImageUrl = editedImageUrl;
      if (editedImageUrl && editedImageUrl.startsWith('file://')) {
        console.log('[ItemDetailScreen] Uploading local image to backend');
        const uploadedUrl = await uploadImage(editedImageUrl);
        if (uploadedUrl) {
          finalImageUrl = uploadedUrl;
        } else {
          // If upload failed, keep the original image
          finalImageUrl = item?.imageUrl || null;
        }
      }
      
      const { authenticatedPut } = await import('@/utils/api');
      const updatedItem = await authenticatedPut<ItemDetail>(`/api/items/${id}`, {
        title: editedTitle,
        currentPrice: newPrice !== null ? newPrice.toString() : null,
        notes: editedNotes,
        imageUrl: finalImageUrl || null,
      });
      console.log('[ItemDetailScreen] Item updated successfully');
      setItem(updatedItem);
      setShowEditModal(false);
      Alert.alert('Success', 'Item updated successfully');
    } catch (error) {
      console.error('[ItemDetailScreen] Error updating item:', error);
      Alert.alert('Error', 'Failed to update item');
    } finally {
      setSaving(false);
    }
  };

  const handleOpenUrl = async () => {
    if (item?.originalUrl) {
      console.log('[ItemDetailScreen] Opening source URL:', item.originalUrl);
      
      // Apply country-specific affiliate link if location is available
      let finalUrl = item.originalUrl;
      if (countryCode && item.sourceDomain) {
        finalUrl = appendAffiliateId(item.originalUrl, item.sourceDomain, countryCode);
        console.log('[ItemDetailScreen] Applied country-specific affiliate link for', countryCode);
      }
      
      const { openStoreLink } = await import('@/utils/openStoreLink');
      await openStoreLink(finalUrl, {
        source: 'item_detail',
        storeDomain: item.sourceDomain || undefined,
        itemId: item.id,
        itemTitle: item.title,
      });
    }
  };

  const handleViewPriceHistory = () => {
    console.log('[ItemDetailScreen] Navigating to price history screen');
    router.push(`/item/price-history/${id}`);
  };

  const handleManageTracking = () => {
    console.log('[ItemDetailScreen] Navigating to tracking screen');
    router.push(`/item/tracking/${id}`);
  };

  const handleOpenStoreUrl = async (url: string, storeName: string, storeDomain: string) => {
    console.log('[ItemDetailScreen] Opening store URL:', storeName, url);
    
    // Apply country-specific affiliate link if location is available
    let finalUrl = url;
    if (countryCode) {
      finalUrl = appendAffiliateId(url, storeDomain, countryCode);
      console.log('[ItemDetailScreen] Applied country-specific affiliate link for', countryCode);
    }
    
    const { openStoreLink } = await import('@/utils/openStoreLink');
    await openStoreLink(finalUrl, {
      source: 'other_stores',
      storeDomain: storeDomain,
      itemId: item?.id,
      itemTitle: item?.title,
    });
  };

  const handleSetLocation = () => {
    console.log('[ItemDetailScreen] User tapped Set Location');
    router.push('/location');
  };

  const handleReportProblem = () => {
    console.log('[ItemDetailScreen] User tapped Report a Problem button');
    router.push({
      pathname: '/report-problem',
      params: {
        context: 'item_detail',
        itemId: id,
      },
    });
  };

  const handleToggleAlert = async (enabled: boolean) => {
    console.log('[ItemDetailScreen] Toggling alert:', enabled);
    setAlertEnabled(enabled);
    
    if (!enabled) {
      // Disable alert
      try {
        setSavingAlert(true);
        const { authenticatedPut } = await import('@/utils/api');
        await authenticatedPut(`/api/items/${id}/alert`, {
          alertEnabled: false,
          alertPrice: null,
        });
        setAlertPrice('');
        console.log('[ItemDetailScreen] Alert disabled');
      } catch (error) {
        console.error('[ItemDetailScreen] Error disabling alert:', error);
        Alert.alert('Error', 'Failed to disable alert');
        setAlertEnabled(true);
      } finally {
        setSavingAlert(false);
      }
    }
  };

  const handleSaveAlertPrice = async () => {
    console.log('[ItemDetailScreen] Saving alert price:', alertPrice);
    
    const price = parseFloat(alertPrice);
    if (isNaN(price) || price <= 0) {
      Alert.alert('Invalid Price', 'Please enter a valid target price greater than 0');
      return;
    }
    
    try {
      setSavingAlert(true);
      const { authenticatedPut } = await import('@/utils/api');
      await authenticatedPut(`/api/items/${id}/alert`, {
        alertEnabled: true,
        alertPrice: price,
      });
      setAlertEnabled(true);
      console.log('[ItemDetailScreen] Alert price saved');
      Alert.alert('Success', 'Target price alert set successfully');
    } catch (error) {
      console.error('[ItemDetailScreen] Error saving alert price:', error);
      Alert.alert('Error', 'Failed to save target price');
    } finally {
      setSavingAlert(false);
    }
  };

  if (loading || !item) {
    return (
      <>
        <Stack.Screen
          options={{
            headerShown: true,
            title: 'Item Details',
            headerBackTitle: 'Back',
          }}
        />
        <SafeAreaView style={styles.container}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Loading...</Text>
          </View>
        </SafeAreaView>
      </>
    );
  }

  const priceText = item.currentPrice ? `${item.currency} ${parseFloat(item.currentPrice).toFixed(2)}` : 'No price';

  const hasPriceDrop = priceDropInfo?.priceDropped === true;
  const percentageChange = priceDropInfo?.percentageChange;

  const lastCheckedText = item.lastCheckedAt 
    ? new Date(item.lastCheckedAt).toLocaleString([], { 
        month: 'short', 
        day: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit' 
      })
    : 'Never';

  const trackingEnabledValue = item.trackingEnabled || false;
  const trackingFrequencyValue = item.trackingFrequency || 'daily';

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Item Details',
          headerBackTitle: 'Back',
        }}
      />
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          {/* Large Image */}
          <View style={styles.imageContainer}>
            {item.imageUrl ? (
              <Image
                source={resolveImageSource(item.imageUrl)}
                style={styles.mainImage}
                resizeMode="cover"
              />
            ) : (
              <View style={[styles.mainImage, styles.placeholderImage]}>
                <IconSymbol
                  ios_icon_name="photo"
                  android_material_icon_name="image"
                  size={64}
                  color={colors.textSecondary}
                />
              </View>
            )}
          </View>

          <View style={styles.contentSection}>
            {/* Item Title */}
            <Text style={styles.itemTitle}>{item.title}</Text>

            {/* Current Price with Price Drop Badge */}
            <View style={styles.priceCard}>
              <View style={styles.priceCardHeader}>
                <Text style={styles.priceLabel}>Current Price</Text>
                {hasPriceDrop && percentageChange && (
                  <View style={styles.priceDropBadge}>
                    <IconSymbol
                      ios_icon_name="arrow.down"
                      android_material_icon_name="arrow-downward"
                      size={14}
                      color="#10B981"
                    />
                    <Text style={styles.priceDropText}>
                      {Math.abs(percentageChange).toFixed(0)}% off
                    </Text>
                  </View>
                )}
              </View>
              <Text style={styles.currentPrice}>{priceText}</Text>
              
              {/* Converted Price (if available) */}
              {convertedPrice && (
                <Text style={styles.convertedPrice}>≈ {convertedPrice}</Text>
              )}
              
              {/* Last Checked Timestamp */}
              {item.originalUrl && (
                <View style={styles.lastCheckedRow}>
                  <IconSymbol
                    ios_icon_name="clock"
                    android_material_icon_name="schedule"
                    size={14}
                    color={colors.textSecondary}
                  />
                  <Text style={styles.lastCheckedText}>Last checked: {lastCheckedText}</Text>
                </View>
              )}
            </View>

            {/* Price Tracking Status Badge */}
            {trackingEnabledValue && (
              <TouchableOpacity style={styles.trackingBadge} onPress={handleManageTracking}>
                <IconSymbol
                  ios_icon_name="chart.line.uptrend.xyaxis"
                  android_material_icon_name="trending-up"
                  size={16}
                  color={colors.primary}
                />
                <Text style={styles.trackingBadgeText}>
                  Tracking {trackingFrequencyValue === 'daily' ? 'daily' : 'weekly'}
                </Text>
                <IconSymbol
                  ios_icon_name="chevron.right"
                  android_material_icon_name="chevron-right"
                  size={16}
                  color={colors.primary}
                />
              </TouchableOpacity>
            )}

            {/* Check Price Button (only if item has originalUrl) */}
            {item.originalUrl && (
              <TouchableOpacity 
                style={styles.checkPriceButton} 
                onPress={handleCheckPrice}
                disabled={checkingPrice}
              >
                {checkingPrice ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <>
                    <IconSymbol
                      ios_icon_name="arrow.clockwise"
                      android_material_icon_name="refresh"
                      size={18}
                      color={colors.primary}
                    />
                    <Text style={styles.checkPriceButtonText}>Check Price Now</Text>
                  </>
                )}
              </TouchableOpacity>
            )}

            {/* Target Price Alert Card */}
            <View style={styles.alertCard}>
              <View style={styles.alertHeader}>
                <View style={styles.alertHeaderLeft}>
                  <IconSymbol
                    ios_icon_name="bell.fill"
                    android_material_icon_name="notifications"
                    size={20}
                    color={alertEnabled ? colors.primary : colors.textSecondary}
                  />
                  <Text style={styles.alertTitle}>Price Alert</Text>
                </View>
                <Switch
                  value={alertEnabled}
                  onValueChange={handleToggleAlert}
                  disabled={savingAlert}
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor={colors.background}
                />
              </View>
              
              {alertEnabled && (
                <View style={styles.alertInputContainer}>
                  <Text style={styles.alertLabel}>Notify me when price goes below:</Text>
                  <View style={styles.alertInputRow}>
                    <TextInput
                      style={styles.alertInput}
                      value={alertPrice}
                      onChangeText={setAlertPrice}
                      placeholder="0.00"
                      placeholderTextColor={colors.textSecondary}
                      keyboardType="decimal-pad"
                      editable={!savingAlert}
                    />
                    <Text style={styles.alertCurrency}>{item.currency}</Text>
                    <TouchableOpacity
                      style={styles.alertSaveButton}
                      onPress={handleSaveAlertPrice}
                      disabled={savingAlert || !alertPrice}
                    >
                      {savingAlert ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <Text style={styles.alertSaveButtonText}>Set</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                  {alertPrice && parseFloat(alertPrice) > 0 && (
                    <Text style={styles.alertHint}>
                      You&apos;ll be notified when the price drops below {item.currency} {parseFloat(alertPrice).toFixed(2)}
                    </Text>
                  )}
                </View>
              )}
            </View>

            {/* Source Domain */}
            {item.sourceDomain && (
              <View style={styles.infoRow}>
                <IconSymbol
                  ios_icon_name="link"
                  android_material_icon_name="link"
                  size={18}
                  color={colors.textSecondary}
                />
                <Text style={styles.sourceDomain}>{item.sourceDomain}</Text>
              </View>
            )}

            {/* Notes Section */}
            {item.notes && (
              <View style={styles.notesCard}>
                <Text style={styles.notesLabel}>Notes</Text>
                <Text style={styles.notesText}>{item.notes}</Text>
              </View>
            )}

            {/* Action Buttons */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity style={styles.primaryButton} onPress={handleEditPress}>
                <IconSymbol
                  ios_icon_name="pencil"
                  android_material_icon_name="edit"
                  size={20}
                  color="#FFFFFF"
                />
                <Text style={styles.primaryButtonText}>Edit Item</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.secondaryButton} onPress={handleViewPriceHistory}>
                <IconSymbol
                  ios_icon_name="chart.line.uptrend.xyaxis"
                  android_material_icon_name="trending-up"
                  size={20}
                  color={colors.primary}
                />
                <Text style={styles.secondaryButtonText}>View Price History</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.secondaryButton} onPress={handleManageTracking}>
                <IconSymbol
                  ios_icon_name="bell.badge"
                  android_material_icon_name="notifications-active"
                  size={20}
                  color={colors.primary}
                />
                <Text style={styles.secondaryButtonText}>Manage Price Tracking</Text>
              </TouchableOpacity>
            </View>

            {/* View Original Product Button */}
            {item.originalUrl && (
              <TouchableOpacity 
                style={styles.linkButton} 
                onPress={handleOpenUrl}
                onLongPress={async () => {
                  const { copyStoreLink } = await import('@/utils/openStoreLink');
                  await copyStoreLink(item.originalUrl);
                }}
              >
                <IconSymbol
                  ios_icon_name="arrow.up.forward.square"
                  android_material_icon_name="open-in-new"
                  size={20}
                  color={colors.primary}
                />
                <Text style={styles.linkButtonText}>View Original Product</Text>
              </TouchableOpacity>
            )}

            {/* Report a Problem Button */}
            <TouchableOpacity style={styles.reportButton} onPress={handleReportProblem}>
              <IconSymbol
                ios_icon_name="exclamationmark.triangle"
                android_material_icon_name="report"
                size={18}
                color={colors.textSecondary}
              />
              <Text style={styles.reportButtonText}>Report a Problem</Text>
            </TouchableOpacity>

            {/* Other Stores Section */}
            <View style={styles.otherStoresSection}>
              <Text style={styles.sectionTitle}>Other Stores</Text>
              
              {/* Location Banner */}
              {!hasUserLocation && (
                <TouchableOpacity style={styles.locationBanner} onPress={handleSetLocation}>
                  <View style={styles.locationBannerLeft}>
                    <IconSymbol
                      ios_icon_name="location"
                      android_material_icon_name="location-on"
                      size={20}
                      color={colors.primary}
                    />
                    <Text style={styles.locationBannerText}>
                      Set your shopping location to see available stores
                    </Text>
                  </View>
                  <IconSymbol
                    ios_icon_name="chevron.right"
                    android_material_icon_name="chevron-right"
                    size={20}
                    color={colors.primary}
                  />
                </TouchableOpacity>
              )}
              
              {/* City Required Banner */}
              {hasUserLocation && cityRequired && (
                <TouchableOpacity style={styles.cityRequiredBanner} onPress={handleSetLocation}>
                  <View style={styles.locationBannerLeft}>
                    <IconSymbol
                      ios_icon_name="location"
                      android_material_icon_name="location-on"
                      size={20}
                      color={colors.primary}
                    />
                    <Text style={styles.locationBannerText}>
                      Add your city to see stores that deliver to you
                    </Text>
                  </View>
                  <View style={styles.setCityButton}>
                    <Text style={styles.setCityButtonText}>Set city</Text>
                  </View>
                </TouchableOpacity>
              )}
              
              {loadingStores ? (
                <View style={styles.storesLoadingContainer}>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text style={styles.storesLoadingText}>Finding stores for your location...</Text>
                </View>
              ) : storesMessage ? (
                <View style={styles.messageContainer}>
                  <IconSymbol
                    ios_icon_name="info.circle"
                    android_material_icon_name="info"
                    size={24}
                    color={colors.textSecondary}
                  />
                  <Text style={styles.messageText}>{storesMessage}</Text>
                </View>
              ) : otherStores.length === 0 ? (
                <View style={styles.noStoresContainer}>
                  <IconSymbol
                    ios_icon_name="storefront"
                    android_material_icon_name="store"
                    size={32}
                    color={colors.textSecondary}
                  />
                  <Text style={styles.noStoresText}>
                    {hasUserLocation 
                      ? 'No stores available for your location' 
                      : 'No other stores found'}
                  </Text>
                </View>
              ) : (
                <>
                  <View style={styles.storesList}>
                    {otherStores.map((store, index) => {
                      const storePriceText = `${store.currency} ${store.price.toFixed(2)}`;
                      
                      return (
                        <TouchableOpacity
                          key={index}
                          style={styles.storeCard}
                          onPress={() => handleOpenStoreUrl(store.url, store.storeName, store.domain)}
                          onLongPress={async () => {
                            const { copyStoreLink } = await import('@/utils/openStoreLink');
                            await copyStoreLink(store.url);
                          }}
                          activeOpacity={0.7}
                        >
                          <View style={styles.storeCardLeft}>
                            <Text style={styles.storeName}>{store.storeName}</Text>
                            <Text style={styles.storeDomain}>{store.domain}</Text>
                          </View>
                          <View style={styles.storeCardRight}>
                            <Text style={styles.storePrice}>{storePriceText}</Text>
                            <IconSymbol
                              ios_icon_name="arrow.up.forward"
                              android_material_icon_name="open-in-new"
                              size={18}
                              color={colors.textSecondary}
                            />
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                  
                  {/* Unavailable Stores Section */}
                  {unavailableStores.length > 0 && (
                    <View style={styles.unavailableSection}>
                      <TouchableOpacity
                        style={styles.unavailableHeader}
                        onPress={() => setShowUnavailableStores(!showUnavailableStores)}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.unavailableTitle}>
                          Unavailable in your location ({unavailableStores.length})
                        </Text>
                        <IconSymbol
                          ios_icon_name={showUnavailableStores ? 'chevron.up' : 'chevron.down'}
                          android_material_icon_name={showUnavailableStores ? 'expand-less' : 'expand-more'}
                          size={20}
                          color={colors.textSecondary}
                        />
                      </TouchableOpacity>
                      
                      {showUnavailableStores && (
                        <View style={styles.unavailableList}>
                          {unavailableStores.map((store, index) => {
                            const storePriceText = `${store.currency} ${store.price.toFixed(2)}`;
                            
                            return (
                              <View key={index} style={styles.unavailableStoreCard}>
                                <View style={styles.storeCardLeft}>
                                  <Text style={styles.unavailableStoreName}>{store.storeName}</Text>
                                  <Text style={styles.storeDomain}>{store.domain}</Text>
                                  <View style={styles.reasonBadge}>
                                    <IconSymbol
                                      ios_icon_name="info.circle"
                                      android_material_icon_name="info"
                                      size={12}
                                      color={colors.textSecondary}
                                    />
                                    <Text style={styles.reasonText}>{store.reason}</Text>
                                  </View>
                                </View>
                                <Text style={styles.unavailableStorePrice}>{storePriceText}</Text>
                              </View>
                            );
                          })}
                        </View>
                      )}
                    </View>
                  )}
                </>
              )}
            </View>
          </View>
        </ScrollView>

        {/* Edit Item Modal */}
        <Modal
          visible={showEditModal}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setShowEditModal(false)}
        >
          <SafeAreaView style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowEditModal(false)}>
                <Text style={styles.modalCancelButton}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Edit Item</Text>
              <TouchableOpacity onPress={handleSaveEdit} disabled={saving}>
                {saving ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Text style={styles.modalSaveButton}>Save</Text>
                )}
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent}>
              {/* Image Preview */}
              <View style={styles.imagePreviewContainer}>
                {editedImageUrl ? (
                  <Image
                    source={resolveImageSource(editedImageUrl)}
                    style={styles.imagePreview}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={[styles.imagePreview, styles.placeholderImage]}>
                    <IconSymbol
                      ios_icon_name="photo"
                      android_material_icon_name="image"
                      size={48}
                      color={colors.textSecondary}
                    />
                  </View>
                )}
                <View style={styles.imageButtonsRow}>
                  <TouchableOpacity style={styles.changeImageButton} onPress={handlePickImage}>
                    <IconSymbol
                      ios_icon_name="camera"
                      android_material_icon_name="camera"
                      size={16}
                      color="#FFFFFF"
                    />
                    <Text style={styles.changeImageButtonText}>Change Image</Text>
                  </TouchableOpacity>
                  {editedImageUrl && (
                    <TouchableOpacity style={styles.removeImageButton} onPress={handleRemoveImage}>
                      <IconSymbol
                        ios_icon_name="trash"
                        android_material_icon_name="delete"
                        size={16}
                        color={colors.error}
                      />
                      <Text style={styles.removeImageButtonText}>Remove</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {/* Title Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Title</Text>
                <TextInput
                  style={styles.input}
                  value={editedTitle}
                  onChangeText={setEditedTitle}
                  placeholder="Item title"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>

              {/* Price Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Price</Text>
                <View style={styles.priceInputRow}>
                  <TextInput
                    style={[styles.input, styles.priceInput]}
                    value={editedPrice}
                    onChangeText={setEditedPrice}
                    placeholder="0.00"
                    placeholderTextColor={colors.textSecondary}
                    keyboardType="decimal-pad"
                  />
                  <TextInput
                    style={[styles.input, styles.currencyInput]}
                    value={editedCurrency}
                    onChangeText={setEditedCurrency}
                    placeholder="USD"
                    placeholderTextColor={colors.textSecondary}
                    maxLength={3}
                  />
                </View>
              </View>

              {/* Notes Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Notes</Text>
                <TextInput
                  style={[styles.input, styles.notesInput]}
                  value={editedNotes}
                  onChangeText={setEditedNotes}
                  placeholder="Add notes..."
                  placeholderTextColor={colors.textSecondary}
                  multiline
                  numberOfLines={4}
                />
              </View>
            </ScrollView>
          </SafeAreaView>
        </Modal>


      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  imageContainer: {
    width: '100%',
    height: 320,
    backgroundColor: colors.backgroundAlt,
  },
  mainImage: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.backgroundAlt,
  },
  contentSection: {
    padding: 20,
  },
  itemTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16,
  },
  priceCard: {
    backgroundColor: colors.highlight,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  priceCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  priceLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  priceDropBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  priceDropText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#10B981',
  },
  currentPrice: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  convertedPrice: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  lastCheckedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  lastCheckedText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  trackingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.highlight,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.primary + '40',
    gap: 8,
    marginBottom: 12,
  },
  trackingBadgeText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  checkPriceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
    marginBottom: 16,
  },
  checkPriceButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  alertCard: {
    backgroundColor: colors.card,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  alertHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  alertInputContainer: {
    marginTop: 16,
    gap: 12,
  },
  alertLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  alertInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  alertInput: {
    flex: 1,
    backgroundColor: colors.backgroundAlt,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  alertCurrency: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  alertSaveButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertSaveButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  alertHint: {
    fontSize: 12,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  sourceDomain: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  notesCard: {
    backgroundColor: colors.card,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 20,
  },
  notesLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 8,
  },
  notesText: {
    fontSize: 16,
    color: colors.text,
    lineHeight: 24,
  },
  buttonContainer: {
    gap: 12,
    marginBottom: 12,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
  },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 8,
  },
  linkButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  reportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 8,
    marginBottom: 16,
  },
  reportButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalHeaderSpacer: {
    width: 60,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  modalCancelButton: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  modalSaveButton: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  imagePreviewContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  imagePreview: {
    width: 200,
    height: 200,
    borderRadius: 12,
    marginBottom: 12,
  },
  imageButtonsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  changeImageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  changeImageButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  removeImageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundAlt,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  removeImageButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.error,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  priceInputRow: {
    flexDirection: 'row',
    gap: 12,
  },
  priceInput: {
    flex: 1,
  },
  currencyInput: {
    width: 80,
  },
  notesInput: {
    height: 100,
    textAlignVertical: 'top',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  emptyStateText: {
    fontSize: 16,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  historyList: {
    gap: 12,
  },
  historyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.card,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  historyItemLeft: {
    gap: 4,
  },
  historyPrice: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  historyTime: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  historyDate: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  otherStoresSection: {
    marginTop: 32,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16,
  },
  locationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.highlight,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.primary + '20',
  },
  locationBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  locationBannerText: {
    fontSize: 14,
    color: colors.text,
    flex: 1,
    lineHeight: 20,
  },
  cityRequiredBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.highlight,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.primary + '20',
  },
  setCityButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  setCityButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  storesLoadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    gap: 12,
  },
  storesLoadingText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  messageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    gap: 12,
  },
  messageText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    flex: 1,
  },
  noStoresContainer: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 12,
  },
  noStoresText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  storesList: {
    gap: 12,
  },
  storeCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.card,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  storeCardLeft: {
    flex: 1,
    gap: 4,
  },
  storeName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  storeDomain: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  storeCardRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  storePrice: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
  },
  unavailableSection: {
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 16,
  },
  unavailableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  unavailableTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  unavailableList: {
    marginTop: 12,
    gap: 12,
  },
  unavailableStoreCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    backgroundColor: colors.backgroundAlt,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    opacity: 0.7,
  },
  unavailableStoreName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  unavailableStorePrice: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  reasonBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  reasonText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
});
