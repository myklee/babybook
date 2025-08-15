-- Add include_solids_in_schedule column to baby_settings table
-- This allows parents to configure whether solid foods should be included in feeding schedule calculations

-- Add the new column with default FALSE
ALTER TABLE baby_settings 
ADD COLUMN include_solids_in_schedule BOOLEAN DEFAULT FALSE;

-- Update existing records to have the default value (FALSE)
-- This ensures all existing baby settings have the new column set to FALSE
UPDATE baby_settings 
SET include_solids_in_schedule = FALSE 
WHERE include_solids_in_schedule IS NULL;

-- Add a NOT NULL constraint after updating existing records
ALTER TABLE baby_settings 
ALTER COLUMN include_solids_in_schedule SET NOT NULL;

-- Add a comment to document the column purpose
COMMENT ON COLUMN baby_settings.include_solids_in_schedule IS 
'When FALSE (default), solid food feedings are excluded from feeding schedule calculations. When TRUE, solid foods count towards feeding intervals and reminders.';