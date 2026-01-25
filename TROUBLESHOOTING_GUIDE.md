
# Troubleshooting Guide

## 🚨 Quick Fixes for Common Issues

### Issue: "App won't load" or "White screen"

**Symptoms:**
- App shows white screen
- App crashes on launch
- Nothing appears

**Solutions:**
1. Check console logs for errors
2. Verify `app.json` configuration
3. Ensure Supabase credentials are set
4. Try clearing app data and restarting

**How to Fix:**
```bash
# Clear Metro bundler cache
npx expo start --clear

# Reinstall dependencies
rm -rf node_modules
npm install
```

---

### Issue: "Cannot connect to Supabase"

**Symptoms:**
- System Diagnostics shows "Supabase Connection Failed"
- Database queries fail
- Authentication doesn't work

**Solutions:**
1. Check `app.json` has correct Supabase URL and anon key
2. Verify Supabase project is active (not paused)
3. Check network connection
4. Verify Supabase credentials are valid

**How to Fix:**
```json
// In app.json, verify:
{
  "expo": {
    "extra": {
      "supabaseUrl": "https://YOUR_PROJECT.supabase.co",
      "supabaseAnonKey": "sb_publishable_YOUR_KEY"
    }
  }
}
```

---

### Issue: "Authentication fails" or "Cannot sign in"

**Symptoms:**
- Sign in button doesn't work
- "Invalid credentials" error
- OAuth doesn't redirect back

**Solutions:**
1. Check email/password are correct
2. Verify email is confirmed (check inbox)
3. Check Supabase auth settings
4. For OAuth: Verify redirect URLs are configured

**How to Fix:**
1. Go to Supabase Dashboard → Authentication → Settings
2. Verify "Enable Email Confirmations" setting
3. For OAuth: Add redirect URLs:
   - `mywishlist://auth-callback`
   - `https://YOUR_PROJECT.supabase.co/auth/v1/callback`

---

### Issue: "Wishlists won't load" or "Items not showing"

**Symptoms:**
- Wishlists screen is empty
- Items don't appear
- "Failed to fetch" errors

**Solutions:**
1. Run System Diagnostics to check database
2. Verify you're signed in
3. Check network connection
4. Verify database tables exist

**How to Fix:**
1. Run System Diagnostics
2. Check "Database Schema" test
3. If fails: Run database migrations
4. If passes: Check user permissions

---

### Issue: "Share sheet doesn't work"

**Symptoms:**
- Can't share from other apps
- Share button doesn't appear
- URL not extracted

**Solutions:**
1. Verify intent filters (Android) or associated domains (iOS)
2. Test on real device (not Expo Go)
3. Check deep linking configuration

**How to Fix:**

**iOS:**
```json
// In app.json
{
  "ios": {
    "associatedDomains": [
      "applinks:mywishlist.app"
    ]
  }
}
```

**Android:**
```json
// In app.json
{
  "android": {
    "intentFilters": [
      {
        "action": "VIEW",
        "autoVerify": true,
        "data": [
          { "scheme": "https", "host": "*" }
        ],
        "category": ["BROWSABLE", "DEFAULT"]
      }
    ]
  }
}
```

---

### Issue: "Notifications don't work"

**Symptoms:**
- No push notifications received
- Permission not granted
- Notifications fail silently

**Solutions:**
1. Check notification permissions
2. Verify Expo push token is saved
3. Test on real device
4. Check quiet hours settings

**How to Fix:**
1. Go to Profile → Notifications
2. Enable "Price Drop Alerts"
3. Grant notification permission when prompted
4. Test with a price drop

---

### Issue: "Image upload fails"

**Symptoms:**
- Can't upload images
- "Upload failed" error
- Images don't appear

**Solutions:**
1. Check photo library permissions
2. Verify Supabase Storage is configured
3. Check file size (max 5MB)
4. Verify storage bucket exists

**How to Fix:**
1. Go to Supabase Dashboard → Storage
2. Create bucket named `wishlist-images`
3. Set bucket to public
4. Grant permissions for authenticated users

---

### Issue: "Price tracking doesn't update"

**Symptoms:**
- Prices never change
- "Last checked" shows old date
- Price history empty

**Solutions:**
1. Verify backend is running (if using backend)
2. Check Edge Functions are deployed (if using Supabase)
3. Manually trigger price refresh
4. Check item URL is valid

**How to Fix:**
1. Open item detail screen
2. Tap "Check Price Now"
3. Verify price updates
4. If fails: Check URL is accessible

---

### Issue: "E2E Tests fail"

**Symptoms:**
- Tests show red (fail) status
- "Cleanup" test fails
- Tests timeout

**Solutions:**
1. Ensure you're signed in
2. Run System Diagnostics first
3. Check network connection
4. Verify database permissions

**How to Fix:**
1. Sign out and sign in again
2. Run System Diagnostics
3. Fix any critical failures
4. Run E2E Tests again

---

### Issue: "App is slow" or "Performance issues"

**Symptoms:**
- App takes long to load
- Screens lag
- Animations stutter

**Solutions:**
1. Check network speed
2. Clear app cache
3. Reduce image sizes
4. Check for memory leaks

**How to Fix:**
1. Run E2E Tests and check durations
2. If any test >500ms, investigate
3. Optimize database queries
4. Compress images before upload

---

### Issue: "Deep linking doesn't work"

**Symptoms:**
- Links don't open app
- Redirects fail
- OAuth doesn't complete

**Solutions:**
1. Verify URL scheme is configured
2. Test on real device
3. Check associated domains (iOS)
4. Verify intent filters (Android)

**How to Fix:**
```json
// In app.json
{
  "scheme": "mywishlist",
  "ios": {
    "associatedDomains": [
      "applinks:mywishlist.app"
    ]
  },
  "android": {
    "intentFilters": [...]
  }
}
```

---

## 🔍 Diagnostic Workflow

When something goes wrong, follow this workflow:

### Step 1: Run System Diagnostics
1. Go to Profile → Developer Tools → System Diagnostics
2. Tap "Run Diagnostics"
3. Review results
4. Fix any red (fail) status items

### Step 2: Check Specific System
Based on the issue, check specific diagnostic:
- **Auth issues** → Check "Authentication" test
- **Data issues** → Check "Database Schema" test
- **Network issues** → Check "Network" test
- **Permission issues** → Check "Notifications" or "Image Picker" tests

### Step 3: Run E2E Tests
1. Go to Profile → Developer Tools → End-to-End Tests
2. Tap "Run Tests"
3. Identify which test fails
4. Fix the specific issue

### Step 4: Check Logs
1. Look at console output
2. Check for error messages
3. Note any stack traces
4. Search for error in this guide

### Step 5: Verify Configuration
1. Check `app.json` settings
2. Verify Supabase credentials
3. Check environment variables
4. Verify deep linking setup

---

## 📱 Platform-Specific Issues

### iOS Only

#### Issue: "App Store Connect upload fails"
**Solution:**
1. Verify bundle identifier matches
2. Check provisioning profiles
3. Verify app icons are correct size
4. Check Info.plist settings

#### Issue: "TestFlight build crashes"
**Solution:**
1. Test in production mode locally first
2. Check crash logs in App Store Connect
3. Verify all dependencies are compatible
4. Test on multiple iOS versions

### Android Only

#### Issue: "Google Play upload fails"
**Solution:**
1. Verify package name matches
2. Check signing configuration
3. Verify app icons are correct size
4. Check AndroidManifest.xml

#### Issue: "App crashes on Android"
**Solution:**
1. Check Android-specific code
2. Verify permissions in AndroidManifest
3. Test on multiple Android versions
4. Check for platform-specific bugs

---

## 🆘 Getting Help

### Before Asking for Help

1. ✅ Run System Diagnostics
2. ✅ Run E2E Tests
3. ✅ Check this troubleshooting guide
4. ✅ Check console logs
5. ✅ Try on different device/platform

### When Asking for Help

Include:
1. **System Diagnostics results** (screenshot)
2. **E2E Test results** (screenshot)
3. **Console logs** (copy/paste)
4. **Steps to reproduce**
5. **Platform** (iOS/Android/Web)
6. **Device** (iPhone 14, Pixel 7, etc.)
7. **OS version** (iOS 17, Android 13, etc.)

### Where to Get Help

1. **Supabase Discord** - For Supabase-specific issues
2. **Expo Forums** - For Expo/React Native issues
3. **GitHub Issues** - For app-specific bugs
4. **Stack Overflow** - For general programming questions

---

## 🎯 Prevention Tips

### Avoid Common Issues

1. **Always run diagnostics before deploying**
2. **Test on real devices, not just simulators**
3. **Keep dependencies updated**
4. **Use TypeScript for type safety**
5. **Write tests for critical flows**
6. **Monitor error logs regularly**
7. **Test on multiple platforms**
8. **Verify configuration before building**

### Best Practices

1. **Development:**
   - Run diagnostics after major changes
   - Test on both iOS and Android
   - Use TypeScript strict mode
   - Write meaningful console logs

2. **Testing:**
   - Run E2E tests before committing
   - Test on real devices weekly
   - Verify all user flows work
   - Check performance metrics

3. **Deployment:**
   - Run full diagnostic suite
   - Test on production-like environment
   - Verify all integrations work
   - Have rollback plan ready

---

**Last Updated:** January 2026  
**Version:** 1.0.0  
**Status:** Active
