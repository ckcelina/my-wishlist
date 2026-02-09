
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Alert,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconSymbol } from '@/components/IconSymbol';
import { useAuth } from '@/contexts/AuthContext';
import { createColors, createTypography, spacing } from '@/styles/designSystem';
import { useAppTheme } from '@/contexts/ThemeContext';
import {
  identifyProductFromImage,
  searchByName,
  extractItem,
  assertSupabaseSession,
} from '@/utils/supabase-edge-functions';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';

interface TestResult {
  functionName: string;
  status: 'idle' | 'running' | 'success' | 'error';
  errorCode?: string;
  errorMessage?: string;
  executionTime?: number;
  responseData?: any;
}

export default function DevTestScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { theme, isDark } = useAppTheme();
  const colors = createColors(theme);
  const typography = createTypography(theme);

  const [testResults, setTestResults] = useState<TestResult[]>([
    { functionName: 'identify-product-from-image', status: 'idle' },
    { functionName: 'search-by-name', status: 'idle' },
    { functionName: 'extract-item', status: 'idle' },
  ]);

  const [searchQuery, setSearchQuery] = useState('iPhone 15 Pro');
  const [extractUrl, setExtractUrl] = useState('https://www.amazon.com/dp/B0CHX1W1XY');

  const updateTestResult = (functionName: string, updates: Partial<TestResult>) => {
    setTestResults((prev) =>
      prev.map((result) =>
        result.functionName === functionName ? { ...result, ...updates } : result
      )
    );
  };

  const testIdentifyProductFromImage = async () => {
    console.log('[DevTest] Testing identify-product-from-image');
    updateTestResult('identify-product-from-image', { status: 'running' });

    const startTime = Date.now();

    try {
      // Check session first
      await assertSupabaseSession();

      // Request image picker permission
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        updateTestResult('identify-product-from-image', {
          status: 'error',
          errorCode: 'PERMISSION_DENIED',
          errorMessage: 'Image picker permission denied',
          executionTime: Date.now() - startTime,
        });
        return;
      }

      // Pick an image
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images',
        allowsEditing: false,
        quality: 0.8,
      });

      if (result.canceled) {
        updateTestResult('identify-product-from-image', {
          status: 'idle',
        });
        return;
      }

      const imageUri = result.assets[0].uri;

      // Convert to base64
      const base64 = await FileSystem.readAsStringAsync(imageUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Call edge function
      const response = await identifyProductFromImage(base64, {
        countryCode: 'US',
        currency: 'USD',
      });

      const executionTime = Date.now() - startTime;

      if (response.status === 'error') {
        updateTestResult('identify-product-from-image', {
          status: 'error',
          errorCode: response.code || 'UNKNOWN_ERROR',
          errorMessage: response.message || 'Unknown error',
          executionTime,
          responseData: response,
        });
      } else {
        updateTestResult('identify-product-from-image', {
          status: 'success',
          executionTime,
          responseData: response,
        });
      }
    } catch (error: any) {
      const executionTime = Date.now() - startTime;
      updateTestResult('identify-product-from-image', {
        status: 'error',
        errorCode: error.message === 'AUTH_REQUIRED' ? 'AUTH_REQUIRED' : 'EXCEPTION',
        errorMessage: error.message || 'Unknown error',
        executionTime,
      });
    }
  };

  const testSearchByName = async () => {
    console.log('[DevTest] Testing search-by-name');
    updateTestResult('search-by-name', { status: 'running' });

    const startTime = Date.now();

    try {
      // Check session first
      await assertSupabaseSession();

      // Call edge function
      const response = await searchByName(searchQuery, {
        countryCode: 'US',
        currency: 'USD',
        limit: 5,
      });

      const executionTime = Date.now() - startTime;

      if (response.error) {
        updateTestResult('search-by-name', {
          status: 'error',
          errorCode: 'API_ERROR',
          errorMessage: response.error,
          executionTime,
          responseData: response,
        });
      } else {
        updateTestResult('search-by-name', {
          status: 'success',
          executionTime,
          responseData: response,
        });
      }
    } catch (error: any) {
      const executionTime = Date.now() - startTime;
      updateTestResult('search-by-name', {
        status: 'error',
        errorCode: error.message === 'AUTH_REQUIRED' ? 'AUTH_REQUIRED' : 'EXCEPTION',
        errorMessage: error.message || 'Unknown error',
        executionTime,
      });
    }
  };

  const testExtractItem = async () => {
    console.log('[DevTest] Testing extract-item');
    updateTestResult('extract-item', { status: 'running' });

    const startTime = Date.now();

    try {
      // Check session first
      await assertSupabaseSession();

      // Call edge function
      const response = await extractItem(extractUrl, 'US');

      const executionTime = Date.now() - startTime;

      if (response.error) {
        updateTestResult('extract-item', {
          status: 'error',
          errorCode: 'API_ERROR',
          errorMessage: response.error,
          executionTime,
          responseData: response,
        });
      } else {
        updateTestResult('extract-item', {
          status: 'success',
          executionTime,
          responseData: response,
        });
      }
    } catch (error: any) {
      const executionTime = Date.now() - startTime;
      updateTestResult('extract-item', {
        status: 'error',
        errorCode: error.message === 'AUTH_REQUIRED' ? 'AUTH_REQUIRED' : 'EXCEPTION',
        errorMessage: error.message || 'Unknown error',
        executionTime,
      });
    }
  };

  const getStatusColor = (status: TestResult['status']) => {
    if (status === 'success') return colors.success;
    if (status === 'error') return colors.error;
    if (status === 'running') return colors.accent;
    return colors.textSecondary;
  };

  const getStatusIcon = (status: TestResult['status']) => {
    if (status === 'success') return 'check-circle';
    if (status === 'error') return 'error';
    if (status === 'running') return 'schedule';
    return 'radio-button-unchecked';
  };

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
    warningBanner: {
      backgroundColor: colors.warning + '20',
      borderRadius: 12,
      padding: spacing.md,
      marginBottom: spacing.lg,
      borderWidth: 1,
      borderColor: colors.warning,
    },
    warningText: {
      ...typography.caption,
      color: colors.warning,
      textAlign: 'center',
    },
    testCard: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: spacing.md,
      marginBottom: spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
    },
    testHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: spacing.sm,
    },
    testHeaderLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      flex: 1,
    },
    testName: {
      ...typography.h3,
      color: colors.text,
      flex: 1,
    },
    testButton: {
      backgroundColor: colors.accent,
      borderRadius: 8,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
    testButtonDisabled: {
      opacity: 0.6,
    },
    testButtonText: {
      ...typography.caption,
      color: colors.background,
      fontWeight: '600',
    },
    inputContainer: {
      marginBottom: spacing.sm,
    },
    inputLabel: {
      ...typography.caption,
      color: colors.textSecondary,
      marginBottom: spacing.xs,
    },
    input: {
      backgroundColor: colors.surface2,
      borderRadius: 8,
      padding: spacing.sm,
      ...typography.body,
      color: colors.text,
      borderWidth: 1,
      borderColor: colors.border,
    },
    statusRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      marginBottom: spacing.xs,
    },
    statusLabel: {
      ...typography.caption,
      color: colors.textSecondary,
      width: 100,
    },
    statusValue: {
      ...typography.caption,
      flex: 1,
    },
    responseContainer: {
      backgroundColor: colors.surface2,
      borderRadius: 8,
      padding: spacing.sm,
      marginTop: spacing.sm,
    },
    responseTitle: {
      ...typography.caption,
      color: colors.textSecondary,
      marginBottom: spacing.xs,
      fontWeight: '600',
    },
    responseText: {
      ...typography.caption,
      color: colors.text,
      fontFamily: 'monospace',
    },
  });

  if (!user) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <Stack.Screen
          options={{
            title: 'Dev Test Panel',
            headerShown: true,
            headerBackTitle: 'Back',
          }}
        />
        <View style={[styles.content, { justifyContent: 'center', alignItems: 'center', flex: 1 }]}>
          <IconSymbol
            ios_icon_name="lock.fill"
            android_material_icon_name="lock"
            size={64}
            color={colors.textSecondary}
          />
          <Text style={[styles.title, { marginTop: spacing.lg }]}>Authentication Required</Text>
          <Text style={styles.subtitle}>Sign in to test edge functions</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Stack.Screen
        options={{
          title: 'Dev Test Panel',
          headerShown: true,
          headerBackTitle: 'Back',
        }}
      />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <IconSymbol
            ios_icon_name="wrench.and.screwdriver.fill"
            android_material_icon_name="build"
            size={48}
            color={colors.accent}
          />
          <Text style={styles.title}>Edge Function Diagnostics</Text>
          <Text style={styles.subtitle}>Test AI-powered edge functions</Text>
        </View>

        <View style={styles.warningBanner}>
          <Text style={styles.warningText}>
            ⚠️ Hidden Dev Panel - For testing edge function authentication and performance
          </Text>
        </View>

        {/* Test 1: identify-product-from-image */}
        <View style={styles.testCard}>
          <View style={styles.testHeader}>
            <View style={styles.testHeaderLeft}>
              <IconSymbol
                ios_icon_name={getStatusIcon(testResults[0].status)}
                android_material_icon_name={getStatusIcon(testResults[0].status)}
                size={24}
                color={getStatusColor(testResults[0].status)}
              />
              <Text style={styles.testName}>identify-product-from-image</Text>
            </View>
            <TouchableOpacity
              style={[
                styles.testButton,
                testResults[0].status === 'running' && styles.testButtonDisabled,
              ]}
              onPress={testIdentifyProductFromImage}
              disabled={testResults[0].status === 'running'}
            >
              {testResults[0].status === 'running' ? (
                <ActivityIndicator size="small" color={colors.background} />
              ) : (
                <>
                  <IconSymbol
                    ios_icon_name="camera.fill"
                    android_material_icon_name="camera"
                    size={16}
                    color={colors.background}
                  />
                  <Text style={styles.testButtonText}>Test</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {testResults[0].status !== 'idle' && (
            <>
              <View style={styles.statusRow}>
                <Text style={styles.statusLabel}>Status:</Text>
                <Text style={[styles.statusValue, { color: getStatusColor(testResults[0].status) }]}>
                  {testResults[0].status.toUpperCase()}
                </Text>
              </View>

              {testResults[0].errorCode && (
                <View style={styles.statusRow}>
                  <Text style={styles.statusLabel}>Error Code:</Text>
                  <Text style={[styles.statusValue, { color: colors.error }]}>
                    {testResults[0].errorCode}
                  </Text>
                </View>
              )}

              {testResults[0].errorMessage && (
                <View style={styles.statusRow}>
                  <Text style={styles.statusLabel}>Error:</Text>
                  <Text style={[styles.statusValue, { color: colors.error }]}>
                    {testResults[0].errorMessage}
                  </Text>
                </View>
              )}

              {testResults[0].executionTime !== undefined && (
                <View style={styles.statusRow}>
                  <Text style={styles.statusLabel}>Time:</Text>
                  <Text style={styles.statusValue}>
                    {testResults[0].executionTime}ms
                  </Text>
                </View>
              )}

              {testResults[0].responseData && (
                <View style={styles.responseContainer}>
                  <Text style={styles.responseTitle}>Response:</Text>
                  <Text style={styles.responseText} numberOfLines={10}>
                    {JSON.stringify(testResults[0].responseData, null, 2)}
                  </Text>
                </View>
              )}
            </>
          )}
        </View>

        {/* Test 2: search-by-name */}
        <View style={styles.testCard}>
          <View style={styles.testHeader}>
            <View style={styles.testHeaderLeft}>
              <IconSymbol
                ios_icon_name={getStatusIcon(testResults[1].status)}
                android_material_icon_name={getStatusIcon(testResults[1].status)}
                size={24}
                color={getStatusColor(testResults[1].status)}
              />
              <Text style={styles.testName}>search-by-name</Text>
            </View>
            <TouchableOpacity
              style={[
                styles.testButton,
                testResults[1].status === 'running' && styles.testButtonDisabled,
              ]}
              onPress={testSearchByName}
              disabled={testResults[1].status === 'running'}
            >
              {testResults[1].status === 'running' ? (
                <ActivityIndicator size="small" color={colors.background} />
              ) : (
                <>
                  <IconSymbol
                    ios_icon_name="magnifyingglass"
                    android_material_icon_name="search"
                    size={16}
                    color={colors.background}
                  />
                  <Text style={styles.testButtonText}>Test</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Search Query:</Text>
            <TextInput
              style={styles.input}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Enter product name..."
              placeholderTextColor={colors.textSecondary}
            />
          </View>

          {testResults[1].status !== 'idle' && (
            <>
              <View style={styles.statusRow}>
                <Text style={styles.statusLabel}>Status:</Text>
                <Text style={[styles.statusValue, { color: getStatusColor(testResults[1].status) }]}>
                  {testResults[1].status.toUpperCase()}
                </Text>
              </View>

              {testResults[1].errorCode && (
                <View style={styles.statusRow}>
                  <Text style={styles.statusLabel}>Error Code:</Text>
                  <Text style={[styles.statusValue, { color: colors.error }]}>
                    {testResults[1].errorCode}
                  </Text>
                </View>
              )}

              {testResults[1].errorMessage && (
                <View style={styles.statusRow}>
                  <Text style={styles.statusLabel}>Error:</Text>
                  <Text style={[styles.statusValue, { color: colors.error }]}>
                    {testResults[1].errorMessage}
                  </Text>
                </View>
              )}

              {testResults[1].executionTime !== undefined && (
                <View style={styles.statusRow}>
                  <Text style={styles.statusLabel}>Time:</Text>
                  <Text style={styles.statusValue}>
                    {testResults[1].executionTime}ms
                  </Text>
                </View>
              )}

              {testResults[1].responseData && (
                <View style={styles.responseContainer}>
                  <Text style={styles.responseTitle}>Response:</Text>
                  <Text style={styles.responseText} numberOfLines={10}>
                    {JSON.stringify(testResults[1].responseData, null, 2)}
                  </Text>
                </View>
              )}
            </>
          )}
        </View>

        {/* Test 3: extract-item */}
        <View style={styles.testCard}>
          <View style={styles.testHeader}>
            <View style={styles.testHeaderLeft}>
              <IconSymbol
                ios_icon_name={getStatusIcon(testResults[2].status)}
                android_material_icon_name={getStatusIcon(testResults[2].status)}
                size={24}
                color={getStatusColor(testResults[2].status)}
              />
              <Text style={styles.testName}>extract-item</Text>
            </View>
            <TouchableOpacity
              style={[
                styles.testButton,
                testResults[2].status === 'running' && styles.testButtonDisabled,
              ]}
              onPress={testExtractItem}
              disabled={testResults[2].status === 'running'}
            >
              {testResults[2].status === 'running' ? (
                <ActivityIndicator size="small" color={colors.background} />
              ) : (
                <>
                  <IconSymbol
                    ios_icon_name="link"
                    android_material_icon_name="link"
                    size={16}
                    color={colors.background}
                  />
                  <Text style={styles.testButtonText}>Test</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Product URL:</Text>
            <TextInput
              style={styles.input}
              value={extractUrl}
              onChangeText={setExtractUrl}
              placeholder="Enter product URL..."
              placeholderTextColor={colors.textSecondary}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {testResults[2].status !== 'idle' && (
            <>
              <View style={styles.statusRow}>
                <Text style={styles.statusLabel}>Status:</Text>
                <Text style={[styles.statusValue, { color: getStatusColor(testResults[2].status) }]}>
                  {testResults[2].status.toUpperCase()}
                </Text>
              </View>

              {testResults[2].errorCode && (
                <View style={styles.statusRow}>
                  <Text style={styles.statusLabel}>Error Code:</Text>
                  <Text style={[styles.statusValue, { color: colors.error }]}>
                    {testResults[2].errorCode}
                  </Text>
                </View>
              )}

              {testResults[2].errorMessage && (
                <View style={styles.statusRow}>
                  <Text style={styles.statusLabel}>Error:</Text>
                  <Text style={[styles.statusValue, { color: colors.error }]}>
                    {testResults[2].errorMessage}
                  </Text>
                </View>
              )}

              {testResults[2].executionTime !== undefined && (
                <View style={styles.statusRow}>
                  <Text style={styles.statusLabel}>Time:</Text>
                  <Text style={styles.statusValue}>
                    {testResults[2].executionTime}ms
                  </Text>
                </View>
              )}

              {testResults[2].responseData && (
                <View style={styles.responseContainer}>
                  <Text style={styles.responseTitle}>Response:</Text>
                  <Text style={styles.responseText} numberOfLines={10}>
                    {JSON.stringify(testResults[2].responseData, null, 2)}
                  </Text>
                </View>
              )}
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
