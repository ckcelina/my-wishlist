
import * as Notifications from 'expo-notifications';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { Platform, Linking, Alert } from 'react-native';

export type PermissionType = 'notifications' | 'camera' | 'photos' | 'location';

export interface PermissionStatus {
  granted: boolean;
  canAskAgain: boolean;
  status: 'granted' | 'denied' | 'undetermined';
}

/**
 * Check notification permission status
 */
export async function checkNotificationPermission(): Promise<PermissionStatus> {
  try {
    const { status, canAskAgain } = await Notifications.getPermissionsAsync();
    
    return {
      granted: status === 'granted',
      canAskAgain: canAskAgain ?? true,
      status: status === 'granted' ? 'granted' : status === 'denied' ? 'denied' : 'undetermined',
    };
  } catch (error) {
    console.error('[Permissions] Error checking notification permission:', error);
    return { granted: false, canAskAgain: true, status: 'undetermined' };
  }
}

/**
 * Request notification permission
 */
export async function requestNotificationPermission(): Promise<PermissionStatus> {
  try {
    const { status, canAskAgain } = await Notifications.requestPermissionsAsync();
    
    return {
      granted: status === 'granted',
      canAskAgain: canAskAgain ?? true,
      status: status === 'granted' ? 'granted' : status === 'denied' ? 'denied' : 'undetermined',
    };
  } catch (error) {
    console.error('[Permissions] Error requesting notification permission:', error);
    return { granted: false, canAskAgain: true, status: 'undetermined' };
  }
}

/**
 * Check camera permission status
 */
export async function checkCameraPermission(): Promise<PermissionStatus> {
  try {
    const { status, canAskAgain } = await ImagePicker.getCameraPermissionsAsync();
    
    return {
      granted: status === 'granted',
      canAskAgain: canAskAgain ?? true,
      status: status === 'granted' ? 'granted' : status === 'denied' ? 'denied' : 'undetermined',
    };
  } catch (error) {
    console.error('[Permissions] Error checking camera permission:', error);
    return { granted: false, canAskAgain: true, status: 'undetermined' };
  }
}

/**
 * Request camera permission
 */
export async function requestCameraPermission(): Promise<PermissionStatus> {
  try {
    const { status, canAskAgain } = await ImagePicker.requestCameraPermissionsAsync();
    
    return {
      granted: status === 'granted',
      canAskAgain: canAskAgain ?? true,
      status: status === 'granted' ? 'granted' : status === 'denied' ? 'denied' : 'undetermined',
    };
  } catch (error) {
    console.error('[Permissions] Error requesting camera permission:', error);
    return { granted: false, canAskAgain: true, status: 'undetermined' };
  }
}

/**
 * Check photos library permission status
 */
export async function checkPhotosPermission(): Promise<PermissionStatus> {
  try {
    const { status, canAskAgain } = await ImagePicker.getMediaLibraryPermissionsAsync();
    
    return {
      granted: status === 'granted',
      canAskAgain: canAskAgain ?? true,
      status: status === 'granted' ? 'granted' : status === 'denied' ? 'denied' : 'undetermined',
    };
  } catch (error) {
    console.error('[Permissions] Error checking photos permission:', error);
    return { granted: false, canAskAgain: true, status: 'undetermined' };
  }
}

/**
 * Request photos library permission
 */
export async function requestPhotosPermission(): Promise<PermissionStatus> {
  try {
    const { status, canAskAgain } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    return {
      granted: status === 'granted',
      canAskAgain: canAskAgain ?? true,
      status: status === 'granted' ? 'granted' : status === 'denied' ? 'denied' : 'undetermined',
    };
  } catch (error) {
    console.error('[Permissions] Error requesting photos permission:', error);
    return { granted: false, canAskAgain: true, status: 'undetermined' };
  }
}

/**
 * Check location permission status
 */
export async function checkLocationPermission(): Promise<PermissionStatus> {
  try {
    const { status, canAskAgain } = await Location.getForegroundPermissionsAsync();
    
    return {
      granted: status === 'granted',
      canAskAgain: canAskAgain ?? true,
      status: status === 'granted' ? 'granted' : status === 'denied' ? 'denied' : 'undetermined',
    };
  } catch (error) {
    console.error('[Permissions] Error checking location permission:', error);
    return { granted: false, canAskAgain: true, status: 'undetermined' };
  }
}

/**
 * Request location permission
 */
export async function requestLocationPermission(): Promise<PermissionStatus> {
  try {
    const { status, canAskAgain } = await Location.requestForegroundPermissionsAsync();
    
    return {
      granted: status === 'granted',
      canAskAgain: canAskAgain ?? true,
      status: status === 'granted' ? 'granted' : status === 'denied' ? 'denied' : 'undetermined',
    };
  } catch (error) {
    console.error('[Permissions] Error requesting location permission:', error);
    return { granted: false, canAskAgain: true, status: 'undetermined' };
  }
}

/**
 * Open device settings for the app
 */
export async function openAppSettings(): Promise<void> {
  try {
    if (Platform.OS === 'ios') {
      await Linking.openURL('app-settings:');
    } else {
      await Linking.openSettings();
    }
  } catch (error) {
    console.error('[Permissions] Error opening app settings:', error);
    Alert.alert('Error', 'Could not open settings');
  }
}

/**
 * Get user-friendly permission name
 */
export function getPermissionName(type: PermissionType): string {
  const permissionNameText = type === 'notifications' ? 'Notifications' : type === 'camera' ? 'Camera' : type === 'photos' ? 'Photos' : 'Location';
  return permissionNameText;
}

/**
 * Get permission description
 */
export function getPermissionDescription(type: PermissionType): string {
  const descriptionText = type === 'notifications' 
    ? 'Receive price drop alerts and deal notifications' 
    : type === 'camera' 
    ? 'Take photos of products to add to your wishlist' 
    : type === 'photos' 
    ? 'Select product images from your photo library' 
    : 'Auto-detect your country and city for better shipping options';
  
  return descriptionText;
}

/**
 * Get permission icon name
 */
export function getPermissionIcon(type: PermissionType): string {
  const iconName = type === 'notifications' ? 'notifications' : type === 'camera' ? 'camera' : type === 'photos' ? 'photo' : 'location-on';
  return iconName;
}

/**
 * Check all permissions at once
 */
export async function checkAllPermissions() {
  const notificationsStatus = await checkNotificationPermission();
  const cameraStatus = await checkCameraPermission();
  const photosStatus = await checkPhotosPermission();
  const locationStatus = await checkLocationPermission();
  
  return {
    notifications: notificationsStatus,
    camera: cameraStatus,
    photos: photosStatus,
    location: locationStatus,
  };
}

/**
 * Contextual permission request with pre-permission screen
 * Returns true if granted, false if denied or user cancelled
 */
export async function requestPermissionContextually(
  type: PermissionType,
  showPrePermissionScreen: (type: PermissionType) => void
): Promise<boolean> {
  console.log('[Permissions] Contextual request for:', type);
  
  // Check current status
  let currentStatus: PermissionStatus;
  
  const statusMap = {
    notifications: checkNotificationPermission,
    camera: checkCameraPermission,
    photos: checkPhotosPermission,
    location: checkLocationPermission,
  };
  
  currentStatus = await statusMap[type]();
  
  // If already granted, return true
  if (currentStatus.granted) {
    console.log('[Permissions] Already granted:', type);
    return true;
  }
  
  // If undetermined, show pre-permission screen
  if (currentStatus.status === 'undetermined') {
    console.log('[Permissions] Showing pre-permission screen for:', type);
    showPrePermissionScreen(type);
    return false; // User will be redirected to pre-permission screen
  }
  
  // If denied and can't ask again, show settings prompt
  if (currentStatus.status === 'denied' && !currentStatus.canAskAgain) {
    console.log('[Permissions] Permission denied, showing settings prompt:', type);
    Alert.alert(
      `${getPermissionName(type)} Required`,
      `${getPermissionDescription(type)}. Please enable it in Settings.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Open Settings', onPress: openAppSettings },
      ]
    );
    return false;
  }
  
  // If denied but can ask again, request directly
  const requestMap = {
    notifications: requestNotificationPermission,
    camera: requestCameraPermission,
    photos: requestPhotosPermission,
    location: requestLocationPermission,
  };
  
  const result = await requestMap[type]();
  return result.granted;
}
