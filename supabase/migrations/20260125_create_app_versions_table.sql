
-- ═══════════════════════════════════════════════════════════════════════════
-- APP VERSION TRACKING TABLE
-- ═══════════════════════════════════════════════════════════════════════════
-- This table tracks app version information every time the app is deployed
-- through EAS or when a user signs in. This helps monitor which versions are
-- in use and track deployment history.
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
  update_id TEXT,
  channel TEXT,
  runtime_version TEXT,
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
CREATE INDEX IF NOT EXISTS idx_app_versions_update_id ON app_versions(update_id);
CREATE INDEX IF NOT EXISTS idx_app_versions_channel ON app_versions(channel);

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
  update_id,
  channel,
  runtime_version,
  environment,
  logged_at
FROM app_versions
ORDER BY platform, logged_at DESC;

-- Create a view for the latest deployment per channel
CREATE OR REPLACE VIEW latest_deployments_by_channel AS
SELECT DISTINCT ON (channel, platform)
  id,
  app_version,
  build_version,
  platform,
  channel,
  update_id,
  runtime_version,
  environment,
  logged_at,
  COUNT(*) OVER (PARTITION BY channel, platform, app_version) as install_count
FROM app_versions
WHERE channel IS NOT NULL
ORDER BY channel, platform, logged_at DESC;

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

-- Create a function to get deployment history
CREATE OR REPLACE FUNCTION get_deployment_history(days_back INTEGER DEFAULT 30)
RETURNS TABLE (
  deployment_date DATE,
  platform TEXT,
  channel TEXT,
  app_version TEXT,
  build_version TEXT,
  update_id TEXT,
  deployment_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    DATE(av.logged_at) as deployment_date,
    av.platform,
    av.channel,
    av.app_version,
    av.build_version,
    av.update_id,
    COUNT(*) as deployment_count
  FROM app_versions av
  WHERE av.logged_at > NOW() - (days_back || ' days')::INTERVAL
    AND av.environment = 'production'
  GROUP BY DATE(av.logged_at), av.platform, av.channel, av.app_version, av.build_version, av.update_id
  ORDER BY deployment_date DESC, av.platform, av.channel;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on the functions
GRANT EXECUTE ON FUNCTION get_version_statistics() TO authenticated;
GRANT EXECUTE ON FUNCTION get_version_statistics() TO anon;
GRANT EXECUTE ON FUNCTION get_deployment_history(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_deployment_history(INTEGER) TO anon;

-- Add comments for documentation
COMMENT ON TABLE app_versions IS 'Tracks app version information for EAS deployment monitoring and user analytics';
COMMENT ON COLUMN app_versions.user_id IS 'User who launched the app (null for anonymous tracking)';
COMMENT ON COLUMN app_versions.app_version IS 'Human-readable version from app.json (e.g., 1.0.0)';
COMMENT ON COLUMN app_versions.build_version IS 'Native build number (iOS: CFBundleVersion, Android: versionCode)';
COMMENT ON COLUMN app_versions.platform IS 'Platform: ios, android, or web';
COMMENT ON COLUMN app_versions.platform_version IS 'OS version (e.g., iOS 17.0, Android 14)';
COMMENT ON COLUMN app_versions.bundle_id IS 'App bundle identifier (e.g., com.example.app)';
COMMENT ON COLUMN app_versions.app_name IS 'Human-readable app name';
COMMENT ON COLUMN app_versions.expo_version IS 'Expo SDK version';
COMMENT ON COLUMN app_versions.update_id IS 'EAS Update ID for OTA updates';
COMMENT ON COLUMN app_versions.channel IS 'EAS Update channel (e.g., production, preview)';
COMMENT ON COLUMN app_versions.runtime_version IS 'EAS runtime version for compatibility';
COMMENT ON COLUMN app_versions.environment IS 'development or production';
COMMENT ON COLUMN app_versions.logged_at IS 'When this version was logged';

-- ═══════════════════════════════════════════════════════════════════════════
-- DEPLOYMENT COMPLETE
-- ═══════════════════════════════════════════════════════════════════════════
-- The app_versions table is now ready to track EAS deployments!
-- 
-- Usage:
-- 1. The app automatically logs version info on startup
-- 2. Version info is logged when users sign in
-- 3. EAS Update information is tracked for OTA updates
-- 4. Query latest versions: SELECT * FROM latest_app_versions;
-- 5. Query deployments by channel: SELECT * FROM latest_deployments_by_channel;
-- 6. Get statistics: SELECT * FROM get_version_statistics();
-- 7. Get deployment history: SELECT * FROM get_deployment_history(30);
-- ═══════════════════════════════════════════════════════════════════════════
