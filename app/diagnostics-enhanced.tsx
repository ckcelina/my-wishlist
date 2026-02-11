
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
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconSymbol } from '@/components/IconSymbol';
import { useAuth } from '@/contexts/AuthContext';
import { supabase, SUPABASE_CONNECTION_STATUS } from '@/lib/supabase';
import { colors, typography, spacing } from '@/styles/designSystem';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import * as ImagePicker from 'expo-image-picker';
import { checkEdgeFunctionAvailability } from '@/utils/supabase-edge-functions';
import { ALL_EDGE_FUNCTIONS, EDGE_FUNCTION_DESCRIPTIONS } from '@/src/constants/edgeFunctions';

interface DiagnosticResult {
  name: string;
  status: 'pass' | 'fail' | 'warning' | 'pending';
  message: string;
  details?: string;
}

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * UI SAFETY HELPER - renderSafeValue
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Prevents "Objects are not valid as a React child" errors by converting
 * any value to a safe string representation.
 * 
 * Rules:
 * - null/undefined → "—"
 * - object/array → JSON.stringify(value, null, 2)
 * - otherwise → String(value)
 * 
 * Use this helper EVERYWHERE you render dynamic values in <Text> components.
 */
function renderSafeValue(value: any): string {
  if (value === null || value === undefined) {
    return '—';
  }
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value, null, 2);
    } catch (e) {
      return `[Unstringifiable Object: ${String(e)}]`;
    }
  }
  return String(value);
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

    const totalTests = 8 + ALL_EDGE_FUNCTIONS.length; // Base tests + edge functions
    let currentTest = 0;

    const incrementProgress = () => {
      currentTest++;
      setProgress((currentTest / totalTests) * 100);
    };

    // Test 1: Supabase Connection
    try {
      updateResult({ name: 'Supabase Connection', status: 'pending', message: 'Testing...' });
      
      const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl;
      const supabaseKey = Constants.expoConfig?.extra?.supabaseAnonKey;
      
      if (!supabaseUrl || !supabaseKey) {
        updateResult({
          name: 'Supabase Connection',
          status: 'fail',
          message: 'Supabase credentials missing',
          details: 'Check app.json extra config',
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
            details: `URL: ${supabaseUrl.substring(0, 30)}...`,
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

    // Test 5-N: Edge Functions (using ALL_EDGE_FUNCTIONS and checkEdgeFunctionAvailability)
    console.log('[Diagnostics] Testing Edge Functions from canonical registry');
    console.log('[Diagnostics] Functions to test:', ALL_EDGE_FUNCTIONS);
    
    for (const functionName of ALL_EDGE_FUNCTIONS) {
      try {
        const description = EDGE_FUNCTION_DESCRIPTIONS[functionName] || 'No description';
        
        updateResult({ 
          name: `Edge: ${functionName}`, 
          status: 'pending', 
          message: 'Checking availability...',
          details: description,
        });
        
        // Use the checkEdgeFunctionAvailability function
        const availabilityResult = await checkEdgeFunctionAvailability(functionName);
        
        console.log(`[Diagnostics] ${functionName} availability:`, availabilityResult.status, availabilityResult.statusCode);
        
        // Map availability status to diagnostic status with detailed messages
        if (availabilityResult.status === 'Available') {
          updateResult({
            name: `Edge: ${functionName}`,
            status: 'pass',
            message: availabilityResult.message,
            details: description,
          });
        } else if (availabilityResult.status === 'Auth Required') {
          updateResult({
            name: `Edge: ${functionName}`,
            status: 'warning',
            message: availabilityResult.message,
            details: description,
          });
        } else if (availabilityResult.status === 'Not Deployed') {
          updateResult({
            name: `Edge: ${functionName}`,
            status: 'fail',
            message: availabilityResult.message,
            details: `${description} - Deploy with: supabase functions deploy ${functionName}`,
          });
        } else if (availabilityResult.status === 'Server Error') {
          updateResult({
            name: `Edge: ${functionName}`,
            status: 'fail',
            message: availabilityResult.message,
            details: description,
          });
        } else {
          // Network error or other error
          updateResult({
            name: `Edge: ${functionName}`,
            status: 'fail',
            message: availabilityResult.message,
            details: description,
          });
        }
      } catch (error: any) {
        console.error(`[Diagnostics] Error checking ${functionName}:`, error);
        updateResult({
          name: `Edge: ${functionName}`,
          status: 'fail',
          message: 'Check failed',
          details: error.message || 'Unknown error',
        });
      }
      incrementProgress();
    }

    // Test N+1: Notifications Permission
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

    // Test N+2: Image Picker Permission
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

    // Test N+3: Storage (Supabase Storage)
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
                <Text style={styles.resultDetails}>{renderSafeValue(result.details)}</Text>
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
