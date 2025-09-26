-- Add database functions for food consumption management

-- Function to safely decrement food consumption count
CREATE OR REPLACE FUNCTION decrement_food_consumption(food_item_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE user_food_items 
  SET 
    times_consumed = GREATEST(times_consumed - 1, 0),
    updated_at = NOW()
  WHERE id = food_item_id;
END;
$$;

-- Function to safely increment food consumption count
CREATE OR REPLACE FUNCTION increment_food_consumption(
  food_item_id UUID,
  event_timestamp TIMESTAMPTZ DEFAULT NOW()
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_first_tried_date TIMESTAMPTZ;
BEGIN
  -- Get current first_tried_date
  SELECT first_tried_date INTO current_first_tried_date
  FROM user_food_items
  WHERE id = food_item_id;
  
  -- Update consumption count and dates
  UPDATE user_food_items 
  SET 
    times_consumed = times_consumed + 1,
    last_tried_date = event_timestamp,
    first_tried_date = COALESCE(current_first_tried_date, event_timestamp),
    updated_at = NOW()
  WHERE id = food_item_id;
END;
$$;

-- Function to recalculate food consumption counts from solid_food_events
CREATE OR REPLACE FUNCTION recalculate_food_consumption(food_item_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  actual_count INTEGER;
  first_event_date TIMESTAMPTZ;
  last_event_date TIMESTAMPTZ;
BEGIN
  -- Count actual events for this food item
  SELECT 
    COUNT(*),
    MIN(f.timestamp),
    MAX(f.timestamp)
  INTO actual_count, first_event_date, last_event_date
  FROM solid_food_events sfe
  JOIN feedings f ON f.id = sfe.feeding_id
  WHERE sfe.food_item_id = recalculate_food_consumption.food_item_id;
  
  -- Update the food item with correct counts and dates
  UPDATE user_food_items
  SET 
    times_consumed = COALESCE(actual_count, 0),
    first_tried_date = first_event_date,
    last_tried_date = last_event_date,
    updated_at = NOW()
  WHERE id = recalculate_food_consumption.food_item_id;
END;
$$;

-- Function to get food consumption statistics
CREATE OR REPLACE FUNCTION get_food_consumption_stats(user_id_param UUID)
RETURNS TABLE(
  total_foods_introduced INTEGER,
  total_solid_food_events INTEGER,
  average_foods_per_event NUMERIC,
  most_consumed_food_name TEXT,
  most_consumed_count INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH food_stats AS (
    SELECT 
      COUNT(DISTINCT ufi.id) as total_foods,
      COUNT(DISTINCT sfe.feeding_id) as total_events,
      CASE 
        WHEN COUNT(DISTINCT sfe.feeding_id) > 0 
        THEN ROUND(COUNT(sfe.id)::NUMERIC / COUNT(DISTINCT sfe.feeding_id), 2)
        ELSE 0
      END as avg_foods_per_event
    FROM user_food_items ufi
    LEFT JOIN solid_food_events sfe ON sfe.food_item_id = ufi.id
    WHERE ufi.user_id = user_id_param
  ),
  most_consumed AS (
    SELECT ufi.name, ufi.times_consumed
    FROM user_food_items ufi
    WHERE ufi.user_id = user_id_param
    ORDER BY ufi.times_consumed DESC, ufi.name ASC
    LIMIT 1
  )
  SELECT 
    fs.total_foods::INTEGER,
    fs.total_events::INTEGER,
    fs.avg_foods_per_event,
    COALESCE(mc.name, '')::TEXT,
    COALESCE(mc.times_consumed, 0)::INTEGER
  FROM food_stats fs
  LEFT JOIN most_consumed mc ON true;
END;
$$;