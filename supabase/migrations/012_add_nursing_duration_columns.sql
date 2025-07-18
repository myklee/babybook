-- Add duration columns for dual-timer nursing sessions
-- This migration adds left_duration, right_duration, and total_duration columns

-- Add duration columns to feedings table
ALTER TABLE feedings 
ADD COLUMN IF NOT EXISTS left_duration INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS right_duration INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_duration INTEGER DEFAULT 0;

-- Add constraint to ensure nursing sessions have duration data
-- First drop the constraint if it exists, then add it
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'nursing_sessions_have_duration' 
    AND table_name = 'feedings'
  ) THEN
    ALTER TABLE feedings DROP CONSTRAINT nursing_sessions_have_duration;
  END IF;
END $$;

ALTER TABLE feedings 
ADD CONSTRAINT nursing_sessions_have_duration 
CHECK (
  (type = 'nursing' AND (left_duration > 0 OR right_duration > 0)) OR 
  (type != 'nursing')
);

-- Add function to compute breast_used from durations
CREATE OR REPLACE FUNCTION compute_breast_used(left_dur INTEGER, right_dur INTEGER)
RETURNS TEXT AS $$
BEGIN
  IF left_dur > 0 AND right_dur > 0 THEN
    RETURN 'both';
  ELSIF left_dur > 0 THEN
    RETURN 'left';
  ELSIF right_dur > 0 THEN
    RETURN 'right';
  ELSE
    RETURN NULL;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Add function to compute total duration
CREATE OR REPLACE FUNCTION compute_total_duration(left_dur INTEGER, right_dur INTEGER)
RETURNS INTEGER AS $$
BEGIN
  RETURN COALESCE(left_dur, 0) + COALESCE(right_dur, 0);
END;
$$ LANGUAGE plpgsql;

-- Add trigger to automatically compute breast_used and total_duration
CREATE OR REPLACE FUNCTION update_nursing_computed_fields()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.type = 'nursing' THEN
    -- Compute breast_used from durations
    NEW.breast_used := compute_breast_used(NEW.left_duration, NEW.right_duration);
    
    -- Compute total_duration
    NEW.total_duration := compute_total_duration(NEW.left_duration, NEW.right_duration);
    
    -- Compute start_time from end_time and total_duration if not provided
    IF NEW.start_time IS NULL AND NEW.end_time IS NOT NULL AND NEW.total_duration > 0 THEN
      NEW.start_time := NEW.end_time::timestamp - (NEW.total_duration || ' seconds')::interval;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for INSERT and UPDATE
DROP TRIGGER IF EXISTS trigger_update_nursing_computed_fields ON feedings;
CREATE TRIGGER trigger_update_nursing_computed_fields
  BEFORE INSERT OR UPDATE ON feedings
  FOR EACH ROW
  EXECUTE FUNCTION update_nursing_computed_fields();

-- Add indexes for duration-based queries
CREATE INDEX IF NOT EXISTS idx_feedings_nursing_durations 
ON feedings(baby_id, type, left_duration, right_duration) 
WHERE type = 'nursing';

-- Add helpful comments
COMMENT ON COLUMN feedings.left_duration IS 'Duration in seconds for left breast nursing';
COMMENT ON COLUMN feedings.right_duration IS 'Duration in seconds for right breast nursing';
COMMENT ON COLUMN feedings.total_duration IS 'Total nursing duration in seconds (left + right)';

-- Migrate existing nursing sessions to have default durations
-- For existing sessions with start_time and end_time, calculate duration
UPDATE feedings 
SET 
  left_duration = CASE 
    WHEN breast_used = 'left' THEN EXTRACT(EPOCH FROM (end_time - start_time))::INTEGER
    WHEN breast_used = 'both' THEN EXTRACT(EPOCH FROM (end_time - start_time))::INTEGER / 2
    ELSE 0
  END,
  right_duration = CASE 
    WHEN breast_used = 'right' THEN EXTRACT(EPOCH FROM (end_time - start_time))::INTEGER
    WHEN breast_used = 'both' THEN EXTRACT(EPOCH FROM (end_time - start_time))::INTEGER / 2
    ELSE 0
  END,
  total_duration = CASE 
    WHEN start_time IS NOT NULL AND end_time IS NOT NULL 
    THEN EXTRACT(EPOCH FROM (end_time - start_time))::INTEGER
    ELSE 0
  END
WHERE type = 'nursing' 
  AND start_time IS NOT NULL 
  AND end_time IS NOT NULL
  AND (left_duration = 0 AND right_duration = 0);