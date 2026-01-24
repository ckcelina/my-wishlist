
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { IconSymbol } from './IconSymbol';
import { colors, typography, spacing, buttonStyles } from '@/styles/designSystem';
import { useAppTheme } from '@/contexts/ThemeContext';
import { logEvent } from '@/utils/observability';
import { useRouter } from 'expo-router';

interface PremiumUpsellModalProps {
  visible: boolean;
  onClose: () => void;
  feature?: string;
}

const PREMIUM_BENEFITS = [
  {
    icon: 'schedule',
    title: 'Faster price updates',
    description: 'Get price checks every hour instead of daily',
  },
  {
    icon: 'cloud-upload',
    title: 'Unlimited imports',
    description: 'Import as many items as you want each month',
  },
  {
    icon: 'category',
    title: 'Advanced organization',
    description: 'Use smart auto-grouping and advanced sorting',
  },
  {
    icon: 'notifications-active',
    title: 'Smart alerts',
    description: 'Set custom price drop alerts for each item',
  },
];

export function PremiumUpsellModal({ visible, onClose, feature }: PremiumUpsellModalProps) {
  const { theme } = useAppTheme();
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);

  const currentColors = {
    background: theme.colors.background,
    card: theme.colors.card,
    text: theme.colors.text,
    textSecondary: theme.colors.textSecondary,
    border: theme.colors.border,
    accent: theme.colors.accent,
    accentLight: theme.colors.accentLight,
  };

  React.useEffect(() => {
    if (visible) {
      console.log('[PremiumUpsellModal] Modal shown, feature:', feature);
      logEvent('premium_modal_shown', { feature });
    }
  }, [visible, feature]);

  const handleUpgrade = async () => {
    console.log('[PremiumUpsellModal] Upgrade button tapped');
    setLoading(true);
    
    try {
      logEvent('premium_upgrade_clicked', { feature });
      
      await new Promise(resolve => setTimeout(resolve, 500));
      
      onClose();
      
      console.log('[PremiumUpsellModal] Navigating to profile for upgrade');
    } catch (error) {
      console.error('[PremiumUpsellModal] Upgrade error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNotNow = () => {
    console.log('[PremiumUpsellModal] Not now button tapped');
    logEvent('premium_dismissed', { feature });
    onClose();
  };

  const handleLearnMore = () => {
    console.log('[PremiumUpsellModal] Learn more tapped');
    logEvent('premium_learn_more_clicked', { feature });
    onClose();
    router.push('/premium-info');
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable
        style={styles.overlay}
        onPress={handleNotNow}
      >
        <Pressable
          style={[styles.container, { backgroundColor: currentColors.card }]}
          onPress={(e) => e.stopPropagation()}
        >
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.header}>
              <View style={[styles.iconContainer, { backgroundColor: currentColors.accentLight }]}>
                <IconSymbol
                  ios_icon_name="star.fill"
                  android_material_icon_name="star"
                  size={32}
                  color={currentColors.accent}
                />
              </View>
              
              <Text style={[styles.title, { color: currentColors.text }]}>
                Upgrade to Premium
              </Text>
              
              <Text style={[styles.subtitle, { color: currentColors.textSecondary }]}>
                Unlock powerful features to get the most out of your wishlists
              </Text>
            </View>

            <View style={styles.benefits}>
              {PREMIUM_BENEFITS.map((benefit, index) => {
                const benefitTitle = benefit.title;
                const benefitDescription = benefit.description;
                
                return (
                  <View key={index} style={styles.benefitItem}>
                    <View style={[styles.benefitIcon, { backgroundColor: currentColors.accentLight }]}>
                      <IconSymbol
                        ios_icon_name={benefit.icon}
                        android_material_icon_name={benefit.icon}
                        size={20}
                        color={currentColors.accent}
                      />
                    </View>
                    
                    <View style={styles.benefitText}>
                      <Text style={[styles.benefitTitle, { color: currentColors.text }]}>
                        {benefitTitle}
                      </Text>
                      <Text style={[styles.benefitDescription, { color: currentColors.textSecondary }]}>
                        {benefitDescription}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>

            <View style={styles.actions}>
              <TouchableOpacity
                style={[styles.primaryButton, { backgroundColor: currentColors.accent }]}
                onPress={handleUpgrade}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.primaryButtonText}>
                    Upgrade Now
                  </Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.secondaryButton, { borderColor: currentColors.border }]}
                onPress={handleNotNow}
                disabled={loading}
              >
                <Text style={[styles.secondaryButtonText, { color: currentColors.text }]}>
                  Not Now
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.linkButton}
                onPress={handleLearnMore}
                disabled={loading}
              >
                <Text style={[styles.linkButtonText, { color: currentColors.accent }]}>
                  Learn More
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  container: {
    width: '100%',
    maxWidth: 480,
    borderRadius: 24,
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  title: {
    ...typography.titleLarge,
    fontWeight: '600',
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    ...typography.bodyMedium,
    textAlign: 'center',
    lineHeight: 20,
  },
  benefits: {
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  benefitIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  benefitText: {
    flex: 1,
    gap: spacing.xs,
  },
  benefitTitle: {
    ...typography.bodyLarge,
    fontWeight: '600',
  },
  benefitDescription: {
    ...typography.bodySmall,
    lineHeight: 18,
  },
  actions: {
    gap: spacing.md,
  },
  primaryButton: {
    ...buttonStyles.base,
    paddingVertical: spacing.md + 2,
  },
  primaryButtonText: {
    ...typography.buttonLarge,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  secondaryButton: {
    ...buttonStyles.base,
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    paddingVertical: spacing.md,
  },
  secondaryButtonText: {
    ...typography.buttonMedium,
    fontWeight: '600',
  },
  linkButton: {
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  linkButtonText: {
    ...typography.bodyMedium,
    fontWeight: '600',
  },
});
