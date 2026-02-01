
import React from 'react';
import { Image, StyleSheet, ImageSourcePropType } from 'react-native';

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
  // Use the new My Wishlist logo (purple gift box with text) for all in-app usage
  // The app download icon (final_quest_240x240.png) is configured separately in app.config.js
  const logoSource = require('@/assets/images/e86a516f-63f8-47ae-96ef-8f37ff302d99.png');
  
  const sizeStyles = {
    small: { width: 80, height: 80 },
    medium: { width: 120, height: 120 },
    large: { width: 160, height: 160 },
  };
  
  console.log('[Logo] Rendering My Wishlist in-app logo');
  
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
    borderRadius: 0, // Remove border radius to show full logo
  },
});
