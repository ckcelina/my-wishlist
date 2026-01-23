
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
