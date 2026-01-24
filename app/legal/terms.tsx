
import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, typography, spacing } from '@/styles/designSystem';

export default function TermsOfServiceScreen() {
  return (
    <>
      <Stack.Screen
        options={{
          title: 'Terms of Service',
          headerBackTitle: 'Back',
        }}
      />
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
          <Text style={styles.title}>Terms of Service</Text>
          <Text style={styles.lastUpdated}>Last updated: January 2025</Text>

          <Text style={styles.sectionTitle}>Acceptance of Terms</Text>
          <Text style={styles.paragraph}>
            By accessing and using My Wishlist, you accept and agree to be bound by the terms and provisions of this agreement. If you do not agree to these terms, please do not use our service.
          </Text>

          <Text style={styles.sectionTitle}>Use of Service</Text>
          <Text style={styles.paragraph}>
            You agree to use My Wishlist only for lawful purposes and in accordance with these Terms. You agree not to:
          </Text>
          <Text style={styles.bulletPoint}>• Use the service in any way that violates applicable laws</Text>
          <Text style={styles.bulletPoint}>• Attempt to gain unauthorized access to our systems</Text>
          <Text style={styles.bulletPoint}>• Interfere with or disrupt the service</Text>
          <Text style={styles.bulletPoint}>• Use automated systems to access the service</Text>

          <Text style={styles.sectionTitle}>User Accounts</Text>
          <Text style={styles.paragraph}>
            You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You agree to notify us immediately of any unauthorized use of your account.
          </Text>

          <Text style={styles.sectionTitle}>Content</Text>
          <Text style={styles.paragraph}>
            You retain all rights to the content you create and store in My Wishlist. By using our service, you grant us a license to use, store, and display your content solely for the purpose of providing the service to you.
          </Text>

          <Text style={styles.sectionTitle}>Price Information</Text>
          <Text style={styles.paragraph}>
            We strive to provide accurate price information, but we cannot guarantee the accuracy of prices displayed. Prices are obtained from third-party sources and may not reflect current prices. Always verify prices on the retailer's website before making a purchase.
          </Text>

          <Text style={styles.sectionTitle}>Limitation of Liability</Text>
          <Text style={styles.paragraph}>
            My Wishlist is provided "as is" without warranties of any kind. We shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of the service.
          </Text>

          <Text style={styles.sectionTitle}>Termination</Text>
          <Text style={styles.paragraph}>
            We reserve the right to terminate or suspend your account at any time, without prior notice, for conduct that we believe violates these Terms or is harmful to other users, us, or third parties.
          </Text>

          <Text style={styles.sectionTitle}>Changes to Terms</Text>
          <Text style={styles.paragraph}>
            We reserve the right to modify these Terms at any time. We will notify users of any material changes. Your continued use of the service after such modifications constitutes your acceptance of the updated Terms.
          </Text>

          <Text style={styles.sectionTitle}>Contact Information</Text>
          <Text style={styles.paragraph}>
            If you have questions about these Terms, please contact us at:
          </Text>
          <Text style={styles.contactText}>support@mywishlist.app</Text>
        </ScrollView>
      </SafeAreaView>
    </>
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
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  title: {
    ...typography.displaySmall,
    marginBottom: spacing.xs,
  },
  lastUpdated: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    ...typography.titleMedium,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  paragraph: {
    ...typography.bodyLarge,
    color: colors.textSecondary,
    lineHeight: 24,
    marginBottom: spacing.md,
  },
  bulletPoint: {
    ...typography.bodyLarge,
    color: colors.textSecondary,
    lineHeight: 24,
    marginBottom: spacing.xs,
    paddingLeft: spacing.md,
  },
  contactText: {
    ...typography.bodyLarge,
    color: colors.accent,
    marginTop: spacing.xs,
  },
});
