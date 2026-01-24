
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
  // Dark mode: black background with white geometric shapes
  const darkModeLogo = require('@/assets/images/7ef63ee6-ea78-4ae0-8c0f-5dabcd379909.png');
  // Light mode: white background with dark geometric shapes
  // Using the same logo for now - you can replace with a light version if available
  const lightModeLogo = require('@/assets/images/7ef63ee6-ea78-4ae0-8c0f-5dabcd379909.png');
  
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
