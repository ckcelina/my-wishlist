
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Pressable,
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
  const { currentLanguage, languageMode, changeLanguage, isI18nReady, loading: i18nLoading } = useI18n();
  const [loading, setLoading] = useState(false);
  const [selectedMode, setSelectedMode] = useState<'system' | 'manual'>(languageMode);
  const [selectedLanguage, setSelectedLanguage] = useState(currentLanguage);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Log diagnostic info
  useEffect(() => {
    console.log('[LanguageSelector] Component mounted');
    console.log('[LanguageSelector] i18nReady:', isI18nReady);
    console.log('[LanguageSelector] i18nLoading:', i18nLoading);
    console.log('[LanguageSelector] currentLanguage:', currentLanguage);
    console.log('[LanguageSelector] languageMode:', languageMode);
    console.log('[LanguageSelector] supportedLanguages count:', SUPPORTED_LANGUAGES.length);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update selected values when context changes
  useEffect(() => {
    setSelectedMode(languageMode);
    setSelectedLanguage(currentLanguage);
  }, [languageMode, currentLanguage]);

  const handleSelectMode = (mode: 'system' | 'manual') => {
    console.log('[LanguageSelector] Mode selected:', mode);
    setSelectedMode(mode);
    setError(null);
    if (mode === 'system') {
      setSelectedLanguage(currentLanguage);
    }
  };

  const handleSelectLanguage = (languageCode: string) => {
    console.log('[LanguageSelector] Language selected:', languageCode);
    setSelectedLanguage(languageCode);
    setSelectedMode('manual');
    setError(null);
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('[LanguageSelector] Saving:', selectedMode, selectedLanguage);
      
      if (!isI18nReady) {
        throw new Error('i18n is not ready. Please try again.');
      }
      
      await changeLanguage(selectedLanguage, selectedMode);
      
      setShowSuccessModal(true);
      setTimeout(() => {
        setShowSuccessModal(false);
        router.back();
      }, 1500);
    } catch (error) {
      console.error('[LanguageSelector] Error saving:', error);
      setError(error instanceof Error ? error.message : 'Failed to save language preference');
    } finally {
      setLoading(false);
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: theme.colors.background,
    },
    loadingText: {
      marginTop: spacing.md,
      fontSize: typography.sizes.md,
      color: theme.colors.textSecondary,
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
      backgroundColor: theme.colors.surface2,
      borderRadius: 12,
      marginBottom: spacing.sm,
      borderWidth: 2,
      borderColor: theme.colors.border,
    },
    modeOptionSelected: {
      borderColor: theme.colors.accent,
      backgroundColor: theme.colors.accent,
    },
    modeOptionText: {
      fontSize: typography.sizes.md,
      color: theme.colors.text,
      fontWeight: typography.weights.medium as any,
    },
    modeOptionTextSelected: {
      color: '#FFFFFF',
      fontWeight: typography.weights.semibold as any,
    },
    languageOption: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: spacing.md,
      backgroundColor: theme.colors.surface2,
      borderRadius: 12,
      marginBottom: spacing.sm,
      borderWidth: 2,
      borderColor: theme.colors.border,
    },
    languageOptionSelected: {
      borderColor: theme.colors.accent,
      backgroundColor: theme.colors.accent,
      borderWidth: 3,
    },
    languageInfo: {
      flex: 1,
    },
    languageName: {
      fontSize: typography.sizes.md,
      color: theme.colors.text,
      fontWeight: typography.weights.medium as any,
    },
    languageNameSelected: {
      color: '#FFFFFF',
      fontWeight: typography.weights.semibold as any,
    },
    languageNative: {
      fontSize: typography.sizes.sm,
      color: theme.colors.textSecondary,
      marginTop: 2,
    },
    languageNativeSelected: {
      color: '#FFFFFF',
      opacity: 0.9,
    },
    rtlBadge: {
      backgroundColor: theme.colors.accent + '20',
      paddingHorizontal: spacing.sm,
      paddingVertical: 4,
      borderRadius: 6,
      marginLeft: spacing.sm,
    },
    rtlBadgeSelected: {
      backgroundColor: '#FFFFFF30',
    },
    rtlBadgeText: {
      fontSize: typography.sizes.xs,
      color: theme.colors.accent,
      fontWeight: typography.weights.semibold as any,
    },
    rtlBadgeTextSelected: {
      color: '#FFFFFF',
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
    errorContainer: {
      backgroundColor: '#FF3B3020',
      padding: spacing.md,
      borderRadius: 12,
      margin: spacing.lg,
      borderWidth: 1,
      borderColor: '#FF3B30',
    },
    errorText: {
      fontSize: typography.sizes.sm,
      color: '#FF3B30',
      textAlign: 'center',
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalContent: {
      backgroundColor: theme.colors.card,
      borderRadius: 16,
      padding: spacing.xl,
      alignItems: 'center',
      minWidth: 200,
    },
    modalText: {
      fontSize: typography.sizes.lg,
      fontWeight: typography.weights.semibold as any,
      color: theme.colors.text,
      marginTop: spacing.md,
    },
  });

  // Show loading state while i18n initializes
  if (i18nLoading || !isI18nReady) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <Stack.Screen
          options={{
            headerShown: true,
            title: 'Language',
            headerBackTitle: 'Back',
          }}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.accent} />
          <Text style={styles.loadingText}>Loading languages...</Text>
        </View>
      </SafeAreaView>
    );
  }

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
            <Text style={[
              styles.modeOptionText,
              selectedMode === 'system' && styles.modeOptionTextSelected,
            ]}>
              {t('profile.systemAuto')}
            </Text>
            {selectedMode === 'system' && (
              <IconSymbol
                ios_icon_name="checkmark.circle.fill"
                android_material_icon_name="check-circle"
                size={24}
                color="#FFFFFF"
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
            <Text style={[
              styles.modeOptionText,
              selectedMode === 'manual' && styles.modeOptionTextSelected,
            ]}>
              {t('profile.selectLanguage')}
            </Text>
            {selectedMode === 'manual' && (
              <IconSymbol
                ios_icon_name="checkmark.circle.fill"
                android_material_icon_name="check-circle"
                size={24}
                color="#FFFFFF"
              />
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('profile.language')}</Text>
          
          {SUPPORTED_LANGUAGES.map((lang) => {
            const languageCode = lang.code;
            const languageName = lang.name;
            const nativeName = lang.nativeName;
            const isRTLLang = lang.isRTL || false;
            const isSelected = selectedLanguage === languageCode;
            
            return (
              <TouchableOpacity
                key={languageCode}
                style={[
                  styles.languageOption,
                  isSelected && styles.languageOptionSelected,
                ]}
                onPress={() => handleSelectLanguage(languageCode)}
              >
                <View style={styles.languageInfo}>
                  <Text style={[
                    styles.languageName,
                    isSelected && styles.languageNameSelected,
                  ]}>
                    {languageName}
                  </Text>
                  <Text style={[
                    styles.languageNative,
                    isSelected && styles.languageNativeSelected,
                  ]}>
                    {nativeName}
                  </Text>
                </View>
                
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  {isRTLLang && (
                    <View style={[
                      styles.rtlBadge,
                      isSelected && styles.rtlBadgeSelected,
                    ]}>
                      <Text style={[
                        styles.rtlBadgeText,
                        isSelected && styles.rtlBadgeTextSelected,
                      ]}>
                        RTL
                      </Text>
                    </View>
                  )}
                  {isSelected && (
                    <IconSymbol
                      ios_icon_name="checkmark.circle.fill"
                      android_material_icon_name="check-circle"
                      size={24}
                      color="#FFFFFF"
                    />
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

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

      <Modal
        visible={showSuccessModal}
        transparent
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <IconSymbol
              ios_icon_name="checkmark.circle.fill"
              android_material_icon_name="check-circle"
              size={48}
              color={theme.colors.accent}
            />
            <Text style={styles.modalText}>{t('toast.languageUpdated')}</Text>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
