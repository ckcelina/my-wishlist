
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system/legacy';
import { Platform, Alert } from 'react-native';

export interface ImagePayload {
  imageBase64: string;
  mimeType: string;
  width: number;
  height: number;
  fileSizeBytes: number;
}

const MAX_IMAGE_SIZE_BYTES = 6 * 1024 * 1024; // 6MB
const MAX_LONGEST_SIDE = 1024;
const COMPRESSION_QUALITY = 0.8;

/**
 * Request camera permission from the user
 * Shows user-friendly error message if denied
 */
export async function requestCameraPermission(): Promise<boolean> {
  console.log('[imageCapture] Requesting camera permission');
  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  
  if (status !== 'granted') {
    console.warn('[imageCapture] Camera permission denied');
    Alert.alert(
      'Camera Permission Required',
      'Please enable camera access in your device settings to take photos.',
      [{ text: 'OK' }]
    );
    return false;
  }
  
  console.log('[imageCapture] Camera permission granted');
  return true;
}

/**
 * Request photo library permission from the user
 * Shows user-friendly error message if denied
 */
export async function requestLibraryPermission(): Promise<boolean> {
  console.log('[imageCapture] Requesting photo library permission');
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  
  if (status !== 'granted') {
    console.warn('[imageCapture] Photo library permission denied');
    Alert.alert(
      'Photo Library Permission Required',
      'Please enable photo library access in your device settings to select images.',
      [{ text: 'OK' }]
    );
    return false;
  }
  
  console.log('[imageCapture] Photo library permission granted');
  return true;
}

/**
 * Normalize an image: resize, compress to JPEG, convert to base64
 * Returns standardized ImagePayload with metadata
 */
export async function normalizeImage(uri: string): Promise<ImagePayload | null> {
  try {
    console.log('[imageCapture] Normalizing image:', uri);
    
    // Get original image info
    const fileInfo = await FileSystem.getInfoAsync(uri, { size: true });
    if (!fileInfo.exists) {
      console.error('[imageCapture] Image file does not exist');
      Alert.alert('Error', 'Image file not found. Please try again.');
      return null;
    }
    
    console.log('[imageCapture] Original file size:', fileInfo.size, 'bytes');
    
    // Resize and compress image
    const manipResult = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: MAX_LONGEST_SIDE } }], // Resize longest side to 1024
      { 
        compress: COMPRESSION_QUALITY, 
        format: ImageManipulator.SaveFormat.JPEG,
        base64: true 
      }
    );
    
    if (!manipResult.base64 || !manipResult.uri) {
      console.error('[imageCapture] Failed to process image - no base64 or uri');
      Alert.alert('Error', 'Failed to process image. Please try again.');
      return null;
    }
    
    console.log('[imageCapture] Image processed - width:', manipResult.width, 'height:', manipResult.height);
    
    // Get processed file size
    const processedFileInfo = await FileSystem.getInfoAsync(manipResult.uri, { size: true });
    if (!processedFileInfo.exists || !processedFileInfo.size) {
      console.error('[imageCapture] Failed to get processed file info');
      Alert.alert('Error', 'Failed to get image file info. Please try again.');
      return null;
    }
    
    console.log('[imageCapture] Processed file size:', processedFileInfo.size, 'bytes');
    
    // Check if processed image is still too large
    if (processedFileInfo.size > MAX_IMAGE_SIZE_BYTES) {
      console.warn('[imageCapture] Image too large after processing:', processedFileInfo.size, 'bytes');
      Alert.alert(
        'Image Too Large',
        'The image is too large (max 6MB). Please choose a smaller image or take a new photo.',
        [{ text: 'OK' }]
      );
      return null;
    }
    
    console.log('[imageCapture] Image normalized successfully');
    
    return {
      imageBase64: manipResult.base64,
      mimeType: 'image/jpeg', // Always JPEG after manipulation
      width: manipResult.width,
      height: manipResult.height,
      fileSizeBytes: processedFileInfo.size,
    };
  } catch (error) {
    console.error('[imageCapture] Error normalizing image:', error);
    Alert.alert('Error', 'Error processing image. Please try again.');
    return null;
  }
}

/**
 * Open camera to take a photo
 * Returns normalized ImagePayload or null if cancelled/failed
 */
export async function takePhoto(): Promise<ImagePayload | null> {
  console.log('[imageCapture] takePhoto called');
  
  // Request permission
  const hasPermission = await requestCameraPermission();
  if (!hasPermission) {
    console.log('[imageCapture] Camera permission not granted, offering upload instead');
    Alert.alert(
      'Camera Not Available',
      'Camera access was denied. Would you like to upload an image from your library instead?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Upload Photo', 
          onPress: async () => {
            const result = await pickFromLibrary();
            return result;
          }
        }
      ]
    );
    return null;
  }
  
  try {
    console.log('[imageCapture] Launching camera');
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: 'images',
      allowsEditing: false,
      quality: 0.8,
      base64: false, // We'll convert to base64 after normalization
    });
    
    if (result.canceled) {
      console.log('[imageCapture] User cancelled camera');
      return null;
    }
    
    if (result.assets && result.assets.length > 0) {
      console.log('[imageCapture] Photo captured, normalizing...');
      return normalizeImage(result.assets[0].uri);
    }
    
    console.warn('[imageCapture] No assets returned from camera');
    return null;
  } catch (error) {
    console.error('[imageCapture] Error taking photo:', error);
    Alert.alert('Error', 'Failed to take photo. Please try again.');
    return null;
  }
}

/**
 * Open photo library to select an image
 * Returns normalized ImagePayload or null if cancelled/failed
 */
export async function pickFromLibrary(): Promise<ImagePayload | null> {
  console.log('[imageCapture] pickFromLibrary called');
  
  // Request permission
  const hasPermission = await requestLibraryPermission();
  if (!hasPermission) {
    console.log('[imageCapture] Photo library permission not granted');
    return null;
  }
  
  try {
    console.log('[imageCapture] Launching image library');
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsEditing: false,
      quality: 0.8,
      base64: false, // We'll convert to base64 after normalization
    });
    
    if (result.canceled) {
      console.log('[imageCapture] User cancelled image selection');
      return null;
    }
    
    if (result.assets && result.assets.length > 0) {
      console.log('[imageCapture] Image selected, normalizing...');
      return normalizeImage(result.assets[0].uri);
    }
    
    console.warn('[imageCapture] No assets returned from library');
    return null;
  } catch (error) {
    console.error('[imageCapture] Error picking from library:', error);
    Alert.alert('Error', 'Failed to select image. Please try again.');
    return null;
  }
}
