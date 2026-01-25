
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconSymbol } from '@/components/IconSymbol';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { colors, typography, spacing } from '@/styles/designSystem';
import {
  createWishlist,
  createWishlistItem,
  updateWishlistItem,
  deleteWishlistItem,
  deleteWishlist,
  generateShareSlug,
  createSharedWishlist,
  deleteSharedWishlist,
} from '@/lib/supabase-helpers';

interface TestResult {
  name: string;
  status: 'pass' | 'fail' | 'pending' | 'skipped';
  message: string;
  duration?: number;
}

export default function E2ETestScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [results, setResults] = useState<TestResult[]>([]);
  const [testing, setTesting] = useState(false);
  const [progress, setProgress] = useState(0);

  const updateResult = (result: TestResult) => {
    setResults(prev => {
      const existing = prev.findIndex(r => r.name === result.name);
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = result;
        return updated;
      }
      return [...prev, result];
    });
  };

  const runE2ETests = async () => {
    if (!user) {
      Alert.alert('Sign In Required', 'Please sign in to run end-to-end tests');
      return;
    }

    console.log('[E2E] Starting end-to-end tests');
    setTesting(true);
    setResults([]);
    setProgress(0);

    const totalTests = 10;
    let currentTest = 0;
    let testWishlistId: string | null = null;
    let testItemId: string | null = null;
    let testShareSlug: string | null = null;

    const incrementProgress = () => {
      currentTest++;
      setProgress((currentTest / totalTests) * 100);
    };

    // Test 1: Create Wishlist
    try {
      updateResult({ name: 'Create Wishlist', status: 'pending', message: 'Creating...' });
      const startTime = Date.now();
      
      const wishlist = await createWishlist({
        user_id: user.id,
        name: `E2E Test Wishlist ${Date.now()}`,
      });
      
      testWishlistId = wishlist.id;
      const duration = Date.now() - startTime;
      
      updateResult({
        name: 'Create Wishlist',
        status: 'pass',
        message: 'Wishlist created successfully',
        duration,
      });
    } catch (error) {
      updateResult({
        name: 'Create Wishlist',
        status: 'fail',
        message: error instanceof Error ? error.message : 'Failed to create wishlist',
      });
    }
    incrementProgress();

    // Test 2: Add Item to Wishlist
    if (testWishlistId) {
      try {
        updateResult({ name: 'Add Item', status: 'pending', message: 'Adding item...' });
        const startTime = Date.now();
        
        const item = await createWishlistItem({
          wishlist_id: testWishlistId,
          title: 'Test Product',
          image_url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e',
          current_price: '99.99',
          currency: 'USD',
          original_url: 'https://example.com/product',
          source_domain: 'example.com',
        });
        
        testItemId = item.id;
        const duration = Date.now() - startTime;
        
        updateResult({
          name: 'Add Item',
          status: 'pass',
          message: 'Item added successfully',
          duration,
        });
      } catch (error) {
        updateResult({
          name: 'Add Item',
          status: 'fail',
          message: error instanceof Error ? error.message : 'Failed to add item',
        });
      }
    } else {
      updateResult({
        name: 'Add Item',
        status: 'skipped',
        message: 'Skipped due to previous failure',
      });
    }
    incrementProgress();

    // Test 3: Update Item
    if (testItemId) {
      try {
        updateResult({ name: 'Update Item', status: 'pending', message: 'Updating...' });
        const startTime = Date.now();
        
        await updateWishlistItem(testItemId, {
          title: 'Updated Test Product',
          current_price: '79.99',
        });
        
        const duration = Date.now() - startTime;
        
        updateResult({
          name: 'Update Item',
          status: 'pass',
          message: 'Item updated successfully',
          duration,
        });
      } catch (error) {
        updateResult({
          name: 'Update Item',
          status: 'fail',
          message: error instanceof Error ? error.message : 'Failed to update item',
        });
      }
    } else {
      updateResult({
        name: 'Update Item',
        status: 'skipped',
        message: 'Skipped due to previous failure',
      });
    }
    incrementProgress();

    // Test 4: Fetch Items
    if (testWishlistId) {
      try {
        updateResult({ name: 'Fetch Items', status: 'pending', message: 'Fetching...' });
        const startTime = Date.now();
        
        const { data, error } = await supabase
          .from('wishlist_items')
          .select('*')
          .eq('wishlist_id', testWishlistId);
        
        if (error) throw error;
        
        const duration = Date.now() - startTime;
        
        updateResult({
          name: 'Fetch Items',
          status: 'pass',
          message: `Fetched ${data.length} items`,
          duration,
        });
      } catch (error) {
        updateResult({
          name: 'Fetch Items',
          status: 'fail',
          message: error instanceof Error ? error.message : 'Failed to fetch items',
        });
      }
    } else {
      updateResult({
        name: 'Fetch Items',
        status: 'skipped',
        message: 'Skipped due to previous failure',
      });
    }
    incrementProgress();

    // Test 5: Create Share Link
    if (testWishlistId) {
      try {
        updateResult({ name: 'Create Share Link', status: 'pending', message: 'Creating...' });
        const startTime = Date.now();
        
        testShareSlug = generateShareSlug();
        
        await createSharedWishlist({
          wishlist_id: testWishlistId,
          share_slug: testShareSlug,
          visibility: 'public',
          allow_reservations: true,
          hide_reserved_items: false,
          show_reserver_names: true,
        });
        
        const duration = Date.now() - startTime;
        
        updateResult({
          name: 'Create Share Link',
          status: 'pass',
          message: 'Share link created',
          duration,
        });
      } catch (error) {
        updateResult({
          name: 'Create Share Link',
          status: 'fail',
          message: error instanceof Error ? error.message : 'Failed to create share link',
        });
      }
    } else {
      updateResult({
        name: 'Create Share Link',
        status: 'skipped',
        message: 'Skipped due to previous failure',
      });
    }
    incrementProgress();

    // Test 6: Fetch Shared Wishlist
    if (testShareSlug) {
      try {
        updateResult({ name: 'Fetch Shared Wishlist', status: 'pending', message: 'Fetching...' });
        const startTime = Date.now();
        
        const { data, error } = await supabase
          .from('shared_wishlists')
          .select('*')
          .eq('share_slug', testShareSlug)
          .single();
        
        if (error) throw error;
        
        const duration = Date.now() - startTime;
        
        updateResult({
          name: 'Fetch Shared Wishlist',
          status: 'pass',
          message: 'Shared wishlist fetched',
          duration,
        });
      } catch (error) {
        updateResult({
          name: 'Fetch Shared Wishlist',
          status: 'fail',
          message: error instanceof Error ? error.message : 'Failed to fetch shared wishlist',
        });
      }
    } else {
      updateResult({
        name: 'Fetch Shared Wishlist',
        status: 'skipped',
        message: 'Skipped due to previous failure',
      });
    }
    incrementProgress();

    // Test 7: Add Price History
    if (testItemId) {
      try {
        updateResult({ name: 'Add Price History', status: 'pending', message: 'Adding...' });
        const startTime = Date.now();
        
        const { error } = await supabase
          .from('price_history')
          .insert({
            item_id: testItemId,
            price: '89.99',
            currency: 'USD',
          });
        
        if (error) throw error;
        
        const duration = Date.now() - startTime;
        
        updateResult({
          name: 'Add Price History',
          status: 'pass',
          message: 'Price history added',
          duration,
        });
      } catch (error) {
        updateResult({
          name: 'Add Price History',
          status: 'fail',
          message: error instanceof Error ? error.message : 'Failed to add price history',
        });
      }
    } else {
      updateResult({
        name: 'Add Price History',
        status: 'skipped',
        message: 'Skipped due to previous failure',
      });
    }
    incrementProgress();

    // Test 8: User Settings
    try {
      updateResult({ name: 'User Settings', status: 'pending', message: 'Testing...' });
      const startTime = Date.now();
      
      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (error) throw error;
      
      if (!data) {
        // Create settings if they don't exist
        const { error: insertError } = await supabase
          .from('user_settings')
          .insert({
            user_id: user.id,
            default_currency: 'USD',
            price_drop_alerts_enabled: true,
          });
        
        if (insertError) throw insertError;
      }
      
      const duration = Date.now() - startTime;
      
      updateResult({
        name: 'User Settings',
        status: 'pass',
        message: 'Settings accessible',
        duration,
      });
    } catch (error) {
      updateResult({
        name: 'User Settings',
        status: 'fail',
        message: error instanceof Error ? error.message : 'Failed to access settings',
      });
    }
    incrementProgress();

    // Test 9: Cleanup - Delete Share Link
    if (testWishlistId) {
      try {
        updateResult({ name: 'Delete Share Link', status: 'pending', message: 'Deleting...' });
        const startTime = Date.now();
        
        await deleteSharedWishlist(testWishlistId);
        
        const duration = Date.now() - startTime;
        
        updateResult({
          name: 'Delete Share Link',
          status: 'pass',
          message: 'Share link deleted',
          duration,
        });
      } catch (error) {
        updateResult({
          name: 'Delete Share Link',
          status: 'fail',
          message: error instanceof Error ? error.message : 'Failed to delete share link',
        });
      }
    } else {
      updateResult({
        name: 'Delete Share Link',
        status: 'skipped',
        message: 'Skipped due to previous failure',
      });
    }
    incrementProgress();

    // Test 10: Cleanup - Delete Test Data
    try {
      updateResult({ name: 'Cleanup', status: 'pending', message: 'Cleaning up...' });
      const startTime = Date.now();
      
      if (testItemId) {
        await deleteWishlistItem(testItemId);
      }
      
      if (testWishlistId) {
        await deleteWishlist(testWishlistId);
      }
      
      const duration = Date.now() - startTime;
      
      updateResult({
        name: 'Cleanup',
        status: 'pass',
        message: 'Test data cleaned up',
        duration,
      });
    } catch (error) {
      updateResult({
        name: 'Cleanup',
        status: 'fail',
        message: error instanceof Error ? error.message : 'Failed to cleanup',
      });
    }
    incrementProgress();

    setTesting(false);
    console.log('[E2E] Tests complete');
    
    const passCount = results.filter(r => r.status === 'pass').length;
    const failCount = results.filter(r => r.status === 'fail').length;
    
    Alert.alert(
      'Tests Complete',
      `${passCount} passed, ${failCount} failed`,
      [{ text: 'OK' }]
    );
  };

  const getStatusColor = (status: TestResult['status']) => {
    const statusColorText = status === 'pass' ? colors.success : status === 'fail' ? colors.error : status === 'pending' ? colors.primary : colors.textSecondary;
    return statusColorText;
  };

  const getStatusIcon = (status: TestResult['status']) => {
    const iconName = status === 'pass' ? 'check-circle' : status === 'fail' ? 'error' : status === 'pending' ? 'schedule' : 'remove-circle';
    return iconName;
  };

  const passCount = results.filter(r => r.status === 'pass').length;
  const failCount = results.filter(r => r.status === 'fail').length;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Stack.Screen
        options={{
          title: 'End-to-End Tests',
          headerShown: true,
          headerBackTitle: 'Back',
        }}
      />
      
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <IconSymbol
            ios_icon_name="checkmark.seal.fill"
            android_material_icon_name="verified"
            size={48}
            color={colors.primary}
          />
          <Text style={styles.title}>End-to-End Tests</Text>
          <Text style={styles.subtitle}>
            Test complete user flows from start to finish
          </Text>
        </View>

        {!user && (
          <View style={styles.warningCard}>
            <IconSymbol
              ios_icon_name="exclamationmark.triangle.fill"
              android_material_icon_name="warning"
              size={24}
              color={colors.warning}
            />
            <Text style={styles.warningText}>
              You must be signed in to run end-to-end tests
            </Text>
          </View>
        )}

        {testing && (
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${progress}%` }]} />
            </View>
            <Text style={styles.progressText}>
              {Math.round(progress)}% Complete
            </Text>
          </View>
        )}

        {results.length > 0 && (
          <View style={styles.summary}>
            <View style={styles.summaryItem}>
              <IconSymbol
                ios_icon_name="checkmark.circle.fill"
                android_material_icon_name="check-circle"
                size={24}
                color={colors.success}
              />
              <Text style={styles.summaryText}>{passCount} Passed</Text>
            </View>
            <View style={styles.summaryItem}>
              <IconSymbol
                ios_icon_name="xmark.circle.fill"
                android_material_icon_name="error"
                size={24}
                color={colors.error}
              />
              <Text style={styles.summaryText}>{failCount} Failed</Text>
            </View>
          </View>
        )}

        {results.map((result, index) => {
          const statusColor = getStatusColor(result.status);
          const iconName = getStatusIcon(result.status);
          
          return (
            <View key={index} style={styles.resultCard}>
              <View style={styles.resultHeader}>
                <IconSymbol
                  ios_icon_name={iconName}
                  android_material_icon_name={iconName}
                  size={24}
                  color={statusColor}
                />
                <Text style={styles.resultName}>{result.name}</Text>
                {result.duration && (
                  <Text style={styles.duration}>{result.duration}ms</Text>
                )}
              </View>
              <Text style={[styles.resultMessage, { color: statusColor }]}>
                {result.message}
              </Text>
            </View>
          );
        })}

        {!testing && results.length === 0 && (
          <View style={styles.emptyState}>
            <IconSymbol
              ios_icon_name="play.circle"
              android_material_icon_name="play-circle-outline"
              size={64}
              color={colors.textSecondary}
            />
            <Text style={styles.emptyText}>
              Tap "Run Tests" to start end-to-end testing
            </Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.button, (testing || !user) && styles.buttonDisabled]}
          onPress={runE2ETests}
          disabled={testing || !user}
        >
          {testing ? (
            <ActivityIndicator color={colors.background} />
          ) : (
            <>
              <IconSymbol
                ios_icon_name="play.fill"
                android_material_icon_name="play-arrow"
                size={20}
                color={colors.background}
              />
              <Text style={styles.buttonText}>Run Tests</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  title: {
    ...typography.h1,
    color: colors.text,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  warningCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.warning + '20',
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.warning,
  },
  warningText: {
    ...typography.body,
    color: colors.warning,
    flex: 1,
  },
  progressContainer: {
    marginBottom: spacing.lg,
  },
  progressBar: {
    height: 8,
    backgroundColor: colors.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
  },
  progressText: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  summary: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: spacing.lg,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: 12,
  },
  summaryItem: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  summaryText: {
    ...typography.caption,
    color: colors.text,
    fontWeight: '600',
  },
  resultCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  resultName: {
    ...typography.h3,
    color: colors.text,
    flex: 1,
  },
  duration: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  resultMessage: {
    ...typography.body,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl * 2,
  },
  emptyText: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    ...typography.button,
    color: colors.background,
  },
});
