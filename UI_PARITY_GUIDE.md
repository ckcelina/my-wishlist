
# UI Parity Guide

## Overview

This guide ensures that the My Wishlist app looks **identical** across:
- **Expo Go** (development testing)
- **TestFlight/App Store** (iOS production)
- **Android builds** (production)

## Implementation

### 1. Environment Detection

**File:** `utils/environmentConfig.ts`

Detects runtime environment:
- `development` - Running in dev mode (`__DEV__ === true`)
- `expo-go` - Running in Expo Go (`Constants.appOwnership === "expo"`)
- `production` - Standalone build (TestFlight, App Store, Android)

**Usage:**
```typescript
import { getEnvironmentInfo, isNativeFeatureAvailable } from '@/utils/environmentConfig';

const envInfo = getEnvironmentInfo();
console.log('Environment:', envInfo.environment); // 'expo-go' | 'production' | 'development'

// Guard native-only features
if (isNativeFeatureAvailable('camera')) {
  // Use camera
}
```

### 2. Typography Tokens

**File:** `styles/typography.ts`

Centralized font sizes, weights, and line heights.

**DO NOT** use hardcoded font sizes like `fontSize: 16`.
**ALWAYS** use tokens:

```typescript
import { FontSizes, FontWeights, TypographyStyles } from '@/styles/typography';

const styles = StyleSheet.create({
  title: {
    ...TypographyStyles.titleLarge, // fontSize: 24, lineHeight: 32, etc.
  },
  body: {
    fontSize: FontSizes.bodyMedium, // 14
    fontWeight: FontWeights.regular, // '400'
  },
});
```

### 3. Spacing Tokens

**File:** `styles/spacing.ts`

Centralized spacing values.

**DO NOT** use hardcoded spacing like `padding: 16`.
**ALWAYS** use tokens:

```typescript
import { Spacing, ComponentSpacing } from '@/styles/spacing';

const styles = StyleSheet.create({
  container: {
    padding: Spacing.md, // 16
    marginBottom: Spacing.lg, // 24
  },
  screen: {
    paddingHorizontal: ComponentSpacing.screenHorizontal, // 16
  },
});
```

### 4. ScreenShell Component

**File:** `components/ScreenShell.tsx`

**ALL screens MUST use ScreenShell** for consistent layout:

```typescript
import { ScreenShell } from '@/components/ScreenShell';

export default function MyScreen() {
  return (
    <ScreenShell scrollable>
      <Text>Content</Text>
    </ScreenShell>
  );
}
```

**Features:**
- Consistent background color (theme-aware)
- Safe area handling (top + bottom)
- StatusBar style (ONLY driven by theme, no dev overrides)
- Consistent padding

### 5. Theme System

**Files:** `styles/theme.ts`, `contexts/ThemeContext.tsx`

**StatusBar style is ONLY driven by theme:**
- Dark mode → `StatusBar style="light"`
- Light mode → `StatusBar style="dark"`

**NO dev-only StatusBar changes.**

### 6. Tab Bar

**File:** `components/FloatingTabBar.tsx`

Tab bar uses consistent spacing tokens:
- Height: `ComponentSpacing.tabBarHeight` (64px)
- Padding: `ComponentSpacing.tabBarPadding` (4px)
- Bottom margin: `ComponentSpacing.tabBarBottomMargin` (20px)

**Safe area insets are respected** on all platforms.

### 7. Native-Only Features

**Guarded to prevent crashes in Expo Go:**

```typescript
import { isNativeFeatureAvailable, safeNativeFeature } from '@/utils/environmentConfig';

// Check availability
if (isNativeFeatureAvailable('notifications')) {
  // Use notifications
} else {
  // Show soft warning or disable feature
}

// Safe wrapper
const result = await safeNativeFeature(
  'camera',
  async () => {
    // Use camera
    return await takePicture();
  },
  null // Fallback value
);
```

**Native-only features:**
- `Updates.checkForUpdateAsync()` - Only in production builds
- Camera - Not available in Expo Go
- Notifications - Not available in Expo Go

### 8. UI Configuration

**File:** `utils/environmentConfig.ts`

```typescript
import { UIConfig } from '@/utils/environmentConfig';

// ALWAYS FALSE - ensures UI parity
UIConfig.addDevPadding; // false
UIConfig.showDevBanner; // false
UIConfig.useDevWrapper; // false

// Consistent values
UIConfig.tabBarHeight; // 64
UIConfig.spacing; // { xs: 4, sm: 8, md: 16, ... }
```

## Testing UI Parity

### UI Parity Test Screen

**File:** `app/ui-parity-test.tsx`

Internal diagnostic screen to verify UI consistency.

**Access:** Navigate to `/ui-parity-test` in the app.

**Shows:**
- Current environment (Expo Go vs Production)
- Theme information
- Safe area insets
- Screen dimensions
- Font scale
- Tab bar height
- Spacing tokens
- Typography tokens

**Verification:**
1. Open app in **Expo Go**
2. Navigate to `/ui-parity-test`
3. Take screenshot
4. Build **preview build** (`eas build --profile preview --platform ios`)
5. Install preview build on device
6. Navigate to `/ui-parity-test`
7. Take screenshot
8. **Compare screenshots** - all values should be identical

### Preview Build Workflow

**Purpose:** Test production-like build before App Store submission.

**Build preview:**
```bash
# iOS
eas build --profile preview --platform ios

# Android
eas build --profile preview --platform android
```

**Preview build configuration:**
- Uses Release build configuration (same as production)
- Internal distribution (TestFlight or APK)
- Same channel as production
- Same environment variables

**Use preview builds to:**
- Verify UI looks identical to Expo Go
- Test native-only features
- Confirm safe area handling
- Validate tab bar positioning
- Check font rendering
- Verify spacing consistency

## Acceptance Criteria

✅ **Wishlists screen** looks identical in Expo Go and preview build
✅ **Wishlist detail screen** looks identical in Expo Go and preview build
✅ **Add Item screen** looks identical in Expo Go and preview build
✅ **Profile screen** looks identical in Expo Go and preview build
✅ **No screen has different spacing** in production vs Expo Go
✅ **No screen has different backgrounds** in production vs Expo Go
✅ **Tab bar height is consistent** across all environments
✅ **Safe area insets are respected** on all platforms
✅ **StatusBar style matches theme** (no dev overrides)
✅ **Native-only features are guarded** (no crashes in Expo Go)

## Common Issues

### Issue: Different spacing in production

**Cause:** Hardcoded spacing values instead of tokens.

**Fix:** Use spacing tokens:
```typescript
// ❌ BAD
padding: 16

// ✅ GOOD
padding: Spacing.md
```

### Issue: Different font sizes in production

**Cause:** Hardcoded font sizes instead of tokens.

**Fix:** Use typography tokens:
```typescript
// ❌ BAD
fontSize: 16

// ✅ GOOD
fontSize: FontSizes.bodyLarge
```

### Issue: Tab bar covers content

**Cause:** Not accounting for tab bar height in bottom padding.

**Fix:** Use `ComponentSpacing.tabBarExtraPadding`:
```typescript
contentContainerStyle={{
  paddingBottom: insets.bottom + ComponentSpacing.tabBarExtraPadding,
}}
```

### Issue: App crashes in Expo Go

**Cause:** Using native-only features without guards.

**Fix:** Guard native features:
```typescript
if (isNativeFeatureAvailable('camera')) {
  // Use camera
}
```

### Issue: StatusBar style different in dev

**Cause:** Dev-only StatusBar overrides.

**Fix:** StatusBar style is ONLY driven by theme:
```typescript
<StatusBar style={isDark ? 'light' : 'dark'} />
```

## Checklist

Before submitting to App Store:

- [ ] Build preview build (`eas build --profile preview`)
- [ ] Install preview build on device
- [ ] Open UI Parity Test screen in Expo Go
- [ ] Open UI Parity Test screen in preview build
- [ ] Compare all values (should be identical)
- [ ] Test all main screens (Wishlists, Add Item, Profile)
- [ ] Verify tab bar positioning
- [ ] Verify safe area handling
- [ ] Verify StatusBar style
- [ ] Test native-only features (camera, notifications)
- [ ] Confirm no crashes in Expo Go
- [ ] Confirm no layout differences

## Resources

- **Environment Config:** `utils/environmentConfig.ts`
- **Typography Tokens:** `styles/typography.ts`
- **Spacing Tokens:** `styles/spacing.ts`
- **ScreenShell:** `components/ScreenShell.tsx`
- **Theme System:** `styles/theme.ts`, `contexts/ThemeContext.tsx`
- **UI Parity Test:** `app/ui-parity-test.tsx`
- **EAS Config:** `eas.json`
