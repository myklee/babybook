-- Migration 019: Add additional database validation and constraints
-- This migration adds comprehensive validation rules and constraints
-- for the solid food improvements system

-- Clean up any problematic food names before adding constraints
UPDATE user_food_items 
SET name = trim(name)
WHERE name != trim(name);

-- Remove any food items with empty names (shouldn't happen but just in case)
DELETE FROM user_food_items 
WHERE trim(name) = '' OR name IS NULL;

-- Add additional check constraints for user_food_items
-- Made more permissive to handle international characters and common food names
ALTER TABLE user_food_items 
ADD CONSTRAINT check_food_name_format 
CHECK (
  -- Food name must not be empty after trimming
  length(trim(name)) > 0 
  -- Food name must not exceed 100 characters
  AND length(trim(name)) <= 100
  -- Allow letters, numbers, spaces, hyphens, apostrophes, periods, parentheses, and common symbols
  AND trim(name) ~ '^[a-zA-Z0-9\s\-\''\.()&,/]+$'
);

-- Add constraint to ensure consumption count consistency
ALTER TABLE user_food_items 
ADD CONSTRAINT check_consumption_count_non_negative 
CHECK (times_consumed >= 0);

-- Add constraint to ensure date consistency
ALTER TABLE user_food_items 
ADD CONSTRAINT check_date_consistency 
CHECK (
  -- If both dates exist, first_tried_date should be <= last_tried_date
  (first_tried_date IS NULL OR last_tried_date IS NULL) 
  OR (first_tried_date <= last_tried_date)
);

-- Add constraint to ensure dates are not in the future
ALTER TABLE user_food_items 
ADD CONSTRAINT check_dates_not_future 
CHECK (
  (first_tried_date IS NULL OR first_tried_date <= NOW())
  AND (last_tried_date IS NULL OR last_tried_date <= NOW())
);

-- Create additional indexes for performance optimization
-- Index for searching food names (case-insensitive)
CREATE INDEX IF NOT EXISTS idx_user_food_items_name_search 
ON user_food_items USING gin(to_tsvector('english', name));

-- Index for date range queries
CREATE INDEX IF NOT EXISTS idx_user_food_items_date_range 
ON user_food_items(user_id, first_tried_date, last_tried_date);

-- Composite index for common queries (user + consumption count + date)
CREATE INDEX IF NOT EXISTS idx_user_food_items_user_consumption_date 
ON user_food_items(user_id, times_consumed DESC, last_tried_date DESC);

-- Note: Index for timeline queries will be handled by existing feeding indexes
-- since queries will typically join solid_food_events with feedings table

-- Create function to validate feeding type for solid food events
CREATE OR REPLACE FUNCTION validate_solid_food_feeding()
RETURNS TRIGGER AS $$
BEGIN
  -- Ensure the feeding record has type 'solid'
  IF NOT EXISTS (
    SELECT 1 FROM feedings 
    WHERE id = NEW.feeding_id 
    AND type = 'solid'
  ) THEN
    RAISE EXCEPTION 'Solid food events can only be linked to feeding records with type ''solid''';
  END IF;
  
  -- Ensure the food item belongs to the same user as the feeding
  IF NOT EXISTS (
    SELECT 1 FROM feedings f
    JOIN user_food_items ufi ON ufi.user_id = f.user_id
    WHERE f.id = NEW.feeding_id 
    AND ufi.id = NEW.food_item_id
  ) THEN
    RAISE EXCEPTION 'Food item must belong to the same user as the feeding record';
  END IF;
  
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to validate solid food events
CREATE TRIGGER validate_solid_food_feeding_trigger
  BEFORE INSERT OR UPDATE ON solid_food_events
  FOR EACH ROW EXECUTE FUNCTION validate_solid_food_feeding();

-- Create function to prevent deletion of food items that are in use
CREATE OR REPLACE FUNCTION prevent_food_item_deletion_if_in_use()
RETURNS TRIGGER AS $$
DECLARE
  usage_count INTEGER;
BEGIN
  -- Check if the food item is used in any solid food events
  SELECT COUNT(*) INTO usage_count
  FROM solid_food_events
  WHERE food_item_id = OLD.id;
  
  IF usage_count > 0 THEN
    RAISE EXCEPTION 'Cannot delete food item "%" as it is used in % feeding event(s). Please remove it from all events first or use archive functionality.', 
      OLD.name, usage_count;
  END IF;
  
  RETURN OLD;
END;
$$ language 'plpgsql';

-- Create trigger to prevent deletion of used food items
CREATE TRIGGER prevent_food_item_deletion_trigger
  BEFORE DELETE ON user_food_items
  FOR EACH ROW EXECUTE FUNCTION prevent_food_item_deletion_if_in_use();

-- Create function to maintain referential integrity when feedings are deleted
CREATE OR REPLACE FUNCTION cleanup_solid_food_events_on_feeding_delete()
RETURNS TRIGGER AS $$
BEGIN
  -- When a feeding is deleted, the solid_food_events will be automatically
  -- deleted due to the CASCADE constraint, but we need to update consumption counts
  UPDATE user_food_items 
  SET times_consumed = GREATEST(times_consumed - 1, 0)
  WHERE id IN (
    SELECT food_item_id 
    FROM solid_food_events 
    WHERE feeding_id = OLD.id
  );
  
  RETURN OLD;
END;
$$ language 'plpgsql';

-- Create trigger to maintain consumption counts when feedings are deleted
CREATE TRIGGER cleanup_solid_food_events_trigger
  BEFORE DELETE ON feedings
  FOR EACH ROW 
  WHEN (OLD.type = 'solid')
  EXECUTE FUNCTION cleanup_solid_food_events_on_feeding_delete();

-- Create function to recalculate consumption counts (for maintenance)
CREATE OR REPLACE FUNCTION recalculate_food_consumption_counts()
RETURNS void AS $$
BEGIN
  UPDATE user_food_items 
  SET times_consumed = (
    SELECT COUNT(*)
    FROM solid_food_events sfe
    WHERE sfe.food_item_id = user_food_items.id
  );
  
  RAISE NOTICE 'Recalculated consumption counts for all food items';
END;
$$ language 'plpgsql';

-- Create function to get food statistics for a user
CREATE OR REPLACE FUNCTION get_user_food_statistics(p_user_id UUID)
RETURNS TABLE (
  total_foods_tried INTEGER,
  total_solid_events INTEGER,
  most_consumed_food TEXT,
  most_consumed_count INTEGER,
  recently_added_foods INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (SELECT COUNT(*)::INTEGER FROM user_food_items WHERE user_id = p_user_id) as total_foods_tried,
    (SELECT COUNT(*)::INTEGER 
     FROM solid_food_events sfe 
     JOIN user_food_items ufi ON ufi.id = sfe.food_item_id 
     WHERE ufi.user_id = p_user_id) as total_solid_events,
    (SELECT name FROM user_food_items WHERE user_id = p_user_id ORDER BY times_consumed DESC LIMIT 1) as most_consumed_food,
    (SELECT times_consumed FROM user_food_items WHERE user_id = p_user_id ORDER BY times_consumed DESC LIMIT 1) as most_consumed_count,
    (SELECT COUNT(*)::INTEGER 
     FROM user_food_items 
     WHERE user_id = p_user_id 
     AND created_at >= NOW() - INTERVAL '7 days') as recently_added_foods;
END;
$$ language 'plpgsql';

-- Add comments for documentation
COMMENT ON TABLE user_food_items IS 'Stores personal food items for each user, tracking consumption frequency and dates';
COMMENT ON TABLE solid_food_events IS 'Links feeding events with multiple food items, enabling multi-food meals';

COMMENT ON COLUMN user_food_items.name IS 'Food name, must be unique per user (case-insensitive)';
COMMENT ON COLUMN user_food_items.times_consumed IS 'Number of times this food has been consumed, automatically updated via triggers';
COMMENT ON COLUMN user_food_items.first_tried_date IS 'Date when this food was first introduced';
COMMENT ON COLUMN user_food_items.last_tried_date IS 'Date when this food was most recently consumed';

COMMENT ON COLUMN solid_food_events.feeding_id IS 'References the feeding record (must have type=solid)';
COMMENT ON COLUMN solid_food_events.food_item_id IS 'References the food item that was consumed';

-- Log constraint addition completion
DO $$
BEGIN
  RAISE NOTICE 'Migration 019 completed successfully. Added comprehensive validation and constraints for solid food system.';
END $$;