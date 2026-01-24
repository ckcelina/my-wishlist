
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
import { BACKEND_URL, authenticatedPost } from '@/utils/api';

interface ImportedItem {
  tempId: string;
  title: string;
  imageUrl: string | null;
  price: number | null;
  currency: string | null;
  productUrl: string;
  sourceDomain?: string;
  duplicateGroupId?: string;
  status?: 'new' | 'duplicate' | 'unavailable';
}

interface Wishlist {
  id: string;
  name: string;
}

interface DuplicateGroup {
  groupId: string;
  members: string[];
  confidence: number;
  canonicalTitle: string;
  reason: string;
}

type OrganizeMode = 'merge' | 'create' | 'split';
type GroupByOption = 'store' | 'category' | 'person' | 'occasion' | 'price_range';

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
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [organizeMode, setOrganizeMode] = useState<OrganizeMode>('create');
  const [newWishlistName, setNewWishlistName] = useState('');
  const [selectedWishlistId, setSelectedWishlistId] = useState('');
  const [wishlists, setWishlists] = useState<Wishlist[]>([]);
  const [loading, setLoading] = useState(false);
  const [showWishlistPicker, setShowWishlistPicker] = useState(false);
  const [duplicateGroups, setDuplicateGroups] = useState<DuplicateGroup[]>([]);
  const [findingDuplicates, setFindingDuplicates] = useState(false);
  const [showItemDetails, setShowItemDetails] = useState(false);
  const [selectedItemForEdit, setSelectedItemForEdit] = useState<ImportedItem | null>(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [showAutoGroupOptions, setShowAutoGroupOptions] = useState(false);
  const [autoGrouping, setAutoGrouping] = useState(false);

  useEffect(() => {
    if (itemsParam && typeof itemsParam === 'string') {
      try {
        const parsedItems = JSON.parse(itemsParam);
        // Add tempId and sourceDomain to each item
        const itemsWithIds = parsedItems.map((item: any, index: number) => {
          const tempId = `temp-${Date.now()}-${index}`;
          let sourceDomain = '';
          try {
            sourceDomain = new URL(item.productUrl).hostname.replace('www.', '');
          } catch (e) {
            console.error('[ImportPreview] Invalid URL:', item.productUrl);
          }
          return {
            ...item,
            tempId,
            sourceDomain,
            status: 'new' as const,
          };
        });
        setItems(itemsWithIds);
        const allIds = new Set(itemsWithIds.map((item: ImportedItem) => item.tempId));
        setSelectedItems(allIds);
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
      console.log('[ImportPreview] Fetching wishlists from:', `${BACKEND_URL}/api/wishlists`);
      const response = await fetch(`${BACKEND_URL}/api/wishlists`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

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

  const toggleItemSelection = (tempId: string) => {
    console.log('[ImportPreview] User toggled item selection:', tempId);
    const newSelected = new Set(selectedItems);
    if (newSelected.has(tempId)) {
      newSelected.delete(tempId);
    } else {
      newSelected.add(tempId);
    }
    setSelectedItems(newSelected);
  };

  const handleFindDuplicates = async () => {
    console.log('[ImportPreview] Finding duplicates with AI');
    setFindingDuplicates(true);

    try {
      const itemsForDetection = items.map(item => ({
        tempId: item.tempId,
        title: item.title,
        imageUrl: item.imageUrl || undefined,
        productUrl: item.productUrl,
        sourceDomain: item.sourceDomain || undefined,
      }));

      console.log('[ImportPreview] Sending items to duplicate detection:', itemsForDetection.length);
      const response = await authenticatedPost<{ groups: DuplicateGroup[] }>(
        '/api/detect-duplicates',
        { items: itemsForDetection }
      );

      console.log('[ImportPreview] Found duplicate groups:', response.groups.length);
      setDuplicateGroups(response.groups);

      // Update items with duplicate status
      const updatedItems = items.map(item => {
        const group = response.groups.find(g => g.members.includes(item.tempId));
        if (group) {
          return {
            ...item,
            duplicateGroupId: group.groupId,
            status: 'duplicate' as const,
          };
        }
        return item;
      });
      setItems(updatedItems);

      if (response.groups.length > 0) {
        Alert.alert(
          'Duplicates Found',
          `Found ${response.groups.length} group(s) of potential duplicates. Tap on items marked as duplicates to review.`
        );
      } else {
        Alert.alert('No Duplicates', 'No duplicate items were found.');
      }
    } catch (error) {
      console.error('[ImportPreview] Error finding duplicates:', error);
      Alert.alert('Error', 'Failed to detect duplicates. Please try again.');
    } finally {
      setFindingDuplicates(false);
    }
  };

  const handleAutoGroup = async (groupBy: GroupByOption) => {
    console.log('[ImportPreview] Auto-grouping by:', groupBy);
    setAutoGrouping(true);

    try {
      const itemsForGrouping = items.map(item => ({
        tempId: item.tempId,
        title: item.title,
        sourceDomain: item.sourceDomain || '',
        price: item.price || 0,
        currency: item.currency || 'USD',
      }));

      console.log('[ImportPreview] Sending items for auto-grouping');
      const response = await authenticatedPost<{
        groups: Array<{ groupId: string; label: string; items: string[] }>;
      }>('/api/import-items/auto-group', {
        items: itemsForGrouping,
        groupBy,
      });

      console.log('[ImportPreview] Auto-grouped into:', response.groups.length, 'groups');
      
      // Show results to user
      const groupSummary = response.groups
        .map(g => `${g.label}: ${g.items.length} items`)
        .join('\n');
      
      Alert.alert(
        'Auto-Grouping Complete',
        `Items grouped into ${response.groups.length} categories:\n\n${groupSummary}\n\nYou can now create separate wishlists for each group.`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('[ImportPreview] Error auto-grouping:', error);
      Alert.alert('Error', 'Failed to auto-group items. Please try again.');
    } finally {
      setAutoGrouping(false);
      setShowAutoGroupOptions(false);
    }
  };

  const handleEditItem = (item: ImportedItem) => {
    console.log('[ImportPreview] Opening item details for:', item.title);
    setSelectedItemForEdit(item);
    setShowItemDetails(true);
  };

  const handleSaveItemEdit = async (updatedItem: ImportedItem) => {
    console.log('[ImportPreview] Saving item edits:', updatedItem.tempId);
    
    try {
      await authenticatedPost('/api/import-items/update', {
        tempId: updatedItem.tempId,
        title: updatedItem.title,
        imageUrl: updatedItem.imageUrl,
        productUrl: updatedItem.productUrl,
        price: updatedItem.price,
        currency: updatedItem.currency,
      });

      // Update local state
      const updatedItems = items.map(item =>
        item.tempId === updatedItem.tempId ? updatedItem : item
      );
      setItems(updatedItems);
      setShowItemDetails(false);
      setSelectedItemForEdit(null);
    } catch (error) {
      console.error('[ImportPreview] Error updating item:', error);
      Alert.alert('Error', 'Failed to update item. Please try again.');
    }
  };

  const handleExcludeItem = (tempId: string) => {
    console.log('[ImportPreview] Excluding item from import:', tempId);
    const newSelected = new Set(selectedItems);
    newSelected.delete(tempId);
    setSelectedItems(newSelected);
    setShowItemDetails(false);
    setSelectedItemForEdit(null);
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
      let targetWishlistId = selectedWishlistId;

      if (organizeMode === 'create') {
        console.log('[ImportPreview] Creating new wishlist:', newWishlistName);
        const newWishlist = await authenticatedPost<{ id: string; name: string }>(
          '/api/wishlists/create',
          { name: newWishlistName.trim() }
        );
        targetWishlistId = newWishlist.id;
        console.log('[ImportPreview] New wishlist created:', targetWishlistId);
      }

      // Get selected items
      const selectedItemsArray = items.filter(item => selectedItems.has(item.tempId));
      console.log('[ImportPreview] Importing items:', selectedItemsArray.length);

      // Prepare items for batch import
      const itemsForImport = selectedItemsArray.map(item => ({
        title: item.title,
        imageUrl: item.imageUrl || undefined,
        productUrl: item.productUrl,
        price: item.price || undefined,
        currency: item.currency || 'USD',
        sourceDomain: item.sourceDomain || undefined,
      }));

      // Use batch import endpoint
      const result = await authenticatedPost<{
        success: boolean;
        createdCount: number;
        warnings: string[];
      }>('/api/import-items/batch', {
        wishlistId: targetWishlistId,
        items: itemsForImport,
      });

      console.log('[ImportPreview] Import completed:', result.createdCount, 'items created');

      if (result.warnings && result.warnings.length > 0) {
        console.warn('[ImportPreview] Import warnings:', result.warnings);
      }

      Alert.alert(
        'Success',
        `Successfully imported ${result.createdCount} item${result.createdCount !== 1 ? 's' : ''}`,
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

  const handleReportProblem = () => {
    console.log('[ImportPreview] User tapped Report a Problem button');
    router.push({
      pathname: '/report-problem',
      params: {
        context: 'import_preview',
      },
    });
  };

  const selectedWishlist = wishlists.find(w => w.id === selectedWishlistId);
  const selectedWishlistName = selectedWishlist?.name || 'Select wishlist';
  const storeNameText = storeName || 'Store';
  const selectedCountText = `${selectedItems.size} ${selectedItems.size === 1 ? 'item' : 'items'} selected`;
  const sourceDomain = items.length > 0 && items[0].sourceDomain ? items[0].sourceDomain : '';

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Import Preview',
          headerBackTitle: 'Back',
          headerRight: () => (
            <TouchableOpacity onPress={handleReportProblem} style={{ marginRight: 8 }}>
              <IconSymbol
                ios_icon_name="questionmark.circle"
                android_material_icon_name="help"
                size={24}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
          ),
        }}
      />
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          {/* Source Card */}
          <View style={styles.sourceCard}>
            <View style={styles.sourceHeader}>
              <View style={styles.sourceIcon}>
                <IconSymbol
                  ios_icon_name="bag"
                  android_material_icon_name="shopping-bag"
                  size={24}
                  color={colors.accent}
                />
              </View>
              <View style={styles.sourceInfo}>
                <Text style={styles.sourceName}>{storeNameText}</Text>
                <Text style={styles.sourceSubtitle}>
                  {sourceDomain} • {items.length} items found
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.openLinkButton}
              onPress={() => {
                // Open original wishlist URL if available
                Alert.alert('Open Link', 'This would open the original wishlist URL');
              }}
            >
              <Text style={styles.openLinkText}>Open link</Text>
              <IconSymbol
                ios_icon_name="arrow.up.right"
                android_material_icon_name="open-in-new"
                size={16}
                color={colors.accent}
              />
            </TouchableOpacity>
          </View>

          {/* Organization Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Where should these items go?</Text>
            
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

          {/* Smart Tools Row */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Smart Tools</Text>
            <View style={styles.smartToolsRow}>
              <TouchableOpacity
                style={styles.toolButton}
                onPress={() => setShowAutoGroupOptions(!showAutoGroupOptions)}
                disabled={autoGrouping}
              >
                <IconSymbol
                  ios_icon_name="wand.and.stars"
                  android_material_icon_name="auto-fix-high"
                  size={20}
                  color={colors.accent}
                />
                <Text style={styles.toolButtonText}>Auto-group</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.toolButton}
                onPress={handleFindDuplicates}
                disabled={findingDuplicates}
              >
                {findingDuplicates ? (
                  <ActivityIndicator size="small" color={colors.accent} />
                ) : (
                  <IconSymbol
                    ios_icon_name="doc.on.doc"
                    android_material_icon_name="content-copy"
                    size={20}
                    color={colors.accent}
                  />
                )}
                <Text style={styles.toolButtonText}>Find duplicates</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.toolButton, selectionMode && styles.toolButtonActive]}
                onPress={() => setSelectionMode(!selectionMode)}
              >
                <IconSymbol
                  ios_icon_name="checkmark.circle"
                  android_material_icon_name="check-circle"
                  size={20}
                  color={selectionMode ? colors.textInverse : colors.accent}
                />
                <Text style={[styles.toolButtonText, selectionMode && styles.toolButtonTextActive]}>
                  Select
                </Text>
              </TouchableOpacity>
            </View>

            {/* Auto-group options */}
            {showAutoGroupOptions && (
              <View style={styles.autoGroupOptions}>
                <Text style={styles.autoGroupTitle}>Group by:</Text>
                <View style={styles.autoGroupChips}>
                  <TouchableOpacity
                    style={styles.autoGroupChip}
                    onPress={() => handleAutoGroup('store')}
                    disabled={autoGrouping}
                  >
                    <Text style={styles.autoGroupChipText}>By Store</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.autoGroupChip}
                    onPress={() => handleAutoGroup('category')}
                    disabled={autoGrouping}
                  >
                    <Text style={styles.autoGroupChipText}>By Category</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.autoGroupChip}
                    onPress={() => handleAutoGroup('person')}
                    disabled={autoGrouping}
                  >
                    <Text style={styles.autoGroupChipText}>By Person</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.autoGroupChip}
                    onPress={() => handleAutoGroup('occasion')}
                    disabled={autoGrouping}
                  >
                    <Text style={styles.autoGroupChipText}>By Occasion</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.autoGroupChip}
                    onPress={() => handleAutoGroup('price_range')}
                    disabled={autoGrouping}
                  >
                    <Text style={styles.autoGroupChipText}>By Price Range</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>

          {/* Items List */}
          <View style={styles.section}>
            <View style={styles.itemsHeader}>
              <Text style={styles.sectionTitle}>Items</Text>
              <Text style={styles.selectedCount}>{selectedCountText}</Text>
            </View>

            {items.map((item) => {
              const isSelected = selectedItems.has(item.tempId);
              const priceDisplay = formatPrice(item.price, item.currency);
              const showCheckbox = selectionMode || organizeMode === 'split';
              const isDuplicate = item.status === 'duplicate';

              return (
                <React.Fragment key={item.tempId}>
                  <TouchableOpacity
                    style={[styles.itemCard, isSelected && styles.itemCardSelected]}
                    onPress={() => {
                      if (showCheckbox) {
                        toggleItemSelection(item.tempId);
                      } else {
                        handleEditItem(item);
                      }
                    }}
                    activeOpacity={0.7}
                  >
                    {showCheckbox && (
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
                    )}

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
                      <View style={styles.itemMeta}>
                        <Text style={styles.itemPrice}>{priceDisplay}</Text>
                        {item.sourceDomain && (
                          <View style={styles.storeTag}>
                            <Text style={styles.storeTagText}>{item.sourceDomain}</Text>
                          </View>
                        )}
                      </View>
                      {isDuplicate && (
                        <View style={styles.statusChip}>
                          <Text style={styles.statusChipText}>Possible duplicate</Text>
                        </View>
                      )}
                      {item.status === 'unavailable' && (
                        <View style={[styles.statusChip, styles.statusChipWarning]}>
                          <Text style={styles.statusChipText}>Unavailable in your location</Text>
                        </View>
                      )}
                    </View>

                    <IconSymbol
                      ios_icon_name="chevron.right"
                      android_material_icon_name="chevron-right"
                      size={20}
                      color={colors.textTertiary}
                    />
                  </TouchableOpacity>
                </React.Fragment>
              );
            })}
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity style={styles.reportLink} onPress={handleReportProblem}>
            <IconSymbol
              ios_icon_name="exclamationmark.triangle"
              android_material_icon_name="report"
              size={16}
              color={colors.textSecondary}
            />
            <Text style={styles.reportLinkText}>Report a Problem</Text>
          </TouchableOpacity>

          <View style={styles.footerButtons}>
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

        {/* Item Details Bottom Sheet */}
        <Modal
          visible={showItemDetails}
          transparent
          animationType="slide"
          onRequestClose={() => setShowItemDetails(false)}
        >
          <Pressable style={styles.modalOverlay} onPress={() => setShowItemDetails(false)}>
            <Pressable style={styles.bottomSheet} onPress={(e) => e.stopPropagation()}>
              <View style={styles.bottomSheetHandle} />
              <ScrollView style={styles.bottomSheetContent}>
                {selectedItemForEdit && (
                  <>
                    <Text style={styles.bottomSheetTitle}>Item Details</Text>

                    {selectedItemForEdit.imageUrl && (
                      <Image
                        source={resolveImageSource(selectedItemForEdit.imageUrl)}
                        style={styles.detailImage}
                        resizeMode="contain"
                      />
                    )}

                    <Text style={styles.detailLabel}>Title</Text>
                    <TextInput
                      style={styles.detailInput}
                      value={selectedItemForEdit.title}
                      onChangeText={(text) =>
                        setSelectedItemForEdit({ ...selectedItemForEdit, title: text })
                      }
                      multiline
                    />

                    <Text style={styles.detailLabel}>Product Link</Text>
                    <View style={styles.linkPreview}>
                      <Text style={styles.linkText} numberOfLines={1}>
                        {selectedItemForEdit.productUrl}
                      </Text>
                      <TouchableOpacity
                        onPress={() => {
                          // Open URL in browser
                          Alert.alert('Open Link', 'This would open the product URL');
                        }}
                      >
                        <Text style={styles.linkButton}>Open</Text>
                      </TouchableOpacity>
                    </View>

                    <View style={styles.priceRow}>
                      <View style={styles.priceField}>
                        <Text style={styles.detailLabel}>Price</Text>
                        <TextInput
                          style={styles.detailInput}
                          value={selectedItemForEdit.price?.toString() || ''}
                          onChangeText={(text) =>
                            setSelectedItemForEdit({
                              ...selectedItemForEdit,
                              price: parseFloat(text) || null,
                            })
                          }
                          keyboardType="decimal-pad"
                        />
                      </View>
                      <View style={styles.currencyField}>
                        <Text style={styles.detailLabel}>Currency</Text>
                        <TextInput
                          style={styles.detailInput}
                          value={selectedItemForEdit.currency || 'USD'}
                          onChangeText={(text) =>
                            setSelectedItemForEdit({ ...selectedItemForEdit, currency: text })
                          }
                        />
                      </View>
                    </View>

                    {selectedItemForEdit.duplicateGroupId && (
                      <View style={styles.duplicateSection}>
                        <Text style={styles.detailLabel}>Duplicate Suggestions</Text>
                        <View style={styles.duplicateWarning}>
                          <IconSymbol
                            ios_icon_name="exclamationmark.triangle"
                            android_material_icon_name="warning"
                            size={20}
                            color={colors.warning}
                          />
                          <Text style={styles.duplicateWarningText}>
                            This item may be a duplicate
                          </Text>
                        </View>
                      </View>
                    )}

                    <View style={styles.bottomSheetActions}>
                      <TouchableOpacity
                        style={styles.excludeButton}
                        onPress={() => handleExcludeItem(selectedItemForEdit.tempId)}
                      >
                        <Text style={styles.excludeButtonText}>Exclude from import</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.saveButton}
                        onPress={() => handleSaveItemEdit(selectedItemForEdit)}
                      >
                        <Text style={styles.saveButtonText}>Save changes</Text>
                      </TouchableOpacity>
                    </View>
                  </>
                )}
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
  sourceCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sourceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  sourceIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  sourceInfo: {
    flex: 1,
  },
  sourceName: {
    ...typography.titleMedium,
    marginBottom: spacing.xs,
  },
  sourceSubtitle: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  openLinkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    gap: spacing.xs,
  },
  openLinkText: {
    ...typography.bodyMedium,
    color: colors.accent,
    fontWeight: '500',
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    ...typography.titleSmall,
    marginBottom: spacing.md,
  },
  smartToolsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  toolButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderRadius: 20,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  toolButtonActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  toolButtonText: {
    ...typography.bodySmall,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  toolButtonTextActive: {
    color: colors.textInverse,
  },
  autoGroupOptions: {
    marginTop: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  autoGroupTitle: {
    ...typography.bodyMedium,
    fontWeight: '500',
    marginBottom: spacing.sm,
  },
  autoGroupChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  autoGroupChip: {
    backgroundColor: colors.accentLight,
    borderRadius: 16,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  autoGroupChipText: {
    ...typography.bodySmall,
    color: colors.accent,
    fontWeight: '500',
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
  itemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  itemPrice: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  storeTag: {
    backgroundColor: colors.background,
    borderRadius: 4,
    paddingVertical: 2,
    paddingHorizontal: spacing.xs,
  },
  storeTagText: {
    ...typography.bodySmall,
    fontSize: 10,
    color: colors.textTertiary,
  },
  statusChip: {
    backgroundColor: colors.warningLight,
    borderRadius: 4,
    paddingVertical: 2,
    paddingHorizontal: spacing.xs,
    alignSelf: 'flex-start',
  },
  statusChipWarning: {
    backgroundColor: colors.errorLight,
  },
  statusChipText: {
    ...typography.bodySmall,
    fontSize: 10,
    color: colors.warning,
    fontWeight: '500',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.md,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  reportLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xs,
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  reportLinkText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  footerButtons: {
    flexDirection: 'row',
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
  bottomSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    marginTop: 'auto',
  },
  bottomSheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  bottomSheetContent: {
    padding: spacing.lg,
  },
  bottomSheetTitle: {
    ...typography.titleLarge,
    marginBottom: spacing.lg,
  },
  detailImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    backgroundColor: colors.background,
    marginBottom: spacing.lg,
  },
  detailLabel: {
    ...typography.labelMedium,
    marginBottom: spacing.xs,
    color: colors.textSecondary,
  },
  detailInput: {
    ...inputStyles.base,
    marginBottom: spacing.md,
  },
  linkPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: spacing.sm,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  linkText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    flex: 1,
  },
  linkButton: {
    ...typography.bodySmall,
    color: colors.accent,
    fontWeight: '500',
  },
  priceRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  priceField: {
    flex: 2,
  },
  currencyField: {
    flex: 1,
  },
  duplicateSection: {
    marginTop: spacing.md,
  },
  duplicateWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.warningLight,
    borderRadius: 8,
    padding: spacing.sm,
    gap: spacing.sm,
  },
  duplicateWarningText: {
    ...typography.bodySmall,
    color: colors.warning,
    flex: 1,
  },
  bottomSheetActions: {
    marginTop: spacing.xl,
    gap: spacing.sm,
  },
  excludeButton: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.error,
  },
  excludeButtonText: {
    ...typography.buttonMedium,
    color: colors.error,
  },
  saveButton: {
    backgroundColor: colors.accent,
    borderRadius: 12,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  saveButtonText: {
    ...typography.buttonMedium,
    color: colors.textInverse,
  },
});
