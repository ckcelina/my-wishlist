
-- ═══════════════════════════════════════════════════════════════════════════
-- APP VERSION TRACKING TABLE
-- ═══════════════════════════════════════════════════════════════════════════
-- This table tracks app version information every time the app is deployed
-- or when a user signs in. This helps monitor which versions are in use
-- and track deployment history.
-- ═══════════════════════════════════════════════════════════════════════════

-- Create app_versions table
CREATE TABLE IF NOT EXISTS app_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  app_version TEXT,
  build_version TEXT,
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
  platform_version TEXT,
  bundle_id TEXT,
  app_name TEXT,
  expo_version TEXT,
  environment TEXT NOT NULL CHECK (environment IN ('development', 'production')),
  logged_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_app_versions_user_id ON app_versions(user_id);
CREATE INDEX IF NOT EXISTS idx_app_versions_logged_at ON app_versions(logged_at DESC);
CREATE INDEX IF NOT EXISTS idx_app_versions_platform ON app_versions(platform);
CREATE INDEX IF NOT EXISTS idx_app_versions_environment ON app_versions(environment);
CREATE INDEX IF NOT EXISTS idx_app_versions_app_version ON app_versions(app_version);

-- Enable Row Level Security
ALTER TABLE app_versions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own version logs
CREATE POLICY "Users can view their own version logs"
  ON app_versions
  FOR SELECT
  USING (auth.uid() = user_id OR user_id IS NULL);

-- Policy: Anyone can insert version logs (for anonymous tracking)
CREATE POLICY "Anyone can insert version logs"
  ON app_versions
  FOR INSERT
  WITH CHECK (true);

-- Policy: Service role can do everything
CREATE POLICY "Service role can manage all version logs"
  ON app_versions
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- Create a view for the latest version per platform
CREATE OR REPLACE VIEW latest_app_versions AS
SELECT DISTINCT ON (platform)
  id,
  app_version,
  build_version,
  platform,
  platform_version,
  bundle_id,
  app_name,
  expo_version,
  environment,
  logged_at
FROM app_versions
ORDER BY platform, logged_at DESC;

-- Create a function to get version statistics
CREATE OR REPLACE FUNCTION get_version_statistics()
RETURNS TABLE (
  platform TEXT,
  app_version TEXT,
  user_count BIGINT,
  last_seen TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    av.platform,
    av.app_version,
    COUNT(DISTINCT av.user_id) as user_count,
    MAX(av.logged_at) as last_seen
  FROM app_versions av
  WHERE av.logged_at > NOW() - INTERVAL '30 days'
  GROUP BY av.platform, av.app_version
  ORDER BY av.platform, last_seen DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION get_version_statistics() TO authenticated;
GRANT EXECUTE ON FUNCTION get_version_statistics() TO anon;

-- Add comments for documentation
COMMENT ON TABLE app_versions IS 'Tracks app version information for deployment monitoring and user analytics';
COMMENT ON COLUMN app_versions.user_id IS 'User who launched the app (null for anonymous tracking)';
COMMENT ON COLUMN app_versions.app_version IS 'Human-readable version from app.json (e.g., 1.0.0)';
COMMENT ON COLUMN app_versions.build_version IS 'Native build number (iOS: CFBundleVersion, Android: versionCode)';
COMMENT ON COLUMN app_versions.platform IS 'Platform: ios, android, or web';
COMMENT ON COLUMN app_versions.platform_version IS 'OS version (e.g., iOS 17.0, Android 14)';
COMMENT ON COLUMN app_versions.bundle_id IS 'App bundle identifier (e.g., com.example.app)';
COMMENT ON COLUMN app_versions.app_name IS 'Human-readable app name';
COMMENT ON COLUMN app_versions.expo_version IS 'Expo SDK version';
COMMENT ON COLUMN app_versions.environment IS 'development or production';
COMMENT ON COLUMN app_versions.logged_at IS 'When this version was logged';

-- ═══════════════════════════════════════════════════════════════════════════
-- DEPLOYMENT COMPLETE
-- ═══════════════════════════════════════════════════════════════════════════
-- The app_versions table is now ready to track app deployments!
-- 
-- Usage:
-- 1. The app automatically logs version info on startup
-- 2. Version info is logged when users sign in
-- 3. Query latest versions: SELECT * FROM latest_app_versions;
-- 4. Get statistics: SELECT * FROM get_version_statistics();
-- ═══════════════════════════════════════════════════════════════════════════
