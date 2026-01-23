
import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, ViewStyle, TextStyle } from 'react-native';
import { buttonStyles, colors } from '@/styles/designSystem';

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
  const getButtonStyle = () => {
    const baseStyle = [buttonStyles.base];
    
    if (variant === 'primary') {
      baseStyle.push(buttonStyles.primary);
    } else if (variant === 'secondary') {
      baseStyle.push(buttonStyles.secondary);
    } else if (variant === 'destructive') {
      baseStyle.push(buttonStyles.destructive);
    } else if (variant === 'ghost') {
      baseStyle.push(buttonStyles.ghost);
    }
    
    if (disabled || loading) {
      baseStyle.push(buttonStyles.disabled);
    }
    
    if (style) {
      baseStyle.push(style);
    }
    
    return baseStyle;
  };
  
  const getTextStyle = () => {
    const baseTextStyle = [];
    
    if (variant === 'primary') {
      baseTextStyle.push(buttonStyles.primaryText);
    } else if (variant === 'secondary') {
      baseTextStyle.push(buttonStyles.secondaryText);
    } else if (variant === 'destructive') {
      baseTextStyle.push(buttonStyles.destructiveText);
    } else if (variant === 'ghost') {
      baseTextStyle.push(buttonStyles.ghostText);
    }
    
    if (textStyle) {
      baseTextStyle.push(textStyle);
    }
    
    return baseTextStyle;
  };
  
  const spinnerColor = variant === 'secondary' || variant === 'ghost' 
    ? colors.primary 
    : colors.textInverse;
  
  return (
    <TouchableOpacity
      style={getButtonStyle()}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator color={spinnerColor} />
      ) : (
        <Text style={getTextStyle()}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}
