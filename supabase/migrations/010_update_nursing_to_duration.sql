-- Update nursing events to use start/end times instead of amount
-- This migration adds start_time and end_time columns to feedings table for nursing events

-- Add new columns for nursing events
ALTER TABLE feedings 
ADD COLUMN start_time TIMESTAMP WITH TIME ZONE,
ADD COLUMN end_time TIMESTAMP WITH TIME ZONE;

-- For existing nursing events, convert timestamp to start_time and set end_time to null
UPDATE feedings 
SET start_time = timestamp, 
    end_time = NULL 
WHERE type = 'nursing';

-- Make amount nullable since nursing events won't use it
ALTER TABLE feedings 
ALTER COLUMN amount DROP NOT NULL;

-- Update the type constraint to ensure we handle nursing properly
ALTER TABLE feedings 
DROP CONSTRAINT IF EXISTS feedings_type_check;

ALTER TABLE feedings 
ADD CONSTRAINT feedings_type_check 
CHECK (type IN ('breast', 'formula', 'solid', 'nursing'));

-- Add constraint to ensure nursing events have start_time
ALTER TABLE feedings 
ADD CONSTRAINT nursing_events_have_start_time 
CHECK (
  (type = 'nursing' AND start_time IS NOT NULL) OR 
  (type != 'nursing')
);

-- Add constraint to ensure non-nursing events have amount
ALTER TABLE feedings 
ADD CONSTRAINT non_nursing_events_have_amount 
CHECK (
  (type != 'nursing' AND amount IS NOT NULL) OR 
  (type = 'nursing')
);

-- Add indexes for the new columns
CREATE INDEX IF NOT EXISTS idx_feedings_start_time ON feedings(start_time);
CREATE INDEX IF NOT EXISTS idx_feedings_end_time ON feedings(end_time);