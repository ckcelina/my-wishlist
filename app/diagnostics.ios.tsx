
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { IconSymbol } from '@/components/IconSymbol';
import { colors, typography, spacing, containerStyles } from '@/styles/designSystem';
import { getDiagnosticLogs, clearDiagnosticLogs, formatDiagnostics } from '@/utils/observability';

interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  type: 'event' | 'error';
  message: string;
  data?: any;
}

function resolveImageSource(source: string | number | any | undefined): any {
  if (!source) return { uri: '' };
  if (typeof source === 'string') return { uri: source };
  return source;
}

export default function DiagnosticsScreen() {
  const router = useRouter();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  useEffect(() => {
    loadLogs();
  }, []);

  async function loadLogs() {
    setLoading(true);
    try {
      const diagnosticLogs = await getDiagnosticLogs();
      setLogs(diagnosticLogs);
    } catch (error) {
      console.error('[Diagnostics] Failed to load logs:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleCopyDiagnostics() {
    try {
      const formatted = formatDiagnostics(logs);
      await Clipboard.setStringAsync(formatted);
      Alert.alert('Copied', 'Diagnostics copied to clipboard');
    } catch (error) {
      Alert.alert('Error', 'Failed to copy diagnostics');
    }
  }

  async function handleClearLogs() {
    Alert.alert(
      'Clear Logs',
      'Are you sure you want to clear all diagnostic logs?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            await clearDiagnosticLogs();
            setLogs([]);
          },
        },
      ]
    );
  }

  function getLevelColor(level: string) {
    switch (level) {
      case 'error':
        return colors.error;
      case 'warn':
        return colors.warning;
      default:
        return colors.textSecondary;
    }
  }

  function getLevelIcon(level: string) {
    switch (level) {
      case 'error':
        return 'error';
      case 'warn':
        return 'warning';
      default:
        return 'info';
    }
  }

  const totalErrors = logs.filter(l => l.level === 'error').length;
  const totalWarnings = logs.filter(l => l.level === 'warn').length;
  const totalEvents = logs.filter(l => l.type === 'event').length;

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Diagnostics',
          headerShown: true,
        }}
      />
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{logs.length}</Text>
              <Text style={styles.statLabel}>Total Logs</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statValue, { color: colors.error }]}>{totalErrors}</Text>
              <Text style={styles.statLabel}>Errors</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statValue, { color: colors.warning }]}>{totalWarnings}</Text>
              <Text style={styles.statLabel}>Warnings</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statValue, { color: colors.primary }]}>{totalEvents}</Text>
              <Text style={styles.statLabel}>Events</Text>
            </View>
          </View>

          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.actionButton, styles.primaryButton]}
              onPress={handleCopyDiagnostics}
            >
              <IconSymbol
                ios_icon_name="doc.on.doc.fill"
                android_material_icon_name="content-copy"
                size={18}
                color={colors.textInverse}
              />
              <Text style={styles.primaryButtonText}>Copy Diagnostics</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.secondaryButton]}
              onPress={handleClearLogs}
            >
              <IconSymbol
                ios_icon_name="trash.fill"
                android_material_icon_name="delete"
                size={18}
                color={colors.error}
              />
              <Text style={styles.secondaryButtonText}>Clear</Text>
            </TouchableOpacity>
          </View>
        </View>

        {loading ? (
          <View style={containerStyles.center}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : logs.length === 0 ? (
          <View style={containerStyles.center}>
            <IconSymbol
              ios_icon_name="checkmark.circle.fill"
              android_material_icon_name="check-circle"
              size={64}
              color={colors.success}
            />
            <Text style={styles.emptyTitle}>No logs yet</Text>
            <Text style={styles.emptyDescription}>
              Diagnostic logs will appear here as you use the app
            </Text>
          </View>
        ) : (
          <ScrollView style={styles.logsList}>
            {logs.map((log, index) => {
              const isExpanded = expandedIndex === index;
              const levelColor = getLevelColor(log.level);
              const levelIcon = getLevelIcon(log.level);
              const time = new Date(log.timestamp).toLocaleString();

              return (
                <TouchableOpacity
                  key={index}
                  style={styles.logItem}
                  onPress={() => setExpandedIndex(isExpanded ? null : index)}
                >
                  <View style={styles.logHeader}>
                    <IconSymbol
                      ios_icon_name={levelIcon}
                      android_material_icon_name={levelIcon}
                      size={20}
                      color={levelColor}
                    />
                    <View style={styles.logHeaderText}>
                      <Text style={styles.logMessage} numberOfLines={isExpanded ? undefined : 1}>
                        {log.message}
                      </Text>
                      <Text style={styles.logTime}>{time}</Text>
                    </View>
                    <View style={[styles.levelBadge, { backgroundColor: `${levelColor}20` }]}>
                      <Text style={[styles.levelText, { color: levelColor }]}>
                        {log.level.toUpperCase()}
                      </Text>
                    </View>
                  </View>

                  {isExpanded && log.data && (
                    <View style={styles.logData}>
                      <Text style={styles.logDataText}>
                        {JSON.stringify(log.data, null, 2)}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.backgroundAlt,
    padding: spacing.sm,
    borderRadius: 12,
    alignItems: 'center',
  },
  statValue: {
    ...typography.titleLarge,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  statLabel: {
    ...typography.labelSmall,
    color: colors.textSecondary,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 12,
    gap: spacing.xs,
  },
  primaryButton: {
    backgroundColor: colors.primary,
  },
  secondaryButton: {
    backgroundColor: colors.backgroundAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  primaryButtonText: {
    ...typography.labelMedium,
    color: colors.textInverse,
    fontWeight: '600',
  },
  secondaryButtonText: {
    ...typography.labelMedium,
    color: colors.error,
    fontWeight: '600',
  },
  logsList: {
    flex: 1,
  },
  logItem: {
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  logHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  logHeaderText: {
    flex: 1,
  },
  logMessage: {
    ...typography.bodyMedium,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  logTime: {
    ...typography.labelSmall,
    color: colors.textTertiary,
  },
  levelBadge: {
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: 6,
  },
  levelText: {
    ...typography.labelSmall,
    fontWeight: '700',
    fontSize: 10,
  },
  logData: {
    marginTop: spacing.sm,
    padding: spacing.sm,
    backgroundColor: colors.backgroundAlt,
    borderRadius: 8,
  },
  logDataText: {
    ...typography.bodySmall,
    fontFamily: 'monospace',
    color: colors.textSecondary,
  },
  emptyTitle: {
    ...typography.titleMedium,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  emptyDescription: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
