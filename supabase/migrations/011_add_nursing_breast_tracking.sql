-- Add breast tracking for nursing sessions
-- This migration adds breast_used column and related constraints for nursing sessions

-- Add breast_used column to feedings table
ALTER TABLE feedings 
ADD COLUMN breast_used VARCHAR(10) CHECK (breast_used IN ('left', 'right', 'both'));

-- Add constraint to ensure nursing sessions have breast_used
ALTER TABLE feedings 
ADD CONSTRAINT nursing_sessions_have_breast 
CHECK (
  (type = 'nursing' AND breast_used IS NOT NULL) OR 
  (type != 'nursing')
);

-- Add index for nursing session queries (active sessions)
CREATE INDEX IF NOT EXISTS idx_feedings_nursing_active 
ON feedings(baby_id, type, end_time) 
WHERE type = 'nursing';

-- Add index for nursing analytics queries
CREATE INDEX IF NOT EXISTS idx_feedings_nursing_breast 
ON feedings(baby_id, type, breast_used, start_time) 
WHERE type = 'nursing';

-- Add index for nursing duration queries
CREATE INDEX IF NOT EXISTS idx_feedings_nursing_duration 
ON feedings(baby_id, type, start_time, end_time) 
WHERE type = 'nursing' AND start_time IS NOT NULL;

-- Update existing nursing records to have a default breast selection
-- This ensures data consistency for existing nursing sessions
UPDATE feedings 
SET breast_used = 'both' 
WHERE type = 'nursing' AND breast_used IS NULL;

-- Add helpful comment for future reference
COMMENT ON COLUMN feedings.breast_used IS 'Tracks which breast was used for nursing sessions: left, right, or both';