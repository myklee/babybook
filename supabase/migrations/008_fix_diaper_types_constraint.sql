-- First drop any existing constraint to allow data updates
ALTER TABLE diaper_changes DROP CONSTRAINT IF EXISTS diaper_changes_type_check;

-- Update existing diaper change records to use new type values
UPDATE diaper_changes SET type = 'pee' WHERE type = 'wet';
UPDATE diaper_changes SET type = 'poop' WHERE type = 'dirty';

-- Add the correct constraint back
ALTER TABLE diaper_changes ADD CONSTRAINT diaper_changes_type_check CHECK (type IN ('pee', 'poop', 'both')); 