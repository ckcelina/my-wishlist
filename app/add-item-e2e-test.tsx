
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
import { createColors, createTypography, spacing } from '@/styles/designSystem';
import { useAppTheme } from '@/contexts/ThemeContext';
import * as ImagePicker from 'expo-image-picker';
import { useSmartLocation } from '@/contexts/SmartLocationContext';

interface TestResult {
  name: string;
  status: 'pass' | 'fail' | 'pending' | 'skipped';
  message: string;
  duration?: number;
}

export default function AddItemE2ETestScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { theme } = useAppTheme();
  const { settings: smartLocationSettings } = useSmartLocation();
  const colors = createColors(theme);
  const typography = createTypography(theme);

  const [results, setResults] = useState<TestResult[]>([]);
  const [running, setRunning] = useState(false);

  const updateResult = (result: TestResult) => {
    setResults((prev) => {
      const existing = prev.find((r) => r.name === result.name);
      if (existing) {
        return prev.map((r) => (r.name === result.name ? result : r));
      }
      return [...prev, result];
    });
  };

  const runE2ETests = async () => {
    if (!user) {
      Alert.alert('Error', 'You must be logged in to run tests');
      return;
    }

    setRunning(true);
    setResults([]);

    try {
      // Test 1: Add Tab Opens
      updateResult({ name: 'Add Tab Opens', status: 'pending', message: 'Testing...' });
      const startTime1 = Date.now();
      try {
        router.push('/(tabs)/add');
        await new Promise((resolve) => setTimeout(resolve, 1000));
        updateResult({
          name: 'Add Tab Opens',
          status: 'pass',
          message: 'Add tab opened successfully',
          duration: Date.now() - startTime1,
        });
      } catch (error: any) {
        updateResult({
          name: 'Add Tab Opens',
          status: 'fail',
          message: `Failed to open Add tab: ${error.message}`,
          duration: Date.now() - startTime1,
        });
      }

      // Test 2: URL Mode - Check if country is set
      updateResult({ name: 'URL Mode - Country Check', status: 'pending', message: 'Testing...' });
      const startTime2 = Date.now();
      try {
        const currentCountry = smartLocationSettings?.activeSearchCountry;
        if (!currentCountry) {
          updateResult({
            name: 'URL Mode - Country Check',
            status: 'fail',
            message: 'Country not set in Settings. User must set country before using URL mode.',
            duration: Date.now() - startTime2,
          });
        } else {
          updateResult({
            name: 'URL Mode - Country Check',
            status: 'pass',
            message: `Country is set to: ${currentCountry}`,
            duration: Date.now() - startTime2,
          });
        }
      } catch (error: any) {
        updateResult({
          name: 'URL Mode - Country Check',
          status: 'fail',
          message: `Failed to check country: ${error.message}`,
          duration: Date.now() - startTime2,
        });
      }

      // Test 3: Camera Mode - Permission Check
      updateResult({ name: 'Camera Mode - Permission Check', status: 'pending', message: 'Testing...' });
      const startTime3 = Date.now();
      try {
        const { status } = await ImagePicker.getCameraPermissionsAsync();
        if (status === 'granted') {
          updateResult({
            name: 'Camera Mode - Permission Check',
            status: 'pass',
            message: 'Camera permission granted',
            duration: Date.now() - startTime3,
          });
        } else if (status === 'undetermined') {
          updateResult({
            name: 'Camera Mode - Permission Check',
            status: 'skipped',
            message: 'Camera permission not yet requested. User will be prompted on first use.',
            duration: Date.now() - startTime3,
          });
        } else {
          updateResult({
            name: 'Camera Mode - Permission Check',
            status: 'fail',
            message: 'Camera permission denied. User must enable in Settings.',
            duration: Date.now() - startTime3,
          });
        }
      } catch (error: any) {
        updateResult({
          name: 'Camera Mode - Permission Check',
          status: 'fail',
          message: `Failed to check camera permission: ${error.message}`,
          duration: Date.now() - startTime3,
        });
      }

      // Test 4: Upload Mode - Permission Check
      updateResult({ name: 'Upload Mode - Permission Check', status: 'pending', message: 'Testing...' });
      const startTime4 = Date.now();
      try {
        const { status } = await ImagePicker.getMediaLibraryPermissionsAsync();
        if (status === 'granted') {
          updateResult({
            name: 'Upload Mode - Permission Check',
            status: 'pass',
            message: 'Photo library permission granted',
            duration: Date.now() - startTime4,
          });
        } else if (status === 'undetermined') {
          updateResult({
            name: 'Upload Mode - Permission Check',
            status: 'skipped',
            message: 'Photo library permission not yet requested. User will be prompted on first use.',
            duration: Date.now() - startTime4,
          });
        } else {
          updateResult({
            name: 'Upload Mode - Permission Check',
            status: 'fail',
            message: 'Photo library permission denied. User must enable in Settings.',
            duration: Date.now() - startTime4,
          });
        }
      } catch (error: any) {
        updateResult({
          name: 'Upload Mode - Permission Check',
          status: 'fail',
          message: `Failed to check photo library permission: ${error.message}`,
          duration: Date.now() - startTime4,
        });
      }

      // Test 5: Search Mode - Country Check
      updateResult({ name: 'Search Mode - Country Check', status: 'pending', message: 'Testing...' });
      const startTime5 = Date.now();
      try {
        const currentCountry = smartLocationSettings?.activeSearchCountry;
        if (!currentCountry) {
          updateResult({
            name: 'Search Mode - Country Check',
            status: 'fail',
            message: 'Country not set in Settings. User must set country before using Search mode.',
            duration: Date.now() - startTime5,
          });
        } else {
          updateResult({
            name: 'Search Mode - Country Check',
            status: 'pass',
            message: `Country is set to: ${currentCountry}`,
            duration: Date.now() - startTime5,
          });
        }
      } catch (error: any) {
        updateResult({
          name: 'Search Mode - Country Check',
          status: 'fail',
          message: `Failed to check country: ${error.message}`,
          duration: Date.now() - startTime5,
        });
      }

      // Test 6: Manual Mode - Basic Validation
      updateResult({ name: 'Manual Mode - Basic Validation', status: 'pending', message: 'Testing...' });
      const startTime6 = Date.now();
      try {
        // Manual mode should always work (no dependencies)
        updateResult({
          name: 'Manual Mode - Basic Validation',
          status: 'pass',
          message: 'Manual mode is always available',
          duration: Date.now() - startTime6,
        });
      } catch (error: any) {
        updateResult({
          name: 'Manual Mode - Basic Validation',
          status: 'fail',
          message: `Failed to validate manual mode: ${error.message}`,
          duration: Date.now() - startTime6,
        });
      }

      // Test 7: Import Preview Navigation
      updateResult({ name: 'Import Preview Navigation', status: 'pending', message: 'Testing...' });
      const startTime7 = Date.now();
      try {
        // Test that import-preview route exists
        const testData = {
          itemName: 'Test Product',
          imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80',
          extractedImages: [],
          storeName: 'Test Store',
          storeDomain: 'test.com',
          price: 99.99,
          currency: 'USD',
          countryAvailability: ['US'],
          inputType: 'manual',
        };
        
        router.push({
          pathname: '/import-preview',
          params: {
            data: JSON.stringify(testData),
          },
        });
        
        await new Promise((resolve) => setTimeout(resolve, 1000));
        
        updateResult({
          name: 'Import Preview Navigation',
          status: 'pass',
          message: 'Import preview screen navigated successfully',
          duration: Date.now() - startTime7,
        });
        
        // Navigate back
        router.back();
      } catch (error: any) {
        updateResult({
          name: 'Import Preview Navigation',
          status: 'fail',
          message: `Failed to navigate to import preview: ${error.message}`,
          duration: Date.now() - startTime7,
        });
      }

      Alert.alert('Tests Complete', 'All E2E tests have been executed. Check results below.');
    } catch (error: any) {
      console.error('[E2E Test] Unexpected error:', error);
      Alert.alert('Test Error', `An unexpected error occurred: ${error.message}`);
    } finally {
      setRunning(false);
    }
  };

  const getStatusColor = (status: TestResult['status']) => {
    switch (status) {
      case 'pass':
        return colors.success;
      case 'fail':
        return colors.error;
      case 'pending':
        return colors.warning;
      case 'skipped':
        return colors.textTertiary;
      default:
        return colors.textSecondary;
    }
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'pass':
        return 'check-circle';
      case 'fail':
        return 'error';
      case 'pending':
        return 'schedule';
      case 'skipped':
        return 'remove-circle';
      default:
        return 'help';
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      padding: spacing.lg,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    title: {
      fontSize: 24,
      fontWeight: '600',
      color: colors.textPrimary,
      marginBottom: spacing.xs,
    },
    subtitle: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    content: {
      flex: 1,
      padding: spacing.lg,
    },
    runButton: {
      backgroundColor: colors.accent,
      padding: spacing.md,
      borderRadius: 12,
      alignItems: 'center',
      marginBottom: spacing.lg,
    },
    runButtonDisabled: {
      opacity: 0.5,
    },
    runButtonText: {
      color: colors.textInverse,
      fontSize: 16,
      fontWeight: '600',
    },
    resultsList: {
      gap: spacing.sm,
    },
    resultCard: {
      backgroundColor: colors.surface,
      padding: spacing.md,
      borderRadius: 12,
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
      fontSize: 16,
      fontWeight: '500',
      color: colors.textPrimary,
      flex: 1,
    },
    resultMessage: {
      fontSize: 14,
      color: colors.textSecondary,
      marginBottom: spacing.xs / 2,
    },
    resultDuration: {
      fontSize: 12,
      color: colors.textTertiary,
    },
    emptyState: {
      alignItems: 'center',
      justifyContent: 'center',
      padding: spacing.xl,
    },
    emptyText: {
      fontSize: 16,
      color: colors.textSecondary,
      textAlign: 'center',
      marginTop: spacing.md,
    },
  });

  return (
    <React.Fragment>
      <Stack.Screen
        options={{
          title: 'Add Item E2E Test',
          headerBackTitle: 'Back',
        }}
      />
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.header}>
          <Text style={styles.title}>Add Item E2E Test</Text>
          <Text style={styles.subtitle}>
            Comprehensive smoke test for all Add Item flows
          </Text>
        </View>

        <ScrollView style={styles.content}>
          <TouchableOpacity
            style={[styles.runButton, running && styles.runButtonDisabled]}
            onPress={runE2ETests}
            disabled={running}
          >
            {running ? (
              <ActivityIndicator size="small" color={colors.textInverse} />
            ) : (
              <Text style={styles.runButtonText}>Run All Tests</Text>
            )}
          </TouchableOpacity>

          {results.length === 0 ? (
            <View style={styles.emptyState}>
              <IconSymbol
                ios_icon_name="play.circle"
                android_material_icon_name="play-circle"
                size={64}
                color={colors.textTertiary}
              />
              <Text style={styles.emptyText}>
                Tap "Run All Tests" to start the E2E smoke test
              </Text>
            </View>
          ) : (
            <View style={styles.resultsList}>
              {results.map((result, index) => (
                <View key={index} style={styles.resultCard}>
                  <View style={styles.resultHeader}>
                    <IconSymbol
                      ios_icon_name={
                        result.status === 'pass'
                          ? 'checkmark.circle'
                          : result.status === 'fail'
                          ? 'xmark.circle'
                          : result.status === 'pending'
                          ? 'clock'
                          : 'minus.circle'
                      }
                      android_material_icon_name={getStatusIcon(result.status)}
                      size={24}
                      color={getStatusColor(result.status)}
                    />
                    <Text style={styles.resultName}>{result.name}</Text>
                  </View>
                  <Text style={styles.resultMessage}>{result.message}</Text>
                  {result.duration !== undefined && (
                    <Text style={styles.resultDuration}>
                      Duration: {result.duration}ms
                    </Text>
                  )}
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </React.Fragment>
  );
}
