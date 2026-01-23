
import { Easing } from 'react-native-reanimated';

// ═══════════════════════════════════════════════════════
// 🎬 ANIMATION SYSTEM - MY WISHLIST
// ═══════════════════════════════════════════════════════

export const animations = {
  // Timing configurations
  timing: {
    fast: 200,
    normal: 300,
    slow: 500,
  },
  
  // Easing functions
  easing: {
    smooth: Easing.bezier(0.25, 0.1, 0.25, 1),
    spring: Easing.bezier(0.68, -0.55, 0.265, 1.55),
    linear: Easing.linear,
  },
  
  // Spring configurations
  spring: {
    gentle: {
      damping: 20,
      stiffness: 120,
      mass: 1,
    },
    bouncy: {
      damping: 15,
      stiffness: 150,
      mass: 0.8,
    },
    snappy: {
      damping: 25,
      stiffness: 200,
      mass: 0.5,
    },
  },
  
  // Scale values for press feedback
  scale: {
    press: 0.96,
    active: 1.0,
  },
  
  // Opacity values
  opacity: {
    hidden: 0,
    dimmed: 0.6,
    visible: 1,
  },
};

// Preset animation configs
export const presets = {
  fadeIn: {
    duration: animations.timing.normal,
    easing: animations.easing.smooth,
  },
  scalePress: {
    duration: animations.timing.fast,
    easing: animations.easing.smooth,
  },
  slideIn: {
    duration: animations.timing.normal,
    easing: animations.easing.spring,
  },
};
