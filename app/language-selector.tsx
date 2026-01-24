
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
import { useI18n } from '@/contexts/I18nContext';
import { SUPPORTED_LANGUAGES } from '@/lib/i18n';
import { colors, typography, spacing } from '@/styles/designSystem';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useTranslation } from 'react-i18next';

export default function LanguageSelectorScreen() {
  const { theme } = useAppTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const { currentLanguage, languageMode, changeLanguage } = useI18n();
  const [loading, setLoading] = useState(false);
  const [selectedMode, setSelectedMode] = useState<'system' | 'manual'>(languageMode);
  const [selectedLanguage, setSelectedLanguage] = useState(currentLanguage);

  const handleSelectMode = (mode: 'system' | 'manual') => {
    console.log('[LanguageSelector] Mode selected:', mode);
    setSelectedMode(mode);
    if (mode === 'system') {
      setSelectedLanguage(currentLanguage);
    }
  };

  const handleSelectLanguage = (languageCode: string) => {
    console.log('[LanguageSelector] Language selected:', languageCode);
    setSelectedLanguage(languageCode);
    setSelectedMode('manual');
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      console.log('[LanguageSelector] Saving:', selectedMode, selectedLanguage);
      
      await changeLanguage(selectedLanguage, selectedMode);
      
      Alert.alert(
        t('common.success'),
        t('toast.languageUpdated'),
        [
          {
            text: t('common.ok'),
            onPress: () => router.back(),
          },
        ]
      );
    } catch (error) {
      console.error('[LanguageSelector] Error saving:', error);
      Alert.alert(t('common.error'), String(error));
    } finally {
      setLoading(false);
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    content: {
      padding: spacing.lg,
    },
    section: {
      marginBottom: spacing.xl,
    },
    sectionTitle: {
      fontSize: typography.sizes.md,
      fontWeight: typography.weights.semibold as any,
      color: theme.colors.text,
      marginBottom: spacing.md,
    },
    modeOption: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: spacing.md,
      backgroundColor: theme.colors.card,
      borderRadius: 12,
      marginBottom: spacing.sm,
      borderWidth: 2,
      borderColor: 'transparent',
    },
    modeOptionSelected: {
      borderColor: theme.colors.accent,
    },
    modeOptionText: {
      fontSize: typography.sizes.md,
      color: theme.colors.text,
      fontWeight: typography.weights.medium as any,
    },
    languageOption: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: spacing.md,
      backgroundColor: theme.colors.card,
      borderRadius: 12,
      marginBottom: spacing.sm,
      borderWidth: 2,
      borderColor: 'transparent',
    },
    languageOptionSelected: {
      borderColor: theme.colors.accent,
    },
    languageInfo: {
      flex: 1,
    },
    languageName: {
      fontSize: typography.sizes.md,
      color: theme.colors.text,
      fontWeight: typography.weights.medium as any,
    },
    languageNative: {
      fontSize: typography.sizes.sm,
      color: theme.colors.textSecondary,
      marginTop: 2,
    },
    rtlBadge: {
      backgroundColor: theme.colors.accent + '20',
      paddingHorizontal: spacing.sm,
      paddingVertical: 4,
      borderRadius: 6,
      marginLeft: spacing.sm,
    },
    rtlBadgeText: {
      fontSize: typography.sizes.xs,
      color: theme.colors.accent,
      fontWeight: typography.weights.semibold as any,
    },
    saveButton: {
      backgroundColor: theme.colors.accent,
      padding: spacing.md,
      borderRadius: 12,
      alignItems: 'center',
      margin: spacing.lg,
    },
    saveButtonDisabled: {
      opacity: 0.5,
    },
    saveButtonText: {
      fontSize: typography.sizes.md,
      fontWeight: typography.weights.semibold as any,
      color: '#FFFFFF',
    },
  });

  const hasChanges = selectedMode !== languageMode || selectedLanguage !== currentLanguage;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: t('profile.selectLanguage'),
          headerBackTitle: t('common.back'),
        }}
      />
      
      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('profile.languageMode')}</Text>
          
          <TouchableOpacity
            style={[
              styles.modeOption,
              selectedMode === 'system' && styles.modeOptionSelected,
            ]}
            onPress={() => handleSelectMode('system')}
          >
            <Text style={styles.modeOptionText}>{t('profile.systemAuto')}</Text>
            {selectedMode === 'system' && (
              <IconSymbol
                ios_icon_name="checkmark.circle.fill"
                android_material_icon_name="check-circle"
                size={24}
                color={theme.colors.accent}
              />
            )}
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.modeOption,
              selectedMode === 'manual' && styles.modeOptionSelected,
            ]}
            onPress={() => handleSelectMode('manual')}
          >
            <Text style={styles.modeOptionText}>{t('profile.selectLanguage')}</Text>
            {selectedMode === 'manual' && (
              <IconSymbol
                ios_icon_name="checkmark.circle.fill"
                android_material_icon_name="check-circle"
                size={24}
                color={theme.colors.accent}
              />
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('profile.language')}</Text>
          
          {SUPPORTED_LANGUAGES.map((lang) => (
            <TouchableOpacity
              key={lang.code}
              style={[
                styles.languageOption,
                selectedLanguage === lang.code && styles.languageOptionSelected,
              ]}
              onPress={() => handleSelectLanguage(lang.code)}
            >
              <View style={styles.languageInfo}>
                <Text style={styles.languageName}>{lang.name}</Text>
                <Text style={styles.languageNative}>{lang.nativeName}</Text>
              </View>
              
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                {lang.rtl && (
                  <View style={styles.rtlBadge}>
                    <Text style={styles.rtlBadgeText}>RTL</Text>
                  </View>
                )}
                {selectedLanguage === lang.code && (
                  <IconSymbol
                    ios_icon_name="checkmark.circle.fill"
                    android_material_icon_name="check-circle"
                    size={24}
                    color={theme.colors.accent}
                  />
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <TouchableOpacity
        style={[
          styles.saveButton,
          (!hasChanges || loading) && styles.saveButtonDisabled,
        ]}
        onPress={handleSave}
        disabled={!hasChanges || loading}
      >
        {loading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.saveButtonText}>{t('common.save')}</Text>
        )}
      </TouchableOpacity>
    </SafeAreaView>
  );
}
