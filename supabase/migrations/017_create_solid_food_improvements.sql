-- Migration 017: Create new solid food improvements tables
-- This migration creates the new user_food_items and solid_food_events tables
-- for the improved solid food system

-- Create user_food_items table for personal food lists
CREATE TABLE IF NOT EXISTS user_food_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (length(trim(name)) > 0 AND length(trim(name)) <= 100),
  times_consumed INTEGER DEFAULT 0 CHECK (times_consumed >= 0),
  first_tried_date TIMESTAMP WITH TIME ZONE,
  last_tried_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create solid_food_events table to link feeding events with multiple foods
CREATE TABLE IF NOT EXISTS solid_food_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  feeding_id UUID NOT NULL REFERENCES feedings(id) ON DELETE CASCADE,
  food_item_id UUID NOT NULL REFERENCES user_food_items(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure unique food per feeding event
  CONSTRAINT unique_feeding_food UNIQUE (feeding_id, food_item_id)
);

-- Create indexes for optimal query performance
CREATE INDEX IF NOT EXISTS idx_user_food_items_user_id ON user_food_items(user_id);
CREATE INDEX IF NOT EXISTS idx_user_food_items_times_consumed ON user_food_items(user_id, times_consumed DESC);
CREATE INDEX IF NOT EXISTS idx_user_food_items_last_tried ON user_food_items(user_id, last_tried_date DESC);

-- Create unique index to ensure unique food names per user (case-insensitive)
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_food_items_unique_name 
ON user_food_items(user_id, lower(trim(name)));

CREATE INDEX IF NOT EXISTS idx_solid_food_events_feeding_id ON solid_food_events(feeding_id);
CREATE INDEX IF NOT EXISTS idx_solid_food_events_food_item_id ON solid_food_events(food_item_id);

-- Enable Row Level Security
ALTER TABLE user_food_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE solid_food_events ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for user_food_items
CREATE POLICY "Users can view their own food items" ON user_food_items
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own food items" ON user_food_items
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own food items" ON user_food_items
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own food items" ON user_food_items
  FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for solid_food_events
-- Users can access solid_food_events if they own the associated feeding
CREATE POLICY "Users can view their own solid food events" ON solid_food_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM feedings 
      WHERE feedings.id = solid_food_events.feeding_id 
      AND feedings.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own solid food events" ON solid_food_events
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM feedings 
      WHERE feedings.id = solid_food_events.feeding_id 
      AND feedings.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own solid food events" ON solid_food_events
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM feedings 
      WHERE feedings.id = solid_food_events.feeding_id 
      AND feedings.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own solid food events" ON solid_food_events
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM feedings 
      WHERE feedings.id = solid_food_events.feeding_id 
      AND feedings.user_id = auth.uid()
    )
  );

-- Create trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_food_items_updated_at 
  BEFORE UPDATE ON user_food_items 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create trigger to automatically update consumption counts
CREATE OR REPLACE FUNCTION update_food_consumption_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Increment consumption count and update dates
    UPDATE user_food_items 
    SET 
      times_consumed = times_consumed + 1,
      last_tried_date = COALESCE(
        (SELECT timestamp FROM feedings WHERE id = NEW.feeding_id),
        NOW()
      ),
      first_tried_date = CASE 
        WHEN first_tried_date IS NULL THEN COALESCE(
          (SELECT timestamp FROM feedings WHERE id = NEW.feeding_id),
          NOW()
        )
        ELSE first_tried_date
      END
    WHERE id = NEW.food_item_id;
    
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    -- Decrement consumption count
    UPDATE user_food_items 
    SET times_consumed = GREATEST(times_consumed - 1, 0)
    WHERE id = OLD.food_item_id;
    
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_consumption_counts_on_solid_food_events
  AFTER INSERT OR DELETE ON solid_food_events
  FOR EACH ROW EXECUTE FUNCTION update_food_consumption_counts();