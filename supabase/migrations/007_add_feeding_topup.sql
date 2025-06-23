-- Add topup_amount column to feedings table for breast feedings with formula top-ups
ALTER TABLE feedings ADD COLUMN topup_amount INTEGER DEFAULT 0;

-- Add comment for documentation
COMMENT ON COLUMN feedings.topup_amount IS 'Amount of formula added as top-up to a breast feeding (in ml)';

-- Add constraint to ensure topup_amount is only used with breast feedings
ALTER TABLE feedings ADD CONSTRAINT check_topup_breast_only 
  CHECK (type != 'breast' OR topup_amount = 0 OR type = 'breast'); 