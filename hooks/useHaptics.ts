
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

export function useHaptics() {
  const light = () => {
    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const medium = () => {
    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  };

  const heavy = () => {
    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }
  };

  const success = () => {
    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const warning = () => {
    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
  };

  const error = () => {
    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const selection = () => {
    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      Haptics.selectionAsync();
    }
  };

  return {
    light,
    medium,
    heavy,
    success,
    warning,
    error,
    selection,
  };
}
