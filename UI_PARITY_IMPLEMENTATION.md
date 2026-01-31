
# UI Parity Implementation Guide

## Overview

This document describes the implementation of UI parity between Expo Go and production builds (TestFlight/App Store/Google Play).

## Goals

1. **Identical UI/UX** - Expo Go should look and behave exactly like production builds
2. **No Dev-Only Behavior** - No visual differences between development and production
3. **Locked Configuration** - API endpoints, UI dimensions, and feature flags are locked per environment
4. **Comprehensive Diagnostics** - Tools to verify parity at runtime

## Architecture

### 1. Environment Configuration System

**File:** `utils/environmentConfig.ts`

**Purpose:** Centralized configuration for all environment-specific settings.

**Key Features:**
- Environment detection (DEV/PREVIEW/PROD)
- Locked API endpoints per environment
- Feature flags (all disabled for parity)
- UI configuration (locked dimensions)
- Monetization settings
- Compliance settings

**Usage:**
```typescript
import { appConfig } from '@/utils/environmentConfig';

// Access configuration
const supabaseUrl = appConfig.supabaseUrl;
const environment = appConfig.environment;
const tabBarHeight = appConfig.lockedTabBarHeight;
```

### 2. Parity Verification System

**File:** `utils/parityVerification.ts`

**Purpose:** Runtime verification that all parity requirements are met.

**Checks Performed:**
1. ✅ Environment variables configured
2. ✅ No dev-only feature flags enabled
3. ✅ UI configuration locked
4. ✅ Supabase connection consistent
5. ✅ API endpoints locked (no localhost)
6. ✅ Edge Function names locked
7. ⚠️ Affiliate configuration
8. ⚠️ Monetization setup
9. ✅ Compliance settings

**Usage:**
```typescript
import { runParityVerification } from '@/utils/parityVerification';

// Run verification
const report = await runParityVerification();

if (!report.overallPassed) {
  console.error('Parity verification failed:', report);
}
```

### 3. Unified Theme System

**File:** `contexts/ThemeContext.tsx`

**Purpose:** Single source of truth for theme across all screens.

**Features:**
- Light/Dark mode support
- System theme detection
- Persistent theme preference
- No flicker on load (hydration)

**Usage:**
```typescript
import { useAppTheme } from '@/contexts/ThemeContext';

function MyComponent() {
  const { theme, isDark, themePreference, setThemePreference } = useAppTheme();
  const colors = createColors(theme);
  
  return <View style={{ backgroundColor: colors.background }} />;
}
```

### 4. ScreenShell Component

**File:** `components/ScreenShell.tsx`

**Purpose:** Consistent screen wrapper for all screens.

**Features:**
- Full-screen background color (theme.background)
- SafeAreaView for content (top + bottom)
- Optional header area
- ScrollView or View content with consistent padding
- StatusBar style matching theme

**Usage:**
```typescript
import { ScreenShell } from '@/components/ScreenShell';

function MyScreen() {
  return (
    <ScreenShell header={<CustomHeader />} scrollable>
      <YourContent />
    </ScreenShell>
  );
}
```

### 5. UI Parity Diagnostics Screen

**File:** `app/ui-parity-diagnostics.tsx`

**Purpose:** Dev-only screen to verify UI parity at runtime.

**Information Displayed:**
- 🏗️ Build Configuration (Build Type, Environment, Platform)
- 🎨 Theme Configuration (Current Theme, Colors)
- 📐 Safe Area Insets (Top, Bottom, Left, Right)
- 📱 Screen Dimensions (Width, Height, Pixel Ratio, Font Scale)
- 🎯 Tab Bar Configuration (Height, Margin, Total Space)
- 🔒 API Configuration (Supabase, Backend, Edge Functions)
- 🎯 Parity Verification (Debug UI, Dev Banner, Dev Padding, Dev Wrapper)
- ✅ Parity Report Summary (Overall Status, Checks Passed/Failed)

**Access:**
- Navigate to `/ui-parity-diagnostics` in the app
- Only accessible in DEV/PREVIEW builds (hidden in PROD)

## Build Configuration

### Environment Variables

**File:** `app.config.js`

**Build Variants:**
- `APP_VARIANT=development` → DEV build
- `APP_VARIANT=preview` → PREVIEW build
- (no variant) → PROD build

**Configuration Per Environment:**

```javascript
// DEV
{
  environment: 'DEV',
  supabaseUrl: 'https://dixgmnuayzblwpqyplsi.supabase.co',
  supabaseAnonKey: 'sb_publishable_...',
  backendUrl: 'https://dp5sm9gseg2u24kanaj9us8ayp8awmu3.app.specular.dev',
  bundleIdentifier: 'com.anonymous.MyWishlist.dev',
  appName: 'My Wishlist (Dev)',
}

// PREVIEW
{
  environment: 'PREVIEW',
  supabaseUrl: 'https://dixgmnuayzblwpqyplsi.supabase.co',
  supabaseAnonKey: 'sb_publishable_...',
  backendUrl: 'https://dp5sm9gseg2u24kanaj9us8ayp8awmu3.app.specular.dev',
  bundleIdentifier: 'com.anonymous.MyWishlist.preview',
  appName: 'My Wishlist (Preview)',
}

// PROD
{
  environment: 'PROD',
  supabaseUrl: 'https://dixgmnuayzblwpqyplsi.supabase.co',
  supabaseAnonKey: 'sb_publishable_...',
  backendUrl: 'https://dp5sm9gseg2u24kanaj9us8ayp8awmu3.app.specular.dev',
  bundleIdentifier: 'com.anonymous.MyWishlist',
  appName: 'My Wishlist',
}
```

### Building Different Variants

**Development Build:**
```bash
APP_VARIANT=development eas build --profile development --platform ios
```

**Preview Build:**
```bash
APP_VARIANT=preview eas build --profile preview --platform ios
```

**Production Build:**
```bash
eas build --profile production --platform ios
```

## Parity Rules

### ✅ DO

1. **Use ThemeProvider + ScreenShell** - All screens must use these for consistency
2. **Use theme colors** - Always use `createColors(theme)` for colors
3. **Use safe area insets** - Always respect safe area insets
4. **Lock UI dimensions** - Tab bar height, border radius, spacing are locked
5. **Lock API endpoints** - No localhost, no dev-only endpoints
6. **Disable dev-only flags** - All feature flags must be false

### ❌ DON'T

1. **Don't hardcode colors** - Always use theme colors
2. **Don't use dev-only modules** - No Expo Go-only modules affecting layout
3. **Don't add dev-only UI** - No dev banners, debug overlays, etc.
4. **Don't use different endpoints** - Same API endpoints for all environments
5. **Don't modify locked dimensions** - Tab bar height, etc. are locked

## Verification Checklist

Before releasing a build, verify:

- [ ] Run `runParityVerification()` - All checks pass
- [ ] Check UI Parity Diagnostics screen - No errors
- [ ] Test in Expo Go - UI matches production
- [ ] Test in TestFlight - UI matches Expo Go
- [ ] Verify theme switching - Light/Dark mode work correctly
- [ ] Verify safe areas - Content respects safe area insets
- [ ] Verify tab bar - Height and spacing are correct
- [ ] Verify API endpoints - No localhost, correct URLs
- [ ] Verify feature flags - All disabled

## Troubleshooting

### Issue: UI looks different in Expo Go vs production

**Solution:**
1. Check `app.config.js` - Ensure `showDebugUI`, `showDevBanner`, `addDevPadding`, `useDevWrapper` are all `false`
2. Run UI Parity Diagnostics screen - Check for errors
3. Verify theme colors - Use `createColors(theme)` everywhere
4. Verify safe area insets - Use `useSafeAreaInsets()` correctly

### Issue: Tab bar height is wrong

**Solution:**
1. Check `utils/environmentConfig.ts` - Ensure `lockedTabBarHeight` is `80`
2. Check `components/FloatingTabBar.tsx` - Ensure it uses `ComponentSpacing.tabBarHeight`
3. Run UI Parity Diagnostics screen - Check "Tab Bar Configuration" section

### Issue: API endpoints are different

**Solution:**
1. Check `app.config.js` - Ensure correct URLs for environment
2. Check `utils/environmentConfig.ts` - Verify `appConfig.supabaseUrl` and `appConfig.backendUrl`
3. Run Parity Verification - Check "API Endpoints" check

### Issue: Theme colors are inconsistent

**Solution:**
1. Check `contexts/ThemeContext.tsx` - Ensure theme is hydrated before rendering
2. Use `useAppTheme()` hook - Don't use static `colors` export
3. Use `createColors(theme)` - Always pass current theme
4. Check `styles/designSystem.ts` - Ensure all colors come from theme tokens

## Best Practices

1. **Always use ScreenShell** - Wrap all screens in `<ScreenShell>`
2. **Always use theme colors** - Use `createColors(theme)` for dynamic colors
3. **Always respect safe areas** - Use `useSafeAreaInsets()` for padding
4. **Always verify parity** - Run diagnostics before releasing
5. **Always test in Expo Go** - Ensure it matches production builds

## Monitoring

### Runtime Monitoring

The app logs parity verification results on startup:

```
═══════════════════════════════════════════════════
🔍 RUNNING PARITY VERIFICATION
═══════════════════════════════════════════════════
✅ 1. Environment Variables - All environment variables are configured correctly
✅ 2. Feature Flags - No dev-only feature flags enabled
✅ 3. UI Configuration - UI configuration is locked for all environments
✅ 4. Supabase Connection - Supabase connection is configured and consistent
✅ 5. API Endpoints - API endpoints are locked to production URLs
✅ 6. Edge Function Names - Edge Function names are locked and consistent
⚠️ 7. Affiliate Configuration - No affiliate IDs configured - monetization disabled
✅ 8. Monetization Setup - Monetization features are enabled
✅ 9. Compliance Settings - Compliance settings are properly configured
═══════════════════════════════════════════════════
✅✅✅ ALL CRITICAL PARITY CHECKS PASSED ✅✅✅
✅ Expo Go and production builds are identical
✅ No dev-only behavior differences
✅ UI, API, and navigation are consistent
═══════════════════════════════════════════════════
```

### Build-Time Verification

The `app.config.js` enforces configuration at build time:
- Locks API endpoints per environment
- Locks bundle identifiers per environment
- Disables all dev-only feature flags
- Ensures consistent configuration

## Summary

This implementation ensures that Expo Go and production builds have **identical UI and behavior**. The key components are:

1. **Environment Configuration** - Centralized, locked configuration
2. **Parity Verification** - Runtime checks for consistency
3. **Unified Theme System** - Single source of truth for theme
4. **ScreenShell Component** - Consistent screen wrapper
5. **UI Parity Diagnostics** - Dev tool for verification

By following these guidelines and using these tools, you can ensure that your app looks and behaves the same in Expo Go, TestFlight, and production.
