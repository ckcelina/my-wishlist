
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
  // Dark mode: brown background with white text/bow
  const darkModeLogo = require('@/assets/images/28c4639c-8f58-4dde-a22a-dbcf47db057e.png');
  // Light mode: light background with brown text/bow
  const lightModeLogo = require('@/assets/images/14005d75-8318-4ff7-a6e2-8f9610c72de8.png');
  
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
