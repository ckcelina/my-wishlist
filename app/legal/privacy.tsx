
import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, typography, spacing } from '@/styles/designSystem';

export default function PrivacyPolicyScreen() {
  return (
    <>
      <Stack.Screen
        options={{
          title: 'Privacy Policy',
          headerBackTitle: 'Back',
        }}
      />
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
          <Text style={styles.title}>Privacy Policy</Text>
          <Text style={styles.lastUpdated}>Last updated: January 2025</Text>

          <Text style={styles.sectionTitle}>Introduction</Text>
          <Text style={styles.paragraph}>
            My Wishlist ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, and safeguard your information when you use our mobile application.
          </Text>

          <Text style={styles.sectionTitle}>Information We Collect</Text>
          <Text style={styles.paragraph}>
            We collect information that you provide directly to us, including:
          </Text>
          <Text style={styles.bulletPoint}>• Account information (name, email address)</Text>
          <Text style={styles.bulletPoint}>• Wishlist data (item names, prices, images, URLs)</Text>
          <Text style={styles.bulletPoint}>• Shopping preferences and location</Text>
          <Text style={styles.bulletPoint}>• Device information and usage data</Text>

          <Text style={styles.sectionTitle}>How We Use Your Information</Text>
          <Text style={styles.paragraph}>
            We use the information we collect to:
          </Text>
          <Text style={styles.bulletPoint}>• Provide and maintain our services</Text>
          <Text style={styles.bulletPoint}>• Track prices and send price drop notifications</Text>
          <Text style={styles.bulletPoint}>• Improve and personalize your experience</Text>
          <Text style={styles.bulletPoint}>• Communicate with you about updates and features</Text>

          <Text style={styles.sectionTitle}>Data Security</Text>
          <Text style={styles.paragraph}>
            We implement appropriate security measures to protect your personal information. However, no method of transmission over the internet is 100% secure, and we cannot guarantee absolute security.
          </Text>

          <Text style={styles.sectionTitle}>Third-Party Services</Text>
          <Text style={styles.paragraph}>
            We may use third-party services for analytics, authentication, and other features. These services have their own privacy policies governing the use of your information.
          </Text>

          <Text style={styles.sectionTitle}>Your Rights</Text>
          <Text style={styles.paragraph}>
            You have the right to:
          </Text>
          <Text style={styles.bulletPoint}>• Access your personal data</Text>
          <Text style={styles.bulletPoint}>• Request correction of inaccurate data</Text>
          <Text style={styles.bulletPoint}>• Request deletion of your data</Text>
          <Text style={styles.bulletPoint}>• Opt-out of marketing communications</Text>

          <Text style={styles.sectionTitle}>Contact Us</Text>
          <Text style={styles.paragraph}>
            If you have questions about this Privacy Policy, please contact us at:
          </Text>
          <Text style={styles.contactText}>support@mywishlist.app</Text>

          <Text style={styles.sectionTitle}>Changes to This Policy</Text>
          <Text style={styles.paragraph}>
            We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last updated" date.
          </Text>
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
