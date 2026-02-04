
import { useAppTheme } from '@/contexts/ThemeContext';
import { ConfirmDialog } from '@/components/design-system/ConfirmDialog';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  RefreshControl,
  Platform,
  Modal,
  Pressable,
  Switch,
  ScrollView,
} from 'react-native';
import { Card } from '@/components/design-system/Card';
import { Logo } from '@/components/Logo';
import { supabase } from '@/lib/supabase';
import { ErrorState } from '@/components/design-system/ErrorState';
import { EmptyState } from '@/components/design-system/EmptyState';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useRouter } from 'expo-router';
import { dedupeById } from '@/utils/deduplication';
import { createColors, createTypography, spacing } from '@/styles/designSystem';
import { OfflineNotice } from '@/components/design-system/OfflineNotice';
import { ListItemSkeleton } from '@/components/design-system/LoadingSkeleton';
import { IconSymbol } from '@/components/IconSymbol';
import { getCachedData, setCachedData } from '@/utils/cache';
import { Button } from '@/components/design-system/Button';

interface List {
  id: string;
  name: string;
  listType: 'WISHLIST' | 'TODO';
  isDefault: boolean;
  itemCount: number;
  completedCount: number;
  smartPlanEnabled: boolean;
  smartPlanTemplate: string | null;
  createdAt: string;
  updatedAt: string;
}

const TAB_BAR_HEIGHT = 80;

const SMART_PLAN_TEMPLATES = [
  { id: 'birthday', name: 'Birthday Party', icon: 'cake' },
  { id: 'wedding', name: 'Wedding', icon: 'favorite' },
  { id: 'vacation', name: 'Vacation', icon: 'flight' },
  { id: 'home', name: 'Home Improvement', icon: 'home' },
  { id: 'custom', name: 'Custom Plan', icon: 'edit' },
];

/**
 * Wishlists Screen - Main home screen showing all user wishlists
 * This is the primary landing page after login
 */
export default function WishlistsScreen() {
  const { user, authLoading } = useAuth();
  const router = useRouter();
  const { isOnline } = useNetworkStatus();
  const { theme } = useAppTheme();
  const insets = useSafeAreaInsets();
  
  const colors = useMemo(() => createColors(theme), [theme]);
  const typography = useMemo(() => createTypography(theme), [theme]);

  const [lists, setLists] = useState<List[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showSmartPlanModal, setShowSmartPlanModal] = useState(false);
  
  const [newListName, setNewListName] = useState('');
  const [newListType, setNewListType] = useState<'WISHLIST' | 'TODO'>('WISHLIST');
  const [selectedList, setSelectedList] = useState<List | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [enableSmartPlan, setEnableSmartPlan] = useState(false);

  const isMounted = useRef(true);

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  const fetchLists = useCallback(async () => {
    if (!user?.id) {
      console.log('[WishlistsScreen] No user, skipping fetch');
      setLoading(false);
      return;
    }

    console.log('[WishlistsScreen] Fetching wishlists for user:', user.id);
    
    try {
      setError(null);
      
      // Fetch from Supabase
      const { data, error: fetchError } = await supabase
        .from('wishlists')
        .select(`
          id,
          name,
          is_default,
          created_at,
          updated_at
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (fetchError) {
        throw fetchError;
      }

      // Get item counts for each wishlist
      const listsWithCounts = await Promise.all(
        (data || []).map(async (list) => {
          const { count } = await supabase
            .from('wishlist_items')
            .select('*', { count: 'exact', head: true })
            .eq('wishlist_id', list.id);

          return {
            id: list.id,
            name: list.name,
            listType: 'WISHLIST' as const,
            isDefault: list.is_default || false,
            itemCount: count || 0,
            completedCount: 0,
            smartPlanEnabled: false,
            smartPlanTemplate: null,
            createdAt: list.created_at,
            updatedAt: list.updated_at,
          };
        })
      );

      const dedupedLists = dedupeById(listsWithCounts);
      
      if (isMounted.current) {
        setLists(dedupedLists);
        console.log('[WishlistsScreen] Loaded', dedupedLists.length, 'wishlists');
        
        // Cache the data
        await setCachedData('wishlists', dedupedLists);
      }
    } catch (err: any) {
      console.error('[WishlistsScreen] Error fetching lists:', err);
      
      if (isMounted.current) {
        setError(err.message || 'Failed to load wishlists');
        
        // Try to load from cache
        const cached = await getCachedData<List[]>('wishlists');
        if (cached) {
          console.log('[WishlistsScreen] Loaded from cache');
          setLists(cached);
        }
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [user]);

  useEffect(() => {
    if (user && !authLoading) {
      fetchLists();
    }
  }, [user, authLoading, fetchLists]);

  const handleCreateList = async () => {
    if (!newListName.trim()) {
      Alert.alert('Error', 'Please enter a list name');
      return;
    }

    if (!user?.id) {
      Alert.alert('Error', 'You must be signed in to create a list');
      return;
    }

    console.log('[WishlistsScreen] Creating new wishlist:', newListName);

    try {
      const { data, error } = await supabase
        .from('wishlists')
        .insert({
          user_id: user.id,
          name: newListName.trim(),
          is_default: lists.length === 0, // First list is default
        })
        .select()
        .single();

      if (error) throw error;

      console.log('[WishlistsScreen] Wishlist created:', data.id);
      
      setShowCreateModal(false);
      setNewListName('');
      setNewListType('WISHLIST');
      setEnableSmartPlan(false);
      setSelectedTemplate(null);
      
      await fetchLists();
    } catch (err: any) {
      console.error('[WishlistsScreen] Error creating list:', err);
      Alert.alert('Error', err.message || 'Failed to create list');
    }
  };

  const handleRenameList = async () => {
    if (!newListName.trim() || !selectedList) {
      Alert.alert('Error', 'Please enter a list name');
      return;
    }

    console.log('[WishlistsScreen] Renaming wishlist:', selectedList.id);

    try {
      const { error } = await supabase
        .from('wishlists')
        .update({ name: newListName.trim() })
        .eq('id', selectedList.id);

      if (error) throw error;

      console.log('[WishlistsScreen] Wishlist renamed');
      
      setShowRenameModal(false);
      setNewListName('');
      setSelectedList(null);
      
      await fetchLists();
    } catch (err: any) {
      console.error('[WishlistsScreen] Error renaming list:', err);
      Alert.alert('Error', err.message || 'Failed to rename list');
    }
  };

  const handleMakeDefault = async () => {
    if (!selectedList) return;

    console.log('[WishlistsScreen] Setting default wishlist:', selectedList.id);

    try {
      // Remove default from all lists
      await supabase
        .from('wishlists')
        .update({ is_default: false })
        .eq('user_id', user?.id);

      // Set new default
      const { error } = await supabase
        .from('wishlists')
        .update({ is_default: true })
        .eq('id', selectedList.id);

      if (error) throw error;

      console.log('[WishlistsScreen] Default wishlist updated');
      
      await fetchLists();
    } catch (err: any) {
      console.error('[WishlistsScreen] Error setting default:', err);
      Alert.alert('Error', err.message || 'Failed to set default list');
    }
  };

  const handleDeleteList = async () => {
    if (!selectedList) return;

    console.log('[WishlistsScreen] Deleting wishlist:', selectedList.id);

    try {
      // Delete all items first
      await supabase
        .from('wishlist_items')
        .delete()
        .eq('wishlist_id', selectedList.id);

      // Delete the wishlist
      const { error } = await supabase
        .from('wishlists')
        .delete()
        .eq('id', selectedList.id);

      if (error) throw error;

      console.log('[WishlistsScreen] Wishlist deleted');
      
      setShowDeleteModal(false);
      setSelectedList(null);
      
      await fetchLists();
    } catch (err: any) {
      console.error('[WishlistsScreen] Error deleting list:', err);
      Alert.alert('Error', err.message || 'Failed to delete list');
    }
  };

  const handleListPress = (list: List) => {
    console.log('[WishlistsScreen] User tapped wishlist:', list.id);
    router.push(`/wishlist/${list.id}`);
  };

  const openCreateModal = (listType: 'WISHLIST' | 'TODO') => {
    console.log('[WishlistsScreen] Opening create modal for:', listType);
    setNewListType(listType);
    setNewListName('');
    setEnableSmartPlan(false);
    setSelectedTemplate(null);
    setShowCreateModal(true);
  };

  const renderListItem = ({ item }: { item: List }) => {
    const itemCountText = `${item.itemCount} ${item.itemCount === 1 ? 'item' : 'items'}`;
    
    return (
      <TouchableOpacity
        onPress={() => handleListPress(item)}
        onLongPress={() => {
          setSelectedList(item);
          setNewListName(item.name);
          setShowRenameModal(true);
        }}
      >
        <Card style={{ marginBottom: spacing.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xs }}>
                <Text style={{ ...typography.h3, color: colors.text }}>
                  {item.name}
                </Text>
                {item.isDefault && (
                  <View style={{ backgroundColor: colors.accent + '20', paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: 4 }}>
                    <Text style={{ ...typography.caption, color: colors.accent, fontWeight: '600' }}>
                      Default
                    </Text>
                  </View>
                )}
              </View>
              <Text style={{ ...typography.body, color: colors.textSecondary }}>
                {itemCountText}
              </Text>
            </View>
            <IconSymbol
              ios_icon_name="chevron.right"
              android_material_icon_name="chevron-right"
              size={24}
              color={colors.textSecondary}
            />
          </View>
        </Card>
      </TouchableOpacity>
    );
  };

  const renderHeader = () => (
    <View style={{ marginBottom: spacing.lg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md }}>
        <Logo size="small" />
        <Text style={{ ...typography.h1, color: colors.text, flex: 1, marginLeft: spacing.md }}>
          My Wishlists
        </Text>
      </View>
      
      {!isOnline && <OfflineNotice />}
      
      {error && (
        <ErrorState
          message={error}
          onRetry={fetchLists}
        />
      )}
    </View>
  );

  const renderFooter = () => (
    <View style={{ height: TAB_BAR_HEIGHT + insets.bottom + spacing.xl }} />
  );

  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    contentContainer: {
      padding: spacing.lg,
      paddingTop: Platform.OS === 'android' ? 48 : spacing.lg,
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
      marginHorizontal: spacing.lg,
      width: '85%',
      maxWidth: 400,
    },
    modalTitle: {
      ...typography.h2,
      color: colors.text,
      marginBottom: spacing.md,
    },
    input: {
      backgroundColor: colors.background,
      borderRadius: 12,
      padding: spacing.md,
      marginBottom: spacing.md,
      fontSize: 16,
      color: colors.text,
      borderWidth: 1,
      borderColor: colors.border,
    },
    modalButtons: {
      flexDirection: 'row',
      gap: spacing.md,
    },
    modalButton: {
      flex: 1,
      paddingVertical: spacing.md,
      borderRadius: 12,
      alignItems: 'center',
    },
    modalButtonCancel: {
      backgroundColor: colors.surface2,
    },
    modalButtonPrimary: {
      backgroundColor: colors.accent,
    },
    modalButtonText: {
      ...typography.body,
      fontWeight: '600',
    },
    modalButtonTextCancel: {
      color: colors.text,
    },
    modalButtonTextPrimary: {
      color: '#FFFFFF',
    },
    fab: {
      position: 'absolute',
      right: spacing.lg,
      bottom: TAB_BAR_HEIGHT + insets.bottom + spacing.md,
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: colors.accent,
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 8,
    },
  }), [colors, typography, insets]);

  if (authLoading || loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.contentContainer}>
          {renderHeader()}
          <ListItemSkeleton count={3} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <FlatList
        data={lists}
        renderItem={renderListItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.contentContainer}
        ListHeaderComponent={renderHeader}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={
          <EmptyState
            icon="list"
            title="No Wishlists Yet"
            message="Create your first wishlist to start tracking items you want"
            actionLabel="Create Wishlist"
            onAction={() => openCreateModal('WISHLIST')}
          />
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchLists();
            }}
            tintColor={colors.accent}
          />
        }
        showsVerticalScrollIndicator={false}
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={() => openCreateModal('WISHLIST')}
      >
        <IconSymbol
          ios_icon_name="plus"
          android_material_icon_name="add"
          size={28}
          color="#FFFFFF"
        />
      </TouchableOpacity>

      {/* Create Modal */}
      <Modal
        visible={showCreateModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCreateModal(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowCreateModal(false)}>
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>Create Wishlist</Text>
            <TextInput
              style={styles.input}
              value={newListName}
              onChangeText={setNewListName}
              placeholder="Wishlist name"
              placeholderTextColor={colors.textSecondary}
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => setShowCreateModal(false)}
              >
                <Text style={[styles.modalButtonText, styles.modalButtonTextCancel]}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonPrimary]}
                onPress={handleCreateList}
              >
                <Text style={[styles.modalButtonText, styles.modalButtonTextPrimary]}>
                  Create
                </Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Rename Modal */}
      <Modal
        visible={showRenameModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowRenameModal(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowRenameModal(false)}>
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>Rename Wishlist</Text>
            <TextInput
              style={styles.input}
              value={newListName}
              onChangeText={setNewListName}
              placeholder="New name"
              placeholderTextColor={colors.textSecondary}
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => setShowRenameModal(false)}
              >
                <Text style={[styles.modalButtonText, styles.modalButtonTextCancel]}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonPrimary]}
                onPress={handleRenameList}
              >
                <Text style={[styles.modalButtonText, styles.modalButtonTextPrimary]}>
                  Rename
                </Text>
              </TouchableOpacity>
            </View>
            
            {selectedList && !selectedList.isDefault && (
              <>
                <View style={{ height: 1, backgroundColor: colors.border, marginVertical: spacing.md }} />
                <Button
                  title="Make Default"
                  onPress={handleMakeDefault}
                  variant="secondary"
                  style={{ marginBottom: spacing.sm }}
                />
                <Button
                  title="Delete Wishlist"
                  onPress={() => {
                    setShowRenameModal(false);
                    setShowDeleteModal(true);
                  }}
                  variant="destructive"
                />
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      {/* Delete Confirmation Modal */}
      <ConfirmDialog
        visible={showDeleteModal}
        title="Delete Wishlist"
        message={`Are you sure you want to delete "${selectedList?.name}"? This will also delete all items in this wishlist.`}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={handleDeleteList}
        onCancel={() => setShowDeleteModal(false)}
        destructive
      />
    </SafeAreaView>
  );
}
