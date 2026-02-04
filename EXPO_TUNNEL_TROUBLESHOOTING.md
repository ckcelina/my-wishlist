
# Expo Tunnel Mode Troubleshooting

## Error: "Input is required, but 'npx expo' is in non-interactive mode"

This error occurs when using `--tunnel` mode without proper authentication.

### Quick Fix (Recommended)

**Use LAN mode instead of tunnel mode for local development:**

```bash
npm run dev
```

This uses `--lan` mode which doesn't require Expo authentication and works on your local network.

### If You Need Tunnel Mode

Tunnel mode is useful when:
- Testing on a physical device not on the same network
- Sharing your dev server with remote testers
- Your network blocks local connections

**Steps to fix:**

1. **Get an Expo Access Token:**
   - Go to https://expo.dev/settings/access-tokens
   - Create a new access token
   - Copy the token

2. **Add token to your environment:**
   
   Create or edit `.env` file:
   ```bash
   EXPO_TOKEN=your-expo-access-token-here
   ```

3. **Run with tunnel mode:**
   ```bash
   npm run dev:tunnel
   ```

### Available Scripts

- `npm run dev` - Start with LAN mode (recommended for local development)
- `npm run dev:tunnel` - Start with tunnel mode (requires EXPO_TOKEN)
- `npm run web` - Start web version only
- `npm run ios` - Start iOS simulator
- `npm run android` - Start Android emulator

### Alternative Solutions

1. **Use Expo Go without tunnel:**
   - Connect your phone to the same WiFi as your computer
   - Use `npm run dev` (LAN mode)
   - Scan the QR code with Expo Go

2. **Use Web version for testing:**
   ```bash
   npm run web
   ```
   Opens in your browser at http://localhost:8081

3. **Clear Expo cache if issues persist:**
   ```bash
   npx expo start --clear
   ```

### Network Troubleshooting

If LAN mode doesn't work:

1. **Check firewall settings** - Allow Metro bundler (port 8081)
2. **Verify same network** - Phone and computer on same WiFi
3. **Try localhost mode:**
   ```bash
   EXPO_NO_TELEMETRY=1 expo start --localhost
   ```

### Production Builds

For production builds (not affected by this issue):
```bash
npm run build:web
npm run build:android
```

### More Information

- [Expo Access Tokens Documentation](https://docs.expo.dev/accounts/programmatic-access/)
- [Expo Development Mode](https://docs.expo.dev/workflow/development-mode/)
- [Troubleshooting Expo Go](https://docs.expo.dev/get-started/expo-go/)
