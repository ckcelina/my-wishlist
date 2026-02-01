

const IS_DEV = process.env.APP_VARIANT === 'development';
const IS_PREVIEW = process.env.APP_VARIANT === 'preview';
const IS_PROD = !IS_DEV && !IS_PREVIEW;

// Determine environment
const ENVIRONMENT = IS_DEV ? 'DEV' : IS_PREVIEW ? 'PREVIEW' : 'PROD';

// Supabase configuration (locked per environment)
const SUPABASE_CONFIG = {
  DEV: {
    url: process.env.SUPABASE_URL || 'https://dixgmnuayzblwpqyplsi.supabase.co',
    anonKey: process.env.SUPABASE_ANON_KEY || 'sb_publishable_YouNJ6jKsZgKgdWMpWUL4w_gPqrMNT-',
    edgeFunctionsUrl: process.env.SUPABASE_EDGE_FUNCTIONS_URL || 'https://dixgmnuayzblwpqyplsi.supabase.co/functions/v1',
  },
  PREVIEW: {
    url: process.env.SUPABASE_URL || 'https://dixgmnuayzblwpqyplsi.supabase.co',
    anonKey: process.env.SUPABASE_ANON_KEY || 'sb_publishable_YouNJ6jKsZgKgdWMpWUL4w_gPqrMNT-',
    edgeFunctionsUrl: process.env.SUPABASE_EDGE_FUNCTIONS_URL || 'https://dixgmnuayzblwpqyplsi.supabase.co/functions/v1',
  },
  PROD: {
    url: process.env.SUPABASE_URL || 'https://dixgmnuayzblwpqyplsi.supabase.co',
    anonKey: process.env.SUPABASE_ANON_KEY || 'sb_publishable_YouNJ6jKsZgKgdWMpWUL4w_gPqrMNT-',
    edgeFunctionsUrl: process.env.SUPABASE_EDGE_FUNCTIONS_URL || 'https://dixgmnuayzblwpqyplsi.supabase.co/functions/v1',
  },
};

// Backend configuration (locked per environment)
// Supports both BACKEND_URL and EXPO_PUBLIC_API_BASE_URL for flexibility
const BACKEND_CONFIG = {
  DEV: process.env.EXPO_PUBLIC_API_BASE_URL || process.env.BACKEND_URL || 'https://dp5sm9gseg2u24kanaj9us8ayp8awmu3.app.specular.dev',
  PREVIEW: process.env.EXPO_PUBLIC_API_BASE_URL || process.env.BACKEND_URL || 'https://dp5sm9gseg2u24kanaj9us8ayp8awmu3.app.specular.dev',
  PROD: process.env.EXPO_PUBLIC_API_BASE_URL || process.env.BACKEND_URL || 'https://dp5sm9gseg2u24kanaj9us8ayp8awmu3.app.specular.dev',
};

// Get current config
const currentSupabaseConfig = SUPABASE_CONFIG[ENVIRONMENT];
const currentBackendUrl = BACKEND_CONFIG[ENVIRONMENT];

// App name with variant suffix
const APP_NAME = IS_DEV ? 'My Wishlist (Dev)' : IS_PREVIEW ? 'My Wishlist (Preview)' : 'My Wishlist';

// Bundle identifier with variant suffix
const BUNDLE_ID_BASE = 'com.anonymous.MyWishlist';
const BUNDLE_ID = IS_DEV ? `${BUNDLE_ID_BASE}.dev` : IS_PREVIEW ? `${BUNDLE_ID_BASE}.preview` : BUNDLE_ID_BASE;

// Package name with variant suffix
const PACKAGE_NAME_BASE = 'com.anonymous.MyWishlist';
const PACKAGE_NAME = IS_DEV ? `${PACKAGE_NAME_BASE}.dev` : IS_PREVIEW ? `${PACKAGE_NAME_BASE}.preview` : PACKAGE_NAME_BASE;

export default {
  expo: {
    name: APP_NAME,
    slug: 'My Wishlist',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/images/6c7b263c-7920-4d07-94f3-fac6c2f0b3c0.png',
    userInterfaceStyle: 'automatic',
    newArchEnabled: true,
    splash: {
      image: './assets/images/047add85-2230-4e4c-9a0d-56a73d2890cc.png',
      resizeMode: 'contain',
      backgroundColor: '#EFEFFF',
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: BUNDLE_ID,
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
        NSCameraUsageDescription: 'My Wishlist needs access to your camera to take photos of products you want to add to your wishlists.',
        NSPhotoLibraryUsageDescription: 'My Wishlist needs access to your photo library to let you select product images for your wishlist items.',
        NSPhotoLibraryAddUsageDescription: 'My Wishlist needs permission to save product photos to your photo library.',
        NSLocationWhenInUseUsageDescription: 'My Wishlist uses your location to pre-fill your country and city, helping you find stores that ship to your area.',
        NSUserTrackingUsageDescription: 'This app uses tracking to provide personalized product recommendations and measure ad performance. Your data is never sold to third parties.',
      },
      associatedDomains: [
        'applinks:mywishlist.app',
        'applinks:https://dixgmnuayzblwpqyplsi.supabase.co',
      ],
      entitlements: {
        'com.apple.developer.associated-domains': [
          'applinks:mywishlist.app',
          'applinks:https://dixgmnuayzblwpqyplsi.supabase.co',
        ],
      },
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/images/6c7b263c-7920-4d07-94f3-fac6c2f0b3c0.png',
        backgroundColor: '#EFEFFF',
      },
      edgeToEdgeEnabled: true,
      package: PACKAGE_NAME,
      permissions: [
        'CAMERA',
        'READ_EXTERNAL_STORAGE',
        'WRITE_EXTERNAL_STORAGE',
        'ACCESS_FINE_LOCATION',
        'ACCESS_COARSE_LOCATION',
      ],
      intentFilters: [
        {
          action: 'VIEW',
          autoVerify: true,
          data: [
            {
              scheme: 'https',
              host: '*',
            },
            {
              scheme: 'http',
              host: '*',
            },
          ],
          category: ['BROWSABLE', 'DEFAULT'],
        },
        {
          action: 'SEND',
          data: [
            {
              mimeType: 'text/plain',
            },
          ],
          category: ['DEFAULT'],
        },
      ],
    },
    web: {
      favicon: './assets/images/6c7b263c-7920-4d07-94f3-fac6c2f0b3c0.png',
      bundler: 'metro',
    },
    plugins: [
      'expo-font',
      'expo-router',
      'expo-web-browser',
      [
        'expo-notifications',
        {
          icon: './assets/images/6c7b263c-7920-4d07-94f3-fac6c2f0b3c0.png',
          color: '#652DF5',
          defaultChannel: 'price-drops',
        },
      ],
    ],
    scheme: 'My Wishlist',
    experiments: {
      typedRoutes: true,
    },
    extra: {
      router: {},
      // ═══════════════════════════════════════════════════════
      // 🔒 ENVIRONMENT CONFIGURATION - LOCKED PER BUILD
      // ═══════════════════════════════════════════════════════
      environment: ENVIRONMENT,
      
      // Supabase Configuration (locked per environment)
      supabaseUrl: currentSupabaseConfig.url,
      supabaseAnonKey: currentSupabaseConfig.anonKey,
      supabaseEdgeFunctionsUrl: currentSupabaseConfig.edgeFunctionsUrl,
      
      // Backend Configuration (locked per environment)
      backendUrl: currentBackendUrl,
      
      // Natively Configuration
      nativelyEnvironment: 'supabase',
      nativelyPrimaryDataSource: 'supabase',
      nativelyExclusiveProvider: true,
      
      // Affiliate IDs (same for all environments)
      amazonAffiliateId: process.env.AMAZON_AFFILIATE_ID || '',
      ebayAffiliateId: process.env.EBAY_AFFILIATE_ID || '',
      walmartAffiliateId: process.env.WALMART_AFFILIATE_ID || '',
      targetAffiliateId: process.env.TARGET_AFFILIATE_ID || '',
      bestbuyAffiliateId: process.env.BESTBUY_AFFILIATE_ID || '',
      etsyAffiliateId: process.env.ETSY_AFFILIATE_ID || '',
      aliexpressAffiliateId: process.env.ALIEXPRESS_AFFILIATE_ID || '',
      
      // ═══════════════════════════════════════════════════════
      // 🎯 PARITY ENFORCEMENT - ALL DISABLED FOR CONSISTENCY
      // ═══════════════════════════════════════════════════════
      showDebugUI: false,
      showDevBanner: false,
      addDevPadding: false,
      useDevWrapper: false,
      
      // Build metadata
      buildVariant: ENVIRONMENT,
      buildTimestamp: new Date().toISOString(),
    },
    updates: {
      url: 'https://u.expo.dev/YOUR_PROJECT_ID',
    },
    runtimeVersion: '1.0.0',
  },
  scheme: 'My Wishlist',
};

