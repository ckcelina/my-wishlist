
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
  Share as RNShare,
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
import { authenticatedPost } from '@/utils/api';
import { useHaptics } from '@/hooks/useHaptics';
import * as Linking from 'expo-linking';

export default function ExportDataScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { theme, isDark } = useAppTheme();
  const haptics = useHaptics();

  const [exportingCSV, setExportingCSV] = useState(false);
  const [exportingPDF, setExportingPDF] = useState(false);

  const handleExportCSV = async () => {
    console.log('[ExportDataScreen] User tapped Export as CSV');
    haptics.light();

    Alert.alert(
      'Export as CSV',
      'This will include all your wishlists, items, prices, and links. The file will be ready to download shortly.',
      [
        { text: 'Cancel', style: 'cancel', onPress: () => haptics.light() },
        {
          text: 'Export',
          onPress: async () => {
            setExportingCSV(true);
            try {
              console.log('[ExportDataScreen] Requesting CSV export');
              const data = await authenticatedPost<{ downloadUrl: string; expiresAt: string }>('/api/export/csv', {});
              
              console.log('[ExportDataScreen] CSV export ready:', data.downloadUrl);
              haptics.success();

              Alert.alert(
                'Export Ready',
                'Your data has been exported. The download link will expire in 1 hour.',
                [
                  {
                    text: 'Download',
                    onPress: () => {
                      console.log('[ExportDataScreen] Opening download URL');
                      Linking.openURL(data.downloadUrl);
                    },
                  },
                  {
                    text: 'Share',
                    onPress: async () => {
                      console.log('[ExportDataScreen] Sharing download URL');
                      try {
                        await RNShare.share({
                          message: 'My Wishlist Data Export',
                          url: data.downloadUrl,
                        });
                      } catch (error) {
                        console.error('[ExportDataScreen] Error sharing:', error);
                      }
                    },
                  },
                ]
              );
            } catch (error) {
              console.error('[ExportDataScreen] Error exporting CSV:', error);
              haptics.error();
              Alert.alert('Error', 'Failed to export data. Please try again.');
            } finally {
              setExportingCSV(false);
            }
          },
        },
      ]
    );
  };

  const handleExportPDF = async () => {
    console.log('[ExportDataScreen] User tapped Export as PDF');
    haptics.light();

    Alert.alert(
      'Export as PDF',
      'This will create a PDF summary with item thumbnails. The file will be ready to download shortly.',
      [
        { text: 'Cancel', style: 'cancel', onPress: () => haptics.light() },
        {
          text: 'Export',
          onPress: async () => {
            setExportingPDF(true);
            try {
              console.log('[ExportDataScreen] Requesting PDF export');
              const data = await authenticatedPost<{ downloadUrl: string; expiresAt: string }>('/api/export/pdf', {});
              
              console.log('[ExportDataScreen] PDF export ready:', data.downloadUrl);
              haptics.success();

              Alert.alert(
                'Export Ready',
                'Your data has been exported. The download link will expire in 1 hour.',
                [
                  {
                    text: 'Download',
                    onPress: () => {
                      console.log('[ExportDataScreen] Opening download URL');
                      Linking.openURL(data.downloadUrl);
                    },
                  },
                  {
                    text: 'Share',
                    onPress: async () => {
                      console.log('[ExportDataScreen] Sharing download URL');
                      try {
                        await RNShare.share({
                          message: 'My Wishlist Data Export',
                          url: data.downloadUrl,
                        });
                      } catch (error) {
                        console.error('[ExportDataScreen] Error sharing:', error);
                      }
                    },
                  },
                ]
              );
            } catch (error) {
              console.error('[ExportDataScreen] Error exporting PDF:', error);
              haptics.error();
              Alert.alert('Error', 'Failed to export data. Please try again.');
            } finally {
              setExportingPDF(false);
            }
          },
        },
      ]
    );
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Export My Data',
          headerBackTitle: 'Back',
        }}
      />
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={[]}>
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.infoCard}>
            <IconSymbol
              ios_icon_name="info.circle"
              android_material_icon_name="info"
              size={24}
              color={theme.colors.accent}
            />
            <Text style={[styles.infoText, { color: theme.colors.textSecondary }]}>
              Export your wishlist data to keep a backup or use it elsewhere. Files expire after 1 hour.
            </Text>
          </View>

          <Card style={styles.card}>
            <View style={styles.exportOption}>
              <View style={styles.optionHeader}>
                <IconSymbol
                  ios_icon_name="doc.text"
                  android_material_icon_name="description"
                  size={32}
                  color={theme.colors.accent}
                />
                <View style={styles.optionInfo}>
                  <Text style={[styles.optionTitle, { color: theme.colors.text }]}>CSV Export</Text>
                  <Text style={[styles.optionDescription, { color: theme.colors.textSecondary }]}>
                    Spreadsheet format with all wishlists, items, prices, and links
                  </Text>
                </View>
              </View>
              <Button
                title={exportingCSV ? 'Exporting...' : 'Export CSV'}
                onPress={handleExportCSV}
                variant="primary"
                disabled={exportingCSV || exportingPDF}
                style={styles.exportButton}
              />
            </View>
          </Card>

          <Card style={styles.card}>
            <View style={styles.exportOption}>
              <View style={styles.optionHeader}>
                <IconSymbol
                  ios_icon_name="doc.richtext"
                  android_material_icon_name="picture-as-pdf"
                  size={32}
                  color={theme.colors.accent}
                />
                <View style={styles.optionInfo}>
                  <Text style={[styles.optionTitle, { color: theme.colors.text }]}>PDF Summary</Text>
                  <Text style={[styles.optionDescription, { color: theme.colors.textSecondary }]}>
                    Visual summary with item thumbnails and prices
                  </Text>
                </View>
              </View>
              <Button
                title={exportingPDF ? 'Exporting...' : 'Export PDF'}
                onPress={handleExportPDF}
                variant="primary"
                disabled={exportingCSV || exportingPDF}
                style={styles.exportButton}
              />
            </View>
          </Card>

          <View style={styles.warningCard}>
            <IconSymbol
              ios_icon_name="exclamationmark.triangle"
              android_material_icon_name="warning"
              size={20}
              color={colors.warning}
            />
            <Text style={[styles.warningText, { color: theme.colors.textSecondary }]}>
              Exported files may include product links and prices. Keep them secure.
            </Text>
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
  content: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
  },
  infoCard: {
    ...containerStyles.row,
    backgroundColor: colors.highlight,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  infoText: {
    ...typography.bodyMedium,
    flex: 1,
    lineHeight: 20,
  },
  card: {
    marginBottom: spacing.md,
  },
  exportOption: {
    gap: spacing.md,
  },
  optionHeader: {
    ...containerStyles.row,
    gap: spacing.md,
  },
  optionInfo: {
    flex: 1,
  },
  optionTitle: {
    ...typography.titleSmall,
    marginBottom: spacing.xs,
  },
  optionDescription: {
    ...typography.bodyMedium,
    lineHeight: 20,
  },
  exportButton: {
    width: '100%',
  },
  warningCard: {
    ...containerStyles.row,
    backgroundColor: colors.warningLight,
    borderRadius: 12,
    padding: spacing.md,
    marginTop: spacing.md,
    marginBottom: spacing.xl,
    gap: spacing.sm,
  },
  warningText: {
    ...typography.bodySmall,
    flex: 1,
    lineHeight: 18,
  },
});
