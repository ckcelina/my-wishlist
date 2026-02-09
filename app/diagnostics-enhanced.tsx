
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react';
import { Stack, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconSymbol } from '@/components/IconSymbol';
import { useAuth } from '@/contexts/AuthContext';
import { supabase, SUPABASE_CONNECTION_STATUS } from '@/lib/supabase';
import { colors, typography, spacing } from '@/styles/designSystem';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import * as ImagePicker from 'expo-image-picker';

interface DiagnosticResult {
  name: string;
  status: 'pass' | 'fail' | 'warning' | 'pending';
  message: string;
  details?: string;
}

export default function DiagnosticsEnhancedScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [results, setResults] = useState<DiagnosticResult[]>([]);
  const [testing, setTesting] = useState(false);
  const [progress, setProgress] = useState(0);

  const updateResult = (result: DiagnosticResult) => {
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

  const runDiagnostics = async () => {
    console.log('[Diagnostics] Starting comprehensive diagnostics');
    setTesting(true);
    setResults([]);
    setProgress(0);

    const totalTests = 19; // Updated count
    let currentTest = 0;

    const incrementProgress = () => {
      currentTest++;
      setProgress((currentTest / totalTests) * 100);
    };

    // Get Supabase configuration
    const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl;
    const supabaseKey = Constants.expoConfig?.extra?.supabaseAnonKey;

    // Test 1: Supabase Connection
    try {
      updateResult({ name: 'Supabase Connection', status: 'pending', message: 'Testing...' });
      
      if (!supabaseUrl || !supabaseKey) {
        updateResult({
          name: 'Supabase Connection',
          status: 'fail',
          message: 'Supabase credentials missing',
          details: 'Check app.config.js extra config',
        });
      } else {
        const { data, error } = await supabase.from('wishlists').select('count').limit(1);
        
        if (error) {
          updateResult({
            name: 'Supabase Connection',
            status: 'fail',
            message: 'Connection failed',
            details: error.message,
          });
        } else {
          updateResult({
            name: 'Supabase Connection',
            status: 'pass',
            message: 'Connected successfully',
            details: `URL: ${supabaseUrl}`,
          });
        }
      }
    } catch (error) {
      updateResult({
        name: 'Supabase Connection',
        status: 'fail',
        message: 'Connection error',
        details: error instanceof Error ? error.message : String(error),
      });
    }
    incrementProgress();

    // Test 2: Authentication Status
    try {
      updateResult({ name: 'Authentication', status: 'pending', message: 'Checking...' });
      
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        updateResult({
          name: 'Authentication',
          status: 'fail',
          message: 'Auth check failed',
          details: error.message,
        });
      } else if (session && user) {
        updateResult({
          name: 'Authentication',
          status: 'pass',
          message: 'User authenticated',
          details: `User ID: ${user.id.substring(0, 8)}...`,
        });
      } else {
        updateResult({
          name: 'Authentication',
          status: 'warning',
          message: 'Not authenticated',
          details: 'Sign in to test full functionality',
        });
      }
    } catch (error) {
      updateResult({
        name: 'Authentication',
        status: 'fail',
        message: 'Auth error',
        details: error instanceof Error ? error.message : String(error),
      });
    }
    incrementProgress();

    // Test 2.5: Auth Ping (Edge Function Auth Verification)
    if (user && supabaseUrl && supabaseKey) {
      try {
        updateResult({ name: 'Edge Function Auth', status: 'pending', message: 'Testing auth-ping...' });
        
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session || !session.access_token) {
          updateResult({
            name: 'Edge Function Auth',
            status: 'fail',
            message: 'No valid session',
            details: 'Session is missing. Try signing out and back in.',
          });
        } else {
          // Call auth-ping Edge Function directly
          const response = await fetch(`${supabaseUrl}/functions/v1/auth-ping`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': supabaseKey,
              'Authorization': `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({}),
          });

          const data = await response.json();

          if (response.ok && data.status === 'ok') {
            updateResult({
              name: 'Edge Function Auth',
              status: 'pass',
              message: 'Auth ping successful',
              details: `User ID verified: ${data.userId.substring(0, 8)}...`,
            });
          } else {
            updateResult({
              name: 'Edge Function Auth',
              status: 'fail',
              message: 'Auth ping failed',
              details: data.message || 'Session is not valid or function not deployed.',
            });
          }
        }
      } catch (error: any) {
        updateResult({
          name: 'Edge Function Auth',
          status: 'fail',
          message: 'Auth ping error',
          details: error.message || 'Failed to call auth-ping Edge Function',
        });
      }
    } else {
      updateResult({
        name: 'Edge Function Auth',
        status: 'warning',
        message: 'Not logged in',
        details: 'Sign in to test Edge Function authentication',
      });
    }
    incrementProgress();

    // Test 3: Database Schema
    try {
      updateResult({ name: 'Database Schema', status: 'pending', message: 'Verifying...' });
      
      const tables = [
        'wishlists',
        'wishlist_items',
        'price_history',
        'shared_wishlists',
        'user_settings',
        'user_location',
      ];
      
      const tableChecks = await Promise.all(
        tables.map(async (table) => {
          const { error } = await supabase.from(table).select('count').limit(1);
          return { table, exists: !error };
        })
      );
      
      const missingTables = tableChecks.filter(t => !t.exists).map(t => t.table);
      
      if (missingTables.length === 0) {
        updateResult({
          name: 'Database Schema',
          status: 'pass',
          message: 'All tables exist',
          details: `Verified ${tables.length} tables`,
        });
      } else {
        updateResult({
          name: 'Database Schema',
          status: 'fail',
          message: 'Missing tables',
          details: missingTables.join(', '),
        });
      }
    } catch (error) {
      updateResult({
        name: 'Database Schema',
        status: 'fail',
        message: 'Schema check failed',
        details: error instanceof Error ? error.message : String(error),
      });
    }
    incrementProgress();

    // Test 4: Wishlists CRUD
    if (user) {
      try {
        updateResult({ name: 'Wishlists CRUD', status: 'pending', message: 'Testing...' });
        
        const { data: wishlists, error: fetchError } = await supabase
          .from('wishlists')
          .select('*')
          .eq('user_id', user.id);
        
        if (fetchError) {
          updateResult({
            name: 'Wishlists CRUD',
            status: 'fail',
            message: 'Fetch failed',
            details: fetchError.message,
          });
        } else {
          updateResult({
            name: 'Wishlists CRUD',
            status: 'pass',
            message: 'CRUD operations working',
            details: `Found ${wishlists?.length || 0} wishlists`,
          });
        }
      } catch (error) {
        updateResult({
          name: 'Wishlists CRUD',
          status: 'fail',
          message: 'CRUD test failed',
          details: error instanceof Error ? error.message : String(error),
        });
      }
    } else {
      updateResult({
        name: 'Wishlists CRUD',
        status: 'warning',
        message: 'Skipped',
        details: 'Sign in to test',
      });
    }
    incrementProgress();

    // Helper function to check Edge Function availability
    const checkEdgeFunction = async (functionName: string): Promise<DiagnosticResult> => {
      if (!supabaseUrl || !supabaseKey) {
        return {
          name: `Edge Function: ${functionName}`,
          status: 'fail',
          message: 'Supabase not configured',
          details: 'Check app.config.js',
        };
      }

      try {
        // Make a test call to the Edge Function
        const response = await fetch(`${supabaseUrl}/functions/v1/${functionName}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseKey,
          },
          body: JSON.stringify({}),
        });

        // 200 = function works
        // 401 = function exists but requires auth (AVAILABLE)
        // 400 = function exists but bad request (AVAILABLE)
        // 405 = function exists but wrong method (AVAILABLE)
        // 404 = function not deployed (NOT AVAILABLE)
        
        if (response.status === 200) {
          return {
            name: `Edge Function: ${functionName}`,
            status: 'pass',
            message: 'Available',
            details: 'Function is deployed and responding',
          };
        } else if (response.status === 401 || response.status === 400 || response.status === 405) {
          return {
            name: `Edge Function: ${functionName}`,
            status: 'pass',
            message: 'Available',
            details: `Function is deployed (status ${response.status})`,
          };
        } else if (response.status === 404) {
          return {
            name: `Edge Function: ${functionName}`,
            status: 'fail',
            message: 'Not deployed',
            details: 'Function not found on server',
          };
        } else {
          return {
            name: `Edge Function: ${functionName}`,
            status: 'warning',
            message: 'Deployed but error',
            details: `Status: ${response.status}`,
          };
        }
      } catch (error: any) {
        return {
          name: `Edge Function: ${functionName}`,
          status: 'fail',
          message: 'Not available',
          details: error.message || 'Function invocation failed',
        };
      }
    };

    // Test 5: Edge Function - extract-item
    updateResult({ name: 'Edge Function: extract-item', status: 'pending', message: 'Testing...' });
    const extractItemResult = await checkEdgeFunction('extract-item');
    updateResult(extractItemResult);
    incrementProgress();

    // Test 6: Edge Function - identify-from-image
    updateResult({ name: 'Edge Function: identify-from-image', status: 'pending', message: 'Testing...' });
    const identifyFromImageResult = await checkEdgeFunction('identify-from-image');
    updateResult(identifyFromImageResult);
    incrementProgress();

    // Test 7: Edge Function - find-alternatives
    updateResult({ name: 'Edge Function: find-alternatives', status: 'pending', message: 'Testing...' });
    const findAlternativesResult = await checkEdgeFunction('find-alternatives');
    updateResult(findAlternativesResult);
    incrementProgress();

    // Test 8: Edge Function - import-wishlist
    updateResult({ name: 'Edge Function: import-wishlist', status: 'pending', message: 'Testing...' });
    const importWishlistResult = await checkEdgeFunction('import-wishlist');
    updateResult(importWishlistResult);
    incrementProgress();

    // Test 9: Notifications Permission
    try {
      updateResult({ name: 'Notifications', status: 'pending', message: 'Checking...' });
      
      const { status } = await Notifications.getPermissionsAsync();
      
      if (status === 'granted') {
        updateResult({
          name: 'Notifications',
          status: 'pass',
          message: 'Permission granted',
          details: 'Push notifications enabled',
        });
      } else {
        updateResult({
          name: 'Notifications',
          status: 'warning',
          message: 'Permission not granted',
          details: `Status: ${status}`,
        });
      }
    } catch (error) {
      updateResult({
        name: 'Notifications',
        status: 'fail',
        message: 'Permission check failed',
        details: error instanceof Error ? error.message : String(error),
      });
    }
    incrementProgress();

    // Test 10: Image Picker Permission
    try {
      updateResult({ name: 'Image Picker', status: 'pending', message: 'Checking...' });
      
      const { status } = await ImagePicker.getMediaLibraryPermissionsAsync();
      
      if (status === 'granted') {
        updateResult({
          name: 'Image Picker',
          status: 'pass',
          message: 'Permission granted',
          details: 'Image selection enabled',
        });
      } else {
        updateResult({
          name: 'Image Picker',
          status: 'warning',
          message: 'Permission not granted',
          details: `Status: ${status}`,
        });
      }
    } catch (error) {
      updateResult({
        name: 'Image Picker',
        status: 'fail',
        message: 'Permission check failed',
        details: error instanceof Error ? error.message : String(error),
      });
    }
    incrementProgress();

    // Test 11: Storage (Supabase Storage)
    try {
      updateResult({ name: 'Storage', status: 'pending', message: 'Testing...' });
      
      const { data: buckets, error } = await supabase.storage.listBuckets();
      
      if (error) {
        updateResult({
          name: 'Storage',
          status: 'fail',
          message: 'Storage check failed',
          details: error.message,
        });
      } else {
        updateResult({
          name: 'Storage',
          status: 'pass',
          message: 'Storage accessible',
          details: `Found ${buckets?.length || 0} buckets`,
        });
      }
    } catch (error) {
      updateResult({
        name: 'Storage',
        status: 'fail',
        message: 'Storage error',
        details: error instanceof Error ? error.message : String(error),
      });
    }
    incrementProgress();

    // Test 12: Deep Linking
    try {
      updateResult({ name: 'Deep Linking', status: 'pending', message: 'Checking...' });
      
      const scheme = Constants.expoConfig?.scheme;
      
      if (scheme) {
        updateResult({
          name: 'Deep Linking',
          status: 'pass',
          message: 'Scheme configured',
          details: `Scheme: ${scheme}`,
        });
      } else {
        updateResult({
          name: 'Deep Linking',
          status: 'warning',
          message: 'No scheme configured',
          details: 'Check app.json',
        });
      }
    } catch (error) {
      updateResult({
        name: 'Deep Linking',
        status: 'fail',
        message: 'Deep linking check failed',
        details: error instanceof Error ? error.message : String(error),
      });
    }
    incrementProgress();

    // Test 13: Platform Detection
    updateResult({
      name: 'Platform',
      status: 'pass',
      message: `Running on ${Platform.OS}`,
      details: `Version: ${Platform.Version}`,
    });
    incrementProgress();

    // Test 14: Environment Variables
    try {
      updateResult({ name: 'Environment', status: 'pending', message: 'Checking...' });
      
      const requiredVars = [
        'supabaseUrl',
        'supabaseAnonKey',
      ];
      
      const missing = requiredVars.filter(
        varName => !Constants.expoConfig?.extra?.[varName]
      );
      
      if (missing.length === 0) {
        updateResult({
          name: 'Environment',
          status: 'pass',
          message: 'All variables configured',
          details: `Checked ${requiredVars.length} variables`,
        });
      } else {
        updateResult({
          name: 'Environment',
          status: 'fail',
          message: 'Missing variables',
          details: missing.join(', '),
        });
      }
    } catch (error) {
      updateResult({
        name: 'Environment',
        status: 'fail',
        message: 'Environment check failed',
        details: error instanceof Error ? error.message : String(error),
      });
    }
    incrementProgress();

    // Test 15: Network Connectivity
    try {
      updateResult({ name: 'Network', status: 'pending', message: 'Testing...' });
      
      const response = await fetch('https://www.google.com', {
        method: 'HEAD',
        cache: 'no-cache',
      });
      
      if (response.ok) {
        updateResult({
          name: 'Network',
          status: 'pass',
          message: 'Internet connected',
          details: 'Network is reachable',
        });
      } else {
        updateResult({
          name: 'Network',
          status: 'warning',
          message: 'Network issues',
          details: `Status: ${response.status}`,
        });
      }
    } catch (error) {
      updateResult({
        name: 'Network',
        status: 'fail',
        message: 'No internet connection',
        details: 'Check your network',
      });
    }
    incrementProgress();

    // Test 16: User Settings
    if (user) {
      try {
        updateResult({ name: 'User Settings', status: 'pending', message: 'Checking...' });
        
        const { data, error } = await supabase
          .from('user_settings')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();
        
        if (error) {
          updateResult({
            name: 'User Settings',
            status: 'fail',
            message: 'Settings check failed',
            details: error.message,
          });
        } else if (data) {
          updateResult({
            name: 'User Settings',
            status: 'pass',
            message: 'Settings exist',
            details: `Currency: ${data.default_currency}`,
          });
        } else {
          updateResult({
            name: 'User Settings',
            status: 'warning',
            message: 'No settings found',
            details: 'Will be created on first use',
          });
        }
      } catch (error) {
        updateResult({
          name: 'User Settings',
          status: 'fail',
          message: 'Settings error',
          details: error instanceof Error ? error.message : String(error),
        });
      }
    } else {
      updateResult({
        name: 'User Settings',
        status: 'warning',
        message: 'Skipped',
        details: 'Sign in to test',
      });
    }
    incrementProgress();

    // Test 17: Share Sheet Configuration
    try {
      updateResult({ name: 'Share Sheet', status: 'pending', message: 'Checking...' });
      
      const intentFilters = Constants.expoConfig?.android?.intentFilters;
      const associatedDomains = Constants.expoConfig?.ios?.associatedDomains;
      
      const hasAndroidConfig = intentFilters && intentFilters.length > 0;
      const hasIOSConfig = associatedDomains && associatedDomains.length > 0;
      
      if (Platform.OS === 'android' && hasAndroidConfig) {
        updateResult({
          name: 'Share Sheet',
          status: 'pass',
          message: 'Android configured',
          details: `${intentFilters.length} intent filters`,
        });
      } else if (Platform.OS === 'ios' && hasIOSConfig) {
        updateResult({
          name: 'Share Sheet',
          status: 'pass',
          message: 'iOS configured',
          details: `${associatedDomains.length} domains`,
        });
      } else {
        updateResult({
          name: 'Share Sheet',
          status: 'warning',
          message: 'Configuration incomplete',
          details: 'Check app.json',
        });
      }
    } catch (error) {
      updateResult({
        name: 'Share Sheet',
        status: 'fail',
        message: 'Config check failed',
        details: error instanceof Error ? error.message : String(error),
      });
    }
    incrementProgress();

    // Test 18: Camera Permission
    try {
      updateResult({ name: 'Camera Permission', status: 'pending', message: 'Checking...' });
      
      const { status } = await ImagePicker.getCameraPermissionsAsync();
      
      if (status === 'granted') {
        updateResult({
          name: 'Camera Permission',
          status: 'pass',
          message: 'Permission granted',
          details: 'Camera access enabled',
        });
      } else {
        updateResult({
          name: 'Camera Permission',
          status: 'warning',
          message: 'Permission not granted',
          details: `Status: ${status}`,
        });
      }
    } catch (error) {
      updateResult({
        name: 'Camera Permission',
        status: 'fail',
        message: 'Permission check failed',
        details: error instanceof Error ? error.message : String(error),
      });
    }
    incrementProgress();

    // Test 19: Edge Functions Base URL
    try {
      updateResult({ name: 'Edge Functions URL', status: 'pending', message: 'Checking...' });
      
      if (!supabaseUrl) {
        updateResult({
          name: 'Edge Functions URL',
          status: 'fail',
          message: 'Supabase URL not configured',
          details: 'Check app.config.js',
        });
      } else {
        const edgeFunctionsUrl = `${supabaseUrl}/functions/v1`;
        updateResult({
          name: 'Edge Functions URL',
          status: 'pass',
          message: 'Correctly configured',
          details: edgeFunctionsUrl,
        });
      }
    } catch (error) {
      updateResult({
        name: 'Edge Functions URL',
        status: 'fail',
        message: 'Configuration check failed',
        details: error instanceof Error ? error.message : String(error),
      });
    }
    incrementProgress();

    setTesting(false);
    console.log('[Diagnostics] Diagnostics complete');
  };

  const getStatusColor = (status: DiagnosticResult['status']) => {
    const statusColorText = status === 'pass' ? colors.success : status === 'fail' ? colors.error : status === 'warning' ? colors.warning : colors.textSecondary;
    return statusColorText;
  };

  const getStatusIcon = (status: DiagnosticResult['status']) => {
    const iconName = status === 'pass' ? 'check-circle' : status === 'fail' ? 'error' : status === 'warning' ? 'warning' : 'schedule';
    return iconName;
  };

  const passCount = results.filter(r => r.status === 'pass').length;
  const failCount = results.filter(r => r.status === 'fail').length;
  const warningCount = results.filter(r => r.status === 'warning').length;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Stack.Screen
        options={{
          title: 'System Diagnostics',
          headerShown: true,
          headerBackTitle: 'Back',
        }}
      />
      
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <IconSymbol
            ios_icon_name="stethoscope"
            android_material_icon_name="medical-services"
            size={48}
            color={colors.primary}
          />
          <Text style={styles.title}>System Diagnostics</Text>
          <Text style={styles.subtitle}>
            Comprehensive health check for all app systems
          </Text>
        </View>

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
                ios_icon_name="exclamationmark.triangle.fill"
                android_material_icon_name="warning"
                size={24}
                color={colors.warning}
              />
              <Text style={styles.summaryText}>{warningCount} Warnings</Text>
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
              </View>
              <Text style={[styles.resultMessage, { color: statusColor }]}>
                {result.message}
              </Text>
              {result.details && (
                <Text style={styles.resultDetails}>{result.details}</Text>
              )}
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
              Tap "Run Diagnostics" to start testing
            </Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.button, testing && styles.buttonDisabled]}
          onPress={runDiagnostics}
          disabled={testing}
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
              <Text style={styles.buttonText}>Run Diagnostics</Text>
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
  resultMessage: {
    ...typography.body,
    marginBottom: spacing.xs,
  },
  resultDetails: {
    ...typography.caption,
    color: colors.textSecondary,
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
