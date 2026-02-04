
# Expo Development Mode Guide

## ✅ Fixed: Default Development Mode

The app now uses **LAN mode** by default, which doesn't require Expo authentication.

```bash
npm run dev
```

This will start the Expo dev server on your local network without requiring an `EXPO_TOKEN`.

## Available Development Modes

### 1. LAN Mode (Default - Recommended)
```bash
npm run dev
```

**Best for:**
- Local development on the same WiFi network
- Testing on physical devices connected to your WiFi
- No authentication required
- Fastest and most reliable

**Requirements:**
- Your computer and phone must be on the same WiFi network
- Firewall must allow connections on port 8081

### 2. Tunnel Mode (Optional)
```bash
npm run dev:tunnel
```

**Best for:**
- Testing on devices not on the same network
- Sharing your dev server with remote testers
- When your network blocks local connections

**Requirements:**
- Requires `EXPO_TOKEN` environment variable
- Get your token from: https://expo.dev/settings/access-tokens
- Add to `.env` file: `EXPO_TOKEN=your-expo-access-token-here`

### 3. Platform-Specific Modes
```bash
npm run web      # Web browser only
npm run ios      # iOS simulator
npm run android  # Android emulator
```

## Setting Up Tunnel Mode (If Needed)

1. **Get an Expo Access Token:**
   - Visit https://expo.dev/settings/access-tokens
   - Click "Create Token"
   - Give it a name (e.g., "Development")
   - Copy the token

2. **Add to your `.env` file:**
   ```bash
   EXPO_TOKEN=your-expo-access-token-here
   ```

3. **Run with tunnel mode:**
   ```bash
   npm run dev:tunnel
   ```

## Troubleshooting

### LAN Mode Not Working?

1. **Check WiFi Connection:**
   - Ensure phone and computer are on the same WiFi network
   - Some public/corporate WiFi networks block device-to-device communication

2. **Check Firewall:**
   - Allow Metro bundler (port 8081) through your firewall
   - On macOS: System Preferences → Security & Privacy → Firewall → Firewall Options
   - On Windows: Windows Defender Firewall → Allow an app

3. **Try clearing cache:**
   ```bash
   npx expo start --clear
   ```

### Tunnel Mode Authentication Error?

If you see "Input is required, but 'npx expo' is in non-interactive mode":
- You're missing the `EXPO_TOKEN` environment variable
- Follow the "Setting Up Tunnel Mode" steps above
- Or switch to LAN mode: `npm run dev`

### QR Code Not Scanning?

1. **Use Expo Go app** (not camera app)
2. **Check URL format** - Should start with `exp://`
3. **Try manual connection:**
   - Open Expo Go
   - Tap "Enter URL manually"
   - Enter the URL shown in terminal

### Still Having Issues?

1. **Restart Metro bundler:**
   ```bash
   # Press Ctrl+C to stop, then:
   npm run dev
   ```

2. **Clear all caches:**
   ```bash
   npx expo start --clear
   rm -rf node_modules
   npm install
   npm run dev
   ```

3. **Check Expo Go version:**
   - Update Expo Go app to latest version
   - Ensure it's compatible with Expo SDK 54

## Production Builds

For production builds (not affected by development mode):
```bash
npm run build:web      # Web production build
npm run build:android  # Android production build
```

## More Information

- [Expo Development Mode](https://docs.expo.dev/workflow/development-mode/)
- [Expo Access Tokens](https://docs.expo.dev/accounts/programmatic-access/)
- [Troubleshooting Expo Go](https://docs.expo.dev/get-started/expo-go/)
- [Network Configuration](https://docs.expo.dev/guides/customizing-metro/#network-configuration)
