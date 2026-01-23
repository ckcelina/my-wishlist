
import React from 'react';
import { Pressable, Text, StyleSheet, ActivityIndicator, ViewStyle, TextStyle } from 'react-native';
import { useAppTheme } from '@/contexts/ThemeContext';
import { createComponentStyles, createTypography } from '@/styles/theme';

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
  const componentStyles = createComponentStyles(theme);
  const typography = createTypography(theme);
  
  const isDisabled = disabled || loading;
  
  const buttonStyle = [
    componentStyles.button,
    variant === 'secondary' && componentStyles.buttonSecondary,
    style,
  ];
  
  const textColor = variant === 'primary' || variant === 'destructive' 
    ? theme.colors.background 
    : theme.colors.text;
  
  const buttonTextStyle = [
    typography.button,
    { color: textColor },
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
        <ActivityIndicator color={textColor} />
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
