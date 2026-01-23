
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Image,
  ImageSourcePropType,
  ActivityIndicator,
} from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { useAuth } from '@/contexts/AuthContext';
import * as ImagePicker from 'expo-image-picker';

// Helper to resolve image sources
function resolveImageSource(source: string | number | ImageSourcePropType | undefined): ImageSourcePropType {
  if (!source) return { uri: '' };
  if (typeof source === 'string') return { uri: source };
  return source as ImageSourcePropType;
}

type TabType = 'link' | 'manual';

interface ExtractedItem {
  title: string;
  imageUrl: string | null;
  price: string | null;
  currency: string;
  originalUrl: string;
  sourceDomain: string;
}

export default function AddItemScreen() {
  const router = useRouter();
  const { wishlistId } = useLocalSearchParams();
  const { user } = useAuth();

  // Tab state
  const [activeTab, setActiveTab] = useState<TabType>('link');

  // Paste Link tab state
  const [itemUrl, setItemUrl] = useState('');
  const [extracting, setExtracting] = useState(false);
  const [extractedItem, setExtractedItem] = useState<ExtractedItem | null>(null);

  // Manual tab state
  const [manualTitle, setManualTitle] = useState('');
  const [manualImage, setManualImage] = useState<string | null>(null);
  const [manualPrice, setManualPrice] = useState('');
  const [manualCurrency, setManualCurrency] = useState('USD');
  const [manualNotes, setManualNotes] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);

  // Common state
  const [selectedWishlistId, setSelectedWishlistId] = useState<string>('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    console.log('AddItemScreen (iOS): Component mounted');
    if (wishlistId && typeof wishlistId === 'string') {
      console.log('AddItemScreen (iOS): Pre-selected wishlist ID:', wishlistId);
      setSelectedWishlistId(wishlistId);
    }
  }, [wishlistId]);

  const handleExtractItem = async () => {
    console.log('AddItemScreen (iOS): Extracting item from URL:', itemUrl);
    if (!itemUrl.trim()) {
      Alert.alert('Error', 'Please enter a product URL');
      return;
    }

    if (!selectedWishlistId) {
      Alert.alert('Error', 'Please select a wishlist first');
      return;
    }

    try {
      setExtracting(true);
      const { authenticatedPost } = await import('@/utils/api');

      // Extract item data from URL using AI
      const extractedData = await authenticatedPost<ExtractedItem>('/api/items/extract', { url: itemUrl });
      console.log('AddItemScreen (iOS): Extracted item data:', extractedData);

      setExtractedItem(extractedData);
    } catch (error) {
      console.error('AddItemScreen (iOS): Error extracting item:', error);
      Alert.alert('Error', 'Failed to extract item data. Please try again.');
    } finally {
      setExtracting(false);
    }
  };

  const handleSaveExtractedItem = async () => {
    console.log('AddItemScreen (iOS): Saving extracted item');
    if (!extractedItem) return;

    try {
      setSaving(true);
      const { authenticatedPost } = await import('@/utils/api');

      // Create the item in the wishlist
      await authenticatedPost('/api/items', {
        wishlistId: selectedWishlistId,
        title: extractedItem.title,
        imageUrl: extractedItem.imageUrl,
        currentPrice: extractedItem.price,
        currency: extractedItem.currency,
        originalUrl: extractedItem.originalUrl,
        sourceDomain: extractedItem.sourceDomain,
        notes: '',
      });

      console.log('AddItemScreen (iOS): Item saved successfully');
      Alert.alert('Success', 'Item added to wishlist!', [
        {
          text: 'OK',
          onPress: () => {
            setItemUrl('');
            setExtractedItem(null);
            router.back();
          },
        },
      ]);
    } catch (error) {
      console.error('AddItemScreen (iOS): Error saving item:', error);
      Alert.alert('Error', 'Failed to save item. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handlePickImage = async () => {
    console.log('AddItemScreen (iOS): Picking image');
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permissionResult.granted) {
        Alert.alert('Permission Required', 'Please allow access to your photo library to upload images.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const imageUri = result.assets[0].uri;
        console.log('AddItemScreen (iOS): Image selected:', imageUri);

        // Upload image to backend
        setUploadingImage(true);
        try {
          const { BACKEND_URL, getBearerToken } = await import('@/utils/api');
          const token = await getBearerToken();

          if (!token) {
            throw new Error('Authentication token not found');
          }

          const formData = new FormData();
          formData.append('image', {
            uri: imageUri,
            type: 'image/jpeg',
            name: 'item-image.jpg',
          } as any);

          const response = await fetch(`${BACKEND_URL}/api/upload/image`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
            },
            body: formData,
          });

          if (!response.ok) {
            throw new Error('Failed to upload image');
          }

          const data = await response.json();
          console.log('AddItemScreen (iOS): Image uploaded:', data.url);
          setManualImage(data.url);
        } catch (error) {
          console.error('AddItemScreen (iOS): Error uploading image:', error);
          Alert.alert('Error', 'Failed to upload image. Please try again.');
        } finally {
          setUploadingImage(false);
        }
      }
    } catch (error) {
      console.error('AddItemScreen (iOS): Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  const handleSaveManualItem = async () => {
    console.log('AddItemScreen (iOS): Saving manual item');
    if (!manualTitle.trim()) {
      Alert.alert('Error', 'Please enter an item title');
      return;
    }

    if (!selectedWishlistId) {
      Alert.alert('Error', 'Please select a wishlist first');
      return;
    }

    try {
      setSaving(true);
      const { authenticatedPost } = await import('@/utils/api');

      // Create the item in the wishlist
      await authenticatedPost('/api/items', {
        wishlistId: selectedWishlistId,
        title: manualTitle,
        imageUrl: manualImage,
        currentPrice: manualPrice || null,
        currency: manualCurrency,
        notes: manualNotes,
      });

      console.log('AddItemScreen (iOS): Manual item saved successfully');
      Alert.alert('Success', 'Item added to wishlist!', [
        {
          text: 'OK',
          onPress: () => {
            setManualTitle('');
            setManualImage(null);
            setManualPrice('');
            setManualCurrency('USD');
            setManualNotes('');
            router.back();
          },
        },
      ]);
    } catch (error) {
      console.error('AddItemScreen (iOS): Error saving manual item:', error);
      Alert.alert('Error', 'Failed to save item. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const extractButtonText = extracting ? 'Fetching...' : 'Fetch Item';
  const saveButtonText = saving ? 'Saving...' : 'Save Item';

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Add Item',
          headerBackTitle: 'Back',
        }}
      />
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.subtitle}>Add items to your wishlist</Text>
        </View>

        {/* Tab Selector */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'link' && styles.tabActive]}
            onPress={() => setActiveTab('link')}
          >
            <IconSymbol
              ios_icon_name="link"
              android_material_icon_name="link"
              size={20}
              color={activeTab === 'link' ? colors.primary : colors.textSecondary}
            />
            <Text style={[styles.tabText, activeTab === 'link' && styles.tabTextActive]}>
              Paste Link
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === 'manual' && styles.tabActive]}
            onPress={() => setActiveTab('manual')}
          >
            <IconSymbol
              ios_icon_name="pencil"
              android_material_icon_name="edit"
              size={20}
              color={activeTab === 'manual' ? colors.primary : colors.textSecondary}
            />
            <Text style={[styles.tabText, activeTab === 'manual' && styles.tabTextActive]}>
              Manual
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
        >
          {activeTab === 'link' ? (
            // Paste Link Tab
            <View style={styles.tabContent}>
              {!extractedItem ? (
                // URL Input
                <React.Fragment>
                  <View style={styles.form}>
                    <Text style={styles.label}>Product URL</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="https://example.com/product"
                      placeholderTextColor={colors.textSecondary}
                      value={itemUrl}
                      onChangeText={setItemUrl}
                      autoCapitalize="none"
                      autoCorrect={false}
                      keyboardType="url"
                      multiline
                    />

                    <TouchableOpacity
                      style={[styles.button, extracting && styles.buttonDisabled]}
                      onPress={handleExtractItem}
                      disabled={extracting}
                    >
                      {extracting ? (
                        <ActivityIndicator color="#FFFFFF" />
                      ) : (
                        <Text style={styles.buttonText}>{extractButtonText}</Text>
                      )}
                    </TouchableOpacity>
                  </View>

                  <View style={styles.infoBox}>
                    <IconSymbol
                      ios_icon_name="info.circle"
                      android_material_icon_name="info"
                      size={20}
                      color={colors.primary}
                    />
                    <Text style={styles.infoText}>
                      Our AI will automatically extract the product name, image, and price from the URL
                    </Text>
                  </View>
                </React.Fragment>
              ) : (
                // Editable Preview
                <React.Fragment>
                  <Text style={styles.sectionTitle}>Preview</Text>

                  {extractedItem.imageUrl && (
                    <Image
                      source={resolveImageSource(extractedItem.imageUrl)}
                      style={styles.previewImage}
                      resizeMode="cover"
                    />
                  )}

                  <View style={styles.form}>
                    <Text style={styles.label}>Title</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Item title"
                      placeholderTextColor={colors.textSecondary}
                      value={extractedItem.title}
                      onChangeText={(text) => setExtractedItem({ ...extractedItem, title: text })}
                    />

                    <Text style={styles.label}>Image URL</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="https://example.com/image.jpg"
                      placeholderTextColor={colors.textSecondary}
                      value={extractedItem.imageUrl || ''}
                      onChangeText={(text) => setExtractedItem({ ...extractedItem, imageUrl: text })}
                      autoCapitalize="none"
                      autoCorrect={false}
                    />

                    <View style={styles.row}>
                      <View style={styles.halfWidth}>
                        <Text style={styles.label}>Price</Text>
                        <TextInput
                          style={styles.input}
                          placeholder="0.00"
                          placeholderTextColor={colors.textSecondary}
                          value={extractedItem.price || ''}
                          onChangeText={(text) => setExtractedItem({ ...extractedItem, price: text })}
                          keyboardType="decimal-pad"
                        />
                      </View>

                      <View style={styles.halfWidth}>
                        <Text style={styles.label}>Currency</Text>
                        <TextInput
                          style={styles.input}
                          placeholder="USD"
                          placeholderTextColor={colors.textSecondary}
                          value={extractedItem.currency}
                          onChangeText={(text) => setExtractedItem({ ...extractedItem, currency: text.toUpperCase() })}
                          autoCapitalize="characters"
                          maxLength={3}
                        />
                      </View>
                    </View>

                    <View style={styles.buttonRow}>
                      <TouchableOpacity
                        style={[styles.button, styles.buttonSecondary]}
                        onPress={() => {
                          setExtractedItem(null);
                          setItemUrl('');
                        }}
                      >
                        <Text style={styles.buttonTextSecondary}>Cancel</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.button, styles.buttonPrimary, saving && styles.buttonDisabled]}
                        onPress={handleSaveExtractedItem}
                        disabled={saving}
                      >
                        {saving ? (
                          <ActivityIndicator color="#FFFFFF" />
                        ) : (
                          <Text style={styles.buttonText}>{saveButtonText}</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                </React.Fragment>
              )}
            </View>
          ) : (
            // Manual Tab
            <View style={styles.tabContent}>
              <View style={styles.form}>
                <Text style={styles.label}>
                  Title
                  <Text style={styles.required}> *</Text>
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder="Item title"
                  placeholderTextColor={colors.textSecondary}
                  value={manualTitle}
                  onChangeText={setManualTitle}
                />

                <Text style={styles.label}>Image</Text>
                {manualImage ? (
                  <View style={styles.imageContainer}>
                    <Image
                      source={resolveImageSource(manualImage)}
                      style={styles.uploadedImage}
                      resizeMode="cover"
                    />
                    <TouchableOpacity
                      style={styles.removeImageButton}
                      onPress={() => setManualImage(null)}
                    >
                      <IconSymbol
                        ios_icon_name="xmark.circle.fill"
                        android_material_icon_name="cancel"
                        size={24}
                        color={colors.text}
                      />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.imagePicker}
                    onPress={handlePickImage}
                    disabled={uploadingImage}
                  >
                    {uploadingImage ? (
                      <ActivityIndicator color={colors.primary} />
                    ) : (
                      <React.Fragment>
                        <IconSymbol
                          ios_icon_name="photo"
                          android_material_icon_name="image"
                          size={32}
                          color={colors.textSecondary}
                        />
                        <Text style={styles.imagePickerText}>Tap to upload image</Text>
                      </React.Fragment>
                    )}
                  </TouchableOpacity>
                )}

                <View style={styles.row}>
                  <View style={styles.halfWidth}>
                    <Text style={styles.label}>Price</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="0.00"
                      placeholderTextColor={colors.textSecondary}
                      value={manualPrice}
                      onChangeText={setManualPrice}
                      keyboardType="decimal-pad"
                    />
                  </View>

                  <View style={styles.halfWidth}>
                    <Text style={styles.label}>Currency</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="USD"
                      placeholderTextColor={colors.textSecondary}
                      value={manualCurrency}
                      onChangeText={(text) => setManualCurrency(text.toUpperCase())}
                      autoCapitalize="characters"
                      maxLength={3}
                    />
                  </View>
                </View>

                <Text style={styles.label}>Notes</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Add notes about this item..."
                  placeholderTextColor={colors.textSecondary}
                  value={manualNotes}
                  onChangeText={setManualNotes}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />

                <TouchableOpacity
                  style={[styles.button, styles.buttonPrimary, saving && styles.buttonDisabled]}
                  onPress={handleSaveManualItem}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.buttonText}>{saveButtonText}</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}
        </ScrollView>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: colors.backgroundAlt,
    gap: 8,
  },
  tabActive: {
    backgroundColor: colors.primary + '15',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: colors.primary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  tabContent: {
    flex: 1,
  },
  form: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  required: {
    color: colors.accent,
  },
  input: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: colors.text,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  button: {
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  buttonPrimary: {
    backgroundColor: colors.primary,
    flex: 1,
  },
  buttonSecondary: {
    backgroundColor: colors.backgroundAlt,
    borderWidth: 1,
    borderColor: colors.border,
    flex: 1,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  buttonTextSecondary: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.backgroundAlt,
    padding: 16,
    borderRadius: 8,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16,
  },
  previewImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 20,
    backgroundColor: colors.backgroundAlt,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfWidth: {
    flex: 1,
  },
  imagePicker: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: 'dashed',
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  imagePickerText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 8,
  },
  imageContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  uploadedImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    backgroundColor: colors.backgroundAlt,
  },
  removeImageButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: colors.background,
    borderRadius: 12,
  },
});
