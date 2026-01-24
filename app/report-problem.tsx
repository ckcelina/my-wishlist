
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
  Pressable,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '@/contexts/AuthContext';
import { IconSymbol } from '@/components/IconSymbol';
import { colors, typography, spacing, inputStyles } from '@/styles/designSystem';
import { useHaptics } from '@/hooks/useHaptics';
import Constants from 'expo-constants';

type ReportType = 'wrong_product_match' | 'wrong_price' | 'store_not_available' | 'broken_link' | 'image_issue' | 'other';

interface ReportCategory {
  value: ReportType;
  label: string;
  description: string;
}

const REPORT_CATEGORIES: ReportCategory[] = [
  { value: 'wrong_product_match', label: 'Wrong Product Match', description: 'AI identified the wrong product' },
  { value: 'wrong_price', label: 'Wrong Price', description: 'Price is incorrect or outdated' },
  { value: 'store_not_available', label: 'Store Not Available', description: 'Store doesn\'t ship to my location' },
  { value: 'broken_link', label: 'Broken Link', description: 'Product link doesn\'t work' },
  { value: 'image_issue', label: 'Image Issue', description: 'Image is wrong or not loading' },
  { value: 'other', label: 'Other', description: 'Something else went wrong' },
];

const CURRENCY_OPTIONS = ['USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'CHF', 'CNY', 'INR', 'JOD'];

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: spacing.lg,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.md,
  },
  description: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    marginBottom: spacing.sm,
  },
  categoryButtonSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  categoryContent: {
    flex: 1,
    marginLeft: spacing.md,
  },
  categoryLabel: {
    ...typography.bodyBold,
    color: colors.text,
    marginBottom: 2,
  },
  categoryDescription: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  input: {
    ...inputStyles.input,
    minHeight: 100,
    textAlignVertical: 'top',
    paddingTop: spacing.md,
  },
  inputSmall: {
    ...inputStyles.input,
  },
  label: {
    ...typography.bodyBold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  optionalLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginLeft: spacing.xs,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    marginTop: spacing.sm,
  },
  uploadButtonText: {
    ...typography.body,
    color: colors.primary,
    marginLeft: spacing.sm,
  },
  uploadedText: {
    ...typography.caption,
    color: colors.success,
    marginTop: spacing.sm,
  },
  submitButton: {
    backgroundColor: colors.primary,
    padding: spacing.md,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: spacing.xl,
    minHeight: 44,
    justifyContent: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: colors.border,
  },
  submitButtonText: {
    ...typography.bodyBold,
    color: colors.white,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: spacing.lg,
    maxHeight: '50%',
  },
  modalTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.md,
  },
  currencyOption: {
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  currencyOptionText: {
    ...typography.body,
    color: colors.text,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  halfWidth: {
    flex: 1,
  },
});

export default function ReportProblemScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const { triggerHaptic } = useHaptics();
  const params = useLocalSearchParams();
  
  const context = params.context as string;
  const itemId = params.itemId as string | undefined;
  const wishlistId = params.wishlistId as string | undefined;

  const [selectedCategory, setSelectedCategory] = useState<ReportType | null>(null);
  const [details, setDetails] = useState('');
  const [attachmentUrl, setAttachmentUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCurrencyModal, setShowCurrencyModal] = useState(false);

  // Structured fix fields for wrong_product_match
  const [correctTitle, setCorrectTitle] = useState('');
  const [correctLink, setCorrectLink] = useState('');
  const [correctDomain, setCorrectDomain] = useState('');

  // Structured fix fields for wrong_price
  const [correctPrice, setCorrectPrice] = useState('');
  const [correctCurrency, setCorrectCurrency] = useState('USD');
  const [priceSourceLink, setPriceSourceLink] = useState('');

  const backendUrl = Constants.expoConfig?.extra?.backendUrl;

  const handleCategorySelect = (category: ReportType) => {
    setSelectedCategory(category);
    triggerHaptic('selection');
  };

  const handlePickImage = async () => {
    console.log('User tapped Upload Screenshot button');
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (!permissionResult.granted) {
      Alert.alert('Permission Required', 'Please allow access to your photo library to upload screenshots.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      console.log('User selected image for report');
      await uploadImage(result.assets[0].uri);
    }
  };

  const uploadImage = async (imageUri: string) => {
    try {
      console.log('Uploading screenshot to backend');
      const formData = new FormData();
      formData.append('image', {
        uri: imageUri,
        type: 'image/jpeg',
        name: 'report-screenshot.jpg',
      } as any);

      const response = await fetch(`${backendUrl}/api/upload/image`, {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `Bearer ${user?.token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to upload image');
      }

      const data = await response.json();
      setAttachmentUrl(data.url);
      console.log('Screenshot uploaded successfully:', data.url);
      triggerHaptic('success');
    } catch (error) {
      console.error('Error uploading screenshot:', error);
      Alert.alert('Upload Failed', 'Could not upload screenshot. Please try again.');
    }
  };

  const handleSubmit = async () => {
    if (!selectedCategory || !details.trim()) {
      Alert.alert('Missing Information', 'Please select a category and describe what went wrong.');
      return;
    }

    console.log('User tapped Submit Report button');
    triggerHaptic('medium');
    setIsSubmitting(true);

    try {
      let suggestedFix: string | object | undefined;

      if (selectedCategory === 'wrong_product_match' && (correctTitle || correctLink || correctDomain)) {
        suggestedFix = {
          correctTitle: correctTitle || undefined,
          correctLink: correctLink || undefined,
          correctDomain: correctDomain || undefined,
        };
      } else if (selectedCategory === 'wrong_price' && correctPrice) {
        suggestedFix = {
          correctPrice: parseFloat(correctPrice) || undefined,
          currency: correctCurrency,
          sourceLink: priceSourceLink || undefined,
        };
      }

      const requestBody = {
        reportType: selectedCategory,
        context,
        itemId: itemId || undefined,
        wishlistId: wishlistId || undefined,
        details: details.trim(),
        suggestedFix: suggestedFix ? JSON.stringify(suggestedFix) : undefined,
        attachmentUrl: attachmentUrl || undefined,
      };

      console.log('Submitting report:', requestBody);

      const response = await fetch(`${backendUrl}/api/reports`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.token}`,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error('Failed to submit report');
      }

      const data = await response.json();
      console.log('Report submitted successfully:', data);
      
      triggerHaptic('success');
      
      // Show thank you message
      Alert.alert(
        'Thank You!',
        'Your report has been submitted. We\'ll review it and work on improving the app.',
        [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]
      );
    } catch (error) {
      console.error('Error submitting report:', error);
      Alert.alert('Submission Failed', 'Could not submit your report. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormValid = selectedCategory && details.trim().length > 0;

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Report a Problem',
          headerShown: true,
        }}
      />
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
          <Text style={styles.description}>
            Help us improve by reporting issues you encounter. Your feedback is valuable!
          </Text>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>What went wrong?</Text>
            {REPORT_CATEGORIES.map((category) => {
              const isSelected = selectedCategory === category.value;
              return (
                <TouchableOpacity
                  key={category.value}
                  style={[styles.categoryButton, isSelected && styles.categoryButtonSelected]}
                  onPress={() => handleCategorySelect(category.value)}
                  activeOpacity={0.7}
                >
                  <IconSymbol
                    ios_icon_name={isSelected ? 'checkmark.circle.fill' : 'circle'}
                    android_material_icon_name={isSelected ? 'check-circle' : 'radio-button-unchecked'}
                    size={24}
                    color={isSelected ? colors.primary : colors.textSecondary}
                  />
                  <View style={styles.categoryContent}>
                    <Text style={styles.categoryLabel}>{category.label}</Text>
                    <Text style={styles.categoryDescription}>{category.description}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {selectedCategory && (
            <>
              <View style={styles.section}>
                <Text style={styles.label}>Tell us more</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Describe what happened..."
                  placeholderTextColor={colors.textSecondary}
                  value={details}
                  onChangeText={setDetails}
                  multiline
                  numberOfLines={4}
                />
              </View>

              {selectedCategory === 'wrong_product_match' && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>
                    Help us fix it
                    <Text style={styles.optionalLabel}> (optional)</Text>
                  </Text>
                  <Text style={styles.label}>Correct product title</Text>
                  <TextInput
                    style={styles.inputSmall}
                    placeholder="Enter the correct product name"
                    placeholderTextColor={colors.textSecondary}
                    value={correctTitle}
                    onChangeText={setCorrectTitle}
                  />
                  <Text style={[styles.label, { marginTop: spacing.md }]}>Correct product link</Text>
                  <TextInput
                    style={styles.inputSmall}
                    placeholder="https://..."
                    placeholderTextColor={colors.textSecondary}
                    value={correctLink}
                    onChangeText={setCorrectLink}
                    autoCapitalize="none"
                    keyboardType="url"
                  />
                  <Text style={[styles.label, { marginTop: spacing.md }]}>Correct store domain</Text>
                  <TextInput
                    style={styles.inputSmall}
                    placeholder="example.com"
                    placeholderTextColor={colors.textSecondary}
                    value={correctDomain}
                    onChangeText={setCorrectDomain}
                    autoCapitalize="none"
                    keyboardType="url"
                  />
                </View>
              )}

              {selectedCategory === 'wrong_price' && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>
                    Help us fix it
                    <Text style={styles.optionalLabel}> (optional)</Text>
                  </Text>
                  <View style={styles.row}>
                    <View style={styles.halfWidth}>
                      <Text style={styles.label}>Correct price</Text>
                      <TextInput
                        style={styles.inputSmall}
                        placeholder="0.00"
                        placeholderTextColor={colors.textSecondary}
                        value={correctPrice}
                        onChangeText={setCorrectPrice}
                        keyboardType="decimal-pad"
                      />
                    </View>
                    <View style={styles.halfWidth}>
                      <Text style={styles.label}>Currency</Text>
                      <TouchableOpacity
                        style={styles.inputSmall}
                        onPress={() => setShowCurrencyModal(true)}
                      >
                        <Text style={{ color: colors.text }}>{correctCurrency}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                  <Text style={[styles.label, { marginTop: spacing.md }]}>Where did you see it?</Text>
                  <TextInput
                    style={styles.inputSmall}
                    placeholder="https://... (optional)"
                    placeholderTextColor={colors.textSecondary}
                    value={priceSourceLink}
                    onChangeText={setPriceSourceLink}
                    autoCapitalize="none"
                    keyboardType="url"
                  />
                </View>
              )}

              <View style={styles.section}>
                <Text style={styles.label}>
                  Screenshot
                  <Text style={styles.optionalLabel}> (optional)</Text>
                </Text>
                <TouchableOpacity
                  style={styles.uploadButton}
                  onPress={handlePickImage}
                  activeOpacity={0.7}
                >
                  <IconSymbol
                    ios_icon_name="photo"
                    android_material_icon_name="photo"
                    size={20}
                    color={colors.primary}
                  />
                  <Text style={styles.uploadButtonText}>
                    {attachmentUrl ? 'Change Screenshot' : 'Upload Screenshot'}
                  </Text>
                </TouchableOpacity>
                {attachmentUrl && (
                  <Text style={styles.uploadedText}>✓ Screenshot uploaded</Text>
                )}
              </View>

              <TouchableOpacity
                style={[styles.submitButton, (!isFormValid || isSubmitting) && styles.submitButtonDisabled]}
                onPress={handleSubmit}
                disabled={!isFormValid || isSubmitting}
                activeOpacity={0.7}
              >
                {isSubmitting ? (
                  <ActivityIndicator color={colors.white} />
                ) : (
                  <Text style={styles.submitButtonText}>Submit Report</Text>
                )}
              </TouchableOpacity>
            </>
          )}
        </ScrollView>

        <Modal
          visible={showCurrencyModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowCurrencyModal(false)}
        >
          <Pressable style={styles.modalOverlay} onPress={() => setShowCurrencyModal(false)}>
            <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
              <Text style={styles.modalTitle}>Select Currency</Text>
              <ScrollView>
                {CURRENCY_OPTIONS.map((currency) => (
                  <TouchableOpacity
                    key={currency}
                    style={styles.currencyOption}
                    onPress={() => {
                      setCorrectCurrency(currency);
                      setShowCurrencyModal(false);
                      triggerHaptic('selection');
                    }}
                  >
                    <Text style={styles.currencyOptionText}>{currency}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </Pressable>
          </Pressable>
        </Modal>
      </SafeAreaView>
    </>
  );
}
