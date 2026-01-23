
import React from 'react';
import { Pressable, PressableProps, ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useHaptics } from '@/hooks/useHaptics';

interface PressableScaleProps extends PressableProps {
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
  scaleValue?: number;
  hapticFeedback?: 'light' | 'medium' | 'heavy' | 'selection' | 'none';
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function PressableScale({
  children,
  style,
  scaleValue = 0.96,
  hapticFeedback = 'light',
  onPress,
  onPressIn,
  onPressOut,
  ...props
}: PressableScaleProps) {
  const scale = useSharedValue(1);
  const haptics = useHaptics();

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = (event: any) => {
    scale.value = withSpring(scaleValue, {
      damping: 15,
      stiffness: 300,
    });
    
    if (hapticFeedback !== 'none') {
      switch (hapticFeedback) {
        case 'light':
          haptics.light();
          break;
        case 'medium':
          haptics.medium();
          break;
        case 'heavy':
          haptics.heavy();
          break;
        case 'selection':
          haptics.selection();
          break;
      }
    }
    
    onPressIn?.(event);
  };

  const handlePressOut = (event: any) => {
    scale.value = withSpring(1, {
      damping: 15,
      stiffness: 300,
    });
    onPressOut?.(event);
  };

  const handlePress = (event: any) => {
    onPress?.(event);
  };

  return (
    <AnimatedPressable
      style={[style, animatedStyle]}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
      {...props}
    >
      {children}
    </AnimatedPressable>
  );
}
