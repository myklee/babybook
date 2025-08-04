-- Make pumping sessions account-level instead of baby-specific
-- Remove the baby_id requirement and make it optional

-- First, drop the existing constraint that requires baby_id
ALTER TABLE pumping_sessions ALTER COLUMN baby_id DROP NOT NULL;

-- Update the foreign key constraint to allow NULL values
ALTER TABLE pumping_sessions DROP CONSTRAINT IF EXISTS pumping_sessions_baby_id_fkey;
ALTER TABLE pumping_sessions ADD CONSTRAINT pumping_sessions_baby_id_fkey 
  FOREIGN KEY (baby_id) REFERENCES babies(id) ON DELETE SET NULL;

-- Update the index to handle NULL values
DROP INDEX IF EXISTS idx_pumping_sessions_baby_id;
CREATE INDEX IF NOT EXISTS idx_pumping_sessions_baby_id ON pumping_sessions(baby_id) WHERE baby_id IS NOT NULL;

-- Add a comment to clarify the new structure
COMMENT ON COLUMN pumping_sessions.baby_id IS 'Optional reference to baby - pumping sessions are account-level';