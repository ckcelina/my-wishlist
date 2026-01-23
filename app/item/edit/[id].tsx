
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
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { useAuth } from '@/contexts/AuthContext';

interface ItemDetail {
  id: string;
  title: string;
  imageUrl: string | null;
  currentPrice: string | null;
  currency: string;
  originalUrl: string | null;
  sourceDomain: string | null;
  notes: string | null;
}

function resolveImageSource(source: string | number | ImageSourcePropType | undefined): ImageSourcePropType {
  if (!source) return { uri: '' };
  if (typeof source === 'string') return { uri: source };
  return source as ImageSourcePropType;
}

export default function EditItemScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Form state
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [notes, setNotes] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [originalUrl, setOriginalUrl] = useState('');

  const fetchItem = useCallback(async () => {
    console.log('EditItemScreen: Fetching item details for editing');
    try {
      setLoading(true);
      const { authenticatedGet } = await import('@/utils/api');
      const data = await authenticatedGet<ItemDetail>(`/api/items/${id}`);
      console.log('EditItemScreen: Fetched item:', data.title);
      
      setTitle(data.title);
      setPrice(data.currentPrice || '');
      setCurrency(data.currency);
      setNotes(data.notes || '');
      setImageUrl(data.imageUrl || '');
      setOriginalUrl(data.originalUrl || '');
    } catch (error) {
      console.error('EditItemScreen: Error fetching item:', error);
      Alert.alert('Error', 'Failed to load item details');
      router.back();
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    console.log('EditItemScreen: Component mounted, item ID:', id);
    if (id) {
      fetchItem();
    }
  }, [id, fetchItem]);

  const uploadImage = async (imageUri: string): Promise<string | null> => {
    console.log('EditItemScreen: Uploading image to backend:', imageUri);
    try {
      const Constants = await import('expo-constants');
      const backendUrl = Constants.default.expoConfig?.extra?.backendUrl;
      
      const formData = new FormData();
      const filename = imageUri.split('/').pop() || 'image.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';
      
      formData.append('image', {
        uri: imageUri,
        name: filename,
        type,
      } as any);

      const response = await fetch(`${backendUrl}/api/upload/image`, {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to upload image');
      }

      const data = await response.json();
      console.log('EditItemScreen: Image uploaded successfully:', data.url);
      return data.url;
    } catch (error) {
      console.error('EditItemScreen: Error uploading image:', error);
      Alert.alert('Upload Error', 'Failed to upload image. Please try again.');
      return null;
    }
  };

  const handlePickImage = async () => {
    console.log('EditItemScreen: User tapped Change Image button');
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const imageUri = result.assets[0].uri;
        console.log('EditItemScreen: Image selected:', imageUri);
        setImageUrl(imageUri);
      }
    } catch (error) {
      console.error('EditItemScreen: Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const handleRemoveImage = () => {
    console.log('EditItemScreen: User tapped Remove Image button');
    setImageUrl('');
  };

  const handleSave = async () => {
    console.log('EditItemScreen: User tapped Save button');
    
    if (!title.trim()) {
      Alert.alert('Error', 'Item title cannot be empty');
      return;
    }

    const newPrice = price.trim() ? parseFloat(price) : null;
    if (price.trim() && (isNaN(newPrice!) || newPrice! < 0)) {
      Alert.alert('Error', 'Please enter a valid price');
      return;
    }

    try {
      setSaving(true);
      
      let finalImageUrl = imageUrl;
      if (imageUrl && imageUrl.startsWith('file://')) {
        console.log('EditItemScreen: Uploading local image to backend');
        const uploadedUrl = await uploadImage(imageUrl);
        if (uploadedUrl) {
          finalImageUrl = uploadedUrl;
        } else {
          setSaving(false);
          return;
        }
      }
      
      const { authenticatedPut } = await import('@/utils/api');
      await authenticatedPut(`/api/items/${id}`, {
        title: title.trim(),
        currentPrice: newPrice !== null ? newPrice.toString() : null,
        notes: notes.trim() || null,
        imageUrl: finalImageUrl || null,
      });
      
      console.log('EditItemScreen: Item updated successfully, navigating back');
      Alert.alert('Success', 'Item updated successfully', [
        {
          text: 'OK',
          onPress: () => router.back(),
        },
      ]);
    } catch (error) {
      console.error('EditItemScreen: Error updating item:', error);
      Alert.alert('Error', 'Failed to update item');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <>
        <Stack.Screen
          options={{
            headerShown: true,
            title: 'Edit Item',
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

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Edit Item',
          headerBackTitle: 'Back',
        }}
      />
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          {/* Image Section */}
          <View style={styles.imageSection}>
            <Text style={styles.sectionLabel}>Image</Text>
            <View style={styles.imagePreviewContainer}>
              {imageUrl ? (
                <Image
                  source={resolveImageSource(imageUrl)}
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
                  <Text style={styles.placeholderText}>No image</Text>
                </View>
              )}
            </View>
            <View style={styles.imageButtonsRow}>
              <TouchableOpacity style={styles.changeImageButton} onPress={handlePickImage}>
                <IconSymbol
                  ios_icon_name="camera"
                  android_material_icon_name="camera"
                  size={18}
                  color="#FFFFFF"
                />
                <Text style={styles.changeImageButtonText}>Change Image</Text>
              </TouchableOpacity>
              {imageUrl && (
                <TouchableOpacity style={styles.removeImageButton} onPress={handleRemoveImage}>
                  <IconSymbol
                    ios_icon_name="trash"
                    android_material_icon_name="delete"
                    size={18}
                    color={colors.error}
                  />
                  <Text style={styles.removeImageButtonText}>Remove</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Title Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>
              Title
              <Text style={styles.requiredStar}> *</Text>
            </Text>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
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
                value={price}
                onChangeText={setPrice}
                placeholder="0.00"
                placeholderTextColor={colors.textSecondary}
                keyboardType="decimal-pad"
              />
              <TextInput
                style={[styles.input, styles.currencyInput]}
                value={currency}
                onChangeText={setCurrency}
                placeholder="USD"
                placeholderTextColor={colors.textSecondary}
                maxLength={3}
                autoCapitalize="characters"
              />
            </View>
          </View>

          {/* Original URL (Read-only) */}
          {originalUrl && (
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Original URL</Text>
              <View style={styles.readOnlyInput}>
                <Text style={styles.readOnlyText} numberOfLines={2}>
                  {originalUrl}
                </Text>
              </View>
              <Text style={styles.helperText}>This field is read-only</Text>
            </View>
          )}

          {/* Notes Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Notes</Text>
            <TextInput
              style={[styles.input, styles.notesInput]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Add notes about this item..."
              placeholderTextColor={colors.textSecondary}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          {/* Save Button */}
          <TouchableOpacity
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <IconSymbol
                  ios_icon_name="checkmark"
                  android_material_icon_name="check"
                  size={20}
                  color="#FFFFFF"
                />
                <Text style={styles.saveButtonText}>Save Changes</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
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
    padding: 20,
    paddingBottom: 40,
  },
  imageSection: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  imagePreviewContainer: {
    alignItems: 'center',
    marginBottom: 12,
  },
  imagePreview: {
    width: 200,
    height: 200,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  placeholderImage: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.backgroundAlt,
    gap: 8,
  },
  placeholderText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  imageButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  changeImageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
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
    paddingVertical: 10,
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
  requiredStar: {
    color: colors.error,
  },
  input: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: 8,
    padding: 14,
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
    width: 90,
  },
  readOnlyInput: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: 8,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    opacity: 0.6,
  },
  readOnlyText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  helperText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
    fontStyle: 'italic',
  },
  notesInput: {
    height: 120,
    textAlignVertical: 'top',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    marginTop: 8,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
</write file>

Now let me update the ItemDetailScreen to navigate to the dedicated EditItemScreen and add a delete button with confirmation:

<write file="app/item/[id].tsx">
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
  ImageSourcePropType,
  Linking,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { useAuth } from '@/contexts/AuthContext';

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
  wishlistId?: string;
}

interface OtherStore {
  storeName: string;
  domain: string;
  price: number;
  currency: string;
  url: string;
}

interface PriceDropInfo {
  priceDropped: boolean;
  originalPrice: number | null;
  currentPrice: number | null;
  percentageChange: number | null;
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
  const [item, setItem] = useState<ItemDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPriceHistoryModal, setShowPriceHistoryModal] = useState(false);
  const [showFullScreenImage, setShowFullScreenImage] = useState(false);
  const [otherStores, setOtherStores] = useState<OtherStore[]>([]);
  const [loadingStores, setLoadingStores] = useState(false);
  const [checkingPrice, setCheckingPrice] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [priceDropInfo, setPriceDropInfo] = useState<PriceDropInfo | null>(null);

  const fetchOtherStores = useCallback(async (title: string, originalUrl?: string) => {
    console.log('ItemDetailScreen: Fetching other stores via Supabase Edge Function');
    try {
      setLoadingStores(true);
      
      const { supabase } = await import('@/lib/supabase');
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(
        'https://dixgmnuayzblwpqyplsi.supabase.co/functions/v1/find-alternatives',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token || ''}`,
          },
          body: JSON.stringify({
            title,
            originalUrl,
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('ItemDetailScreen: Edge Function error:', errorText);
        throw new Error('Failed to fetch alternatives');
      }

      const data = await response.json();
      console.log('ItemDetailScreen: Found', data.alternatives?.length || 0, 'other stores');
      setOtherStores(data.alternatives || []);
    } catch (error) {
      console.error('ItemDetailScreen: Error fetching other stores:', error);
      setOtherStores([]);
    } finally {
      setLoadingStores(false);
    }
  }, []);

  const fetchItem = useCallback(async () => {
    console.log('ItemDetailScreen: Fetching item details');
    try {
      setLoading(true);
      const { authenticatedGet } = await import('@/utils/api');
      const data = await authenticatedGet<ItemDetail>(`/api/items/${id}`);
      console.log('ItemDetailScreen: Fetched item:', data.title);
      setItem(data);
      
      if (data.title) {
        fetchOtherStores(data.title, data.originalUrl || undefined);
      }
    } catch (error) {
      console.error('ItemDetailScreen: Error fetching item:', error);
      Alert.alert('Error', 'Failed to load item details');
    } finally {
      setLoading(false);
    }
  }, [id, fetchOtherStores]);

  const fetchPriceDropInfo = useCallback(async () => {
    console.log('ItemDetailScreen: Fetching price drop info');
    try {
      const { authenticatedGet } = await import('@/utils/api');
      const data = await authenticatedGet<PriceDropInfo>(`/api/items/${id}/price-dropped`);
      console.log('ItemDetailScreen: Price drop info:', data);
      setPriceDropInfo(data);
    } catch (error) {
      console.error('ItemDetailScreen: Error fetching price drop info:', error);
    }
  }, [id]);

  useEffect(() => {
    console.log('ItemDetailScreen: Component mounted, item ID:', id);
    if (id) {
      fetchItem();
      fetchPriceDropInfo();
    }
  }, [id, fetchItem, fetchPriceDropInfo]);

  const handleCheckPrice = async () => {
    console.log('ItemDetailScreen: User tapped Check Price Now button');
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
      
      console.log('ItemDetailScreen: Price check result:', result);
      
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
      console.error('ItemDetailScreen: Error checking price:', error);
      Alert.alert('Error', 'Failed to check price. Please try again later.');
    } finally {
      setCheckingPrice(false);
    }
  };

  const handleEditPress = () => {
    console.log('ItemDetailScreen: User tapped Edit button, navigating to EditItemScreen');
    router.push(`/item/edit/${id}`);
  };

  const handleDeletePress = () => {
    console.log('ItemDetailScreen: User tapped Delete button');
    Alert.alert(
      'Delete Item',
      'Are you sure you want to delete this item? This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => console.log('ItemDetailScreen: Delete cancelled'),
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: handleDeleteConfirm,
        },
      ]
    );
  };

  const handleDeleteConfirm = async () => {
    console.log('ItemDetailScreen: User confirmed delete');
    try {
      setDeleting(true);
      const { authenticatedDelete } = await import('@/utils/api');
      await authenticatedDelete(`/api/items/${id}`);
      console.log('ItemDetailScreen: Item deleted successfully, navigating back');
      
      Alert.alert('Deleted', 'Item has been deleted', [
        {
          text: 'OK',
          onPress: () => router.back(),
        },
      ]);
    } catch (error) {
      console.error('ItemDetailScreen: Error deleting item:', error);
      Alert.alert('Error', 'Failed to delete item. Please try again.');
      setDeleting(false);
    }
  };

  const handleOpenUrl = async () => {
    if (item?.originalUrl) {
      console.log('ItemDetailScreen: Opening source URL:', item.originalUrl);
      try {
        await Linking.openURL(item.originalUrl);
      } catch (error) {
        console.error('ItemDetailScreen: Error opening URL:', error);
        Alert.alert('Error', 'Failed to open link');
      }
    }
  };

  const handleViewPriceHistory = () => {
    console.log('ItemDetailScreen: User tapped View Price History button');
    setShowPriceHistoryModal(true);
  };

  const handleOpenStoreUrl = async (url: string, storeName: string) => {
    console.log('ItemDetailScreen: Opening store URL:', storeName, url);
    try {
      await Linking.openURL(url);
    } catch (error) {
      console.error('ItemDetailScreen: Error opening store URL:', error);
      Alert.alert('Error', 'Failed to open link');
    }
  };

  const handleImagePress = () => {
    if (item?.imageUrl) {
      console.log('ItemDetailScreen: User tapped image, opening full screen view');
      setShowFullScreenImage(true);
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
  const sortedPriceHistory = [...item.priceHistory].sort((a, b) => 
    new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime()
  );

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
          {/* Large Image - Tap to view full screen */}
          <TouchableOpacity 
            style={styles.imageContainer} 
            onPress={handleImagePress}
            activeOpacity={item.imageUrl ? 0.8 : 1}
          >
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
          </TouchableOpacity>

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
              
              {/* Last Checked Timestamp */}
              {item.originalUrl && (
                <View style={styles.lastCheckedRow}>
                  <IconSymbol
                    ios_icon_name="clock"
                    android_material_icon_name="schedule"
                    size={14}
                    color={colors.textSecondary}
                  />
                  <Text style={styles.lastCheckedText}>
                    Last checked: {lastCheckedText}
                  </Text>
                </View>
              )}
            </View>

            {/* Source Domain + Open Original Link */}
            {item.sourceDomain && item.originalUrl && (
              <TouchableOpacity style={styles.sourceDomainCard} onPress={handleOpenUrl}>
                <View style={styles.sourceDomainLeft}>
                  <IconSymbol
                    ios_icon_name="link"
                    android_material_icon_name="link"
                    size={18}
                    color={colors.textSecondary}
                  />
                  <Text style={styles.sourceDomain}>{item.sourceDomain}</Text>
                </View>
                <IconSymbol
                  ios_icon_name="arrow.up.right"
                  android_material_icon_name="open-in-new"
                  size={18}
                  color={colors.primary}
                />
              </TouchableOpacity>
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
              <TouchableOpacity 
                style={styles.primaryButton} 
                onPress={handleEditPress}
                disabled={deleting}
              >
                <IconSymbol
                  ios_icon_name="pencil"
                  android_material_icon_name="edit"
                  size={20}
                  color="#FFFFFF"
                />
                <Text style={styles.primaryButtonText}>Edit</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.deleteButton} 
                onPress={handleDeletePress}
                disabled={deleting}
              >
                {deleting ? (
                  <ActivityIndicator size="small" color={colors.error} />
                ) : (
                  <>
                    <IconSymbol
                      ios_icon_name="trash"
                      android_material_icon_name="delete"
                      size={20}
                      color={colors.error}
                    />
                    <Text style={styles.deleteButtonText}>Delete</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.secondaryButton} 
                onPress={handleViewPriceHistory}
                disabled={deleting}
              >
                <IconSymbol
                  ios_icon_name="chart.line.uptrend.xyaxis"
                  android_material_icon_name="trending-up"
                  size={20}
                  color={colors.primary}
                />
                <Text style={styles.secondaryButtonText}>View Price History</Text>
              </TouchableOpacity>
            </View>

            {/* Check Price Button (only if item has originalUrl) */}
            {item.originalUrl && (
              <TouchableOpacity 
                style={styles.checkPriceButton} 
                onPress={handleCheckPrice}
                disabled={checkingPrice || deleting}
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

            {/* Other Stores Section */}
            <View style={styles.otherStoresSection}>
              <Text style={styles.sectionTitle}>Other Stores</Text>
              
              {loadingStores ? (
                <View style={styles.storesLoadingContainer}>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text style={styles.storesLoadingText}>Finding other stores...</Text>
                </View>
              ) : otherStores.length === 0 ? (
                <View style={styles.noStoresContainer}>
                  <IconSymbol
                    ios_icon_name="storefront"
                    android_material_icon_name="store"
                    size={32}
                    color={colors.textSecondary}
                  />
                  <Text style={styles.noStoresText}>No other stores found</Text>
                </View>
              ) : (
                <View style={styles.storesList}>
                  {otherStores.map((store, index) => {
                    const storePriceText = `${store.currency} ${store.price.toFixed(2)}`;
                    
                    return (
                      <TouchableOpacity
                        key={index}
                        style={styles.storeCard}
                        onPress={() => handleOpenStoreUrl(store.url, store.storeName)}
                        activeOpacity={0.7}
                      >
                        <View style={styles.storeCardLeft}>
                          <Text style={styles.storeName}>{store.storeName}</Text>
                          <Text style={styles.storeDomain}>{store.domain}</Text>
                        </View>
                        <View style={styles.storeCardRight}>
                          <Text style={styles.storePrice}>{storePriceText}</Text>
                          <IconSymbol
                            ios_icon_name="chevron.right"
                            android_material_icon_name="chevron-right"
                            size={20}
                            color={colors.textSecondary}
                          />
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>
          </View>
        </ScrollView>

        {/* Full Screen Image Modal */}
        <Modal
          visible={showFullScreenImage}
          animationType="fade"
          presentationStyle="fullScreen"
          onRequestClose={() => setShowFullScreenImage(false)}
        >
          <View style={styles.fullScreenImageContainer}>
            <TouchableOpacity
              style={styles.closeFullScreenButton}
              onPress={() => setShowFullScreenImage(false)}
            >
              <IconSymbol
                ios_icon_name="xmark"
                android_material_icon_name="close"
                size={28}
                color="#FFFFFF"
              />
            </TouchableOpacity>
            {item.imageUrl && (
              <Image
                source={resolveImageSource(item.imageUrl)}
                style={styles.fullScreenImage}
                resizeMode="contain"
              />
            )}
          </View>
        </Modal>

        {/* Price History Modal */}
        <Modal
          visible={showPriceHistoryModal}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setShowPriceHistoryModal(false)}
        >
          <SafeAreaView style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderSpacer} />
              <Text style={styles.modalTitle}>Price History</Text>
              <TouchableOpacity onPress={() => setShowPriceHistoryModal(false)}>
                <Text style={styles.modalCancelButton}>Done</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent}>
              {sortedPriceHistory.length === 0 ? (
                <View style={styles.emptyState}>
                  <IconSymbol
                    ios_icon_name="chart.line.uptrend.xyaxis"
                    android_material_icon_name="trending-up"
                    size={48}
                    color={colors.textSecondary}
                  />
                  <Text style={styles.emptyStateText}>No price history yet</Text>
                  <Text style={styles.emptyStateSubtext}>
                    Price history will appear here after price checks
                  </Text>
                </View>
              ) : (
                <View style={styles.historyList}>
                  {sortedPriceHistory.map((entry, index) => {
                    const historyPrice = parseFloat(entry.price);
                    const historyPriceText = `${item.currency} ${historyPrice.toFixed(2)}`;
                    const date = new Date(entry.recordedAt);
                    const dateText = date.toLocaleDateString();
                    const timeText = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    
                    return (
                      <View key={index} style={styles.historyItem}>
                        <View style={styles.historyItemLeft}>
                          <Text style={styles.historyPrice}>{historyPriceText}</Text>
                          <Text style={styles.historyTime}>{timeText}</Text>
                        </View>
                        <Text style={styles.historyDate}>{dateText}</Text>
                      </View>
                    );
                  })}
                </View>
              )}
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
  sourceDomainCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.card,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
  },
  sourceDomainLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  sourceDomain: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
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
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.backgroundAlt,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.error,
    gap: 8,
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.error,
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
  fullScreenImageContainer: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeFullScreenButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
    padding: 8,
  },
  fullScreenImage: {
    width: '100%',
    height: '100%',
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
  modalContent: {
    flex: 1,
    padding: 20,
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
  noStoresContainer: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 12,
  },
  noStoresText: {
    fontSize: 14,
    color: colors.textSecondary,
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
});
