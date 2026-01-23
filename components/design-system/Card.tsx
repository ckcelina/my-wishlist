
import React from 'react';
import { View, StyleSheet, ViewStyle, Pressable } from 'react-native';
import { useAppTheme } from '@/contexts/ThemeContext';
import { createComponentStyles } from '@/styles/theme';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  elevated?: boolean;
  flat?: boolean;
  onPress?: () => void;
}

export function Card({ children, style, elevated = false, flat = false, onPress }: CardProps) {
  const { theme } = useAppTheme();
  const componentStyles = createComponentStyles(theme);
  
  const cardStyle = [
    componentStyles.card,
    elevated && styles.elevated,
    flat && styles.flat,
    style,
  ];
  
  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          cardStyle,
          pressed && styles.pressed,
        ]}
      >
        {children}
      </Pressable>
    );
  }
  
  return <View style={cardStyle}>{children}</View>;
}

const styles = StyleSheet.create({
  elevated: {
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 4,
  },
  flat: {
    shadowOpacity: 0,
    elevation: 0,
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
});
