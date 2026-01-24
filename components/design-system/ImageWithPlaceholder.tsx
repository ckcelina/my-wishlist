
import React, { useState } from 'react';
import { View, Image, ImageSourcePropType, StyleSheet, ViewStyle, ImageStyle } from 'react-native';
import { colors } from '@/styles/commonStyles';

interface ImageWithPlaceholderProps {
  source: string | number | ImageSourcePropType | undefined;
  style?: ImageStyle;
  containerStyle?: ViewStyle;
  resizeMode?: 'cover' | 'contain' | 'stretch' | 'repeat' | 'center';
  thumbnailSize?: boolean;
}

function resolveImageSource(source: string | number | ImageSourcePropType | undefined): ImageSourcePropType {
  if (!source) return { uri: '' };
  if (typeof source === 'string') return { uri: source };
  return source as ImageSourcePropType;
}

export function ImageWithPlaceholder({
  source,
  style,
  containerStyle,
  resizeMode = 'cover',
  thumbnailSize = false,
}: ImageWithPlaceholderProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const imageSource = resolveImageSource(source);
  
  // Optimize thumbnail images by adding size parameters
  const optimizedSource = thumbnailSize && typeof imageSource === 'object' && imageSource.uri
    ? { uri: `${imageSource.uri}${imageSource.uri.includes('?') ? '&' : '?'}w=200&h=200&fit=crop` }
    : imageSource;

  return (
    <View style={[styles.container, containerStyle]}>
      {(loading || error) && (
        <View style={[styles.placeholder, style]}>
          <View style={styles.shimmer} />
        </View>
      )}
      {!error && (
        <Image
          source={optimizedSource}
          style={[style, loading && styles.hidden]}
          resizeMode={resizeMode}
          onLoadStart={() => setLoading(true)}
          onLoadEnd={() => setLoading(false)}
          onError={() => {
            setLoading(false);
            setError(true);
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  placeholder: {
    backgroundColor: colors.backgroundAlt,
    overflow: 'hidden',
  },
  shimmer: {
    flex: 1,
    backgroundColor: colors.border,
    opacity: 0.3,
  },
  hidden: {
    opacity: 0,
  },
});
