
# Expo Go and Production Build Parity

This document explains how the My Wishlist app ensures **IDENTICAL** behavior across all environments:
- Expo Go (development testing)
- TestFlight (iOS beta testing)
- App Store (iOS production)
- Google Play (Android production)
- Web builds

## 🎯 Parity Goals

1. **Locked Environment Variables** - Same Supabase project, keys, and API endpoints everywhere
2. **No Dev-Only Behavior** - No conditional logic that differs between environments
3. **Identical UI** - Same layout, themes, spacing, and navigation everywhere
4. **Consistent API Calls** - Same endpoints, headers, and authentication everywhere
5. **Graceful Degradation** - Features unavailable in Expo Go fail silently without breaking the app

## 🔒 Locked Configuration

### Environment Variables (`utils/environmentConfig.ts`)

All environment variables are sourced from `app.json` `extra` section and are **LOCKED** for all environments:

```typescript
export const ENV = {
  // Supabase configuration - LOCKED for all environments
  SUPABASE_URL: Constants.expoConfig?.extra?.supabaseUrl || '',
  SUPABASE_ANON_KEY: Constants.expoConfig?.extra?.supabaseAnonKey || '',
  
  // Backend URL (legacy) - LOCKED for all environments
  BACKEND_URL: Constants.expoConfig?.extra?.backendUrl || '',
  
  // Environment detection (read-only, for logging purposes only)
  IS_EXPO_GO: Constants.appOwnership === 'expo',
  IS_DEVELOPMENT: __DEV__,
  IS_PRODUCTION: !__DEV__ && Constants.appOwnership !== 'expo',
};
```

**Key Points:**
- ✅ All environments use the **SAME** Supabase URL
- ✅ All environments use the **SAME** Supabase anon key
- ✅ No conditional overrides based on environment
- ✅ Environment detection is **READ-ONLY** for logging purposes

### Feature Flags (`utils/environmentConfig.ts`)

All feature flags that could cause differences are **DISABLED**:

```typescript
export const FeatureFlags = {
  showDebugUI: false,              // ALWAYS FALSE - no debug panels
  enableUpdatesCheck: true,        // ENABLED for all (gracefully skips in Expo Go)
  enableNotifications: true,       // ENABLED for all (gracefully skips in Expo Go)
  enableCamera: true,              // ENABLED for all (gracefully skips in Expo Go)
  enableVersionTracking: true,     // ENABLED for all
  enableErrorLogging: true,        // ENABLED for all
};
```

**Key Points:**
- ✅ No debug UI in any environment
- ✅ Features enabled everywhere, with graceful degradation
- ✅ No conditional feature toggling

### UI Configuration (`utils/environmentConfig.ts`)

All UI configuration is **LOCKED** to ensure identical layout:

```typescript
export const UIConfig = {
  addDevPadding: false,            // ALWAYS FALSE - no extra padding
  showDevBanner: false,            // ALWAYS FALSE - no environment banners
  useDevWrapper: false,            // ALWAYS FALSE - no special containers
  tabBarHeight: 64,                // LOCKED - identical everywhere
  spacing: { /* ... */ },          // LOCKED - identical everywhere
  borderRadius: { /* ... */ },     // LOCKED - identical everywhere
  useSafeAreaInsets: true,         // CONSISTENT - applied uniformly
  statusBarStyle: 'auto',          // CONSISTENT - theme-based
};
```

**Key Points:**
- ✅ No dev-only padding or margins
- ✅ No environment banners
- ✅ Identical spacing and border radius
- ✅ Consistent safe area handling

## 🎨 Theme System Parity

The theme system (`styles/theme.ts`, `styles/designSystem.ts`) ensures **IDENTICAL** visual appearance:

### Color Tokens

All colors come from theme tokens - **NO hardcoded colors**:

```typescript
// Dark mode
background: '#765943',
surface: 'rgba(255,255,255,0.10)',
textPrimary: '#FFFFFF',
// ... etc

// Light mode
background: '#ede8e3',
surface: 'rgba(43,31,25,0.06)',
textPrimary: '#2b1f19',
// ... etc
```

**Key Points:**
- ✅ All colors defined in theme tokens
- ✅ No conditional styling based on environment
- ✅ Theme applied uniformly across all platforms

### Typography

Typography is consistent across all environments:

```typescript
export const createTypography = (theme: Theme) => ({
  displayLarge: { fontSize: 32, lineHeight: 40, /* ... */ },
  bodyMedium: { fontSize: 14, lineHeight: 20, /* ... */ },
  // ... etc
});
```

**Key Points:**
- ✅ Font sizes locked
- ✅ Line heights locked
- ✅ Font families locked

## 🔌 API Parity

### Supabase Client (`lib/supabase.ts`)

The Supabase client uses **LOCKED** environment variables:

```typescript
const SUPABASE_URL = Constants.expoConfig?.extra?.supabaseUrl || '';
const SUPABASE_ANON_KEY = Constants.expoConfig?.extra?.supabaseAnonKey || '';

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
```

**Key Points:**
- ✅ Same Supabase URL everywhere
- ✅ Same anon key everywhere
- ✅ Same auth configuration everywhere

### Edge Functions (`utils/supabase-edge-functions.ts`)

Edge functions use **LOCKED** environment variables:

```typescript
const SUPABASE_URL = ENV.SUPABASE_URL;
const SUPABASE_ANON_KEY = ENV.SUPABASE_ANON_KEY;

async function callEdgeFunction<TRequest, TResponse>(
  functionName: string,
  request: TRequest
): Promise<TResponse> {
  const url = `${SUPABASE_URL}/functions/v1/${functionName}`;
  // ... same implementation everywhere
}
```

**Key Points:**
- ✅ Same endpoint URLs everywhere
- ✅ Same authentication headers everywhere
- ✅ Graceful error handling (404s don't crash the app)

## 📊 Version Tracking Parity

Version tracking (`utils/versionTracking.ts`) works **IDENTICALLY** in all environments:

```typescript
export async function logAppVersionToSupabase(userId?: string): Promise<void> {
  // Check if version tracking is enabled
  if (!FeatureFlags.enableVersionTracking) {
    console.log('[VersionTracking] Version tracking disabled by feature flag');
    return;
  }

  // ... logs version to Supabase
  // Graceful error handling - never crashes the app
}
```

**Key Points:**
- ✅ Runs in all environments (Expo Go, TestFlight, App Store)
- ✅ Graceful degradation if table doesn't exist
- ✅ Never crashes the app

### Update Checks

Update checks work **IDENTICALLY** with graceful degradation:

```typescript
export async function checkForUpdatesAndLog(userId?: string): Promise<void> {
  // Always log the current version first
  await logAppVersionToSupabase(userId);

  // Check if Updates API is available
  if (!Updates.isEnabled) {
    console.log('[VersionTracking] EAS Updates not enabled (Expo Go or development)');
    return; // Gracefully skip
  }

  // ... check for updates
}
```

**Key Points:**
- ✅ Runs in all environments
- ✅ Gracefully skips if Updates API unavailable (Expo Go)
- ✅ Never crashes the app

## 🔍 Parity Verification

The app includes a comprehensive parity verification system (`utils/parityVerification.ts`):

```typescript
export async function runParityVerification(): Promise<ParityReport> {
  const checks: ParityCheck[] = [];

  // Check 1: Environment variables are configured
  checks.push(checkEnvironmentVariables());

  // Check 2: No dev-only feature flags
  checks.push(checkFeatureFlags());

  // Check 3: UI configuration is locked
  checks.push(checkUIConfiguration());

  // Check 4: Supabase connection is consistent
  checks.push(checkSupabaseConnection());

  // Check 5: No conditional styling
  checks.push(checkConditionalStyling());

  // Check 6: API endpoints are locked
  checks.push(checkAPIEndpoints());

  // Check 7: Navigation is consistent
  checks.push(checkNavigation());

  // Check 8: Theme system is consistent
  checks.push(checkThemeSystem());

  // ... generate report
}
```

**Key Points:**
- ✅ Runs automatically on app start
- ✅ Verifies all parity requirements
- ✅ Logs detailed report to console

## 🚀 Testing Parity

### In Expo Go

1. Open the app in Expo Go
2. Check the console logs for parity verification
3. Verify all checks pass
4. Test all features (wishlists, items, sharing, etc.)

### In TestFlight/App Store

1. Build and deploy to TestFlight
2. Install on a device
3. Check the console logs (via Xcode or remote debugging)
4. Verify all checks pass
5. Test all features
6. Compare behavior with Expo Go - should be **IDENTICAL**

### Verification Checklist

- [ ] Environment variables are locked (same Supabase URL/key)
- [ ] No dev-only feature flags enabled
- [ ] UI configuration is locked (no dev padding/banners)
- [ ] Supabase connection works identically
- [ ] API endpoints are locked (no localhost URLs)
- [ ] Theme system is consistent
- [ ] Navigation is consistent
- [ ] All features work identically

## 📝 Common Issues and Solutions

### Issue: Different behavior in Expo Go vs production

**Solution:** Check the parity verification report. Look for:
- Dev-only feature flags enabled
- Conditional styling based on environment
- Different API endpoints

### Issue: Features not working in Expo Go

**Solution:** Ensure graceful degradation:
- Check if the feature requires native APIs (Updates, Notifications)
- Verify error handling doesn't crash the app
- Add fallback behavior for unavailable features

### Issue: UI looks different in Expo Go vs production

**Solution:** Check for:
- Dev-only padding or margins
- Conditional styling based on `__DEV__` or `Constants.appOwnership`
- Hardcoded colors instead of theme tokens

## 🎯 Best Practices

1. **Always use theme tokens** - Never hardcode colors
2. **Always use locked environment variables** - Never use conditional overrides
3. **Always use graceful degradation** - Features should fail silently, not crash
4. **Always test in both Expo Go and production** - Verify identical behavior
5. **Always run parity verification** - Check the report on app start

## 📚 Related Files

- `utils/environmentConfig.ts` - Locked environment configuration
- `utils/versionTracking.ts` - Version tracking with parity
- `utils/supabase-edge-functions.ts` - Edge functions with parity
- `utils/parityVerification.ts` - Parity verification system
- `lib/supabase.ts` - Supabase client with locked config
- `styles/theme.ts` - Theme system with locked tokens
- `styles/designSystem.ts` - Design system with locked styles
- `app/_layout.tsx` - Root layout with parity verification

## ✅ Verification

To verify parity is working correctly:

1. Start the app in Expo Go
2. Check the console for parity verification report
3. Verify all checks pass
4. Build and deploy to TestFlight
5. Install on a device
6. Check the console for parity verification report
7. Verify all checks pass
8. Compare behavior - should be **IDENTICAL**

If all checks pass, you have **FULL PARITY** between Expo Go and production builds! 🎉
