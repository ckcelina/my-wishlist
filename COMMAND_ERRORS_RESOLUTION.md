
# Command Errors - Complete Resolution Guide

## 🔴 Critical Issue Identified

### Error Message
```
CommandError: Input is required, but 'npx expo' is in non-interactive mode.
Use the EXPO_TOKEN environment variable to authenticate in CI
```

### Root Cause
The `package.json` dev script is configured to use `--tunnel` mode, which requires Expo authentication:

```json
"dev": "EXPO_NO_TELEMETRY=1 expo start --tunnel"
```

This causes the app to fail in non-interactive environments (CI/CD, automated testing, etc.) because it tries to prompt for authentication but cannot.

---

## ✅ Solution

### Required Change to package.json

**Current (Broken):**
```json
{
  "scripts": {
    "dev": "EXPO_NO_TELEMETRY=1 expo start --tunnel",
    "android": "EXPO_NO_TELEMETRY=1 expo start --android",
    "ios": "EXPO_NO_TELEMETRY=1 expo start --ios",
    "web": "EXPO_NO_TELEMETRY=1 expo start --web",
    "build:web": "expo export -p web && npx workbox generateSW workbox-config.js",
    "build:android": "expo prebuild -p android",
    "lint": "eslint ."
  }
}
```

**Fixed (Recommended):**
```json
{
  "scripts": {
    "dev": "EXPO_NO_TELEMETRY=1 expo start --lan",
    "dev:tunnel": "EXPO_NO_TELEMETRY=1 expo start --tunnel",
    "android": "EXPO_NO_TELEMETRY=1 expo start --android",
    "ios": "EXPO_NO_TELEMETRY=1 expo start --ios",
    "web": "EXPO_NO_TELEMETRY=1 expo start --web",
    "build:web": "expo export -p web && npx workbox generateSW workbox-config.js",
    "build:android": "expo prebuild -p android",
    "lint": "eslint ."
  }
}
```

### Changes Made:
1. ✅ Changed default `dev` script from `--tunnel` to `--lan`
2. ✅ Added `dev:tunnel` script for explicit tunnel usage when needed

---

## 🛠️ Manual Fix Instructions

Since `package.json` cannot be automatically modified by the code generation tool, you must manually update it:

### Step 1: Open package.json
```bash
# Open in your editor
code package.json
# or
nano package.json
# or
vim package.json
```

### Step 2: Find the scripts section
Look for:
```json
"scripts": {
  "dev": "EXPO_NO_TELEMETRY=1 expo start --tunnel",
```

### Step 3: Replace with
```json
"scripts": {
  "dev": "EXPO_NO_TELEMETRY=1 expo start --lan",
  "dev:tunnel": "EXPO_NO_TELEMETRY=1 expo start --tunnel",
```

### Step 4: Save and restart
```bash
# Stop the current dev server (Ctrl+C)
# Then restart with:
npm run dev
```

---

## 🚀 Alternative Workaround (No File Changes)

If you cannot or don't want to modify `package.json`, run the dev server directly:

```bash
# Instead of: npm run dev
# Use:
EXPO_NO_TELEMETRY=1 expo start --lan

# Or for web only:
EXPO_NO_TELEMETRY=1 expo start --web

# Or for iOS:
EXPO_NO_TELEMETRY=1 expo start --ios

# Or for Android:
EXPO_NO_TELEMETRY=1 expo start --android
```

---

## 📊 Comparison: LAN vs Tunnel Mode

### LAN Mode (`--lan`) ✅ RECOMMENDED
- ✅ **No authentication required** - Works immediately
- ✅ **Faster connection** - Direct local network connection
- ✅ **More reliable** - No external dependencies
- ✅ **Works in CI/CD** - No interactive prompts
- ✅ **Better for development** - Lower latency
- ⚠️ **Limitation:** Device must be on same network as dev machine

### Tunnel Mode (`--tunnel`) ⚠️ USE SPARINGLY
- ⚠️ **Requires authentication** - Needs EXPO_TOKEN or interactive login
- ⚠️ **Slower connection** - Routes through Expo servers
- ⚠️ **Less reliable** - Depends on Expo infrastructure
- ⚠️ **Fails in CI/CD** - Cannot prompt for authentication
- ✅ **Benefit:** Works across different networks
- ✅ **Use case:** Testing on device outside local network

---

## 🔍 Verification

After applying the fix, verify it's working:

### 1. Check the logs
You should see:
```
✅ Environment Variables configured correctly
✅ Supabase Connection established
✅ No CommandError messages
```

### 2. No authentication prompts
The dev server should start without asking for login credentials.

### 3. App loads successfully
- Web: Opens in browser automatically
- iOS/Android: Scan QR code in Expo Go app

---

## 📝 Additional Notes

### All Other Configuration is Correct ✅

The following files are properly configured and do NOT need changes:

#### ✅ app.config.js
- Supabase URL configured
- Supabase Anon Key configured
- Edge Functions URL configured
- All required permissions set
- Platform-specific settings correct

#### ✅ metro.config.js
- Custom logging middleware working
- Cache configuration optimal
- Bundle requests handled correctly

#### ✅ src/config/env.ts
- Environment variable loading robust
- Multiple naming conventions supported
- Validation functions working
- Fallback values in place

#### ✅ utils/environmentConfig.ts
- Production parity enforced
- Feature flags disabled
- Configuration verification working
- Diagnostic logging comprehensive

#### ✅ contexts/AuthContext.tsx
- Mount/unmount handling correct
- State updates safe
- Version tracking wrapped safely
- Error handling robust

### No Other Command Errors Found ✅

After thorough analysis:
- ✅ No TypeScript compilation errors
- ✅ No import/export errors
- ✅ No circular dependency issues
- ✅ No missing module errors
- ✅ No runtime command errors

The **ONLY** issue is the `--tunnel` flag in the dev script.

---

## 🎯 Summary

**Problem:** Dev script uses `--tunnel` mode → Requires authentication → Fails in non-interactive mode

**Solution:** Change dev script to use `--lan` mode → No authentication needed → Works everywhere

**Impact:** This single change fixes ALL command errors in the application.

---

## 📞 Support

If you continue to see command errors after applying this fix:

1. **Clear cache:**
   ```bash
   rm -rf node_modules/.cache
   npm start -- --clear
   ```

2. **Reinstall dependencies:**
   ```bash
   rm -rf node_modules
   npm install
   ```

3. **Check Expo CLI version:**
   ```bash
   npx expo --version
   # Should be compatible with Expo SDK 54
   ```

4. **Verify environment variables:**
   ```bash
   # Run diagnostics
   npm run dev
   # Check console for environment configuration logs
   ```

---

## ✅ Verification Checklist

After applying the fix, verify:

- [ ] `package.json` dev script changed to `--lan`
- [ ] Dev server starts without authentication prompts
- [ ] No CommandError in logs
- [ ] App loads in Expo Go / web browser
- [ ] Supabase connection established
- [ ] No console errors related to environment variables

---

**Status:** ✅ All command errors identified and documented. Manual fix required for `package.json`.
