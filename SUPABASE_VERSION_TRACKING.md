
# 📊 Supabase Version Tracking for EAS Deployments

## Overview

This app automatically tracks version information in Supabase every time it's deployed through Expo Application Services (EAS). This provides complete visibility into:

- **App deployments** - Track every build and OTA update
- **User adoption** - See which versions users are running
- **Platform distribution** - Monitor iOS, Android, and Web usage
- **Deployment history** - Full audit trail of all releases

## 🚀 How It Works

### Automatic Version Logging

The app logs version information to Supabase in three scenarios:

1. **App Launch** - Every time the app starts (anonymous tracking)
2. **User Sign-In** - When a user authenticates (user-specific tracking)
3. **EAS Updates** - When OTA updates are downloaded and applied

### What Gets Tracked

Each version log includes:

```typescript
{
  app_version: "1.0.0",           // From app.json
  build_version: "1",             // Native build number
  platform: "ios",                // ios, android, or web
  platform_version: "17.0",       // OS version
  bundle_id: "com.example.app",   // App identifier
  app_name: "My Wishlist",        // App name
  expo_version: "54.0.0",         // Expo SDK version
  update_id: "abc123...",         // EAS Update ID (for OTA)
  channel: "production",          // EAS channel
  runtime_version: "1.0.0",       // Runtime compatibility
  environment: "production",      // development or production
  logged_at: "2025-01-25T10:00:00Z"
}
```

## 📋 Database Schema

### Table: `app_versions`

```sql
CREATE TABLE app_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  app_version TEXT,
  build_version TEXT,
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
  platform_version TEXT,
  bundle_id TEXT,
  app_name TEXT,
  expo_version TEXT,
  update_id TEXT,              -- EAS Update ID
  channel TEXT,                -- EAS channel (production, preview, development)
  runtime_version TEXT,        -- EAS runtime version
  environment TEXT NOT NULL CHECK (environment IN ('development', 'production')),
  logged_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Views

**`latest_app_versions`** - Latest version per platform:
```sql
SELECT * FROM latest_app_versions;
```

**`latest_deployments_by_channel`** - Latest deployment per EAS channel:
```sql
SELECT * FROM latest_deployments_by_channel;
```

### Functions

**`get_version_statistics()`** - Version adoption statistics:
```sql
SELECT * FROM get_version_statistics();
-- Returns: platform, app_version, user_count, last_seen
```

**`get_deployment_history(days_back)`** - Deployment timeline:
```sql
SELECT * FROM get_deployment_history(30);
-- Returns: deployment_date, platform, channel, app_version, deployment_count
```

## 🔧 Setup Instructions

### 1. Run the Migration

The migration file is already created at:
```
supabase/migrations/20260125_create_app_versions_table.sql
```

To apply it to your Supabase project:

**Option A: Supabase Dashboard**
1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy the contents of the migration file
4. Run the SQL

**Option B: Supabase CLI**
```bash
supabase db push
```

### 2. Configure EAS Updates

The app is already configured for EAS Updates. To set up your project:

1. **Install EAS CLI:**
   ```bash
   npm install -g eas-cli
   ```

2. **Login to EAS:**
   ```bash
   eas login
   ```

3. **Configure your project:**
   ```bash
   eas update:configure
   ```

4. **Update app.json with your project ID:**
   ```json
   {
     "expo": {
       "updates": {
         "url": "https://u.expo.dev/YOUR_PROJECT_ID"
       }
     }
   }
   ```

### 3. Deploy Your App

**Build for Production:**
```bash
# iOS
eas build --platform ios --profile production

# Android
eas build --platform android --profile production
```

**Publish OTA Update:**
```bash
# Production channel
eas update --branch production --message "Bug fixes and improvements"

# Preview channel
eas update --branch preview --message "Testing new features"
```

## 📊 Monitoring Deployments

### View Latest Versions

```sql
-- Latest version per platform
SELECT * FROM latest_app_versions;

-- Latest deployments by channel
SELECT * FROM latest_deployments_by_channel;
```

### Check Version Adoption

```sql
-- See which versions users are running
SELECT * FROM get_version_statistics();

-- Example output:
-- platform | app_version | user_count | last_seen
-- ios      | 1.0.0       | 150        | 2025-01-25 10:00:00
-- android  | 1.0.0       | 200        | 2025-01-25 09:45:00
```

### View Deployment History

```sql
-- Last 30 days of deployments
SELECT * FROM get_deployment_history(30);

-- Example output:
-- deployment_date | platform | channel    | app_version | deployment_count
-- 2025-01-25      | ios      | production | 1.0.0       | 150
-- 2025-01-24      | android  | production | 1.0.0       | 200
```

### Track Specific User Versions

```sql
-- See all versions a specific user has used
SELECT 
  app_version,
  build_version,
  platform,
  channel,
  logged_at
FROM app_versions
WHERE user_id = 'USER_UUID'
ORDER BY logged_at DESC;
```

## 🔍 Debugging

### Check if Version Tracking is Working

The app logs detailed information to the console:

```
[VersionTracking] ═══════════════════════════════════════════════════
[VersionTracking] 📊 LOGGING APP VERSION TO SUPABASE
[VersionTracking] ═══════════════════════════════════════════════════
[VersionTracking] App Version: 1.0.0
[VersionTracking] Build Version: 1
[VersionTracking] Platform: ios
[VersionTracking] Update ID: abc123...
[VersionTracking] Channel: production
[VersionTracking] ✅ Successfully logged version to Supabase
```

### Common Issues

**Issue: Table doesn't exist**
- Run the migration in Supabase dashboard
- Check console for SQL creation instructions

**Issue: No EAS Update information**
- EAS Updates only work in production builds
- Development mode won't have update_id, channel, or runtime_version

**Issue: Versions not being logged**
- Check Supabase connection in app logs
- Verify RLS policies allow inserts
- Check network connectivity

## 📈 Analytics Queries

### Most Popular Versions

```sql
SELECT 
  platform,
  app_version,
  COUNT(DISTINCT user_id) as unique_users,
  COUNT(*) as total_launches
FROM app_versions
WHERE logged_at > NOW() - INTERVAL '7 days'
GROUP BY platform, app_version
ORDER BY unique_users DESC;
```

### Update Adoption Rate

```sql
-- See how quickly users adopt new versions
SELECT 
  DATE(logged_at) as date,
  app_version,
  COUNT(DISTINCT user_id) as new_users
FROM app_versions
WHERE app_version = '1.0.0'
GROUP BY DATE(logged_at), app_version
ORDER BY date;
```

### Platform Distribution

```sql
SELECT 
  platform,
  COUNT(DISTINCT user_id) as users,
  ROUND(COUNT(DISTINCT user_id) * 100.0 / SUM(COUNT(DISTINCT user_id)) OVER (), 2) as percentage
FROM app_versions
WHERE logged_at > NOW() - INTERVAL '30 days'
GROUP BY platform;
```

## 🎯 Best Practices

1. **Increment Version Numbers** - Update `version` in app.json for each release
2. **Use Channels** - Separate production, preview, and development deployments
3. **Monitor Adoption** - Check version statistics after each release
4. **Track Issues** - Correlate bug reports with specific versions
5. **Plan Deprecation** - Use adoption data to decide when to drop old version support

## 🔐 Security & Privacy

- **Anonymous Tracking** - Version logs work without user authentication
- **User Privacy** - Only tracks version info, not personal data
- **RLS Policies** - Users can only view their own version history
- **Service Role** - Full access for admin queries and analytics

## 📚 Additional Resources

- [EAS Build Documentation](https://docs.expo.dev/build/introduction/)
- [EAS Update Documentation](https://docs.expo.dev/eas-update/introduction/)
- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)

---

**Version tracking is now active!** Every deployment through EAS will be automatically logged to your Supabase database. 🎉
