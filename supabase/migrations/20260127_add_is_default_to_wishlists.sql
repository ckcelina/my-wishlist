
-- Add is_default column to wishlists table
ALTER TABLE wishlists ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT false NOT NULL;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_wishlists_is_default ON wishlists(user_id, is_default);

-- Ensure only one default wishlist per user (set first wishlist as default if none exists)
DO $$
DECLARE
  user_record RECORD;
  first_wishlist_id UUID;
BEGIN
  FOR user_record IN SELECT DISTINCT user_id FROM wishlists
  LOOP
    -- Check if user has any default wishlist
    IF NOT EXISTS (
      SELECT 1 FROM wishlists 
      WHERE user_id = user_record.user_id 
      AND is_default = true
    ) THEN
      -- Get the oldest wishlist for this user
      SELECT id INTO first_wishlist_id
      FROM wishlists
      WHERE user_id = user_record.user_id
      ORDER BY created_at ASC
      LIMIT 1;
      
      -- Set it as default
      IF first_wishlist_id IS NOT NULL THEN
        UPDATE wishlists
        SET is_default = true
        WHERE id = first_wishlist_id;
      END IF;
    END IF;
  END LOOP;
END $$;

-- Add constraint to ensure only one default per user
CREATE OR REPLACE FUNCTION check_single_default_wishlist()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_default = true THEN
    -- Unset all other defaults for this user
    UPDATE wishlists
    SET is_default = false
    WHERE user_id = NEW.user_id
    AND id != NEW.id
    AND is_default = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS ensure_single_default_wishlist ON wishlists;
CREATE TRIGGER ensure_single_default_wishlist
  BEFORE INSERT OR UPDATE ON wishlists
  FOR EACH ROW
  WHEN (NEW.is_default = true)
  EXECUTE FUNCTION check_single_default_wishlist();
