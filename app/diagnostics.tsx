
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconSymbol } from '@/components/IconSymbol';
import { colors, typography, spacing } from '@/styles/designSystem';
import { verifySupabaseConnection, getSupabaseConfig, testEdgeFunctions } from '@/utils/supabase-connection';
import { useAuth } from '@/contexts/AuthContext';
import Constants from 'expo-constants';

export default function DiagnosticsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<any>(null);
  const [edgeFunctionStatus, setEdgeFunctionStatus] = useState<any>(null);

  useEffect(() => {
    runDiagnostics();
  }, []);

  const runDiagnostics = async () => {
    console.log('[Diagnostics] Running diagnostics...');
    setLoading(true);
    
    try {
      const status = await verifySupabaseConnection();
      setConnectionStatus(status);
      
      const edgeStatus = await testEdgeFunctions();
      setEdgeFunctionStatus(edgeStatus);
    } catch (error) {
      console.error('[Diagnostics] Error running diagnostics:', error);
    } finally {
      setLoading(false);
    }
  };

  const config = getSupabaseConfig();
  const backendUrl = Constants.expoConfig?.extra?.backendUrl;

  const statusIcon = connectionStatus?.connected ? 'check-circle' : 'error';
  const statusColor = connectionStatus?.connected ? '#4CAF50' : '#F44336';
  const statusText = connectionStatus?.connected ? 'Connected' : 'Not Connected';

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Diagnostics',
          headerBackTitle: 'Back',
        }}
      />
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
          <View style={styles.header}>
            <IconSymbol
              ios_icon_name="stethoscope"
              android_material_icon_name="medical-services"
              size={48}
              color={colors.primary}
            />
            <Text style={styles.title}>System Diagnostics</Text>
            <Text style={styles.subtitle}>Connection and configuration status</Text>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.loadingText}>Running diagnostics...</Text>
            </View>
          ) : (
            <>
              {/* Supabase Connection Status */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Supabase Connection</Text>
                
                <View style={[styles.statusCard, { borderColor: statusColor }]}>
                  <View style={styles.statusHeader}>
                    <IconSymbol
                      ios_icon_name="circle.fill"
                      android_material_icon_name={statusIcon}
                      size={24}
                      color={statusColor}
                    />
                    <Text style={[styles.statusText, { color: statusColor }]}>
                      {statusText}
                    </Text>
                  </View>
                  
                  {connectionStatus?.error && (
                    <Text style={styles.errorText}>{connectionStatus.error}</Text>
                  )}
                </View>

                <View style={styles.detailsCard}>
                  <DetailRow label="URL" value={config.url} />
                  <DetailRow label="Anon Key" value={config.hasAnonKey ? 'Configured' : 'Missing'} />
                  <DetailRow 
                    label="Auth" 
                    value={connectionStatus?.authConfigured ? '✅ Working' : '❌ Failed'} 
                  />
                  <DetailRow 
                    label="Database" 
                    value={connectionStatus?.databaseAccessible ? '✅ Accessible' : '❌ Not Accessible'} 
                  />
                </View>
              </View>

              {/* Backend API Status */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Backend API</Text>
                
                <View style={styles.detailsCard}>
                  <DetailRow label="URL" value={backendUrl || 'Not configured'} />
                </View>
              </View>

              {/* Edge Functions Status */}
              {edgeFunctionStatus && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Edge Functions</Text>
                  
                  <View style={styles.detailsCard}>
                    <DetailRow 
                      label="extract-item" 
                      value={edgeFunctionStatus.extractItem ? '✅ Available' : '❌ Not Available'} 
                    />
                    <DetailRow 
                      label="find-alternatives" 
                      value={edgeFunctionStatus.findAlternatives ? '✅ Available' : '❌ Not Available'} 
                    />
                    <DetailRow 
                      label="import-wishlist" 
                      value={edgeFunctionStatus.importWishlist ? '✅ Available' : '❌ Not Available'} 
                    />
                    <DetailRow 
                      label="identify-from-image" 
                      value={edgeFunctionStatus.identifyFromImage ? '✅ Available' : '❌ Not Available'} 
                    />
                  </View>
                </View>
              )}

              {/* User Status */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>User Status</Text>
                
                <View style={styles.detailsCard}>
                  <DetailRow label="Authenticated" value={user ? 'Yes' : 'No'} />
                  {user && (
                    <>
                      <DetailRow label="User ID" value={user.id} />
                      <DetailRow label="Email" value={user.email} />
                    </>
                  )}
                </View>
              </View>

              {/* Actions */}
              <TouchableOpacity
                style={styles.refreshButton}
                onPress={runDiagnostics}
              >
                <IconSymbol
                  ios_icon_name="arrow.clockwise"
                  android_material_icon_name="refresh"
                  size={20}
                  color="#FFFFFF"
                />
                <Text style={styles.refreshButtonText}>Refresh Diagnostics</Text>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue} numberOfLines={1} ellipsizeMode="middle">
        {value}
      </Text>
    </View>
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
    ...typography.h2,
    color: colors.text,
    marginTop: spacing.md,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl * 2,
  },
  loadingText: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.md,
  },
  statusCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.lg,
    borderWidth: 2,
    marginBottom: spacing.md,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    ...typography.h3,
    marginLeft: spacing.sm,
  },
  errorText: {
    ...typography.caption,
    color: '#F44336',
    marginTop: spacing.sm,
  },
  detailsCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.lg,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  detailLabel: {
    ...typography.body,
    color: colors.textSecondary,
    flex: 1,
  },
  detailValue: {
    ...typography.body,
    color: colors.text,
    flex: 2,
    textAlign: 'right',
  },
  refreshButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.lg,
  },
  refreshButtonText: {
    ...typography.button,
    color: '#FFFFFF',
    marginLeft: spacing.sm,
  },
});
