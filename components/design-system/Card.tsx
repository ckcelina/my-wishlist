
import React from 'react';
import { View, StyleSheet, ViewStyle, Pressable } from 'react-native';
import { useAppTheme } from '@/contexts/ThemeContext';
import { createColors } from '@/styles/designSystem';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  elevated?: boolean;
  flat?: boolean;
  interactive?: boolean;
  onPress?: () => void;
}

export function Card({ children, style, elevated = false, flat = false, interactive = false, onPress }: CardProps) {
  const { theme } = useAppTheme();
  const colors = createColors(theme);
  
  const baseCardStyle = {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...(theme.mode === 'light' && !flat && {
      shadowColor: colors.shadowLight,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 1,
      shadowRadius: 8,
      elevation: 2,
    }),
  };
  
  const cardStyle = [
    baseCardStyle,
    elevated && styles.elevated,
    flat && styles.flat,
    style,
  ];
  
  if (onPress || interactive) {
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
