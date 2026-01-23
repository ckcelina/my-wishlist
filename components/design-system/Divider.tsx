
import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { useAppTheme } from '@/contexts/ThemeContext';

interface DividerProps {
  style?: ViewStyle;
  vertical?: boolean;
}

export function Divider({ style, vertical = false }: DividerProps) {
  const { theme } = useAppTheme();
  
  const dividerStyle = vertical
    ? [styles.vertical, { backgroundColor: theme.colors.divider }, style]
    : [styles.horizontal, { backgroundColor: theme.colors.divider }, style];
  
  return <View style={dividerStyle} />;
}

const styles = StyleSheet.create({
  horizontal: {
    height: 1,
    width: '100%',
    marginVertical: 16,
  },
  vertical: {
    width: 1,
    height: '100%',
    marginHorizontal: 16,
  },
});
