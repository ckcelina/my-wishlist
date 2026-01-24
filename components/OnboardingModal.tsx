
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  Dimensions,
} from 'react-native';
import { IconSymbol } from '@/components/IconSymbol';
import { Button } from '@/components/design-system/Button';
import { colors, typography, spacing } from '@/styles/designSystem';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useHaptics } from '@/hooks/useHaptics';
import Animated, { FadeIn, FadeOut, SlideInRight, SlideOutLeft } from 'react-native-reanimated';

const { width } = Dimensions.get('window');

interface OnboardingStep {
  icon: string;
  androidIcon: string;
  title: string;
  description: string;
}

const STEPS: OnboardingStep[] = [
  {
    icon: 'square.and.arrow.up',
    androidIcon: 'share',
    title: 'Add from anywhere',
    description: 'Save items from any app or website using the share button',
  },
  {
    icon: 'chart.line.uptrend.xyaxis',
    androidIcon: 'trending-down',
    title: 'Track prices automatically',
    description: 'Get notified when prices drop on your saved items',
  },
  {
    icon: 'person.2',
    androidIcon: 'group',
    title: 'Share with friends',
    description: 'Create shareable wishlists for birthdays, holidays, and more',
  },
];

interface OnboardingModalProps {
  visible: boolean;
  onComplete: () => void;
  onSkip: () => void;
}

export function OnboardingModal({ visible, onComplete, onSkip }: OnboardingModalProps) {
  const { theme, isDark } = useAppTheme();
  const haptics = useHaptics();
  const [currentStep, setCurrentStep] = useState(0);

  const handleNext = () => {
    haptics.light();
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const handleSkip = () => {
    haptics.light();
    onSkip();
  };

  const step = STEPS[currentStep];
  const isLastStep = currentStep === STEPS.length - 1;
  const buttonText = isLastStep ? 'Get Started' : 'Next';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleSkip}
    >
      <Pressable style={styles.overlay} onPress={handleSkip}>
        <Pressable
          style={[styles.content, { backgroundColor: theme.colors.card }]}
          onPress={(e) => e.stopPropagation()}
        >
          <Animated.View
            key={currentStep}
            entering={SlideInRight.duration(300)}
            exiting={SlideOutLeft.duration(300)}
            style={styles.stepContent}
          >
            <View style={[styles.iconContainer, { backgroundColor: theme.colors.accent + '20' }]}>
              <IconSymbol
                ios_icon_name={step.icon}
                android_material_icon_name={step.androidIcon}
                size={64}
                color={theme.colors.accent}
              />
            </View>

            <Text style={[styles.title, { color: theme.colors.text }]}>
              {step.title}
            </Text>

            <Text style={[styles.description, { color: theme.colors.textSecondary }]}>
              {step.description}
            </Text>
          </Animated.View>

          <View style={styles.footer}>
            <View style={styles.dots}>
              {STEPS.map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.dot,
                    {
                      backgroundColor: index === currentStep
                        ? theme.colors.accent
                        : theme.colors.border,
                    },
                  ]}
                />
              ))}
            </View>

            <View style={styles.buttons}>
              <Button
                title="Skip"
                onPress={handleSkip}
                variant="secondary"
                style={styles.button}
              />
              <Button
                title={buttonText}
                onPress={handleNext}
                variant="primary"
                style={styles.button}
              />
            </View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    width: width * 0.85,
    maxWidth: 400,
    borderRadius: 24,
    padding: spacing.xl,
    alignItems: 'center',
  },
  stepContent: {
    alignItems: 'center',
    width: '100%',
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  title: {
    ...typography.titleLarge,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  description: {
    ...typography.bodyLarge,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: spacing.xl,
  },
  footer: {
    width: '100%',
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  buttons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  button: {
    flex: 1,
  },
});
