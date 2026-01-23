
import { useAuth } from '@/contexts/AuthContext';
import React, { useState, useEffect } from 'react';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import * as ImagePicker from 'expo-image-picker';
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
import Constants from 'expo-constants';

type TabType = 'url' | 'manual';

interface ExtractedItem {
  title: string;
  imageUrl: string | null;
  price: string | null;
  currency: string;
  originalUrl: string;
  sourceDomain: string;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  tabContainer: {
    flexDirection: 'row',
    marginBottom: 24,
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: colors.primary,
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  activeTabText: {
    color: '#FFFFFF',
  },
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  secondaryButtonText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  imagePreview: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginTop: 12,
    backgroundColor: colors.cardBackground,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.textSecondary,
  },
  errorText: {
    color: colors.error,
    fontSize: 14,
    marginTop: 8,
  },
  infoText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 16,
  },
  sourceInfo: {
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  sourceLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  sourceValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
});

function resolveImageSource(source: string | number | ImageSourcePropType | undefined): ImageSourcePropType {
  if (!source) return { uri: '' };
  if (typeof source === 'string') return { uri: source };
  return source as ImageSourcePropType;
}

export default function AddItemScreen() {
  const router = useRouter();
  const { wishlistId } = useLocalSearchParams();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<TabType>('url');
  
  // URL extraction state
  const [url, setUrl] = useState('');
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState('');
  
  // Editable extracted fields
  const [extractedTitle, setExtractedTitle] = useState('');
  const [extractedImageUrl, setExtractedImageUrl] = useState('');
  const [extractedPrice, setExtractedPrice] = useState('');
  const [extractedCurrency, setExtractedCurrency] = useState('USD');
  const [extractedNotes, setExtractedNotes] = useState('');
  const [originalUrl, setOriginalUrl] = useState('');
  const [sourceDomain, setSourceDomain] = useState('');
  const [showExtractedForm, setShowExtractedForm] = useState(false);

  // Manual entry state
  const [manualTitle, setManualTitle] = useState('');
  const [manualPrice, setManualPrice] = useState('');
  const [manualCurrency, setManualCurrency] = useState('USD');
  const [manualImageUri, setManualImageUri] = useState('');
  const [manualNotes, setManualNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    console.log('AddItemScreen mounted with wishlistId:', wishlistId);
  }, [wishlistId]);

  const handleExtractItem = async () => {
    if (!url.trim()) {
      Alert.alert('Error', 'Please enter a URL');
      return;
    }

    console.log('Extracting item from URL:', url);
    setExtracting(true);
    setExtractError('');
    setShowExtractedForm(false);

    try {
      const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl;
      const supabaseAnonKey = Constants.expoConfig?.extra?.supabaseAnonKey;

      if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error('Supabase configuration missing');
      }

      // Call Supabase Edge Function
      const edgeFunctionUrl = `${supabaseUrl}/functions/v1/extract-item`;
      console.log('Calling Edge Function:', edgeFunctionUrl);

      const response = await fetch(edgeFunctionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseAnonKey}`,
        },
        body: JSON.stringify({ url: url.trim() }),
      });

      const data = await response.json();
      console.log('Edge Function response:', data);

      if (data.error) {
        setExtractError(data.error);
      }

      // Populate editable fields with extracted data
      setExtractedTitle(data.title || '');
      setExtractedImageUrl(data.imageUrl || '');
      setExtractedPrice(data.price ? String(data.price) : '');
      setExtractedCurrency(data.currency || 'USD');
      setExtractedNotes('');
      setOriginalUrl(url.trim());
      setSourceDomain(data.sourceDomain || '');
      setShowExtractedForm(true);

    } catch (error: any) {
      console.error('Failed to extract item:', error);
      setExtractError(error.message || 'Failed to extract item details');
      Alert.alert('Error', 'Failed to extract item details. Please try manual entry.');
    } finally {
      setExtracting(false);
    }
  };

  const uploadImage = async (imageUri: string): Promise<string | null> => {
    console.log('Uploading image to backend:', imageUri);
    try {
      const backendUrl = Constants.expoConfig?.extra?.backendUrl;
      
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
      console.log('Image uploaded successfully:', data.url);
      return data.url;
    } catch (error) {
      console.error('Error uploading image:', error);
      Alert.alert('Upload Error', 'Failed to upload image. The item will be saved without an image.');
      return null;
    }
  };

  const handlePickExtractedImage = async () => {
    console.log('Opening image picker for extracted item');
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setExtractedImageUrl(result.assets[0].uri);
      console.log('Image selected:', result.assets[0].uri);
    }
  };

  const handleRemoveExtractedImage = () => {
    console.log('Removing extracted image');
    setExtractedImageUrl('');
  };

  const handleSaveExtractedItem = async () => {
    if (!extractedTitle.trim()) {
      Alert.alert('Error', 'Please enter an item title');
      return;
    }

    if (!wishlistId) {
      Alert.alert('Error', 'No wishlist selected');
      return;
    }

    console.log('Saving extracted item to wishlist:', wishlistId);
    setSaving(true);

    try {
      // Upload image if it's a local file (starts with file://)
      let finalImageUrl = extractedImageUrl;
      if (extractedImageUrl && extractedImageUrl.startsWith('file://')) {
        console.log('Uploading local image to backend');
        const uploadedUrl = await uploadImage(extractedImageUrl);
        if (uploadedUrl) {
          finalImageUrl = uploadedUrl;
        } else {
          finalImageUrl = null;
        }
      }

      const backendUrl = Constants.expoConfig?.extra?.backendUrl;
      const response = await fetch(`${backendUrl}/api/items`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          wishlistId,
          title: extractedTitle.trim(),
          imageUrl: finalImageUrl || null,
          currentPrice: extractedPrice ? parseFloat(extractedPrice) : null,
          currency: extractedCurrency,
          originalUrl: originalUrl,
          sourceDomain: sourceDomain,
          notes: extractedNotes.trim() || null,
          userId: user?.id,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save item');
      }

      const savedItem = await response.json();
      console.log('Item saved successfully:', savedItem);

      Alert.alert('Success', 'Item added to wishlist!', [
        {
          text: 'OK',
          onPress: () => router.back(),
        },
      ]);
    } catch (error: any) {
      console.error('Failed to save item:', error);
      Alert.alert('Error', 'Failed to save item. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handlePickImage = async () => {
    console.log('Opening image picker');
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setManualImageUri(result.assets[0].uri);
      console.log('Image selected:', result.assets[0].uri);
    }
  };

  const handleRemoveManualImage = () => {
    console.log('Removing manual image');
    setManualImageUri('');
  };

  const handleSaveManualItem = async () => {
    if (!manualTitle.trim()) {
      Alert.alert('Error', 'Please enter an item title');
      return;
    }

    if (!wishlistId) {
      Alert.alert('Error', 'No wishlist selected');
      return;
    }

    console.log('Saving manual item to wishlist:', wishlistId);
    setSaving(true);

    try {
      // Upload image if provided
      let finalImageUrl = manualImageUri;
      if (manualImageUri && manualImageUri.startsWith('file://')) {
        console.log('Uploading local image to backend');
        const uploadedUrl = await uploadImage(manualImageUri);
        if (uploadedUrl) {
          finalImageUrl = uploadedUrl;
        } else {
          finalImageUrl = null;
        }
      }

      const backendUrl = Constants.expoConfig?.extra?.backendUrl;
      const response = await fetch(`${backendUrl}/api/items`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          wishlistId,
          title: manualTitle.trim(),
          imageUrl: finalImageUrl || null,
          currentPrice: manualPrice ? parseFloat(manualPrice) : null,
          currency: manualCurrency,
          notes: manualNotes.trim() || null,
          userId: user?.id,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save item');
      }

      const savedItem = await response.json();
      console.log('Manual item saved successfully:', savedItem);

      Alert.alert('Success', 'Item added to wishlist!', [
        {
          text: 'OK',
          onPress: () => router.back(),
        },
      ]);
    } catch (error: any) {
      console.error('Failed to save manual item:', error);
      Alert.alert('Error', 'Failed to save item. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const renderUrlTab = () => {
    if (extracting) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Extracting item details...</Text>
        </View>
      );
    }

    if (showExtractedForm) {
      const sourceDisplayText = sourceDomain || 'Unknown source';
      const urlDisplayText = originalUrl;

      return (
        <View>
          <Text style={styles.infoText}>
            Review and edit the extracted details before saving
          </Text>

          {extractError && (
            <Text style={styles.errorText}>Note: {extractError}</Text>
          )}

          <View style={styles.sourceInfo}>
            <Text style={styles.sourceLabel}>Source</Text>
            <Text style={styles.sourceValue}>{sourceDisplayText}</Text>
            <Text style={styles.sourceLabel}>URL</Text>
            <Text style={styles.sourceValue} numberOfLines={2}>{urlDisplayText}</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Item Title *</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter item name"
              placeholderTextColor={colors.textSecondary}
              value={extractedTitle}
              onChangeText={setExtractedTitle}
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Price</Text>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="0.00"
                placeholderTextColor={colors.textSecondary}
                value={extractedPrice}
                onChangeText={setExtractedPrice}
                keyboardType="decimal-pad"
              />
              <TextInput
                style={[styles.input, { width: 80 }]}
                placeholder="USD"
                placeholderTextColor={colors.textSecondary}
                value={extractedCurrency}
                onChangeText={setExtractedCurrency}
                autoCapitalize="characters"
                maxLength={3}
              />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Image</Text>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity 
                style={[styles.secondaryButton, { flex: 1 }]} 
                onPress={handlePickExtractedImage}
              >
                <Text style={styles.secondaryButtonText}>
                  {extractedImageUrl ? 'Change Image' : 'Pick Image'}
                </Text>
              </TouchableOpacity>
              {extractedImageUrl && (
                <TouchableOpacity 
                  style={[styles.secondaryButton, { paddingHorizontal: 16 }]} 
                  onPress={handleRemoveExtractedImage}
                >
                  <Text style={styles.secondaryButtonText}>Remove</Text>
                </TouchableOpacity>
              )}
            </View>
            {extractedImageUrl && (
              <Image 
                source={resolveImageSource(extractedImageUrl)} 
                style={styles.imagePreview}
                resizeMode="cover"
              />
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Notes</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Add any notes about this item..."
              placeholderTextColor={colors.textSecondary}
              value={extractedNotes}
              onChangeText={setExtractedNotes}
              multiline
            />
          </View>

          <TouchableOpacity
            style={[styles.button, (!extractedTitle.trim() || saving) && styles.buttonDisabled]}
            onPress={handleSaveExtractedItem}
            disabled={!extractedTitle.trim() || saving}
          >
            <Text style={styles.buttonText}>
              {saving ? 'Saving...' : 'Save to Wishlist'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => {
              setShowExtractedForm(false);
              setUrl('');
              setExtractError('');
              setExtractedTitle('');
              setExtractedImageUrl('');
              setExtractedPrice('');
              setExtractedCurrency('USD');
              setExtractedNotes('');
              setOriginalUrl('');
              setSourceDomain('');
            }}
          >
            <Text style={styles.secondaryButtonText}>Try Another URL</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View>
        <View style={styles.section}>
          <Text style={styles.label}>Item URL</Text>
          <TextInput
            style={styles.input}
            placeholder="https://example.com/product"
            placeholderTextColor={colors.textSecondary}
            value={url}
            onChangeText={setUrl}
            autoCapitalize="none"
            keyboardType="url"
            autoCorrect={false}
          />
        </View>

        <TouchableOpacity
          style={[styles.button, (!url.trim() || extracting) && styles.buttonDisabled]}
          onPress={handleExtractItem}
          disabled={!url.trim() || extracting}
        >
          <Text style={styles.buttonText}>Fetch Item</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderManualTab = () => {
    return (
      <View>
        <View style={styles.section}>
          <Text style={styles.label}>Item Title *</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter item name"
            placeholderTextColor={colors.textSecondary}
            value={manualTitle}
            onChangeText={setManualTitle}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Price</Text>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="0.00"
              placeholderTextColor={colors.textSecondary}
              value={manualPrice}
              onChangeText={setManualPrice}
              keyboardType="decimal-pad"
            />
            <TextInput
              style={[styles.input, { width: 80 }]}
              placeholder="USD"
              placeholderTextColor={colors.textSecondary}
              value={manualCurrency}
              onChangeText={setManualCurrency}
              autoCapitalize="characters"
              maxLength={3}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Image</Text>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <TouchableOpacity 
              style={[styles.secondaryButton, { flex: 1 }]} 
              onPress={handlePickImage}
            >
              <Text style={styles.secondaryButtonText}>
                {manualImageUri ? 'Change Image' : 'Pick Image'}
              </Text>
            </TouchableOpacity>
            {manualImageUri && (
              <TouchableOpacity 
                style={[styles.secondaryButton, { paddingHorizontal: 16 }]} 
                onPress={handleRemoveManualImage}
              >
                <Text style={styles.secondaryButtonText}>Remove</Text>
              </TouchableOpacity>
            )}
          </View>
          {manualImageUri && (
            <Image 
              source={resolveImageSource(manualImageUri)} 
              style={styles.imagePreview}
              resizeMode="cover"
            />
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Notes</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Add any notes about this item..."
            placeholderTextColor={colors.textSecondary}
            value={manualNotes}
            onChangeText={setManualNotes}
            multiline
          />
        </View>

        <TouchableOpacity
          style={[styles.button, (!manualTitle.trim() || saving) && styles.buttonDisabled]}
          onPress={handleSaveManualItem}
          disabled={!manualTitle.trim() || saving}
        >
          <Text style={styles.buttonText}>
            {saving ? 'Saving...' : 'Add to Wishlist'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Add Item',
          headerBackTitle: 'Back',
        }}
      />
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'url' && styles.activeTab]}
            onPress={() => setActiveTab('url')}
          >
            <Text style={[styles.tabText, activeTab === 'url' && styles.activeTabText]}>
              Paste Link
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'manual' && styles.activeTab]}
            onPress={() => setActiveTab('manual')}
          >
            <Text style={[styles.tabText, activeTab === 'manual' && styles.activeTabText]}>
              Manual Entry
            </Text>
          </TouchableOpacity>
        </View>

        {activeTab === 'url' ? renderUrlTab() : renderManualTab()}
      </ScrollView>
    </>
  );
}
