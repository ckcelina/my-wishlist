
# Environment Configuration

## Purpose

The `environmentConfig.ts` module ensures UI consistency across:
- **Expo Go** (development testing)
- **TestFlight/App Store** (iOS production)
- **Android builds** (production)

## Key Concepts

### 1. Environment Detection

```typescript
import { detectEnvironment, getEnvironmentInfo } from './environmentConfig';

const env = detectEnvironment();
// Returns: 'development' | 'expo-go' | 'production'

const info = getEnvironmentInfo();
// Returns: { environment, isDevelopment, isExpoGo, isProduction, platform, ... }
```

**Detection Logic:**
1. Check `Constants.appOwnership === 'expo'` → Expo Go
2. Check `__DEV__ === true` → Development
3. Otherwise → Production (standalone build)

### 2. Native Feature Guards

**Problem:** Native-only features crash in Expo Go.

**Solution:** Guard features before use.

```typescript
import { isNativeFeatureAvailable, safeNativeFeature } from './environmentConfig';

// Check availability
if (isNativeFeatureAvailable('camera')) {
  // Use camera
} else {
  console.log('Camera not available in Expo Go');
}

// Safe wrapper with fallback
const photo = await safeNativeFeature(
  'camera',
  async () => await takePicture(),
  null // Fallback if not available
);
```

**Native-only features:**
- `Updates.checkForUpdateAsync()` - Only in production
- Camera - Not in Expo Go
- Notifications - Not in Expo Go
- File system - Limited in Expo Go

### 3. Feature Flags

```typescript
import { FeatureFlags } from './environmentConfig';

// Show debug UI (only in development)
if (FeatureFlags.showDebugUI()) {
  // Show debug panel
}

// Enable updates check (only in production)
if (FeatureFlags.enableUpdatesCheck()) {
  await Updates.checkForUpdateAsync();
}

// Enable notifications (not in Expo Go)
if (FeatureFlags.enableNotifications()) {
  await registerForPushNotifications();
}
```

### 4. UI Configuration

**Ensures consistent layout across all environments.**

```typescript
import { UIConfig } from './environmentConfig';

// ALWAYS FALSE - no dev-only UI changes
UIConfig.addDevPadding; // false
UIConfig.showDevBanner; // false
UIConfig.useDevWrapper; // false

// Consistent values
UIConfig.tabBarHeight; // 64
UIConfig.spacing.md; // 16
UIConfig.borderRadius.md; // 12
```

**Why?**
- Prevents layout differences between Expo Go and production
- Ensures tab bar height is consistent
- Ensures spacing is consistent
- Ensures border radius is consistent

## Usage Examples

### Example 1: Guard Camera Feature

```typescript
import { isNativeFeatureAvailable } from '@/utils/environmentConfig';
import * as ImagePicker from 'expo-image-picker';

async function takePhoto() {
  if (!isNativeFeatureAvailable('camera')) {
    Alert.alert('Camera not available', 'Camera is not available in Expo Go');
    return;
  }

  const result = await ImagePicker.launchCameraAsync();
  // Use result
}
```

### Example 2: Guard Updates Check

```typescript
import { FeatureFlags } from '@/utils/environmentConfig';
import * as Updates from 'expo-updates';

async function checkForUpdates() {
  if (!FeatureFlags.enableUpdatesCheck()) {
    console.log('Updates check not available in Expo Go');
    return;
  }

  const update = await Updates.checkForUpdateAsync();
  if (update.isAvailable) {
    await Updates.fetchUpdateAsync();
    await Updates.reloadAsync();
  }
}
```

### Example 3: Consistent Spacing

```typescript
import { UIConfig } from '@/utils/environmentConfig';

const styles = StyleSheet.create({
  container: {
    padding: UIConfig.spacing.md, // 16 (consistent across all environments)
  },
  card: {
    borderRadius: UIConfig.borderRadius.md, // 12 (consistent across all environments)
  },
});
```

### Example 4: Environment-Specific Logging

```typescript
import { getEnvironmentInfo } from '@/utils/environmentConfig';

const envInfo = getEnvironmentInfo();

if (envInfo.isExpoGo) {
  console.log('Running in Expo Go - some features disabled');
} else if (envInfo.isProduction) {
  console.log('Running in production build');
}
```

## Best Practices

### ✅ DO

- **Always guard native-only features** before use
- **Use `UIConfig` for spacing and sizing** to ensure consistency
- **Use `FeatureFlags` for environment-specific features**
- **Log environment info on app start** for debugging
- **Test in both Expo Go and preview builds** before release

### ❌ DON'T

- **Don't use `__DEV__` for UI changes** (breaks parity)
- **Don't add dev-only padding/margins** (breaks parity)
- **Don't show dev-only banners** (breaks parity)
- **Don't assume native features are available** (crashes in Expo Go)
- **Don't hardcode spacing values** (breaks consistency)

## Testing

### Test in Expo Go

```bash
npm run dev
```

Open app in Expo Go and verify:
- No crashes
- Native features are disabled gracefully
- UI looks correct

### Test in Preview Build

```bash
# Build preview
eas build --profile preview --platform ios

# Install on device
# Open app and verify:
# - Native features work
# - UI looks identical to Expo Go
# - No layout differences
```

### Compare UI Parity

1. Open `/ui-parity-test` in Expo Go
2. Take screenshot
3. Open `/ui-parity-test` in preview build
4. Take screenshot
5. Compare - all values should be identical

## Troubleshooting

### Issue: App crashes in Expo Go

**Cause:** Using native-only feature without guard.

**Fix:**
```typescript
// ❌ BAD
await Updates.checkForUpdateAsync();

// ✅ GOOD
if (FeatureFlags.enableUpdatesCheck()) {
  await Updates.checkForUpdateAsync();
}
```

### Issue: Different layout in production

**Cause:** Using `__DEV__` for UI changes.

**Fix:**
```typescript
// ❌ BAD
padding: __DEV__ ? 20 : 16

// ✅ GOOD
padding: UIConfig.spacing.md
```

### Issue: Feature not working in Expo Go

**Expected:** Native-only features don't work in Expo Go.

**Solution:** Test in preview build instead.

## API Reference

### `detectEnvironment()`

Returns the current runtime environment.

**Returns:** `'development' | 'expo-go' | 'production'`

### `getEnvironmentInfo()`

Returns comprehensive environment information.

**Returns:**
```typescript
{
  environment: RuntimeEnvironment;
  isDevelopment: boolean;
  isExpoGo: boolean;
  isProduction: boolean;
  platform: 'ios' | 'android' | 'web';
  appVersion: string;
  buildNumber: string;
  deviceName: string | null;
}
```

### `isNativeFeatureAvailable(featureName: string)`

Checks if a native-only feature is available.

**Returns:** `boolean`

**Example:**
```typescript
if (isNativeFeatureAvailable('camera')) {
  // Use camera
}
```

### `safeNativeFeature<T>(featureName, callback, fallback)`

Safe wrapper for native-only features.

**Returns:** `Promise<T>`

**Example:**
```typescript
const photo = await safeNativeFeature(
  'camera',
  async () => await takePicture(),
  null
);
```

### `logEnvironmentInfo()`

Logs environment information to console.

**Example:**
```typescript
logEnvironmentInfo();
// Logs:
// ═══════════════════════════════════════════════════
// 🌍 ENVIRONMENT CONFIGURATION
// ═══════════════════════════════════════════════════
// Environment: EXPO-GO
// Platform: ios
// ...
```

### `FeatureFlags`

Environment-specific feature flags.

**Properties:**
- `showDebugUI()` - Only in development
- `enableUpdatesCheck()` - Only in production
- `enableNotifications()` - Not in Expo Go
- `enableCamera()` - Not in Expo Go

### `UIConfig`

Consistent UI configuration.

**Properties:**
- `addDevPadding` - Always `false`
- `showDevBanner` - Always `false`
- `useDevWrapper` - Always `false`
- `tabBarHeight` - `64`
- `spacing` - `{ xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 }`
- `borderRadius` - `{ sm: 8, md: 12, lg: 16, xl: 18 }`
