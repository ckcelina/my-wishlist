
import React from 'react';
import { View, TouchableOpacity, ViewStyle } from 'react-native';
import { cardStyles } from '@/styles/designSystem';

interface CardProps {
  children: React.ReactNode;
  variant?: 'base' | 'elevated' | 'flat';
  interactive?: boolean;
  onPress?: () => void;
  style?: ViewStyle;
}

export function Card({
  children,
  variant = 'base',
  interactive = false,
  onPress,
  style,
}: CardProps) {
  const getCardStyle = () => {
    const baseStyle = [cardStyles.base];
    
    if (variant === 'elevated') {
      baseStyle.push(cardStyles.elevated);
    } else if (variant === 'flat') {
      baseStyle.push(cardStyles.flat);
    }
    
    if (interactive) {
      baseStyle.push(cardStyles.interactive);
    }
    
    if (style) {
      baseStyle.push(style);
    }
    
    return baseStyle;
  };
  
  if (interactive && onPress) {
    return (
      <TouchableOpacity
        style={getCardStyle()}
        onPress={onPress}
        activeOpacity={0.7}
      >
        {children}
      </TouchableOpacity>
    );
  }
  
  return <View style={getCardStyle()}>{children}</View>;
}
