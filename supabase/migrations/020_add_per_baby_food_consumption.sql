-- Migration 020: Add per-baby food consumption tracking
-- This migration creates a new table to track food consumption per baby
-- while maintaining the existing user_food_items structure

-- Create baby_food_consumption table to track consumption per baby
CREATE TABLE IF NOT EXISTS baby_food_consumption (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  baby_id UUID NOT NULL REFERENCES babies(id) ON DELETE CASCADE,
  food_item_id UUID NOT NULL REFERENCES user_food_items(id) ON DELETE CASCADE,
  times_consumed INTEGER DEFAULT 0 CHECK (times_consumed >= 0),
  first_tried_date TIMESTAMP WITH TIME ZONE,
  last_tried_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure unique food per baby
  CONSTRAINT unique_baby_food UNIQUE (baby_id, food_item_id)
);

-- Create indexes for optimal query performance
CREATE INDEX IF NOT EXISTS idx_baby_food_consumption_baby_id ON baby_food_consumption(baby_id);
CREATE INDEX IF NOT EXISTS idx_baby_food_consumption_food_item_id ON baby_food_consumption(food_item_id);
CREATE INDEX IF NOT EXISTS idx_baby_food_consumption_times_consumed ON baby_food_consumption(baby_id, times_consumed DESC);
CREATE INDEX IF NOT EXISTS idx_baby_food_consumption_last_tried ON baby_food_consumption(baby_id, last_tried_date DESC);

-- Enable Row Level Security
ALTER TABLE baby_food_consumption ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for baby_food_consumption
-- Users can access baby_food_consumption if they own the baby
CREATE POLICY "Users can view their own baby food consumption" ON baby_food_consumption
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM babies 
      WHERE babies.id = baby_food_consumption.baby_id 
      AND babies.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own baby food consumption" ON baby_food_consumption
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM babies 
      WHERE babies.id = baby_food_consumption.baby_id 
      AND babies.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own baby food consumption" ON baby_food_consumption
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM babies 
      WHERE babies.id = baby_food_consumption.baby_id 
      AND babies.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own baby food consumption" ON baby_food_consumption
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM babies 
      WHERE babies.id = baby_food_consumption.baby_id 
      AND babies.user_id = auth.uid()
    )
  );

-- Create trigger to automatically update updated_at timestamp
CREATE TRIGGER update_baby_food_consumption_updated_at 
  BEFORE UPDATE ON baby_food_consumption 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function to update per-baby consumption counts
CREATE OR REPLACE FUNCTION update_baby_food_consumption_counts()
RETURNS TRIGGER AS $$
DECLARE
  feeding_baby_id UUID;
  feeding_timestamp TIMESTAMP WITH TIME ZONE;
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Get baby_id and timestamp from the feeding record
    SELECT baby_id, timestamp INTO feeding_baby_id, feeding_timestamp
    FROM feedings 
    WHERE id = NEW.feeding_id;
    
    -- Insert or update baby_food_consumption record
    INSERT INTO baby_food_consumption (
      baby_id, 
      food_item_id, 
      times_consumed, 
      first_tried_date, 
      last_tried_date
    )
    VALUES (
      feeding_baby_id,
      NEW.food_item_id,
      1,
      feeding_timestamp,
      feeding_timestamp
    )
    ON CONFLICT (baby_id, food_item_id) 
    DO UPDATE SET
      times_consumed = baby_food_consumption.times_consumed + 1,
      last_tried_date = feeding_timestamp,
      updated_at = NOW();
    
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    -- Get baby_id from the feeding record
    SELECT baby_id INTO feeding_baby_id
    FROM feedings 
    WHERE id = OLD.feeding_id;
    
    -- Decrement consumption count for this baby
    UPDATE baby_food_consumption 
    SET 
      times_consumed = GREATEST(times_consumed - 1, 0),
      updated_at = NOW()
    WHERE baby_id = feeding_baby_id 
    AND food_item_id = OLD.food_item_id;
    
    -- If consumption count reaches 0, optionally remove the record
    -- (or keep it for historical purposes - keeping it for now)
    
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$ language 'plpgsql';

-- Create trigger to maintain per-baby consumption counts
CREATE TRIGGER update_baby_consumption_counts_on_solid_food_events
  AFTER INSERT OR DELETE ON solid_food_events
  FOR EACH ROW EXECUTE FUNCTION update_baby_food_consumption_counts();

-- Migrate existing data to the new per-baby consumption tracking
-- This populates the baby_food_consumption table with existing data
INSERT INTO baby_food_consumption (
  baby_id,
  food_item_id,
  times_consumed,
  first_tried_date,
  last_tried_date,
  created_at,
  updated_at
)
SELECT 
  f.baby_id,
  sfe.food_item_id,
  COUNT(*) as times_consumed,
  MIN(f.timestamp) as first_tried_date,
  MAX(f.timestamp) as last_tried_date,
  MIN(sfe.created_at) as created_at,
  MAX(sfe.created_at) as updated_at
FROM solid_food_events sfe
JOIN feedings f ON f.id = sfe.feeding_id
GROUP BY f.baby_id, sfe.food_item_id
ON CONFLICT (baby_id, food_item_id) DO UPDATE SET
  times_consumed = EXCLUDED.times_consumed,
  first_tried_date = LEAST(baby_food_consumption.first_tried_date, EXCLUDED.first_tried_date),
  last_tried_date = GREATEST(baby_food_consumption.last_tried_date, EXCLUDED.last_tried_date),
  updated_at = GREATEST(baby_food_consumption.updated_at, EXCLUDED.updated_at);

-- Create function to get food consumption statistics per baby
CREATE OR REPLACE FUNCTION get_baby_food_statistics(p_baby_id UUID)
RETURNS TABLE (
  total_foods_tried INTEGER,
  total_solid_events INTEGER,
  most_consumed_food TEXT,
  most_consumed_count INTEGER,
  recently_tried_foods INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (SELECT COUNT(*)::INTEGER 
     FROM baby_food_consumption 
     WHERE baby_id = p_baby_id) as total_foods_tried,
    (SELECT COUNT(*)::INTEGER 
     FROM solid_food_events sfe 
     JOIN feedings f ON f.id = sfe.feeding_id 
     WHERE f.baby_id = p_baby_id) as total_solid_events,
    (SELECT ufi.name 
     FROM baby_food_consumption bfc
     JOIN user_food_items ufi ON ufi.id = bfc.food_item_id
     WHERE bfc.baby_id = p_baby_id 
     ORDER BY bfc.times_consumed DESC 
     LIMIT 1) as most_consumed_food,
    (SELECT times_consumed 
     FROM baby_food_consumption 
     WHERE baby_id = p_baby_id 
     ORDER BY times_consumed DESC 
     LIMIT 1) as most_consumed_count,
    (SELECT COUNT(*)::INTEGER 
     FROM baby_food_consumption 
     WHERE baby_id = p_baby_id 
     AND first_tried_date >= NOW() - INTERVAL '7 days') as recently_tried_foods;
END;
$$ language 'plpgsql';

-- Create function to get food consumption for a specific baby
CREATE OR REPLACE FUNCTION get_baby_food_consumption(p_baby_id UUID)
RETURNS TABLE (
  food_item_id UUID,
  food_name TEXT,
  times_consumed INTEGER,
  first_tried_date TIMESTAMP WITH TIME ZONE,
  last_tried_date TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    bfc.food_item_id,
    ufi.name as food_name,
    bfc.times_consumed,
    bfc.first_tried_date,
    bfc.last_tried_date
  FROM baby_food_consumption bfc
  JOIN user_food_items ufi ON ufi.id = bfc.food_item_id
  WHERE bfc.baby_id = p_baby_id
  ORDER BY bfc.times_consumed DESC, ufi.name ASC;
END;
$$ language 'plpgsql';

-- Add comments for documentation
COMMENT ON TABLE baby_food_consumption IS 'Tracks food consumption per baby, enabling per-baby statistics and analytics';
COMMENT ON COLUMN baby_food_consumption.baby_id IS 'References the baby who consumed the food';
COMMENT ON COLUMN baby_food_consumption.food_item_id IS 'References the food item that was consumed';
COMMENT ON COLUMN baby_food_consumption.times_consumed IS 'Number of times this baby has consumed this food';
COMMENT ON COLUMN baby_food_consumption.first_tried_date IS 'Date when this baby first tried this food';
COMMENT ON COLUMN baby_food_consumption.last_tried_date IS 'Date when this baby most recently consumed this food';

-- Log migration completion
DO $$
BEGIN
  RAISE NOTICE 'Migration 020 completed successfully. Added per-baby food consumption tracking.';
END $$;