
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { useAuth } from '@/contexts/AuthContext';

interface ItemDetail {
  id: string;
  name: string;
  imageUrl: string;
  currentPrice: number;
  currency: string;
  sourceUrl: string;
  notes: string;
  priceHistory: Array<{
    price: number;
    recordedAt: string;
  }>;
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
  const [editing, setEditing] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [editedPrice, setEditedPrice] = useState('');
  const [editedNotes, setEditedNotes] = useState('');

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
      const { apiGet } = await import('@/utils/api');
      const data = await apiGet<ItemDetail>(`/api/items/${id}`);
      console.log('ItemDetailScreen: Fetched item:', data.name);
      setItem(data);
      setEditedName(data.name);
      setEditedPrice(data.currentPrice.toString());
      setEditedNotes(data.notes || '');
    } catch (error) {
      console.error('ItemDetailScreen: Error fetching item:', error);
      Alert.alert('Error', 'Failed to load item details');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    console.log('ItemDetailScreen: Saving item changes');
    if (!editedName.trim()) {
      Alert.alert('Error', 'Item name cannot be empty');
      return;
    }

    const newPrice = parseFloat(editedPrice);
    if (isNaN(newPrice) || newPrice < 0) {
      Alert.alert('Error', 'Please enter a valid price');
      return;
    }

    try {
      const { authenticatedPut } = await import('@/utils/api');
      const updatedItem = await authenticatedPut<ItemDetail>(`/api/items/${id}`, {
        name: editedName,
        currentPrice: newPrice.toString(),
        notes: editedNotes,
      });
      console.log('ItemDetailScreen: Item updated successfully');
      setItem(updatedItem);
      setEditing(false);
    } catch (error) {
      console.error('ItemDetailScreen: Error updating item:', error);
      Alert.alert('Error', 'Failed to update item');
    }
  };

  const handleOpenUrl = async () => {
    if (item?.sourceUrl) {
      console.log('ItemDetailScreen: Opening source URL:', item.sourceUrl);
      try {
        await Linking.openURL(item.sourceUrl);
      } catch (error) {
        console.error('ItemDetailScreen: Error opening URL:', error);
        Alert.alert('Error', 'Failed to open link');
      }
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
            <Text style={styles.loadingText}>Loading...</Text>
          </View>
        </SafeAreaView>
      </>
    );
  }

  const priceText = `${item.currency} ${item.currentPrice.toFixed(2)}`;
  const lowestPrice = item.priceHistory.length > 0
    ? Math.min(...item.priceHistory.map(h => h.price))
    : item.currentPrice;
  const lowestPriceText = `${item.currency} ${lowestPrice.toFixed(2)}`;

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: editing ? 'Edit Item' : 'Item Details',
          headerBackTitle: 'Back',
          headerRight: () => (
            <TouchableOpacity onPress={() => {
              if (editing) {
                handleSave();
              } else {
                setEditing(true);
              }
            }}>
              <Text style={styles.headerButton}>
                {editing ? 'Save' : 'Edit'}
              </Text>
            </TouchableOpacity>
          ),
        }}
      />
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          <Image
            source={resolveImageSource(item.imageUrl)}
            style={styles.mainImage}
            resizeMode="cover"
          />

          {editing ? (
            <View style={styles.editSection}>
              <Text style={styles.label}>Item Name</Text>
              <TextInput
                style={styles.input}
                value={editedName}
                onChangeText={setEditedName}
                placeholder="Item name"
                placeholderTextColor={colors.textSecondary}
              />

              <Text style={styles.label}>Price</Text>
              <TextInput
                style={styles.input}
                value={editedPrice}
                onChangeText={setEditedPrice}
                placeholder="0.00"
                placeholderTextColor={colors.textSecondary}
                keyboardType="decimal-pad"
              />

              <Text style={styles.label}>Notes</Text>
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
          ) : (
            <>
              <View style={styles.infoSection}>
                <Text style={styles.itemName}>{item.name}</Text>
                
                <View style={styles.priceCard}>
                  <Text style={styles.priceLabel}>Current Price</Text>
                  <Text style={styles.currentPrice}>{priceText}</Text>
                </View>

                {item.priceHistory.length > 0 && (
                  <View style={styles.priceHistoryCard}>
                    <View style={styles.priceHistoryHeader}>
                      <IconSymbol
                        ios_icon_name="chart.line.downtrend.xyaxis"
                        android_material_icon_name="trending-down"
                        size={20}
                        color={colors.secondary}
                      />
                      <Text style={styles.priceHistoryTitle}>Price History</Text>
                    </View>
                    <View style={styles.lowestPriceRow}>
                      <Text style={styles.lowestPriceLabel}>Lowest Price:</Text>
                      <Text style={styles.lowestPrice}>{lowestPriceText}</Text>
                    </View>
                    <View style={styles.historyList}>
                      {item.priceHistory.slice(0, 5).map((history, index) => {
                        const historyPriceText = `${item.currency} ${history.price.toFixed(2)}`;
                        const dateText = new Date(history.recordedAt).toLocaleDateString();
                        return (
                          <View key={index} style={styles.historyItem}>
                            <Text style={styles.historyPrice}>{historyPriceText}</Text>
                            <Text style={styles.historyDate}>{dateText}</Text>
                          </View>
                        );
                      })}
                    </View>
                  </View>
                )}

                {item.notes && (
                  <View style={styles.notesCard}>
                    <Text style={styles.notesLabel}>Notes</Text>
                    <Text style={styles.notesText}>{item.notes}</Text>
                  </View>
                )}

                <TouchableOpacity style={styles.linkButton} onPress={handleOpenUrl}>
                  <IconSymbol
                    ios_icon_name="link"
                    android_material_icon_name="link"
                    size={20}
                    color="#FFFFFF"
                  />
                  <Text style={styles.linkButtonText}>View Original Product</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
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
  },
  loadingText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  headerButton: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
    marginRight: 16,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  mainImage: {
    width: '100%',
    height: 300,
    backgroundColor: colors.backgroundAlt,
  },
  infoSection: {
    padding: 20,
  },
  itemName: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 20,
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
  priceHistoryCard: {
    backgroundColor: colors.card,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
  },
  priceHistoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  priceHistoryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  lowestPriceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  lowestPriceLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  lowestPrice: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.secondary,
  },
  historyList: {
    gap: 8,
  },
  historyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  historyPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  historyDate: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  notesCard: {
    backgroundColor: colors.card,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
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
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  linkButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  editSection: {
    padding: 20,
  },
  label: {
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
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  notesInput: {
    height: 100,
    textAlignVertical: 'top',
  },
});
