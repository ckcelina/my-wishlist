
// CRITICAL FIX: Export config directly without wrapping in 'expo' key
// This prevents "Root-level expo object found" warning
export default {
  name: 'My Wishlist',
  slug: 'my-wishlist',
  owner: 'ckcelina',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/images/e86a516f-63f8-47ae-96ef-8f37ff302d99.png',
  userInterfaceStyle: 'automatic',
  splash: {
    image: './assets/images/e86a516f-63f8-47ae-96ef-8f37ff302d99.png',
    resizeMode: 'contain',
    backgroundColor: '#EFEFFF',
  },
  assetBundlePatterns: ['**/*'],
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.ckcelina.mywishlist',
    appleTeamId: 'HY2V55PTYK',
    icon: './assets/images/e86a516f-63f8-47ae-96ef-8f37ff302d99.png',
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
      NSCameraUsageDescription: 'This app needs access to your camera to scan product barcodes and take photos of items you want to add to your wishlist.',
      NSPhotoLibraryUsageDescription: 'This app needs access to your photo library to select images of items you want to add to your wishlist.',
      NSPhotoLibraryAddUsageDescription: 'This app needs permission to save images to your photo library.',
      NSLocationWhenInUseUsageDescription: 'This app needs your location to show you relevant stores and prices in your area.',
    },
    scheme: 'mywishlist',
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/images/e86a516f-63f8-47ae-96ef-8f37ff302d99.png',
      backgroundColor: '#EFEFFF',
    },
    package: 'com.mywishlist.app',
    permissions: [
      'CAMERA',
      'READ_EXTERNAL_STORAGE',
      'WRITE_EXTERNAL_STORAGE',
      'ACCESS_FINE_LOCATION',
      'ACCESS_COARSE_LOCATION',
    ],
    scheme: 'mywishlist',
  },
  web: {
    favicon: './assets/images/e86a516f-63f8-47ae-96ef-8f37ff302d99.png',
    bundler: 'metro',
  },
  plugins: [
    'expo-router',
    [
      'expo-image-picker',
      {
        photosPermission: 'This app needs access to your photos to select images of items you want to add to your wishlist.',
        cameraPermission: 'This app needs access to your camera to take photos of items you want to add to your wishlist.',
      },
    ],
    [
      'expo-location',
      {
        locationAlwaysAndWhenInUsePermission: 'This app needs your location to show you relevant stores and prices in your area.',
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    router: {
      origin: false,
    },
    eas: {
      projectId: 'b6c4964e-ea64-479d-8bce-b38e8e9b3ee5',
    },
    // CRITICAL FIX: Add Supabase configuration
    // These values are read by utils/environmentConfig.ts and lib/supabase.ts
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://dixgmnuayzblwpqyplsi.supabase.co',
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRpeGdtbnVheXpibHdwcXlwbHNpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkxOTQyMTcsImV4cCI6MjA4NDc3MDIxN30.cxsYejM4zik3AvUEVlQBkUbMqdZ6X2Q4kZ9ISyXrIz4',
    supabaseEdgeFunctionsUrl: process.env.EXPO_PUBLIC_SUPABASE_EDGE_FUNCTIONS_URL || 'https://dixgmnuayzblwpqyplsi.supabase.co/functions/v1',
  },
  notification: {
    icon: './assets/images/e86a516f-63f8-47ae-96ef-8f37ff302d99.png',
    color: '#6366F1',
  },
};
