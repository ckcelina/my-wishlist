
-- Create app_versions table for version tracking
CREATE TABLE IF NOT EXISTS public.app_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  platform text NOT NULL,          -- "ios" | "android" | "web"
  app_version text NOT NULL,       -- e.g. "1.0.3"
  build_version text NULL,         -- e.g. "42"
  platform_version text NULL,      -- OS version
  bundle_id text NULL,
  app_name text NULL,
  expo_version text NULL,
  update_id text NULL,             -- EAS Update ID
  channel text NULL,               -- EAS Update channel
  runtime_version text NULL,       -- Expo runtime version
  environment text NOT NULL DEFAULT 'production', -- "development" | "production"
  device_id text NULL,
  logged_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.app_versions ENABLE ROW LEVEL SECURITY;

-- Policy: Allow INSERT for authenticated users for their own user_id
CREATE POLICY "Users can insert their own version logs"
  ON public.app_versions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Policy: Allow INSERT for anonymous users only if user_id is null
CREATE POLICY "Anonymous users can insert version logs"
  ON public.app_versions
  FOR INSERT
  TO anon
  WITH CHECK (user_id IS NULL);

-- Policy: Allow SELECT only for authenticated users where user_id matches
CREATE POLICY "Users can view their own version logs"
  ON public.app_versions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_app_versions_user_id ON public.app_versions(user_id);
CREATE INDEX IF NOT EXISTS idx_app_versions_logged_at ON public.app_versions(logged_at DESC);
CREATE INDEX IF NOT EXISTS idx_app_versions_platform ON public.app_versions(platform);

-- Grant permissions
GRANT SELECT, INSERT ON public.app_versions TO authenticated;
GRANT INSERT ON public.app_versions TO anon;
