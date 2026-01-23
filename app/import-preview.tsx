
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
  ActivityIndicator,
  Modal,
  Pressable,
} from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconSymbol } from '@/components/IconSymbol';
import { useAuth } from '@/contexts/AuthContext';
import { colors, typography, spacing, containerStyles, inputStyles } from '@/styles/designSystem';
import Constants from 'expo-constants';

interface ImportedItem {
  title: string;
  imageUrl: string | null;
  price: number | null;
  currency: string | null;
  productUrl: string;
}

interface Wishlist {
  id: string;
  name: string;
}

type OrganizeMode = 'merge' | 'create' | 'split';

function resolveImageSource(source: string | number | ImageSourcePropType | undefined): ImageSourcePropType {
  if (!source) return { uri: '' };
  if (typeof source === 'string') return { uri: source };
  return source as ImageSourcePropType;
}

export default function ImportPreviewScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { storeName, items: itemsParam } = useLocalSearchParams();
  
  const [items, setItems] = useState<ImportedItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());
  const [organizeMode, setOrganizeMode] = useState<OrganizeMode>('create');
  const [newWishlistName, setNewWishlistName] = useState('');
  const [selectedWishlistId, setSelectedWishlistId] = useState('');
  const [wishlists, setWishlists] = useState<Wishlist[]>([]);
  const [loading, setLoading] = useState(false);
  const [showWishlistPicker, setShowWishlistPicker] = useState(false);

  useEffect(() => {
    if (itemsParam && typeof itemsParam === 'string') {
      try {
        const parsedItems = JSON.parse(itemsParam);
        setItems(parsedItems);
        const allIndices = new Set(parsedItems.map((_: any, index: number) => index));
        setSelectedItems(allIndices);
      } catch (error) {
        console.error('[ImportPreview] Error parsing items:', error);
        Alert.alert('Error', 'Failed to load items');
        router.back();
      }
    }

    if (storeName && typeof storeName === 'string') {
      const defaultName = `${storeName} Wishlist`;
      setNewWishlistName(defaultName);
    }
  }, [itemsParam, storeName]);

  useEffect(() => {
    fetchWishlists();
  }, [user]);

  const fetchWishlists = async () => {
    if (!user) {
      console.log('[ImportPreview] No user, skipping wishlist fetch');
      return;
    }

    try {
      const backendUrl = Constants.expoConfig?.extra?.backendUrl;
      const response = await fetch(`${backendUrl}/api/wishlists?userId=${user.id}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch wishlists');
      }

      const data = await response.json();
      setWishlists(data);
      
      if (data.length > 0 && !selectedWishlistId) {
        setSelectedWishlistId(data[0].id);
      }
    } catch (error) {
      console.error('[ImportPreview] Error fetching wishlists:', error);
    }
  };

  const toggleItemSelection = (index: number) => {
    console.log('[ImportPreview] User toggled item selection:', index);
    const newSelected = new Set(selectedItems);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedItems(newSelected);
  };

  const handleImport = async () => {
    if (selectedItems.size === 0) {
      Alert.alert('No Items Selected', 'Please select at least one item to import');
      return;
    }

    if (organizeMode === 'merge' && !selectedWishlistId) {
      Alert.alert('No Wishlist Selected', 'Please select a wishlist to merge into');
      return;
    }

    if (organizeMode === 'create' && !newWishlistName.trim()) {
      Alert.alert('Invalid Name', 'Please enter a name for the new wishlist');
      return;
    }

    console.log('[ImportPreview] User tapped Import Items');
    setLoading(true);

    try {
      const backendUrl = Constants.expoConfig?.extra?.backendUrl;
      let targetWishlistId = selectedWishlistId;

      if (organizeMode === 'create') {
        console.log('[ImportPreview] Creating new wishlist:', newWishlistName);
        const createResponse = await fetch(`${backendUrl}/api/wishlists`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: user?.id,
            name: newWishlistName.trim(),
            isDefault: false,
          }),
        });

        if (!createResponse.ok) {
          throw new Error('Failed to create wishlist');
        }

        const newWishlist = await createResponse.json();
        targetWishlistId = newWishlist.id;
        console.log('[ImportPreview] New wishlist created:', targetWishlistId);
      }

      const selectedItemsArray = Array.from(selectedItems).map(index => items[index]);
      console.log('[ImportPreview] Importing items:', selectedItemsArray.length);

      for (const item of selectedItemsArray) {
        const sourceDomain = new URL(item.productUrl).hostname.replace('www.', '');
        
        const itemResponse = await fetch(`${backendUrl}/api/items`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            wishlistId: targetWishlistId,
            title: item.title,
            imageUrl: item.imageUrl,
            currentPrice: item.price,
            currency: item.currency || 'USD',
            originalUrl: item.productUrl,
            sourceDomain: sourceDomain,
            userId: user?.id,
          }),
        });

        if (!itemResponse.ok) {
          console.error('[ImportPreview] Failed to import item:', item.title);
        }
      }

      console.log('[ImportPreview] Import completed successfully');
      Alert.alert(
        'Success',
        'Wishlist imported successfully',
        [
          {
            text: 'View Wishlist',
            onPress: () => {
              router.replace(`/wishlist/${targetWishlistId}`);
            },
          },
        ]
      );
    } catch (error: any) {
      console.error('[ImportPreview] Error importing items:', error);
      Alert.alert('Import Failed', error.message || 'Failed to import items. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price: number | null, currency: string | null) => {
    if (price === null) {
      return 'Price not available';
    }
    const currencySymbol = currency === 'USD' ? '$' : currency || '';
    const priceText = `${currencySymbol}${price.toFixed(2)}`;
    return priceText;
  };

  const selectedWishlist = wishlists.find(w => w.id === selectedWishlistId);
  const selectedWishlistName = selectedWishlist?.name || 'Select wishlist';
  const storeNameText = storeName || 'Store';
  const selectedCountText = `${selectedItems.size} ${selectedItems.size === 1 ? 'item' : 'items'} selected`;

  return (
    <>
      <Stack.Screen
        options={{
          title: `Import from ${storeNameText}`,
          headerBackTitle: 'Back',
        }}
      />
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>How do you want to organize these items?</Text>
            
            <TouchableOpacity
              style={[styles.radioOption, organizeMode === 'merge' && styles.radioOptionSelected]}
              onPress={() => setOrganizeMode('merge')}
              activeOpacity={0.7}
            >
              <View style={styles.radioButton}>
                {organizeMode === 'merge' && <View style={styles.radioButtonInner} />}
              </View>
              <View style={styles.radioContent}>
                <Text style={styles.radioLabel}>Merge into existing wishlist</Text>
                {organizeMode === 'merge' && (
                  <TouchableOpacity
                    style={styles.dropdownButton}
                    onPress={() => setShowWishlistPicker(true)}
                  >
                    <Text style={styles.dropdownText}>{selectedWishlistName}</Text>
                    <IconSymbol
                      ios_icon_name="arrow-drop-down"
                      android_material_icon_name="arrow-drop-down"
                      size={20}
                      color={colors.textSecondary}
                    />
                  </TouchableOpacity>
                )}
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.radioOption, organizeMode === 'create' && styles.radioOptionSelected]}
              onPress={() => setOrganizeMode('create')}
              activeOpacity={0.7}
            >
              <View style={styles.radioButton}>
                {organizeMode === 'create' && <View style={styles.radioButtonInner} />}
              </View>
              <View style={styles.radioContent}>
                <Text style={styles.radioLabel}>Create a new wishlist</Text>
                {organizeMode === 'create' && (
                  <TextInput
                    style={styles.nameInput}
                    placeholder="Wishlist name"
                    placeholderTextColor={colors.textTertiary}
                    value={newWishlistName}
                    onChangeText={setNewWishlistName}
                  />
                )}
              </View>
            </TouchableOpacity>
          </View>

          <View style={styles.section}>
            <View style={styles.itemsHeader}>
              <Text style={styles.sectionTitle}>Items</Text>
              <Text style={styles.selectedCount}>{selectedCountText}</Text>
            </View>

            {items.map((item, index) => {
              const isSelected = selectedItems.has(index);
              const priceDisplay = formatPrice(item.price, item.currency);

              return (
                <React.Fragment key={index}>
                  <TouchableOpacity
                    style={[styles.itemCard, isSelected && styles.itemCardSelected]}
                    onPress={() => toggleItemSelection(index)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.checkbox}>
                      {isSelected && (
                        <IconSymbol
                          ios_icon_name="check"
                          android_material_icon_name="check"
                          size={18}
                          color={colors.accent}
                        />
                      )}
                    </View>

                    {item.imageUrl && (
                      <Image
                        source={resolveImageSource(item.imageUrl)}
                        style={styles.itemImage}
                        resizeMode="cover"
                      />
                    )}

                    <View style={styles.itemInfo}>
                      <Text style={styles.itemTitle} numberOfLines={2}>
                        {item.title}
                      </Text>
                      <Text style={styles.itemPrice}>{priceDisplay}</Text>
                    </View>
                  </TouchableOpacity>
                </React.Fragment>
              );
            })}
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => router.back()}
            disabled={loading}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.importButton, (selectedItems.size === 0 || loading) && styles.importButtonDisabled]}
            onPress={handleImport}
            disabled={selectedItems.size === 0 || loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator size="small" color={colors.textInverse} />
            ) : (
              <Text style={styles.importButtonText}>Import Items</Text>
            )}
          </TouchableOpacity>
        </View>

        <Modal
          visible={showWishlistPicker}
          transparent
          animationType="fade"
          onRequestClose={() => setShowWishlistPicker(false)}
        >
          <Pressable style={styles.modalOverlay} onPress={() => setShowWishlistPicker(false)}>
            <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
              <Text style={styles.modalTitle}>Select Wishlist</Text>
              <ScrollView style={styles.wishlistList}>
                {wishlists.map((wishlist, index) => (
                  <React.Fragment key={index}>
                    <TouchableOpacity
                      style={[
                        styles.wishlistOption,
                        selectedWishlistId === wishlist.id && styles.wishlistOptionSelected,
                      ]}
                      onPress={() => {
                        setSelectedWishlistId(wishlist.id);
                        setShowWishlistPicker(false);
                      }}
                    >
                      <Text style={styles.wishlistOptionText}>{wishlist.name}</Text>
                      {selectedWishlistId === wishlist.id && (
                        <IconSymbol
                          ios_icon_name="check"
                          android_material_icon_name="check"
                          size={20}
                          color={colors.accent}
                        />
                      )}
                    </TouchableOpacity>
                  </React.Fragment>
                ))}
              </ScrollView>
            </Pressable>
          </Pressable>
        </Modal>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    ...containerStyles.screen,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: 100,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    ...typography.titleSmall,
    marginBottom: spacing.md,
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  radioOptionSelected: {
    borderColor: colors.accent,
    backgroundColor: colors.accentLight,
  },
  radioButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
    marginTop: 2,
  },
  radioButtonInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.accent,
  },
  radioContent: {
    flex: 1,
  },
  radioLabel: {
    ...typography.bodyLarge,
    fontWeight: '500',
    marginBottom: spacing.xs,
  },
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: spacing.sm,
    marginTop: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dropdownText: {
    ...typography.bodyMedium,
    flex: 1,
  },
  nameInput: {
    ...inputStyles.base,
    marginTop: spacing.xs,
  },
  itemsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  selectedCount: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: 12,
    marginBottom: spacing.sm,
    borderWidth: 2,
    borderColor: colors.border,
  },
  itemCardSelected: {
    borderColor: colors.accent,
    backgroundColor: colors.accentLight,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  itemImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: colors.background,
    marginRight: spacing.sm,
  },
  itemInfo: {
    flex: 1,
  },
  itemTitle: {
    ...typography.bodyMedium,
    fontWeight: '500',
    marginBottom: spacing.xs,
  },
  itemPrice: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    padding: spacing.md,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.sm,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelButtonText: {
    ...typography.buttonMedium,
    color: colors.textPrimary,
  },
  importButton: {
    flex: 2,
    backgroundColor: colors.accent,
    borderRadius: 12,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.shadowMedium,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 2,
  },
  importButtonDisabled: {
    opacity: 0.5,
  },
  importButtonText: {
    ...typography.buttonLarge,
    color: colors.textInverse,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.lg,
    width: '85%',
    maxWidth: 400,
    maxHeight: '70%',
  },
  modalTitle: {
    ...typography.titleMedium,
    marginBottom: spacing.md,
  },
  wishlistList: {
    maxHeight: 400,
  },
  wishlistOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderRadius: 8,
    marginBottom: spacing.xs,
  },
  wishlistOptionSelected: {
    backgroundColor: colors.accentLight,
  },
  wishlistOptionText: {
    ...typography.bodyLarge,
    flex: 1,
  },
});
