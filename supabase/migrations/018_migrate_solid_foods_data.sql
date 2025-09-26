-- Migration 018: Migrate existing solid_foods data to new structure
-- This migration converts existing solid_foods records to the new user_food_items
-- and solid_food_events structure while preserving all data

-- First, update the constraint to allow solid foods to have NULL amounts
ALTER TABLE feedings 
DROP CONSTRAINT IF EXISTS non_nursing_events_have_amount;

ALTER TABLE feedings 
ADD CONSTRAINT non_nursing_events_have_amount 
CHECK (
  (type NOT IN ('nursing', 'solid') AND amount IS NOT NULL) OR 
  (type IN ('nursing', 'solid'))
);

-- First, create user_food_items from unique food names per user
-- This extracts unique food names and aggregates their consumption data
INSERT INTO user_food_items (
  user_id,
  name,
  times_consumed,
  first_tried_date,
  last_tried_date,
  created_at,
  updated_at
)
SELECT 
  sf.user_id,
  sf.food_name,
  SUM(sf.times_tried) as times_consumed,
  MIN(sf.first_tried_date) as first_tried_date,
  MAX(sf.last_tried_date) as last_tried_date,
  MIN(sf.created_at) as created_at,
  MAX(sf.updated_at) as updated_at
FROM solid_foods sf
GROUP BY sf.user_id, sf.food_name
ON CONFLICT (user_id, lower(trim(name))) DO UPDATE SET
  times_consumed = EXCLUDED.times_consumed,
  first_tried_date = LEAST(user_food_items.first_tried_date, EXCLUDED.first_tried_date),
  last_tried_date = GREATEST(user_food_items.last_tried_date, EXCLUDED.last_tried_date),
  updated_at = GREATEST(user_food_items.updated_at, EXCLUDED.updated_at);

-- Create feeding records for each existing solid food entry
-- Each solid_foods record becomes a feeding event with type "solid"
INSERT INTO feedings (
  baby_id,
  timestamp,
  amount,
  type,
  notes,
  user_id,
  created_at
)
SELECT 
  sf.baby_id,
  sf.last_tried_date as timestamp,
  NULL as amount, -- Solid foods don't have amounts in ml
  'solid' as type,
  CASE 
    WHEN sf.notes IS NOT NULL AND sf.reaction IS NOT NULL THEN 
      sf.notes || ' (Reaction: ' || sf.reaction || ')'
    WHEN sf.notes IS NOT NULL THEN sf.notes
    WHEN sf.reaction IS NOT NULL THEN 'Reaction: ' || sf.reaction
    ELSE NULL
  END as notes,
  sf.user_id,
  sf.created_at
FROM solid_foods sf
-- Only create feeding records if they don't already exist
-- (in case this migration is run multiple times)
WHERE NOT EXISTS (
  SELECT 1 FROM feedings f 
  WHERE f.baby_id = sf.baby_id 
  AND f.timestamp = sf.last_tried_date 
  AND f.type = 'solid'
  AND f.user_id = sf.user_id
);

-- Create solid_food_events linking the new feeding records with user_food_items
-- This maintains the relationship between feeding events and specific foods
INSERT INTO solid_food_events (
  feeding_id,
  food_item_id,
  created_at
)
SELECT DISTINCT
  f.id as feeding_id,
  ufi.id as food_item_id,
  f.created_at
FROM solid_foods sf
JOIN feedings f ON (
  f.baby_id = sf.baby_id 
  AND f.timestamp = sf.last_tried_date 
  AND f.type = 'solid'
  AND f.user_id = sf.user_id
)
JOIN user_food_items ufi ON (
  ufi.user_id = sf.user_id 
  AND ufi.name = sf.food_name
)
-- Avoid duplicate entries
ON CONFLICT (feeding_id, food_item_id) DO NOTHING;

-- Handle cases where multiple solid_foods entries have the same timestamp
-- This creates additional feeding records for foods that were tried at the same time
-- but had separate entries in the old system
WITH duplicate_timestamps AS (
  SELECT 
    sf.user_id,
    sf.baby_id,
    sf.last_tried_date,
    COUNT(*) as count,
    ARRAY_AGG(sf.food_name ORDER BY sf.created_at) as food_names,
    ARRAY_AGG(sf.id ORDER BY sf.created_at) as solid_food_ids
  FROM solid_foods sf
  GROUP BY sf.user_id, sf.baby_id, sf.last_tried_date
  HAVING COUNT(*) > 1
),
additional_feedings AS (
  INSERT INTO feedings (
    baby_id,
    timestamp,
    amount,
    type,
    notes,
    user_id,
    created_at
  )
  SELECT 
    dt.baby_id,
    dt.last_tried_date + (row_number() OVER (PARTITION BY dt.user_id, dt.baby_id, dt.last_tried_date) - 1) * INTERVAL '1 second' as timestamp,
    NULL as amount,
    'solid' as type,
    'Multiple foods: ' || array_to_string(dt.food_names, ', ') as notes,
    dt.user_id,
    NOW()
  FROM duplicate_timestamps dt
  WHERE dt.count > 1
  RETURNING id, baby_id, timestamp, user_id
)
-- Link the additional feeding records with their corresponding food items
INSERT INTO solid_food_events (feeding_id, food_item_id, created_at)
SELECT 
  af.id as feeding_id,
  ufi.id as food_item_id,
  NOW()
FROM additional_feedings af
JOIN duplicate_timestamps dt ON (
  dt.baby_id = af.baby_id 
  AND dt.user_id = af.user_id
  AND ABS(EXTRACT(EPOCH FROM (dt.last_tried_date - af.timestamp))) < 60 -- Within 1 minute
)
JOIN user_food_items ufi ON (
  ufi.user_id = af.user_id 
  AND ufi.name = ANY(dt.food_names)
)
ON CONFLICT (feeding_id, food_item_id) DO NOTHING;

-- Update consumption counts to ensure accuracy after migration
-- This recalculates consumption counts based on the new solid_food_events
UPDATE user_food_items 
SET times_consumed = (
  SELECT COUNT(*)
  FROM solid_food_events sfe
  WHERE sfe.food_item_id = user_food_items.id
);

-- Create a backup table for the original solid_foods data
-- This allows for rollback if needed
CREATE TABLE IF NOT EXISTS solid_foods_backup AS 
SELECT * FROM solid_foods;

-- Add a comment to track the migration
COMMENT ON TABLE solid_foods_backup IS 'Backup of original solid_foods table before migration to new structure. Created during migration 018.';

-- Log migration completion
DO $$
BEGIN
  RAISE NOTICE 'Migration 018 completed successfully. Migrated % solid food records to new structure.', 
    (SELECT COUNT(*) FROM solid_foods);
END $$;