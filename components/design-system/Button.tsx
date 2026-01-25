
import React from 'react';
import { Pressable, Text, StyleSheet, ActivityIndicator, ViewStyle, TextStyle } from 'react-native';
import { useAppTheme } from '@/contexts/ThemeContext';
import { createColors, createTypography } from '@/styles/designSystem';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'destructive' | 'ghost';
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  style,
  textStyle,
}: ButtonProps) {
  const { theme } = useAppTheme();
  const colors = createColors(theme);
  const typography = createTypography(theme);
  
  const isDisabled = disabled || loading;
  
  const getButtonStyle = () => {
    const baseStyle = {
      borderRadius: 12,
      paddingVertical: 16,
      paddingHorizontal: 24,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      flexDirection: 'row' as const,
      gap: 8,
    };

    switch (variant) {
      case 'primary':
        return {
          ...baseStyle,
          backgroundColor: colors.accent,
          ...(theme.mode === 'light' && {
            shadowColor: colors.shadowMedium,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 1,
            shadowRadius: 4,
            elevation: 2,
          }),
        };
      case 'secondary':
        return {
          ...baseStyle,
          backgroundColor: colors.surface,
          borderWidth: 1.5,
          borderColor: colors.border,
        };
      case 'destructive':
        return {
          ...baseStyle,
          backgroundColor: colors.error,
          ...(theme.mode === 'light' && {
            shadowColor: colors.shadowMedium,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 1,
            shadowRadius: 4,
            elevation: 2,
          }),
        };
      case 'ghost':
        return {
          ...baseStyle,
          backgroundColor: 'transparent',
        };
      default:
        return baseStyle;
    }
  };

  const getTextColor = () => {
    switch (variant) {
      case 'primary':
        return theme.mode === 'dark' ? colors.background : colors.background;
      case 'secondary':
        return colors.text;
      case 'destructive':
        return '#FFFFFF';
      case 'ghost':
        return colors.accent;
      default:
        return colors.text;
    }
  };
  
  const buttonStyle = [
    getButtonStyle(),
    style,
  ];
  
  const buttonTextStyle = [
    typography.buttonMedium,
    { color: getTextColor() },
    textStyle,
  ];
  
  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        buttonStyle,
        pressed && !isDisabled && styles.pressed,
        isDisabled && styles.disabled,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={getTextColor()} />
      ) : (
        <Text style={buttonTextStyle}>{title}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  disabled: {
    opacity: 0.5,
  },
});
