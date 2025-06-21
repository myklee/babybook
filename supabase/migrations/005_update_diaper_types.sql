-- Drop the old constraint
ALTER TABLE diaper_changes DROP CONSTRAINT diaper_changes_type_check;

-- Add the new constraint with updated values
ALTER TABLE diaper_changes ADD CONSTRAINT diaper_changes_type_check CHECK (type IN ('pee', 'poop', 'both')); 