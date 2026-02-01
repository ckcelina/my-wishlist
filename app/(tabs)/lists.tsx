
import { Button } from '@/components/design-system/Button';
import { ConfirmDialog } from '@/components/design-system/ConfirmDialog';
import { getCachedData, setCachedData } from '@/utils/cache';
import { useAuth } from '@/contexts/AuthContext';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { ListItemSkeleton } from '@/components/design-system/LoadingSkeleton';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { createColors, createTypography, spacing } from '@/styles/designSystem';
import { supabase } from '@/lib/supabase';
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'expo-router';
import { OfflineNotice } from '@/components/design-system/OfflineNotice';
import { ErrorState } from '@/components/design-system/ErrorState';
import { Logo } from '@/components/Logo';
import { IconSymbol } from '@/components/IconSymbol';
import { Card } from '@/components/design-system/Card';
import { useAppTheme } from '@/contexts/ThemeContext';
import { dedupeById } from '@/utils/deduplication';
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
import { EmptyState } from '@/components/design-system/EmptyState';

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
  { id: 'birthday_party', name: 'Birthday Party', icon: 'cake', androidIcon: 'cake' },
  { id: 'christmas_gifts', name: 'Christmas Gifts', icon: 'gift', androidIcon: 'card-giftcard' },
  { id: 'event_planning', name: 'Event Planning', icon: 'calendar', androidIcon: 'event' },
  { id: 'trip', name: 'Trip', icon: 'airplane', androidIcon: 'flight' },
];

export default function ListsScreen() {
  const [lists, setLists] = useState<List[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [createListType, setCreateListType] = useState<'WISHLIST' | 'TODO'>('WISHLIST');
  const [renameModalVisible, setRenameModalVisible] = useState(false);
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, right: 0 });
  const [selectedList, setSelectedList] = useState<List | null>(null);
  const [newListName, setNewListName] = useState('');
  const [renameListName, setRenameListName] = useState('');
  const [setAsDefault, setSetAsDefault] = useState(false);
  const [smartPlanEnabled, setSmartPlanEnabled] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

  const { user } = useAuth();
  const router = useRouter();
  const { isConnected } = useNetworkStatus();
  const { theme } = useAppTheme();
  const insets = useSafeAreaInsets();
  
  const colors = useMemo(() => createColors(theme), [theme]);
  const typography = useMemo(() => createTypography(theme), [theme]);

  const subscriptionRef = useRef<any>(null);
  const isFetchingRef = useRef(false);
  const hasInitializedRef = useRef(false);

  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.lg,
      paddingBottom: spacing.md,
    },
    headerTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.md,
    },
    logo: {
      width: 120,
      height: 40,
    },
    title: {
      ...typography.h1,
      color: colors.textPrimary,
      marginBottom: spacing.xs,
    },
    subtitle: {
      ...typography.body,
      color: colors.textSecondary,
    },
    list: {
      flex: 1,
    },
    listContent: {
      flexGrow: 1,
      paddingHorizontal: spacing.lg,
      paddingBottom: insets.bottom + TAB_BAR_HEIGHT + spacing.xl,
    },
    listCard: {
      marginBottom: spacing.md,
    },
    listContent: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    listLeft: {
      flex: 1,
    },
    listName: {
      ...typography.h3,
      color: colors.textPrimary,
      marginBottom: spacing.xs,
    },
    listMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      flexWrap: 'wrap',
    },
    listMetaText: {
      ...typography.caption,
      color: colors.textSecondary,
    },
    listRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    typeBadge: {
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      borderRadius: 6,
    },
    wishlistBadge: {
      backgroundColor: colors.accentLight,
    },
    todoBadge: {
      backgroundColor: '#DBEAFE',
    },
    typeBadgeText: {
      fontSize: 11,
      fontWeight: '600',
    },
    wishlistBadgeText: {
      color: colors.accent,
    },
    todoBadgeText: {
      color: '#3B82F6',
    },
    defaultBadge: {
      backgroundColor: colors.accent,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      borderRadius: 6,
    },
    defaultBadgeText: {
      fontSize: 11,
      fontWeight: '600',
      color: '#FFFFFF',
    },
    smartPlanBadge: {
      backgroundColor: '#F3E8FF',
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      borderRadius: 6,
    },
    smartPlanBadgeText: {
      fontSize: 11,
      fontWeight: '600',
      color: '#9333EA',
    },
    moreButton: {
      padding: spacing.sm,
    },
    createButtonsContainer: {
      paddingTop: spacing.lg,
      paddingBottom: spacing.md,
      gap: spacing.md,
    },
    createButton: {
      borderWidth: 0,
    },
    createWishlistButton: {
      backgroundColor: colors.accent,
    },
    createTodoButton: {
      backgroundColor: '#3B82F6',
    },
    createButtonText: {
      color: '#FFFFFF',
      fontWeight: '600',
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
      maxHeight: '80%',
    },
    modalScroll: {
      maxHeight: 500,
    },
    modalTitle: {
      ...typography.h2,
      color: colors.textPrimary,
      marginBottom: spacing.md,
    },
    modalInput: {
      backgroundColor: colors.surface2,
      borderWidth: 1.5,
      borderColor: colors.border,
      borderRadius: 12,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.md,
      fontSize: 16,
      color: colors.textPrimary,
      marginBottom: spacing.md,
    },
    modalToggleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: spacing.sm,
      marginBottom: spacing.md,
    },
    modalToggleLabel: {
      ...typography.body,
      color: colors.textPrimary,
      flex: 1,
    },
    templateSection: {
      marginBottom: spacing.md,
    },
    templateLabel: {
      ...typography.body,
      fontWeight: '600',
      color: colors.textPrimary,
      marginBottom: spacing.sm,
    },
    templateGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
    },
    templateCard: {
      flex: 1,
      minWidth: '45%',
      backgroundColor: colors.surface2,
      borderRadius: 12,
      padding: spacing.md,
      alignItems: 'center',
      gap: spacing.xs,
      borderWidth: 2,
      borderColor: 'transparent',
    },
    templateCardSelected: {
      borderColor: colors.accent,
      backgroundColor: colors.accentLight,
    },
    templateIcon: {
      marginBottom: spacing.xs,
    },
    templateName: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textPrimary,
      textAlign: 'center',
    },
    modalButtons: {
      flexDirection: 'row',
      gap: spacing.sm,
    },
    modalButton: {
      flex: 1,
    },
    menuOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    menuContent: {
      position: 'absolute',
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: spacing.xs,
      minWidth: 200,
      ...Platform.select({
        ios: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.25,
          shadowRadius: 8,
        },
        android: {
          elevation: 8,
        },
      }),
    },
    menuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: spacing.md,
      borderRadius: 8,
      gap: spacing.sm,
    },
    menuItemText: {
      ...typography.body,
      color: colors.textPrimary,
    },
    menuItemDanger: {
      color: colors.error,
    },
  }), [colors, typography, insets.bottom]);

  const fetchLists = useCallback(async () => {
    if (!user?.id || isFetchingRef.current) return;

    isFetchingRef.current = true;

    try {
      setLoading(true);
      setError(null);

      // TODO: Backend Integration - GET /api/lists to fetch all lists
      // For now, fetch from Supabase directly
      const { data, error: fetchError } = await supabase
        .from('wishlists')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      const formattedLists: List[] = (data || []).map((list: any) => ({
        id: list.id,
        name: list.name,
        listType: list.list_type || 'WISHLIST',
        isDefault: list.is_default || false,
        itemCount: 0, // TODO: Get from backend
        completedCount: 0, // TODO: Get from backend
        smartPlanEnabled: list.smart_plan_enabled || false,
        smartPlanTemplate: list.smart_plan_template,
        createdAt: list.created_at,
        updatedAt: list.updated_at,
      }));

      const deduplicatedLists = dedupeById(formattedLists, 'id');
      setLists(deduplicatedLists);
      await setCachedData('lists', deduplicatedLists);
    } catch (err) {
      console.error('[ListsScreen] Error fetching lists:', err);
      setError(err instanceof Error ? err.message : 'Failed to load lists');

      const cached = await getCachedData<List[]>('lists');
      if (cached) {
        setLists(dedupeById(cached, 'id'));
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
      isFetchingRef.current = false;
    }
  }, [user]);

  useEffect(() => {
    if (user && !hasInitializedRef.current) {
      hasInitializedRef.current = true;
      fetchLists();
    }

    return () => {
      hasInitializedRef.current = false;
      isFetchingRef.current = false;
    };
  }, [user, fetchLists]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchLists();
  }, [fetchLists]);

  const handleCreateList = async () => {
    const trimmedName = newListName.trim();
    
    if (!trimmedName) {
      Alert.alert('Error', 'Please enter a list name');
      return;
    }

    if (!user?.id) {
      Alert.alert('Error', 'You must be logged in to create a list');
      return;
    }

    if (smartPlanEnabled && !selectedTemplate) {
      Alert.alert('Error', 'Please select a template for Smart Plan Mode');
      return;
    }

    try {
      console.log('[ListsScreen] Creating new list:', trimmedName, 'type:', createListType);
      
      // TODO: Backend Integration - POST /api/lists
      // Body: { name, listType, isDefault?, smartPlanEnabled?, smartPlanTemplate? }
      const { data, error } = await supabase
        .from('wishlists')
        .insert({
          user_id: user.id,
          name: trimmedName,
          list_type: createListType,
          is_default: setAsDefault,
          smart_plan_enabled: smartPlanEnabled,
          smart_plan_template: selectedTemplate,
        })
        .select()
        .single();

      if (error) throw error;

      setCreateModalVisible(false);
      setNewListName('');
      setSetAsDefault(false);
      setSmartPlanEnabled(false);
      setSelectedTemplate(null);
      handleRefresh();
      Alert.alert('Success', 'List created successfully');
    } catch (err) {
      console.error('[ListsScreen] Error creating list:', err);
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to create list');
    }
  };

  const handleRenameList = async () => {
    const trimmedName = renameListName.trim();
    
    if (!trimmedName || !selectedList) {
      Alert.alert('Error', 'Please enter a list name');
      return;
    }

    try {
      // TODO: Backend Integration - PUT /api/lists/:id
      const { error } = await supabase
        .from('wishlists')
        .update({ name: trimmedName })
        .eq('id', selectedList.id);

      if (error) throw error;

      setRenameModalVisible(false);
      setRenameListName('');
      setSelectedList(null);
      handleRefresh();
      Alert.alert('Success', 'List renamed successfully');
    } catch (err) {
      console.error('[ListsScreen] Error renaming list:', err);
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to rename list');
    }
  };

  const handleDeleteList = async () => {
    if (!selectedList) return;

    try {
      // TODO: Backend Integration - DELETE /api/lists/:id
      const { error } = await supabase
        .from('wishlists')
        .delete()
        .eq('id', selectedList.id);

      if (error) throw error;

      setDeleteDialogVisible(false);
      setSelectedList(null);
      handleRefresh();
      Alert.alert('Success', 'List deleted successfully');
    } catch (err) {
      console.error('[ListsScreen] Error deleting list:', err);
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to delete list');
    }
  };

  const handleListPress = (list: List) => {
    router.push(`/list/${list.id}`);
  };

  const openCreateModal = (listType: 'WISHLIST' | 'TODO') => {
    setCreateListType(listType);
    setNewListName('');
    setSetAsDefault(false);
    setSmartPlanEnabled(false);
    setSelectedTemplate(null);
    setCreateModalVisible(true);
  };

  const renderListItem = ({ item }: { item: List }) => {
    const itemCountText = item.itemCount === 1 ? 'item' : 'items';
    const completedText = item.listType === 'TODO' && item.itemCount > 0
      ? `${item.completedCount}/${item.itemCount} completed`
      : `${item.itemCount} ${itemCountText}`;

    return (
      <TouchableOpacity
        key={`list-${item.id}`}
        onPress={() => handleListPress(item)}
        activeOpacity={0.7}
      >
        <Card style={styles.listCard}>
          <View style={styles.listContent}>
            <View style={styles.listLeft}>
              <Text style={styles.listName}>{item.name}</Text>
              <View style={styles.listMeta}>
                <View style={[
                  styles.typeBadge,
                  item.listType === 'WISHLIST' ? styles.wishlistBadge : styles.todoBadge
                ]}>
                  <Text style={[
                    styles.typeBadgeText,
                    item.listType === 'WISHLIST' ? styles.wishlistBadgeText : styles.todoBadgeText
                  ]}>
                    {item.listType === 'WISHLIST' ? 'Wishlist' : 'To-Do'}
                  </Text>
                </View>
                <Text style={styles.listMetaText}>{completedText}</Text>
              </View>
            </View>
            <View style={styles.listRight}>
              {item.isDefault && (
                <View style={styles.defaultBadge}>
                  <Text style={styles.defaultBadgeText}>Default</Text>
                </View>
              )}
              {item.smartPlanEnabled && (
                <View style={styles.smartPlanBadge}>
                  <Text style={styles.smartPlanBadgeText}>Smart Plan</Text>
                </View>
              )}
              <TouchableOpacity
                style={styles.moreButton}
                onPress={(e) => {
                  e.stopPropagation();
                  setSelectedList(item);
                  const { pageY } = e.nativeEvent;
                  setMenuPosition({ top: pageY, right: 20 });
                  setMenuVisible(true);
                }}
              >
                <IconSymbol
                  ios_icon_name="ellipsis"
                  android_material_icon_name="more-vert"
                  size={24}
                  color={colors.icon}
                />
              </TouchableOpacity>
            </View>
          </View>
        </Card>
      </TouchableOpacity>
    );
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerTop}>
        <Logo style={styles.logo} />
      </View>
      <Text style={styles.title}>My Lists</Text>
      <Text style={styles.subtitle}>
        Organize your wishlists and to-do lists
      </Text>
    </View>
  );

  const renderFooter = () => (
    <View style={styles.createButtonsContainer}>
      <Button
        title="+ Add Wishlist"
        onPress={() => openCreateModal('WISHLIST')}
        variant="primary"
        style={[styles.createButton, styles.createWishlistButton]}
      />
      <Button
        title="+ Add To-Do List"
        onPress={() => openCreateModal('TODO')}
        variant="primary"
        style={[styles.createButton, styles.createTodoButton]}
      />
    </View>
  );

  if (loading && lists.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        {renderHeader()}
        <View style={styles.list}>
          <ListItemSkeleton />
          <ListItemSkeleton />
          <ListItemSkeleton />
        </View>
      </SafeAreaView>
    );
  }

  if (error && lists.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        {!isConnected && <OfflineNotice />}
        {renderHeader()}
        <ErrorState
          message={error}
          onRetry={fetchLists}
        />
      </SafeAreaView>
    );
  }

  if (lists.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        {renderHeader()}
        <EmptyState
          icon="list"
          title="No lists yet"
          message="Create your first wishlist or to-do list to get started"
        />
        {renderFooter()}
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.container} edges={['top']}>
        {!isConnected && <OfflineNotice />}
        <FlatList
          data={lists}
          renderItem={renderListItem}
          keyExtractor={(item) => `list-${item.id}`}
          ListHeaderComponent={renderHeader}
          ListFooterComponent={renderFooter}
          contentContainerStyle={styles.listContent}
          style={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.accent}
            />
          }
        />

        {/* Create List Modal */}
        <Modal
          visible={createModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setCreateModalVisible(false)}
        >
          <Pressable style={styles.modalOverlay} onPress={() => setCreateModalVisible(false)}>
            <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
              <ScrollView style={styles.modalScroll}>
                <Text style={styles.modalTitle}>
                  Create {createListType === 'WISHLIST' ? 'Wishlist' : 'To-Do List'}
                </Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="List name"
                  placeholderTextColor={colors.textSecondary}
                  value={newListName}
                  onChangeText={setNewListName}
                  autoFocus
                />
                <View style={styles.modalToggleRow}>
                  <Text style={styles.modalToggleLabel}>Set as default</Text>
                  <Switch
                    value={setAsDefault}
                    onValueChange={setSetAsDefault}
                    trackColor={{ false: colors.border, true: colors.accent }}
                    thumbColor={colors.surface}
                  />
                </View>
                {createListType === 'TODO' && (
                  <>
                    <View style={styles.modalToggleRow}>
                      <Text style={styles.modalToggleLabel}>Enable Smart Plan Mode</Text>
                      <Switch
                        value={smartPlanEnabled}
                        onValueChange={setSmartPlanEnabled}
                        trackColor={{ false: colors.border, true: colors.accent }}
                        thumbColor={colors.surface}
                      />
                    </View>
                    {smartPlanEnabled && (
                      <View style={styles.templateSection}>
                        <Text style={styles.templateLabel}>Select Template</Text>
                        <View style={styles.templateGrid}>
                          {SMART_PLAN_TEMPLATES.map((template) => (
                            <TouchableOpacity
                              key={template.id}
                              style={[
                                styles.templateCard,
                                selectedTemplate === template.id && styles.templateCardSelected,
                              ]}
                              onPress={() => setSelectedTemplate(template.id)}
                            >
                              <IconSymbol
                                ios_icon_name={template.icon}
                                android_material_icon_name={template.androidIcon}
                                size={32}
                                color={selectedTemplate === template.id ? colors.accent : colors.icon}
                                style={styles.templateIcon}
                              />
                              <Text style={styles.templateName}>{template.name}</Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>
                    )}
                  </>
                )}
              </ScrollView>
              <View style={styles.modalButtons}>
                <Button
                  title="Cancel"
                  onPress={() => setCreateModalVisible(false)}
                  variant="secondary"
                  style={styles.modalButton}
                />
                <Button
                  title="Create"
                  onPress={handleCreateList}
                  variant="primary"
                  style={styles.modalButton}
                />
              </View>
            </Pressable>
          </Pressable>
        </Modal>

        {/* Rename Modal */}
        <Modal
          visible={renameModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setRenameModalVisible(false)}
        >
          <Pressable style={styles.modalOverlay} onPress={() => setRenameModalVisible(false)}>
            <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
              <Text style={styles.modalTitle}>Rename List</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="List name"
                placeholderTextColor={colors.textSecondary}
                value={renameListName}
                onChangeText={setRenameListName}
                autoFocus
              />
              <View style={styles.modalButtons}>
                <Button
                  title="Cancel"
                  onPress={() => setRenameModalVisible(false)}
                  variant="secondary"
                  style={styles.modalButton}
                />
                <Button
                  title="Rename"
                  onPress={handleRenameList}
                  variant="primary"
                  style={styles.modalButton}
                />
              </View>
            </Pressable>
          </Pressable>
        </Modal>

        {/* Menu Modal */}
        <Modal
          visible={menuVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setMenuVisible(false)}
        >
          <Pressable style={styles.menuOverlay} onPress={() => setMenuVisible(false)}>
            <View style={[styles.menuContent, { top: menuPosition.top, right: menuPosition.right }]}>
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  setMenuVisible(false);
                  setRenameListName(selectedList?.name || '');
                  setRenameModalVisible(true);
                }}
              >
                <IconSymbol
                  ios_icon_name="pencil"
                  android_material_icon_name="edit"
                  size={20}
                  color={colors.icon}
                />
                <Text style={styles.menuItemText}>Rename</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  setMenuVisible(false);
                  setDeleteDialogVisible(true);
                }}
              >
                <IconSymbol
                  ios_icon_name="trash"
                  android_material_icon_name="delete"
                  size={20}
                  color={colors.error}
                />
                <Text style={[styles.menuItemText, styles.menuItemDanger]}>Delete</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Modal>

        <ConfirmDialog
          visible={deleteDialogVisible}
          title="Delete List"
          message={`Are you sure you want to delete "${selectedList?.name}"? This will also delete all items in this list.`}
          confirmText="Delete"
          cancelText="Cancel"
          onConfirm={handleDeleteList}
          onCancel={() => setDeleteDialogVisible(false)}
          destructive
        />
      </SafeAreaView>
    </View>
  );
}
