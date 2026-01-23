
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform, Alert } from 'react-native';
import { authenticatedPost } from './api';

// Set notification handler for foreground notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Request notification permissions from the user
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  console.log('[Notifications] Requesting notification permissions');

  try {
    // Check if we're on a physical device
    if (!Device.isDevice) {
      console.log('[Notifications] Not a physical device, skipping');
      Alert.alert(
        'Push Notifications',
        'Push notifications only work on physical devices, not simulators/emulators.'
      );
      return false;
    }

    // Get current permission status
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    console.log('[Notifications] Existing permission status:', existingStatus);

    let finalStatus = existingStatus;

    // Request permissions if not already granted
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
      console.log('[Notifications] New permission status:', finalStatus);
    }

    if (finalStatus !== 'granted') {
      console.log('[Notifications] Permission denied');
      return false;
    }

    // Set up Android notification channel
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('price-drops', {
        name: 'Price Drop Alerts',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF6B6B',
        sound: 'default',
      });
      console.log('[Notifications] Android channel created');
    }

    console.log('[Notifications] Permissions granted successfully');
    return true;
  } catch (error) {
    console.error('[Notifications] Error requesting permissions:', error);
    return false;
  }
}

/**
 * Get Expo push token and register it with the backend
 */
export async function registerForPushNotifications(): Promise<string | null> {
  console.log('[Notifications] Registering for push notifications');

  try {
    // Request permissions first
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) {
      console.log('[Notifications] No permission, cannot register');
      return null;
    }

    // Get Expo push token
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    if (!projectId) {
      console.error('[Notifications] No project ID found in app config');
      return null;
    }

    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId,
    });

    const expoPushToken = tokenData.data;
    console.log('[Notifications] Got Expo push token:', expoPushToken);

    // Register token with backend
    try {
      await authenticatedPost('/api/users/push-token', {
        expoPushToken,
      });
      console.log('[Notifications] Token registered with backend');
    } catch (error) {
      console.error('[Notifications] Failed to register token with backend:', error);
      // Don't fail completely if backend registration fails
    }

    return expoPushToken;
  } catch (error) {
    console.error('[Notifications] Error registering for push notifications:', error);
    return null;
  }
}

/**
 * Check if notifications are enabled
 */
export async function areNotificationsEnabled(): Promise<boolean> {
  try {
    const { status } = await Notifications.getPermissionsAsync();
    return status === 'granted';
  } catch (error) {
    console.error('[Notifications] Error checking notification status:', error);
    return false;
  }
}

/**
 * Schedule a local test notification
 */
export async function scheduleTestNotification(): Promise<void> {
  console.log('[Notifications] Scheduling test notification');

  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Test Notification',
        body: 'This is a test notification from My Wishlist',
        sound: 'default',
      },
      trigger: {
        seconds: 2,
      },
    });
    console.log('[Notifications] Test notification scheduled');
  } catch (error) {
    console.error('[Notifications] Error scheduling test notification:', error);
  }
}
