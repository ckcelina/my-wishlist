
# Environment Configuration & UI Parity System

## Overview

This system ensures **identical UI and behavior** across all build types:
- **Expo Go** (development)
- **Development Builds** (internal testing)
- **Preview Builds** (TestFlight/Internal Testing)
- **Production Builds** (App Store/Google Play)

## Key Principles

1. **No Visual Differences** - Expo Go looks exactly like production
2. **Locked Configuration** - API endpoints are locked per environment
3. **No Dev-Only Behavior** - No debug UI, banners, or wrappers
4. **Comprehensive Verification** - Runtime checks ensure parity

## Files

### Core Configuration

- `utils/environmentConfig.ts` - Environment configuration system
- `utils/parityVerification.ts` - Parity verification checks
- `app.config.js` - Build configuration with variants
- `eas.json` - EAS Build profiles

### UI Components

- `contexts/ThemeContext.tsx` - Unified theme system
- `components/ScreenShell.tsx` - Consistent screen wrapper
- `app/ui-parity-diagnostics.tsx` - Diagnostics screen

### Documentation

- `UI_PARITY_IMPLEMENTATION.md` - Implementation guide
- `utils/README_ENVIRONMENT_PARITY.md` - This file

## Environment Configuration

### Structure

```typescript
export interface AppConfig {
  // Environment
  environment: 'DEV' | 'PREVIEW' | 'PROD';
  
  // API Configuration (locked per environment)
  supabaseUrl: string;
  supabaseAnonKey: string;
  supabaseEdgeFunctionsUrl: string;
  backendUrl: string;
  
  // Feature Flags (ALL DISABLED for parity)
  showDebugUI: boolean;          // ❌ false
  showDevBanner: boolean;        // ❌ false
  addDevPadding: boolean;        // ❌ false
  useDevWrapper: boolean;        // ❌ false
  
  // UI Configuration (LOCKED)
  lockedTabBarHeight: number;         // 80
  lockedTabBarBorderRadius: number;   // 20
  lockedTabBarSpacing: number;        // 10
  
  // Monetization
  affiliateIds: { ... };
  premiumFeatures: { ... };
  
  // Analytics
  enableAnalytics: boolean;
  enableConversionTracking: boolean;
  
  // Compliance
  requireTrackingConsent: boolean;
  requireNotificationConsent: boolean;
}
```

### Usage

```typescript
import { appConfig } from '@/utils/environmentConfig';

// Access configuration
const environment = appConfig.environment;
const supabaseUrl = appConfig.supabaseUrl;
const tabBarHeight = appConfig.lockedTabBarHeight;

// Check feature flags (should all be false)
if (appConfig.showDebugUI) {
  console.error('Debug UI is enabled - breaks parity!');
}
```

## Parity Verification

### Checks Performed

The `runParityVerification()` function performs 9 checks:

1. **Environment Variables** - Supabase URL, anon key configured
2. **Feature Flags** - No dev-only flags enabled
3. **UI Configuration** - Tab bar dimensions locked
4. **Supabase Connection** - Connection consistent
5. **API Endpoints** - No localhost URLs
6. **Edge Function Names** - Function names locked
7. **Affiliate Configuration** - Affiliate IDs configured (warning)
8. **Monetization Setup** - Analytics enabled (warning)
9. **Compliance Settings** - Consent requirements enabled

### Running Verification

```typescript
import { runParityVerification } from '@/utils/parityVerification';

// Run verification
const report = await runParityVerification();

console.log('Overall Passed:', report.overallPassed);
console.log('Total Checks:', report.summary.totalChecks);
console.log('Passed:', report.summary.passedChecks);
console.log('Failed:', report.summary.failedChecks);
console.log('Critical Failures:', report.summary.criticalFailures);

// Check individual results
report.checks.forEach(check => {
  console.log(`${check.name}: ${check.passed ? '✅' : '❌'}`);
  console.log(`  ${check.message}`);
  if (check.details) {
    console.log(`  Details:`, check.details);
  }
});
```

### Automatic Verification

Verification runs automatically on app startup (see `app/_layout.tsx`):

```typescript
useEffect(() => {
  logConfiguration();
  
  runParityVerification().then(report => {
    if (!report.overallPassed) {
      console.error('🚨 PARITY VERIFICATION FAILED');
    }
  });
}, []);
```

## Build Variants

### Configuration

**File:** `app.config.js`

**Environment Variable:** `APP_VARIANT`

**Variants:**
- `development` → DEV build
- `preview` → PREVIEW build
- (none) → PROD build

### Build Commands

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

### Differences Per Variant

| Feature | DEV | PREVIEW | PROD |
|---------|-----|---------|------|
| App Name | "My Wishlist (Dev)" | "My Wishlist (Preview)" | "My Wishlist" |
| Bundle ID | `.dev` suffix | `.preview` suffix | Base ID |
| Supabase URL | Same | Same | Same |
| Backend URL | Same | Same | Same |
| Debug UI | ❌ Disabled | ❌ Disabled | ❌ Disabled |
| Dev Banner | ❌ Disabled | ❌ Disabled | ❌ Disabled |

**Note:** All variants use the **same API endpoints** and **same UI configuration** to ensure parity.

## UI Parity Diagnostics

### Accessing the Screen

Navigate to `/ui-parity-diagnostics` in the app.

### Information Displayed

1. **Build Configuration**
   - Build Type (Expo Go / Standalone)
   - Environment (DEV / PREVIEW / PROD)
   - Platform (iOS / Android)
   - App Version

2. **Theme Configuration**
   - Current Theme (Light / Dark)
   - Theme Preference (System / Light / Dark)
   - Background Color
   - Surface Color
   - Text Color
   - Accent Color

3. **Safe Area Insets**
   - Top Inset
   - Bottom Inset
   - Left Inset
   - Right Inset

4. **Screen Dimensions**
   - Screen Width
   - Screen Height
   - Window Width
   - Window Height
   - Pixel Ratio
   - Font Scale
   - Pixel Density

5. **Tab Bar Configuration**
   - Tab Bar Height
   - Bottom Margin
   - Total Space (with insets)
   - Border Radius
   - Spacing

6. **API Configuration**
   - Supabase URL
   - Supabase Key
   - Backend URL
   - Edge Functions URL

7. **Parity Verification**
   - Debug UI (should be disabled)
   - Dev Banner (should be disabled)
   - Dev Padding (should be disabled)
   - Dev Wrapper (should be disabled)

8. **Parity Report Summary**
   - Overall Status
   - Total Checks
   - Passed
   - Failed
   - Critical Failures

### Status Indicators

- ✅ **Good** - Green - Everything is correct
- ⚠️ **Warning** - Yellow - Non-critical issue
- ❌ **Error** - Red - Critical issue that breaks parity

## Theme System

### ThemeProvider

**File:** `contexts/ThemeContext.tsx`

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
  
  // Create dynamic colors
  const colors = createColors(theme);
  
  // Use colors
  return (
    <View style={{ backgroundColor: colors.background }}>
      <Text style={{ color: colors.textPrimary }}>Hello</Text>
    </View>
  );
}
```

### Dynamic Colors

**File:** `styles/designSystem.ts`

**Function:** `createColors(theme: Theme)`

**Usage:**
```typescript
import { createColors } from '@/styles/designSystem';
import { useAppTheme } from '@/contexts/ThemeContext';

function MyComponent() {
  const { theme } = useAppTheme();
  const colors = createColors(theme);
  
  // All colors are theme-aware
  const styles = StyleSheet.create({
    container: {
      backgroundColor: colors.background,
      borderColor: colors.border,
    },
    text: {
      color: colors.textPrimary,
    },
  });
  
  return <View style={styles.container}>...</View>;
}
```

## ScreenShell Component

### Purpose

Provides consistent layout across all screens:
- Full-screen background color
- SafeAreaView for content
- Optional header area
- ScrollView or View content
- StatusBar style matching theme

### Usage

```typescript
import { ScreenShell } from '@/components/ScreenShell';

function MyScreen() {
  return (
    <ScreenShell 
      header={<CustomHeader />} 
      scrollable
      edges={['top', 'bottom']}
    >
      <YourContent />
    </ScreenShell>
  );
}
```

### Props

- `children` - Screen content
- `header` - Optional header component
- `scrollable` - Use ScrollView (default: true)
- `edges` - Safe area edges (default: ['top', 'bottom'])
- `contentContainerStyle` - Additional styles for content
- `style` - Additional styles for container
- `showsVerticalScrollIndicator` - Show scroll indicator (default: false)

## Best Practices

### ✅ DO

1. **Use ScreenShell** - Wrap all screens in `<ScreenShell>`
2. **Use theme colors** - Always use `createColors(theme)`
3. **Use safe area insets** - Always respect safe area insets
4. **Lock UI dimensions** - Don't modify locked dimensions
5. **Lock API endpoints** - Use same endpoints for all environments
6. **Disable dev-only flags** - Keep all feature flags false
7. **Run diagnostics** - Verify parity before releasing

### ❌ DON'T

1. **Don't hardcode colors** - Always use theme colors
2. **Don't use dev-only modules** - No Expo Go-only modules
3. **Don't add dev-only UI** - No debug overlays, banners
4. **Don't use different endpoints** - Same API for all environments
5. **Don't modify locked dimensions** - Tab bar height is locked
6. **Don't enable feature flags** - Keep all flags false

## Troubleshooting

### Issue: Parity verification fails

**Solution:**
1. Check console logs for specific failures
2. Run UI Parity Diagnostics screen
3. Fix issues identified in the report
4. Re-run verification

### Issue: UI looks different in Expo Go

**Solution:**
1. Check `app.config.js` - Ensure all feature flags are false
2. Check theme colors - Use `createColors(theme)` everywhere
3. Check safe area insets - Use `useSafeAreaInsets()` correctly
4. Run UI Parity Diagnostics screen

### Issue: API endpoints are wrong

**Solution:**
1. Check `app.config.js` - Verify URLs for environment
2. Check `utils/environmentConfig.ts` - Verify `appConfig` values
3. Run Parity Verification - Check "API Endpoints" check

## Monitoring

### Startup Logs

The app logs configuration and verification results on startup:

```
═══════════════════════════════════════════════════
🚀 APP STARTING - PRODUCTION PARITY ENFORCED
═══════════════════════════════════════════════════
🌍 ENVIRONMENT CONFIGURATION - PRODUCTION PARITY ENFORCED
Environment: PROD
Platform: ios
App Version: 1.0.0
═══════════════════════════════════════════════════
🔒 LOCKED CONFIGURATION:
Supabase URL: https://dixgmnuayzblwpqyplsi.supabase.co
Supabase Key: Configured
Backend URL: https://dp5sm9gseg2u24kanaj9us8ayp8awmu3.app.specular.dev
═══════════════════════════════════════════════════
🎯 PARITY VERIFICATION:
Debug UI: DISABLED ✅
Dev Banner: DISABLED ✅
Dev Padding: DISABLED ✅
Dev Wrapper: DISABLED ✅
═══════════════════════════════════════════════════
✅✅✅ ALL CONFIGURATION CHECKS PASSED ✅✅✅
✅ Expo Go and production builds are identical
✅ No dev-only behavior differences
═══════════════════════════════════════════════════
```

## Summary

This system ensures **complete UI and behavior parity** between Expo Go and production builds through:

1. **Centralized Configuration** - Single source of truth
2. **Locked Dimensions** - UI dimensions are locked
3. **Locked Endpoints** - API endpoints are locked
4. **Disabled Feature Flags** - No dev-only behavior
5. **Runtime Verification** - Automatic checks on startup
6. **Diagnostics Tools** - UI Parity Diagnostics screen
7. **Unified Theme** - Single theme system
8. **Consistent Layout** - ScreenShell component

By following these guidelines, you can ensure your app looks and behaves identically in all environments.
