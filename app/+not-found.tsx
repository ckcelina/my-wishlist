
import { Link, Stack, useRouter } from 'expo-router';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppTheme } from '@/contexts/ThemeContext';
import { IconSymbol } from '@/components/IconSymbol';
import { useMemo } from 'react';
import { createColors, createTypography, spacing } from '@/styles/designSystem';

export default function NotFoundScreen() {
  const { theme } = useAppTheme();
  const router = useRouter();
  const colors = useMemo(() => createColors(theme), [theme]);
  const typography = useMemo(() => createTypography(theme), [theme]);

  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: spacing.xl,
    },
    iconContainer: {
      marginBottom: spacing.xl,
    },
    title: {
      fontSize: typography.sizes.xxl,
      fontWeight: typography.weights.bold as any,
      color: colors.text,
      marginBottom: spacing.md,
      textAlign: 'center',
    },
    message: {
      fontSize: typography.sizes.md,
      color: colors.textSecondary,
      textAlign: 'center',
      marginBottom: spacing.xl,
      lineHeight: 24,
    },
    button: {
      backgroundColor: colors.accent,
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.md,
      borderRadius: 12,
      minWidth: 200,
      alignItems: 'center',
    },
    buttonText: {
      color: '#FFFFFF',
      fontSize: typography.sizes.md,
      fontWeight: typography.weights.semibold as any,
    },
  }), [colors, typography]);

  const handleGoHome = () => {
    console.log('User tapped Go to Wishlists button from 404 page');
    // Navigate to the correct route - lists, not wishlists
    router.replace('/(tabs)/lists');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <IconSymbol
            ios_icon_name="exclamationmark.triangle"
            android_material_icon_name="warning"
            size={64}
            color={colors.accent}
          />
        </View>
        <Text style={styles.title}>Page Not Found</Text>
        <Text style={styles.message}>
          This screen doesn't exist. Let's get you back to your wishlists.
        </Text>
        <TouchableOpacity style={styles.button} onPress={handleGoHome}>
          <Text style={styles.buttonText}>Go to Wishlists</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
