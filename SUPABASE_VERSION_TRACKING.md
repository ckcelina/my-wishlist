
# Supabase App Version Tracking

This document explains how the app automatically tracks version information in Supabase every time it is deployed or when users sign in.

## Overview

The app now automatically logs version information to Supabase, including:
- App version (from `app.json`)
- Build number (native build version)
- Platform (iOS, Android, Web)
- Platform version (OS version)
- Device information
- Deployment timestamp
- Environment (development/production)

## How It Works

### 1. Automatic Logging on App Start
When the app starts, it automatically logs the current version to Supabase:
- Location: `app/_layout.tsx`
- Function: `logAppVersionToSupabase()`
- Timing: On app initialization

### 2. Automatic Logging on User Sign In
When a user signs in, the app logs their version information:
- Location: `contexts/AuthContext.tsx`
- Function: `logAppVersionToSupabase(userId)`
- Timing: On `SIGNED_IN` auth event

### 3. Version Information Collected
The following information is tracked:
```typescript
{
  appVersion: "1.0.0",           // From app.json
  buildVersion: "1",             // Native build number
  platform: "ios",               // ios, android, or web
  platformVersion: "17.0",       // OS version
  bundleId: "com.example.app",   // App bundle identifier
  appName: "My Wishlist",        // App name
  expoVersion: "54.0.1",         // Expo SDK version
  environment: "production",     // development or production
  deployedAt: "2024-01-25T..."   // Timestamp
}
```

## Database Setup

### Step 1: Run the Migration
Execute the SQL migration in your Supabase dashboard:

1. Go to your Supabase project
2. Navigate to **SQL Editor**
3. Copy and paste the contents of `supabase/migrations/20260125_create_app_versions_table.sql`
4. Click **Run**

This will create:
- `app_versions` table
- Indexes for performance
- Row Level Security policies
- A view for latest versions
- A function for version statistics

### Step 2: Verify the Table
Check that the table was created:
```sql
SELECT * FROM app_versions LIMIT 10;
```

## Usage

### View Latest Versions
```sql
SELECT * FROM latest_app_versions;
```

### Get Version Statistics
```sql
SELECT * FROM get_version_statistics();
```

### Query Specific Platform
```sql
SELECT * FROM app_versions 
WHERE platform = 'ios' 
ORDER BY logged_at DESC 
LIMIT 10;
```

### Count Users by Version
```sql
SELECT 
  app_version, 
  platform, 
  COUNT(DISTINCT user_id) as user_count
FROM app_versions
WHERE logged_at > NOW() - INTERVAL '7 days'
GROUP BY app_version, platform
ORDER BY user_count DESC;
```

### Find Outdated Versions
```sql
SELECT DISTINCT 
  user_id, 
  app_version, 
  platform,
  logged_at
FROM app_versions
WHERE app_version != '1.0.0'  -- Replace with current version
ORDER BY logged_at DESC;
```

## Utility Functions

### Get Current Version Info
```typescript
import { getVersionInfo } from '@/utils/versionTracking';

const versionInfo = await getVersionInfo();
console.log('App Version:', versionInfo.appVersion);
console.log('Build Version:', versionInfo.buildVersion);
```

### Log Version Manually
```typescript
import { logAppVersionToSupabase } from '@/utils/versionTracking';

// Log without user ID (anonymous)
await logAppVersionToSupabase();

// Log with user ID
await logAppVersionToSupabase(userId);
```

### Check if Version is Outdated
```typescript
import { isAppVersionOutdated } from '@/utils/versionTracking';

const isOutdated = await isAppVersionOutdated();
if (isOutdated) {
  // Show update prompt to user
}
```

### Get User's Version History
```typescript
import { getUserAppVersions } from '@/utils/versionTracking';

const versions = await getUserAppVersions(userId);
console.log('User has used versions:', versions);
```

## Console Logs

The app logs detailed version information to the console:

```
[VersionTracking] ═══════════════════════════════════════════════════
[VersionTracking] 📊 LOGGING APP VERSION TO SUPABASE
[VersionTracking] ═══════════════════════════════════════════════════
[VersionTracking] App Version: 1.0.0
[VersionTracking] Build Version: 1
[VersionTracking] Bundle ID: com.anonymous.MyWishlist
[VersionTracking] App Name: My Wishlist
[VersionTracking] Platform: ios
[VersionTracking] Platform Version: 17.0
[VersionTracking] ✅ Successfully logged version to Supabase
[VersionTracking] ═══════════════════════════════════════════════════
```

## Troubleshooting

### Table Not Found Error
If you see this error:
```
relation "app_versions" does not exist
```

**Solution:** Run the SQL migration in Supabase (see Database Setup above)

### Permission Denied Error
If you see permission errors:
```
permission denied for table app_versions
```

**Solution:** The migration includes RLS policies. Make sure they were created:
```sql
SELECT * FROM pg_policies WHERE tablename = 'app_versions';
```

### No Data Being Logged
1. Check console logs for errors
2. Verify Supabase connection is working
3. Check that the table exists
4. Verify RLS policies allow inserts

## Privacy & Security

- **Anonymous Tracking:** Version logs can be created without a user ID
- **User Privacy:** Users can only view their own version logs
- **Row Level Security:** Enabled with appropriate policies
- **No Sensitive Data:** Only version and device metadata is stored

## Benefits

1. **Deployment Monitoring:** Track which versions are deployed
2. **User Analytics:** See which versions users are running
3. **Update Tracking:** Identify users on outdated versions
4. **Platform Insights:** Compare adoption across iOS/Android/Web
5. **Debugging:** Correlate issues with specific versions

## Next Steps

1. ✅ Run the SQL migration in Supabase
2. ✅ Deploy your app
3. ✅ Check the `app_versions` table for logs
4. ✅ Use the statistics function to analyze version adoption
5. ✅ Set up alerts for outdated versions (optional)

## Example Queries

### Most Popular Versions (Last 30 Days)
```sql
SELECT 
  app_version,
  platform,
  COUNT(*) as launch_count,
  COUNT(DISTINCT user_id) as unique_users
FROM app_versions
WHERE logged_at > NOW() - INTERVAL '30 days'
GROUP BY app_version, platform
ORDER BY unique_users DESC;
```

### Version Adoption Timeline
```sql
SELECT 
  DATE(logged_at) as date,
  app_version,
  COUNT(DISTINCT user_id) as users
FROM app_versions
GROUP BY DATE(logged_at), app_version
ORDER BY date DESC, users DESC;
```

### Platform Distribution
```sql
SELECT 
  platform,
  COUNT(DISTINCT user_id) as users,
  ROUND(COUNT(DISTINCT user_id) * 100.0 / SUM(COUNT(DISTINCT user_id)) OVER (), 2) as percentage
FROM app_versions
WHERE logged_at > NOW() - INTERVAL '7 days'
GROUP BY platform;
```

---

**Note:** This system automatically tracks versions without any manual intervention. Just deploy your app and the version information will be logged to Supabase!
