
export default {
  expo: {
    name: 'My Wishlist',
    slug: 'my-wishlist',
    owner: 'ckcelina',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/images/final_quest_240x240.png',
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
      icon: './assets/images/final_quest_240x240.png',
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
        foregroundImage: './assets/images/final_quest_240x240.png',
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
      favicon: './assets/images/final_quest_240x240.png',
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
    },
    notification: {
      icon: './assets/images/final_quest_240x240.png',
      color: '#6366F1',
    },
  },
};
