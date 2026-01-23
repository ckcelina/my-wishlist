
import { useAuth } from '@/contexts/AuthContext';
import React, { useState, useEffect } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
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
  Platform,
  Image,
  ImageSourcePropType,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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
    paddingBottom: 100,
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
  extractedCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  extractedTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  extractedImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 12,
    backgroundColor: colors.background,
  },
  extractedInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  extractedLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  extractedValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
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
  const [extractedItem, setExtractedItem] = useState<ExtractedItem | null>(null);
  const [extractError, setExtractError] = useState('');

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
    setExtractedItem(null);

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

      // Set extracted data even if partial
      setExtractedItem({
        title: data.title || 'Unknown Item',
        imageUrl: data.imageUrl,
        price: data.price ? String(data.price) : null,
        currency: data.currency || 'USD',
        originalUrl: url.trim(),
        sourceDomain: data.sourceDomain || '',
      });

    } catch (error: any) {
      console.error('Failed to extract item:', error);
      setExtractError(error.message || 'Failed to extract item details');
      Alert.alert('Error', 'Failed to extract item details. Please try manual entry.');
    } finally {
      setExtracting(false);
    }
  };

  const handleSaveExtractedItem = async () => {
    if (!extractedItem || !wishlistId) return;

    console.log('Saving extracted item to wishlist:', wishlistId);
    setSaving(true);

    try {
      const backendUrl = Constants.expoConfig?.extra?.backendUrl;
      const response = await fetch(`${backendUrl}/api/items`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          wishlistId,
          title: extractedItem.title,
          imageUrl: extractedItem.imageUrl,
          currentPrice: extractedItem.price ? parseFloat(extractedItem.price) : null,
          currency: extractedItem.currency,
          originalUrl: extractedItem.originalUrl,
          sourceDomain: extractedItem.sourceDomain,
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
      const backendUrl = Constants.expoConfig?.extra?.backendUrl;
      const response = await fetch(`${backendUrl}/api/items`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          wishlistId,
          title: manualTitle.trim(),
          imageUrl: manualImageUri || null,
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

    if (extractedItem) {
      const priceDisplay = extractedItem.price 
        ? `${extractedItem.currency} ${extractedItem.price}`
        : 'Price not found';
      const domainDisplay = extractedItem.sourceDomain || 'Unknown source';

      return (
        <View>
          <View style={styles.extractedCard}>
            <Text style={styles.extractedTitle}>{extractedItem.title}</Text>
            
            {extractedItem.imageUrl && (
              <Image 
                source={resolveImageSource(extractedItem.imageUrl)} 
                style={styles.extractedImage}
                resizeMode="cover"
              />
            )}
            
            <View style={styles.extractedInfo}>
              <Text style={styles.extractedLabel}>Price:</Text>
              <Text style={styles.extractedValue}>{priceDisplay}</Text>
            </View>
            
            <View style={styles.extractedInfo}>
              <Text style={styles.extractedLabel}>Source:</Text>
              <Text style={styles.extractedValue}>{domainDisplay}</Text>
            </View>

            {extractError && (
              <Text style={styles.errorText}>Note: {extractError}</Text>
            )}
          </View>

          <TouchableOpacity
            style={[styles.button, saving && styles.buttonDisabled]}
            onPress={handleSaveExtractedItem}
            disabled={saving}
          >
            <Text style={styles.buttonText}>
              {saving ? 'Saving...' : 'Add to Wishlist'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => {
              setExtractedItem(null);
              setUrl('');
              setExtractError('');
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
          <Text style={styles.buttonText}>Extract Item Details</Text>
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
          <TouchableOpacity style={styles.secondaryButton} onPress={handlePickImage}>
            <Text style={styles.secondaryButtonText}>
              {manualImageUri ? 'Change Image' : 'Pick Image'}
            </Text>
          </TouchableOpacity>
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
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'url' && styles.activeTab]}
            onPress={() => setActiveTab('url')}
          >
            <Text style={[styles.tabText, activeTab === 'url' && styles.activeTabText]}>
              From URL
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
    </SafeAreaView>
  );
}
