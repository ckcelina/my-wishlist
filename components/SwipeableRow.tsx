
import React, { useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  PanResponder,
  Platform,
} from 'react-native';
import { IconSymbol } from './IconSymbol';
import { useAppTheme } from '@/contexts/ThemeContext';
import { createColors, spacing } from '@/styles/designSystem';

interface SwipeAction {
  label: string;
  icon: string;
  androidIcon: string;
  color: string;
  onPress: () => void;
}

interface SwipeableRowProps {
  children: React.ReactNode;
  actions: SwipeAction[];
  enabled?: boolean;
}

export function SwipeableRow({ children, actions, enabled = true }: SwipeableRowProps) {
  const { theme } = useAppTheme();
  const colors = createColors(theme);
  
  const translateX = useRef(new Animated.Value(0)).current;
  const lastOffset = useRef(0);

  const SWIPE_THRESHOLD = 80;
  const ACTION_WIDTH = 80;
  const MAX_SWIPE = actions.length * ACTION_WIDTH;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => enabled,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return enabled && Math.abs(gestureState.dx) > 10;
      },
      onPanResponderGrant: () => {
        translateX.setOffset(lastOffset.current);
        translateX.setValue(0);
      },
      onPanResponderMove: (_, gestureState) => {
        if (!enabled) return;
        
        // Only allow swiping left (negative dx)
        if (gestureState.dx < 0) {
          const newValue = Math.max(-MAX_SWIPE, gestureState.dx);
          translateX.setValue(newValue);
        } else if (lastOffset.current < 0) {
          // Allow swiping right to close
          const newValue = Math.min(0, lastOffset.current + gestureState.dx);
          translateX.setValue(newValue - lastOffset.current);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (!enabled) return;
        
        translateX.flattenOffset();
        const currentValue = lastOffset.current + gestureState.dx;

        if (currentValue < -SWIPE_THRESHOLD) {
          // Snap to open
          Animated.spring(translateX, {
            toValue: -MAX_SWIPE,
            useNativeDriver: true,
            friction: 8,
          }).start();
          lastOffset.current = -MAX_SWIPE;
        } else {
          // Snap to closed
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
            friction: 8,
          }).start();
          lastOffset.current = 0;
        }
      },
    })
  ).current;

  const closeRow = () => {
    Animated.spring(translateX, {
      toValue: 0,
      useNativeDriver: true,
      friction: 8,
    }).start();
    lastOffset.current = 0;
  };

  const handleActionPress = (action: SwipeAction) => {
    closeRow();
    setTimeout(() => action.onPress(), 200);
  };

  const styles = StyleSheet.create({
    container: {
      position: 'relative',
    },
    actionsContainer: {
      position: 'absolute',
      right: 0,
      top: 0,
      bottom: 0,
      flexDirection: 'row',
      alignItems: 'stretch',
    },
    action: {
      width: ACTION_WIDTH,
      justifyContent: 'center',
      alignItems: 'center',
      gap: 4,
    },
    actionLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: '#FFFFFF',
    },
    rowContent: {
      backgroundColor: colors.surface,
    },
  });

  if (!enabled) {
    return <View>{children}</View>;
  }

  return (
    <View style={styles.container}>
      {/* Actions (revealed when swiping left) */}
      <View style={styles.actionsContainer}>
        {actions.map((action, index) => (
          <TouchableOpacity
            key={index}
            style={[styles.action, { backgroundColor: action.color }]}
            onPress={() => handleActionPress(action)}
            activeOpacity={0.7}
          >
            <IconSymbol
              ios_icon_name={action.icon}
              android_material_icon_name={action.androidIcon}
              size={24}
              color="#FFFFFF"
            />
            <Text style={styles.actionLabel}>{action.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Row content (swipeable) */}
      <Animated.View
        style={[
          styles.rowContent,
          {
            transform: [{ translateX }],
          },
        ]}
        {...panResponder.panHandlers}
      >
        {children}
      </Animated.View>
    </View>
  );
}
