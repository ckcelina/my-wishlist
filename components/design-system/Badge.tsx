
import React from 'react';
import { View, Text } from 'react-native';
import { badgeStyles } from '@/styles/designSystem';

interface BadgeProps {
  label: string;
  variant?: 'success' | 'warning' | 'error' | 'info' | 'neutral';
}

export function Badge({ label, variant = 'neutral' }: BadgeProps) {
  const getBadgeStyle = () => {
    const baseStyle = [badgeStyles.base];
    
    if (variant === 'success') {
      baseStyle.push(badgeStyles.success);
    } else if (variant === 'warning') {
      baseStyle.push(badgeStyles.warning);
    } else if (variant === 'error') {
      baseStyle.push(badgeStyles.error);
    } else if (variant === 'info') {
      baseStyle.push(badgeStyles.info);
    } else {
      baseStyle.push(badgeStyles.neutral);
    }
    
    return baseStyle;
  };
  
  const getTextStyle = () => {
    const baseTextStyle = [badgeStyles.text];
    
    if (variant === 'success') {
      baseTextStyle.push(badgeStyles.successText);
    } else if (variant === 'warning') {
      baseTextStyle.push(badgeStyles.warningText);
    } else if (variant === 'error') {
      baseTextStyle.push(badgeStyles.errorText);
    } else if (variant === 'info') {
      baseTextStyle.push(badgeStyles.infoText);
    } else {
      baseTextStyle.push(badgeStyles.neutralText);
    }
    
    return baseTextStyle;
  };
  
  return (
    <View style={getBadgeStyle()}>
      <Text style={getTextStyle()}>{label}</Text>
    </View>
  );
}
