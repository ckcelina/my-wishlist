
import React from 'react';
import { View } from 'react-native';
import { dividerStyles } from '@/styles/designSystem';

interface DividerProps {
  orientation?: 'horizontal' | 'vertical';
}

export function Divider({ orientation = 'horizontal' }: DividerProps) {
  const dividerStyle = orientation === 'horizontal' 
    ? dividerStyles.horizontal 
    : dividerStyles.vertical;
  
  return <View style={dividerStyle} />;
}
