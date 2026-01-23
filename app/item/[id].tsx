
import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
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
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPriceHistoryModal, setShowPriceHistoryModal] = useState(false);
  const [saving, setSaving] = useState(false);

  // Edit form state
  const [editedTitle, setEditedTitle] = useState('');
  const [editedPrice, setEditedPrice] = useState('');
  const [editedCurrency, setEditedCurrency] = useState('USD');
  const [editedNotes, setEditedNotes] = useState('');
  const [editedImageUrl, setEditedImageUrl] = useState('');

  useEffect(() => {
    console.log('ItemDetailScreen: Component mounted, item ID:', id);
    if (id) {
      fetchItem();
    }
  }, [id]);

  const fetchItem = async () => {
    console.log('ItemDetailScreen: Fetching item details');
    try {
      setLoading(true);
      const { authenticatedGet } = await import('@/utils/api');
      const data = await authenticatedGet<ItemDetail>(`/api/items/${id}`);
      console.log('ItemDetailScreen: Fetched item:', data.title);
      setItem(data);
    } catch (error) {
      console.error('ItemDetailScreen: Error fetching item:', error);
      Alert.alert('Error', 'Failed to load item details');
    } finally {
      setLoading(false);
    }
  };

  const handleEditPress = () => {
    if (!item) return;
    console.log('ItemDetailScreen: Opening edit modal');
    setEditedTitle(item.title);
    setEditedPrice(item.currentPrice || '');
    setEditedCurrency(item.currency);
    setEditedNotes(item.notes || '');
    setEditedImageUrl(item.imageUrl || '');
    setShowEditModal(true);
  };

  const handlePickImage = async () => {
    console.log('ItemDetailScreen: Picking image');
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const imageUri = result.assets[0].uri;
        console.log('ItemDetailScreen: Image selected:', imageUri);
        setEditedImageUrl(imageUri);
      }
    } catch (error) {
      console.error('ItemDetailScreen: Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const handleSaveEdit = async () => {
    console.log('ItemDetailScreen: Saving item changes');
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
      const { authenticatedPut } = await import('@/utils/api');
      const updatedItem = await authenticatedPut<ItemDetail>(`/api/items/${id}`, {
        title: editedTitle,
        currentPrice: newPrice !== null ? newPrice.toString() : null,
        notes: editedNotes,
        imageUrl: editedImageUrl || null,
      });
      console.log('ItemDetailScreen: Item updated successfully');
      setItem(updatedItem);
      setShowEditModal(false);
      Alert.alert('Success', 'Item updated successfully');
    } catch (error) {
      console.error('ItemDetailScreen: Error updating item:', error);
      Alert.alert('Error', 'Failed to update item');
    } finally {
      setSaving(false);
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
    console.log('ItemDetailScreen: Opening price history modal');
    setShowPriceHistoryModal(true);
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

            {/* Current Price */}
            <View style={styles.priceCard}>
              <Text style={styles.priceLabel}>Current Price</Text>
              <Text style={styles.currentPrice}>{priceText}</Text>
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
            </View>

            {/* View Original Product Button */}
            {item.originalUrl && (
              <TouchableOpacity style={styles.linkButton} onPress={handleOpenUrl}>
                <IconSymbol
                  ios_icon_name="safari"
                  android_material_icon_name="open-in-new"
                  size={20}
                  color={colors.primary}
                />
                <Text style={styles.linkButtonText}>View Original Product</Text>
              </TouchableOpacity>
            )}
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
                <TouchableOpacity style={styles.changeImageButton} onPress={handlePickImage}>
                  <IconSymbol
                    ios_icon_name="camera"
                    android_material_icon_name="camera"
                    size={16}
                    color="#FFFFFF"
                  />
                  <Text style={styles.changeImageButtonText}>Change Image</Text>
                </TouchableOpacity>
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
    marginBottom: 16,
  },
  priceLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 4,
  },
  currentPrice: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.text,
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
});
