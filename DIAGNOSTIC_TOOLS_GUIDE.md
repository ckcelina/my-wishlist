
# Diagnostic Tools Guide

## 🔧 Quick Start

### Accessing Diagnostic Tools

1. Open the app
2. Navigate to the **Profile** tab (bottom right)
3. Scroll down to **Developer Tools** section
4. Choose:
   - **System Diagnostics** - Test all app systems
   - **End-to-End Tests** - Test complete user flows

## 🩺 System Diagnostics

### What It Tests

The System Diagnostics tool runs 15 comprehensive tests:

#### 1. **Supabase Connection** ✅
- Tests database connectivity
- Verifies credentials
- **Expected:** Pass
- **If Fails:** Check `app.json` for `supabaseUrl` and `supabaseAnonKey`

#### 2. **Authentication** ✅
- Checks user session
- Verifies auth state
- **Expected:** Pass (if signed in), Warning (if not signed in)
- **If Fails:** Check Supabase auth configuration

#### 3. **Database Schema** ✅
- Verifies all tables exist
- Tests table access
- **Expected:** Pass
- **If Fails:** Run database migrations

#### 4. **Wishlists CRUD** ✅
- Tests create/read/update/delete operations
- **Expected:** Pass (if signed in), Warning (if not signed in)
- **If Fails:** Check database permissions

#### 5. **Backend API** ⚠️
- Tests legacy backend connection
- **Expected:** Warning (Supabase-only mode)
- **If Fails:** Not critical if using Supabase only

#### 6. **Notifications** ⚠️
- Checks push notification permissions
- **Expected:** Pass (if granted), Warning (if not granted)
- **If Fails:** Grant notification permissions in settings

#### 7. **Image Picker** ⚠️
- Checks photo library permissions
- **Expected:** Pass (if granted), Warning (if not granted)
- **If Fails:** Grant photo permissions in settings

#### 8. **Storage** ✅
- Tests Supabase Storage access
- **Expected:** Pass
- **If Fails:** Check Supabase Storage configuration

#### 9. **Edge Functions** ⚠️
- Tests AI feature availability
- **Expected:** Pass (if deployed), Warning (if not deployed)
- **If Fails:** Deploy Supabase Edge Functions

#### 10. **Deep Linking** ✅
- Verifies URL scheme configuration
- **Expected:** Pass
- **If Fails:** Check `app.json` scheme configuration

#### 11. **Platform** ✅
- Detects iOS/Android/Web
- **Expected:** Always Pass
- **If Fails:** Should never fail

#### 12. **Environment** ✅
- Validates configuration variables
- **Expected:** Pass
- **If Fails:** Check `app.json` extra config

#### 13. **Network** ✅
- Tests internet connectivity
- **Expected:** Pass
- **If Fails:** Check network connection

#### 14. **User Settings** ✅
- Verifies settings table access
- **Expected:** Pass (if signed in), Warning (if not signed in)
- **If Fails:** Check database permissions

#### 15. **Share Sheet** ⚠️
- Checks share configuration
- **Expected:** Pass
- **If Fails:** Check `app.json` intent filters (Android) or associated domains (iOS)

### How to Use

1. Tap **"Run Diagnostics"**
2. Wait for all tests to complete (15-30 seconds)
3. Review results:
   - ✅ **Green (Pass)** - System working correctly
   - ⚠️ **Yellow (Warning)** - Non-critical issue or permission needed
   - ❌ **Red (Fail)** - Critical issue that needs fixing
4. Tap on any result to see details
5. Fix any failures before deploying

### Interpreting Results

#### All Green ✅
- App is healthy and ready for use
- All critical systems working
- Safe to deploy

#### Some Yellow ⚠️
- Non-critical issues
- May need permissions
- App still functional
- Address before production

#### Any Red ❌
- Critical issues
- App may not work correctly
- **Must fix before deploying**
- Check error details

## 🧪 End-to-End Tests

### What It Tests

The E2E test suite runs 10 complete user flow tests:

#### 1. **Create Wishlist**
- Creates a test wishlist
- Verifies database insert
- **Expected:** Pass
- **Duration:** <300ms

#### 2. **Add Item**
- Adds item to wishlist
- Tests item creation
- **Expected:** Pass
- **Duration:** <300ms

#### 3. **Update Item**
- Updates item details
- Tests item modification
- **Expected:** Pass
- **Duration:** <200ms

#### 4. **Fetch Items**
- Retrieves wishlist items
- Tests database query
- **Expected:** Pass
- **Duration:** <200ms

#### 5. **Create Share Link**
- Generates share slug
- Creates shared wishlist
- **Expected:** Pass
- **Duration:** <300ms

#### 6. **Fetch Shared Wishlist**
- Retrieves shared wishlist
- Tests public access
- **Expected:** Pass
- **Duration:** <200ms

#### 7. **Add Price History**
- Records price change
- Tests price tracking
- **Expected:** Pass
- **Duration:** <200ms

#### 8. **User Settings**
- Accesses user settings
- Creates if missing
- **Expected:** Pass
- **Duration:** <300ms

#### 9. **Delete Share Link**
- Removes shared wishlist
- Tests cleanup
- **Expected:** Pass
- **Duration:** <200ms

#### 10. **Cleanup**
- Deletes test data
- Ensures no leftovers
- **Expected:** Pass
- **Duration:** <300ms

### How to Use

1. **Sign in first** (required for E2E tests)
2. Tap **"Run Tests"**
3. Wait for all tests to complete (10-20 seconds)
4. Review results:
   - ✅ **Pass** - Test succeeded
   - ❌ **Fail** - Test failed (investigate)
   - ⏭️ **Skipped** - Skipped due to previous failure
5. Check performance (duration for each test)
6. All test data is automatically cleaned up

### Interpreting Results

#### All Pass ✅
- All user flows working
- Database operations successful
- App ready for production

#### Some Fail ❌
- Critical issue in user flow
- **Must investigate and fix**
- Check error message for details
- May indicate database or permission issue

#### Performance Issues
- If any test takes >500ms, investigate
- May indicate:
  - Slow network
  - Database performance issue
  - Need for optimization

## 🚨 Troubleshooting

### Common Issues

#### "Supabase Connection Failed"
**Solution:**
1. Check `app.json` has `supabaseUrl` and `supabaseAnonKey`
2. Verify Supabase project is active
3. Check network connection

#### "Database Schema Missing Tables"
**Solution:**
1. Run database migrations
2. Check Supabase dashboard for tables
3. Verify database permissions

#### "Authentication Failed"
**Solution:**
1. Sign out and sign in again
2. Check Supabase auth configuration
3. Verify email confirmation (if required)

#### "Edge Functions Not Found"
**Solution:**
1. Deploy Supabase Edge Functions
2. Or accept warning (AI features won't work)
3. Check Supabase Functions dashboard

#### "E2E Tests Fail"
**Solution:**
1. Ensure you're signed in
2. Check network connection
3. Run System Diagnostics first
4. Fix any critical failures
5. Try again

### Getting Help

If diagnostics show critical failures:

1. **Check the error message** - Often tells you exactly what's wrong
2. **Run both diagnostic tools** - System Diagnostics + E2E Tests
3. **Check the logs** - Look for console errors
4. **Review configuration** - Verify `app.json` settings
5. **Check Supabase dashboard** - Verify project status

## 📊 Best Practices

### Before Deploying

1. ✅ Run System Diagnostics
2. ✅ Fix all critical failures (red)
3. ✅ Run E2E Tests
4. ✅ Verify all tests pass
5. ✅ Test on real devices
6. ✅ Test share sheet
7. ✅ Test notifications

### During Development

1. Run diagnostics after major changes
2. Run E2E tests before committing
3. Monitor performance metrics
4. Address warnings before they become failures

### Regular Maintenance

1. Run diagnostics weekly
2. Monitor for new warnings
3. Keep dependencies updated
4. Test on latest OS versions

## 🎯 Success Criteria

### Ready for Production When:

- ✅ All System Diagnostics pass (or only warnings)
- ✅ All E2E Tests pass
- ✅ Average test duration <300ms
- ✅ No critical failures
- ✅ Tested on real devices
- ✅ Share sheet works
- ✅ Notifications deliver

---

**Last Updated:** January 2026  
**Version:** 1.0.0  
**Status:** Active
