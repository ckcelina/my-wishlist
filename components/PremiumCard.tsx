
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { IconSymbol } from './IconSymbol';
import { Card } from './design-system/Card';
import { Divider } from './design-system/Divider';
import { PressableScale } from './design-system/PressableScale';
import { typography, spacing } from '@/styles/designSystem';
import { useAppTheme } from '@/contexts/ThemeContext';
import { getPremiumStatus, restorePremium, type PremiumStatus } from '@/utils/premium';
import { PremiumUpsellModal } from './PremiumUpsellModal';
import { useRouter } from 'expo-router';
import { useHaptics } from '@/hooks/useHaptics';

export function PremiumCard() {
  const { theme } = useAppTheme();
  const router = useRouter();
  const haptics = useHaptics();
  
  const [premiumStatus, setPremiumStatus] = useState<PremiumStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [restoring, setRestoring] = useState(false);
  const [showUpsellModal, setShowUpsellModal] = useState(false);

  const currentColors = {
    text: theme.colors.text,
    textSecondary: theme.colors.textSecondary,
    accent: theme.colors.accent,
    accentLight: theme.colors.accentLight,
    success: theme.colors.success,
  };

  useEffect(() => {
    loadPremiumStatus();
  }, []);

  const loadPremiumStatus = async () => {
    console.log('[PremiumCard] Loading premium status');
    try {
      const status = await getPremiumStatus();
      console.log('[PremiumCard] Premium status loaded:', status);
      setPremiumStatus(status);
    } catch (error) {
      console.error('[PremiumCard] Failed to load premium status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = () => {
    console.log('[PremiumCard] Upgrade button tapped');
    haptics.light();
    setShowUpsellModal(true);
  };

  const handleRestore = async () => {
    console.log('[PremiumCard] Restore button tapped');
    haptics.light();
    setRestoring(true);
    
    try {
      const status = await restorePremium();
      console.log('[PremiumCard] Restore successful:', status);
      setPremiumStatus(status);
      haptics.success();
      
      const message = status.isPremium 
        ? 'Premium subscription restored successfully!'
        : 'No premium subscription found to restore.';
      
      Alert.alert('Restore Complete', message);
    } catch (error) {
      console.error('[PremiumCard] Restore failed:', error);
      haptics.error();
      Alert.alert('Error', 'Failed to restore purchases. Please try again.');
    } finally {
      setRestoring(false);
    }
  };

  const handleLearnMore = () => {
    console.log('[PremiumCard] Learn more tapped');
    haptics.light();
    router.push('/premium-info');
  };

  if (loading) {
    return (
      <Card style={styles.card}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={currentColors.accent} />
        </View>
      </Card>
    );
  }

  const isPremium = premiumStatus?.isPremium || false;
  const planName = premiumStatus?.planName || null;
  
  const statusText = isPremium ? 'Active' : 'Free';
  const statusColor = isPremium ? currentColors.success : currentColors.textSecondary;

  return (
    <>
      <Card style={styles.card}>
        <View style={styles.header}>
          <View style={[styles.iconContainer, { backgroundColor: currentColors.accentLight }]}>
            <IconSymbol
              ios_icon_name="star.fill"
              android_material_icon_name="star"
              size={24}
              color={currentColors.accent}
            />
          </View>
          
          <View style={styles.headerText}>
            <Text style={[styles.title, { color: currentColors.text }]}>
              My Wishlist Premium
            </Text>
            <Text style={[styles.status, { color: statusColor }]}>
              {statusText}
            </Text>
          </View>
        </View>

        {isPremium && planName && (
          <>
            <Divider />
            <View style={styles.planInfo}>
              <Text style={[styles.planLabel, { color: currentColors.textSecondary }]}>
                Current Plan
              </Text>
              <Text style={[styles.planName, { color: currentColors.text }]}>
                {planName}
              </Text>
            </View>
          </>
        )}

        <Divider />

        {!isPremium ? (
          <>
            <PressableScale
              style={styles.menuItem}
              onPress={handleUpgrade}
              hapticFeedback="light"
            >
              <View style={styles.menuItemLeft}>
                <IconSymbol
                  ios_icon_name="arrow.up.circle"
                  android_material_icon_name="upgrade"
                  size={24}
                  color={currentColors.accent}
                />
                <Text style={[styles.menuItemText, { color: currentColors.accent }]}>
                  Upgrade to Premium
                </Text>
              </View>
              <IconSymbol
                ios_icon_name="chevron.right"
                android_material_icon_name="chevron-right"
                size={20}
                color={currentColors.textSecondary}
              />
            </PressableScale>

            <Divider />
          </>
        ) : null}

        <PressableScale
          style={styles.menuItem}
          onPress={handleRestore}
          disabled={restoring}
          hapticFeedback="light"
        >
          <View style={styles.menuItemLeft}>
            <IconSymbol
              ios_icon_name="arrow.clockwise"
              android_material_icon_name="refresh"
              size={24}
              color={currentColors.textSecondary}
            />
            <Text style={[styles.menuItemText, { color: currentColors.text }]}>
              Restore Purchases
            </Text>
          </View>
          {restoring ? (
            <ActivityIndicator size="small" color={currentColors.accent} />
          ) : (
            <IconSymbol
              ios_icon_name="chevron.right"
              android_material_icon_name="chevron-right"
              size={20}
              color={currentColors.textSecondary}
            />
          )}
        </PressableScale>

        <Divider />

        <PressableScale
          style={styles.menuItem}
          onPress={handleLearnMore}
          hapticFeedback="light"
        >
          <View style={styles.menuItemLeft}>
            <IconSymbol
              ios_icon_name="info.circle"
              android_material_icon_name="info"
              size={24}
              color={currentColors.textSecondary}
            />
            <Text style={[styles.menuItemText, { color: currentColors.text }]}>
              Learn More
            </Text>
          </View>
          <IconSymbol
            ios_icon_name="chevron.right"
            android_material_icon_name="chevron-right"
            size={20}
            color={currentColors.textSecondary}
          />
        </PressableScale>
      </Card>

      <PremiumUpsellModal
        visible={showUpsellModal}
        onClose={() => {
          setShowUpsellModal(false);
          loadPremiumStatus();
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 0,
  },
  loadingContainer: {
    padding: spacing.lg,
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.md,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
    gap: spacing.xs,
  },
  title: {
    ...typography.bodyLarge,
    fontWeight: '600',
  },
  status: {
    ...typography.bodySmall,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  planInfo: {
    padding: spacing.md,
    gap: spacing.xs,
  },
  planLabel: {
    ...typography.bodySmall,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  planName: {
    ...typography.bodyLarge,
    fontWeight: '600',
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  menuItemText: {
    ...typography.bodyLarge,
  },
});
