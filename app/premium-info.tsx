
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconSymbol } from '@/components/IconSymbol';
import { colors, typography, spacing } from '@/styles/designSystem';
import { useAppTheme } from '@/contexts/ThemeContext';

const FEATURES = [
  {
    icon: 'schedule',
    title: 'Faster Price Updates',
    description: 'Premium members get price checks every hour instead of once per day. Never miss a deal with real-time price tracking.',
  },
  {
    icon: 'cloud-upload',
    title: 'Unlimited Imports',
    description: 'Import as many items as you want each month. No limits on wishlist imports from any store.',
  },
  {
    icon: 'public',
    title: 'Multi-Country Comparison',
    description: 'Compare prices across multiple countries to find the best deals worldwide.',
  },
  {
    icon: 'notifications-active',
    title: 'Advanced Price Alerts',
    description: 'Set custom price drop alerts for each item. Get notified when any item drops below your target price.',
  },
];

const FAQ = [
  {
    question: 'How does billing work?',
    answer: 'Billing is not yet implemented. This is a placeholder for the premium feature system.',
  },
  {
    question: 'Can I cancel anytime?',
    answer: 'Yes, you can cancel your premium subscription at any time with no penalties.',
  },
  {
    question: 'What happens to my data if I cancel?',
    answer: 'All your wishlists and items remain intact. You\'ll just lose access to premium features.',
  },
  {
    question: 'How do affiliate links work?',
    answer: 'When you click on store links, we may earn a small commission at no extra cost to you. This helps support the app and keep it free for everyone.',
  },
];

export default function PremiumInfoScreen() {
  const { theme } = useAppTheme();
  const router = useRouter();

  const currentColors = {
    background: theme.colors.background,
    card: theme.colors.card,
    text: theme.colors.text,
    textSecondary: theme.colors.textSecondary,
    border: theme.colors.border,
    accent: theme.colors.accent,
    accentLight: theme.colors.accentLight,
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: currentColors.background }]} edges={['bottom']}>
      <Stack.Screen
        options={{
          title: 'Premium Features',
          headerShown: true,
          headerStyle: { backgroundColor: currentColors.background },
          headerTintColor: currentColors.text,
        }}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <View style={[styles.heroIcon, { backgroundColor: currentColors.accentLight }]}>
            <IconSymbol
              ios_icon_name="star.fill"
              android_material_icon_name="star"
              size={48}
              color={currentColors.accent}
            />
          </View>
          
          <Text style={[styles.heroTitle, { color: currentColors.text }]}>
            My Wishlist Premium
          </Text>
          
          <Text style={[styles.heroSubtitle, { color: currentColors.textSecondary }]}>
            Unlock powerful features to get the most out of your wishlists
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: currentColors.text }]}>
            Premium Features
          </Text>
          
          {FEATURES.map((feature, index) => {
            const featureTitle = feature.title;
            const featureDescription = feature.description;
            
            return (
              <View
                key={index}
                style={[styles.featureCard, { backgroundColor: currentColors.card, borderColor: currentColors.border }]}
              >
                <View style={[styles.featureIcon, { backgroundColor: currentColors.accentLight }]}>
                  <IconSymbol
                    ios_icon_name={feature.icon}
                    android_material_icon_name={feature.icon}
                    size={24}
                    color={currentColors.accent}
                  />
                </View>
                
                <View style={styles.featureContent}>
                  <Text style={[styles.featureTitle, { color: currentColors.text }]}>
                    {featureTitle}
                  </Text>
                  <Text style={[styles.featureDescription, { color: currentColors.textSecondary }]}>
                    {featureDescription}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: currentColors.text }]}>
            Frequently Asked Questions
          </Text>
          
          {FAQ.map((item, index) => {
            const question = item.question;
            const answer = item.answer;
            
            return (
              <View
                key={index}
                style={[styles.faqCard, { backgroundColor: currentColors.card, borderColor: currentColors.border }]}
              >
                <Text style={[styles.faqQuestion, { color: currentColors.text }]}>
                  {question}
                </Text>
                <Text style={[styles.faqAnswer, { color: currentColors.textSecondary }]}>
                  {answer}
                </Text>
              </View>
            );
          })}
        </View>

        <View style={[styles.complianceSection, { backgroundColor: currentColors.card, borderColor: currentColors.border }]}>
          <View style={styles.complianceHeader}>
            <IconSymbol
              ios_icon_name="shield.checkmark"
              android_material_icon_name="verified-user"
              size={24}
              color={currentColors.accent}
            />
            <Text style={[styles.complianceTitle, { color: currentColors.text }]}>
              Privacy & Transparency
            </Text>
          </View>
          <Text style={[styles.complianceText, { color: currentColors.textSecondary }]}>
            We believe in transparency. When you click on store links, we may earn a small commission at no extra cost to you. This helps us keep the app free and continuously improve it. All sponsored offers are clearly labeled, and we never hide tracking or sell your personal data.
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.upgradeButton, { backgroundColor: currentColors.accent }]}
          onPress={() => router.back()}
        >
          <Text style={styles.upgradeButtonText}>
            Get Started
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },
  hero: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  heroIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  heroTitle: {
    ...typography.displayMedium,
    fontWeight: '600',
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  heroSubtitle: {
    ...typography.bodyLarge,
    textAlign: 'center',
    lineHeight: 24,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    ...typography.titleMedium,
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  featureCard: {
    flexDirection: 'row',
    padding: spacing.md,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureContent: {
    flex: 1,
    gap: spacing.xs,
  },
  featureTitle: {
    ...typography.bodyLarge,
    fontWeight: '600',
  },
  featureDescription: {
    ...typography.bodySmall,
    lineHeight: 18,
  },
  faqCard: {
    padding: spacing.md,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  faqQuestion: {
    ...typography.bodyLarge,
    fontWeight: '600',
  },
  faqAnswer: {
    ...typography.bodyMedium,
    lineHeight: 20,
  },
  complianceSection: {
    padding: spacing.md,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: spacing.xl,
  },
  complianceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  complianceTitle: {
    ...typography.bodyLarge,
    fontWeight: '600',
  },
  complianceText: {
    ...typography.bodyMedium,
    lineHeight: 20,
  },
  upgradeButton: {
    paddingVertical: spacing.md + 2,
    paddingHorizontal: spacing.lg,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  upgradeButtonText: {
    ...typography.buttonLarge,
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
