
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
  
  // Use placeholder logo URLs - these should be replaced with actual uploaded logos
  const darkModeLogo = 'https://images.unsplash.com/photo-1513885535751-8b9238bd345a?w=400&h=400&fit=crop';
  const lightModeLogo = 'https://images.unsplash.com/photo-1513885535751-8b9238bd345a?w=400&h=400&fit=crop';
  
  const logoSource = isDark ? darkModeLogo : lightModeLogo;
  
  const sizeStyles = {
    small: { width: 32, height: 32 },
    medium: { width: 48, height: 48 },
    large: { width: 80, height: 80 },
  };
  
  console.log('[Logo] Rendering logo for theme:', isDark ? 'dark' : 'light');
  
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
    // Additional styling if needed
  },
});
