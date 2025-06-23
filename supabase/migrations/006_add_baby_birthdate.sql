-- Add birthdate column to babies table
ALTER TABLE babies ADD COLUMN birthdate DATE;

-- Add comment for documentation
COMMENT ON COLUMN babies.birthdate IS 'Baby''s date of birth'; 