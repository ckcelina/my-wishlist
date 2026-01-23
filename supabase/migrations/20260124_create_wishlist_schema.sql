
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create wishlists table
CREATE TABLE IF NOT EXISTS wishlists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create wishlist_items table
CREATE TABLE IF NOT EXISTS wishlist_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wishlist_id UUID NOT NULL REFERENCES wishlists(id) ON DELETE CASCADE,
  original_url TEXT,
  source_domain TEXT,
  title TEXT NOT NULL,
  image_url TEXT,
  current_price NUMERIC,
  currency TEXT DEFAULT 'USD',
  notes TEXT,
  last_checked_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create price_history table
CREATE TABLE IF NOT EXISTS price_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_id UUID NOT NULL REFERENCES wishlist_items(id) ON DELETE CASCADE,
  price NUMERIC NOT NULL,
  currency TEXT NOT NULL,
  recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create shared_wishlists table
CREATE TABLE IF NOT EXISTS shared_wishlists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wishlist_id UUID NOT NULL REFERENCES wishlists(id) ON DELETE CASCADE,
  share_slug TEXT UNIQUE NOT NULL,
  visibility TEXT CHECK (visibility IN ('public', 'unlisted')) DEFAULT 'unlisted',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_wishlists_user_id ON wishlists(user_id);
CREATE INDEX IF NOT EXISTS idx_wishlist_items_wishlist_id ON wishlist_items(wishlist_id);
CREATE INDEX IF NOT EXISTS idx_price_history_item_id ON price_history(item_id);
CREATE INDEX IF NOT EXISTS idx_shared_wishlists_share_slug ON shared_wishlists(share_slug);

-- Enable Row Level Security on all tables
ALTER TABLE wishlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE wishlist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE shared_wishlists ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own wishlists" ON wishlists;
DROP POLICY IF EXISTS "Users can create their own wishlists" ON wishlists;
DROP POLICY IF EXISTS "Users can update their own wishlists" ON wishlists;
DROP POLICY IF EXISTS "Users can delete their own wishlists" ON wishlists;

DROP POLICY IF EXISTS "Users can view items in their wishlists" ON wishlist_items;
DROP POLICY IF EXISTS "Users can create items in their wishlists" ON wishlist_items;
DROP POLICY IF EXISTS "Users can update items in their wishlists" ON wishlist_items;
DROP POLICY IF EXISTS "Users can delete items in their wishlists" ON wishlist_items;

DROP POLICY IF EXISTS "Users can view price history for their items" ON price_history;
DROP POLICY IF EXISTS "Users can create price history for their items" ON price_history;

DROP POLICY IF EXISTS "Owners can view their shared wishlists" ON shared_wishlists;
DROP POLICY IF EXISTS "Owners can create shared wishlists" ON shared_wishlists;
DROP POLICY IF EXISTS "Owners can update their shared wishlists" ON shared_wishlists;
DROP POLICY IF EXISTS "Owners can delete their shared wishlists" ON shared_wishlists;
DROP POLICY IF EXISTS "Anyone can view public/unlisted shared wishlists" ON shared_wishlists;

-- RLS Policies for wishlists table
-- Users can CRUD their own wishlists
CREATE POLICY "Users can view their own wishlists"
  ON wishlists FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own wishlists"
  ON wishlists FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own wishlists"
  ON wishlists FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own wishlists"
  ON wishlists FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for wishlist_items table
-- Users can CRUD items if the parent wishlist belongs to them
CREATE POLICY "Users can view items in their wishlists"
  ON wishlist_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM wishlists
      WHERE wishlists.id = wishlist_items.wishlist_id
      AND wishlists.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create items in their wishlists"
  ON wishlist_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM wishlists
      WHERE wishlists.id = wishlist_items.wishlist_id
      AND wishlists.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update items in their wishlists"
  ON wishlist_items FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM wishlists
      WHERE wishlists.id = wishlist_items.wishlist_id
      AND wishlists.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete items in their wishlists"
  ON wishlist_items FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM wishlists
      WHERE wishlists.id = wishlist_items.wishlist_id
      AND wishlists.user_id = auth.uid()
    )
  );

-- RLS Policies for price_history table
-- Users can read/write only if the parent item belongs to them
CREATE POLICY "Users can view price history for their items"
  ON price_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM wishlist_items
      JOIN wishlists ON wishlists.id = wishlist_items.wishlist_id
      WHERE wishlist_items.id = price_history.item_id
      AND wishlists.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create price history for their items"
  ON price_history FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM wishlist_items
      JOIN wishlists ON wishlists.id = wishlist_items.wishlist_id
      WHERE wishlist_items.id = price_history.item_id
      AND wishlists.user_id = auth.uid()
    )
  );

-- RLS Policies for shared_wishlists table
-- Owners can CRUD; anyone can read if they have share_slug
CREATE POLICY "Owners can view their shared wishlists"
  ON shared_wishlists FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM wishlists
      WHERE wishlists.id = shared_wishlists.wishlist_id
      AND wishlists.user_id = auth.uid()
    )
  );

CREATE POLICY "Owners can create shared wishlists"
  ON shared_wishlists FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM wishlists
      WHERE wishlists.id = shared_wishlists.wishlist_id
      AND wishlists.user_id = auth.uid()
    )
  );

CREATE POLICY "Owners can update their shared wishlists"
  ON shared_wishlists FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM wishlists
      WHERE wishlists.id = shared_wishlists.wishlist_id
      AND wishlists.user_id = auth.uid()
    )
  );

CREATE POLICY "Owners can delete their shared wishlists"
  ON shared_wishlists FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM wishlists
      WHERE wishlists.id = shared_wishlists.wishlist_id
      AND wishlists.user_id = auth.uid()
    )
  );

CREATE POLICY "Anyone can view public/unlisted shared wishlists"
  ON shared_wishlists FOR SELECT
  USING (visibility IN ('public', 'unlisted'));

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at columns
DROP TRIGGER IF EXISTS update_wishlists_updated_at ON wishlists;
CREATE TRIGGER update_wishlists_updated_at
  BEFORE UPDATE ON wishlists
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_wishlist_items_updated_at ON wishlist_items;
CREATE TRIGGER update_wishlist_items_updated_at
  BEFORE UPDATE ON wishlist_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
