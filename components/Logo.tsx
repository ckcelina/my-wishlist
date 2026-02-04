
import React from 'react';
import { Image, StyleSheet, View, ImageSourcePropType } from 'react-native';
import { useAppTheme } from '@/contexts/ThemeContext';

interface LogoProps {
  size?: 'small' | 'medium' | 'large';
  style?: any;
}

// Helper to resolve image sources (handles both local require() and remote URLs)
function resolveImageSource(source: string | number | ImageSourcePropType | undefined): ImageSourcePropType {
  if (!source) return { uri: '' };
  if (typeof source === 'string') return { uri: source };
  return source as ImageSourcePropType;
}

export const Logo: React.FC<LogoProps> = ({ size = 'medium', style }) => {
  const { isDark } = useAppTheme();
  
  // Use theme-appropriate logo
  const logoSource = isDark
    ? require('@/assets/images/natively-dark.png')
    : require('@/assets/images/e86a516f-63f8-47ae-96ef-8f37ff302d99.png');

  const sizeStyles = {
    small: { width: 40, height: 40 },
    medium: { width: 80, height: 80 },
    large: { width: 120, height: 120 },
  };

  const dimensions = sizeStyles[size];

  return (
    <View style={[styles.container, style]}>
      <Image
        source={resolveImageSource(logoSource)}
        style={[styles.logo, dimensions]}
        resizeMode="contain"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    // Dimensions set dynamically based on size prop
  },
});
