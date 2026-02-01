
import React from 'react';
import { Image, StyleSheet, ImageSourcePropType } from 'react-native';
import { useAppTheme } from '@/contexts/ThemeContext';

interface LogoProps {
  size?: 'small' | 'medium' | 'large';
  style?: any;
}

// Helper to resolve image sources
function resolveImageSource(source: string | number | ImageSourcePropType | undefined): ImageSourcePropType {
  if (!source) return { uri: '' };
  if (typeof source === 'string') return { uri: source };
  return source as ImageSourcePropType;
}

export function Logo({ size = 'medium', style }: LogoProps) {
  const { isDark } = useAppTheme();
  
  // My Wishlist logos - theme aware
  // Light mode: light purple background with purple gift box
  const lightModeLogo = require('@/assets/images/047add85-2230-4e4c-9a0d-56a73d2890cc.png');
  // Dark mode: dark purple background with purple gift box
  const darkModeLogo = require('@/assets/images/6c7b263c-7920-4d07-94f3-fac6c2f0b3c0.png');
  
  const logoSource = isDark ? darkModeLogo : lightModeLogo;
  
  const sizeStyles = {
    small: { width: 80, height: 80 },
    medium: { width: 120, height: 120 },
    large: { width: 160, height: 160 },
  };
  
  console.log('[Logo] Rendering My Wishlist logo for theme:', isDark ? 'dark' : 'light');
  
  return (
    <Image
      source={resolveImageSource(logoSource)}
      style={[sizeStyles[size], styles.logo, style]}
      resizeMode="contain"
    />
  );
}

const styles = StyleSheet.create({
  logo: {
    borderRadius: 20,
  },
});
