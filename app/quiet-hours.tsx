
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { useAppTheme } from '@/contexts/ThemeContext';
import { IconSymbol } from '@/components/IconSymbol';
import { Card } from '@/components/design-system/Card';
import { Button } from '@/components/design-system/Button';
import { PressableScale } from '@/components/design-system/PressableScale';
import { colors, typography, spacing, containerStyles } from '@/styles/designSystem';
import { authenticatedGet, authenticatedPut } from '@/utils/api';
import { useHaptics } from '@/hooks/useHaptics';
import DateTimePicker from '@react-native-community/datetimepicker';

interface QuietHoursSettings {
  enabled: boolean;
  startTime: string | null;
  endTime: string | null;
}

export default function QuietHoursScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { theme, isDark } = useAppTheme();
  const haptics = useHaptics();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [startTime, setStartTime] = useState<Date>(new Date());
  const [endTime, setEndTime] = useState<Date>(new Date());
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  const fetchSettings = useCallback(async () => {
    console.log('[QuietHoursScreen] Fetching quiet hours settings');
    try {
      const data = await authenticatedGet<QuietHoursSettings>('/api/users/quiet-hours');
      console.log('[QuietHoursScreen] Settings fetched:', data);

      setEnabled(data.enabled || false);

      if (data.startTime) {
        const [hours, minutes] = data.startTime.split(':').map(Number);
        const start = new Date();
        start.setHours(hours, minutes, 0, 0);
        setStartTime(start);
      }

      if (data.endTime) {
        const [hours, minutes] = data.endTime.split(':').map(Number);
        const end = new Date();
        end.setHours(hours, minutes, 0, 0);
        setEndTime(end);
      }
    } catch (error) {
      console.error('[QuietHoursScreen] Error fetching settings:', error);
      Alert.alert('Error', 'Failed to load quiet hours settings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchSettings();
    }
  }, [user, fetchSettings]);

  const formatTime = (date: Date): string => {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const formatTimeDisplay = (date: Date): string => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const handleSave = async () => {
    console.log('[QuietHoursScreen] User tapped Save');
    haptics.light();

    if (enabled && !startTime && !endTime) {
      Alert.alert('Error', 'Please set start and end times for quiet hours');
      return;
    }

    setSaving(true);
    try {
      const updates: QuietHoursSettings = {
        enabled,
        startTime: enabled ? formatTime(startTime) : null,
        endTime: enabled ? formatTime(endTime) : null,
      };

      console.log('[QuietHoursScreen] Saving settings:', updates);
      await authenticatedPut('/api/users/quiet-hours', updates);

      console.log('[QuietHoursScreen] Settings saved successfully');
      haptics.success();
      Alert.alert('Success', 'Quiet hours settings saved', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error) {
      console.error('[QuietHoursScreen] Error saving settings:', error);
      haptics.error();
      Alert.alert('Error', 'Failed to save quiet hours settings');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = (value: boolean) => {
    console.log('[QuietHoursScreen] User toggled quiet hours:', value);
    haptics.selection();
    setEnabled(value);
  };

  const handleStartTimeChange = (event: any, selectedDate?: Date) => {
    setShowStartPicker(Platform.OS === 'ios');
    if (selectedDate) {
      console.log('[QuietHoursScreen] Start time changed:', formatTime(selectedDate));
      haptics.selection();
      setStartTime(selectedDate);
    }
  };

  const handleEndTimeChange = (event: any, selectedDate?: Date) => {
    setShowEndPicker(Platform.OS === 'ios');
    if (selectedDate) {
      console.log('[QuietHoursScreen] End time changed:', formatTime(selectedDate));
      haptics.selection();
      setEndTime(selectedDate);
    }
  };

  const startTimeText = formatTimeDisplay(startTime);
  const endTimeText = formatTimeDisplay(endTime);

  if (loading) {
    return (
      <>
        <Stack.Screen
          options={{
            headerShown: true,
            title: 'Quiet Hours',
            headerBackTitle: 'Back',
          }}
        />
        <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={[]}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.accent} />
          </View>
        </SafeAreaView>
      </>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Quiet Hours',
          headerBackTitle: 'Back',
        }}
      />
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={[]}>
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <Card style={styles.card}>
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <IconSymbol
                  ios_icon_name="moon"
                  android_material_icon_name="bedtime"
                  size={24}
                  color={theme.colors.textSecondary}
                />
                <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                  Enable Quiet Hours
                </Text>
              </View>
              <Switch
                value={enabled}
                onValueChange={handleToggle}
                trackColor={{ false: theme.colors.border, true: theme.colors.accent + '80' }}
                thumbColor={enabled ? theme.colors.accent : theme.colors.card}
              />
            </View>

            <Text style={[styles.description, { color: theme.colors.textSecondary }]}>
              During quiet hours, notifications will be queued and sent after the quiet period ends.
            </Text>
          </Card>

          {enabled && (
            <>
              <Card style={styles.card}>
                <Text style={[styles.cardTitle, { color: theme.colors.text }]}>Start Time</Text>
                <PressableScale
                  style={[styles.timePicker, { backgroundColor: theme.colors.background, borderColor: theme.colors.border }]}
                  onPress={() => {
                    haptics.light();
                    setShowStartPicker(true);
                  }}
                  hapticFeedback="light"
                >
                  <IconSymbol
                    ios_icon_name="clock"
                    android_material_icon_name="access-time"
                    size={20}
                    color={theme.colors.textSecondary}
                  />
                  <Text style={[styles.timeText, { color: theme.colors.text }]}>{startTimeText}</Text>
                </PressableScale>
              </Card>

              <Card style={styles.card}>
                <Text style={[styles.cardTitle, { color: theme.colors.text }]}>End Time</Text>
                <PressableScale
                  style={[styles.timePicker, { backgroundColor: theme.colors.background, borderColor: theme.colors.border }]}
                  onPress={() => {
                    haptics.light();
                    setShowEndPicker(true);
                  }}
                  hapticFeedback="light"
                >
                  <IconSymbol
                    ios_icon_name="clock"
                    android_material_icon_name="access-time"
                    size={20}
                    color={theme.colors.textSecondary}
                  />
                  <Text style={[styles.timeText, { color: theme.colors.text }]}>{endTimeText}</Text>
                </PressableScale>
              </Card>

              {showStartPicker && (
                <DateTimePicker
                  value={startTime}
                  mode="time"
                  is24Hour={false}
                  display="default"
                  onChange={handleStartTimeChange}
                />
              )}

              {showEndPicker && (
                <DateTimePicker
                  value={endTime}
                  mode="time"
                  is24Hour={false}
                  display="default"
                  onChange={handleEndTimeChange}
                />
              )}
            </>
          )}

          <View style={styles.buttonContainer}>
            <Button
              title={saving ? 'Saving...' : 'Save Settings'}
              onPress={handleSave}
              variant="primary"
              disabled={saving}
            />
          </View>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    ...containerStyles.screen,
    paddingTop: Platform.OS === 'android' ? 48 : 0,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
  },
  card: {
    marginBottom: spacing.md,
  },
  section: {
    ...containerStyles.spaceBetween,
    marginBottom: spacing.sm,
  },
  sectionHeader: {
    ...containerStyles.row,
  },
  sectionTitle: {
    ...typography.bodyLarge,
    fontWeight: '600',
  },
  description: {
    ...typography.bodyMedium,
    lineHeight: 20,
  },
  cardTitle: {
    ...typography.bodyLarge,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  timePicker: {
    ...containerStyles.row,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
  },
  timeText: {
    ...typography.bodyLarge,
  },
  buttonContainer: {
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
  },
});
