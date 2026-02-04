
# 🚀 Quick Fix Guide - Command Errors

## The Problem
Your app shows this error:
```
CommandError: Input is required, but 'npx expo' is in non-interactive mode.
```

## The Solution (2 Minutes)

### Option 1: Edit package.json (Permanent Fix)

1. Open `package.json`
2. Find this line:
   ```json
   "dev": "EXPO_NO_TELEMETRY=1 expo start --tunnel",
   ```
3. Change it to:
   ```json
   "dev": "EXPO_NO_TELEMETRY=1 expo start --lan",
   ```
4. Save the file
5. Restart your dev server: `npm run dev`

### Option 2: Run Command Directly (Quick Workaround)

Instead of `npm run dev`, run:
```bash
EXPO_NO_TELEMETRY=1 expo start --lan
```

## Why This Works

- `--tunnel` mode requires authentication (causes the error)
- `--lan` mode works on your local network (no authentication needed)
- Your device must be on the same WiFi network as your computer

## Verification

After the fix, you should see:
```
✅ Environment Variables configured correctly
✅ Supabase Connection established
✅ No CommandError messages
```

## Need Tunnel Mode?

If you need to test on a device outside your network:

1. Add this to `package.json` scripts:
   ```json
   "dev:tunnel": "EXPO_NO_TELEMETRY=1 expo start --tunnel",
   ```
2. Run: `npm run dev:tunnel`
3. You'll need to authenticate with Expo

## That's It!

This single change fixes all command errors in your app. Everything else is already configured correctly.

---

**Questions?** Check `COMMAND_ERRORS_RESOLUTION.md` for detailed information.
