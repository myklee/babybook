-- Create pumping_sessions table
CREATE TABLE IF NOT EXISTS pumping_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  baby_id UUID NOT NULL REFERENCES babies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  left_duration INTEGER NOT NULL DEFAULT 0, -- seconds
  right_duration INTEGER NOT NULL DEFAULT 0, -- seconds
  total_duration INTEGER NOT NULL DEFAULT 0, -- seconds
  left_amount INTEGER, -- ml
  right_amount INTEGER, -- ml
  total_amount INTEGER NOT NULL DEFAULT 0, -- ml
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_pumping_sessions_user_id ON pumping_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_pumping_sessions_baby_id ON pumping_sessions(baby_id);
CREATE INDEX IF NOT EXISTS idx_pumping_sessions_start_time ON pumping_sessions(start_time);
CREATE INDEX IF NOT EXISTS idx_pumping_sessions_end_time ON pumping_sessions(end_time);

-- Enable Row Level Security
ALTER TABLE pumping_sessions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own pumping sessions" ON pumping_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own pumping sessions" ON pumping_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own pumping sessions" ON pumping_sessions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own pumping sessions" ON pumping_sessions
  FOR DELETE USING (auth.uid() = user_id);

-- Add constraint to ensure at least one breast has duration > 0
ALTER TABLE pumping_sessions ADD CONSTRAINT check_duration_positive 
  CHECK (left_duration > 0 OR right_duration > 0);

-- Add constraint to ensure amounts are non-negative if provided
ALTER TABLE pumping_sessions ADD CONSTRAINT check_amounts_non_negative 
  CHECK (
    (left_amount IS NULL OR left_amount >= 0) AND 
    (right_amount IS NULL OR right_amount >= 0) AND 
    total_amount >= 0
  );

-- Add constraint to ensure end_time is after start_time
ALTER TABLE pumping_sessions ADD CONSTRAINT check_end_after_start 
  CHECK (end_time > start_time);

-- Add trigger to automatically update total_duration and total_amount
CREATE OR REPLACE FUNCTION update_pumping_totals()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate total duration
  NEW.total_duration = COALESCE(NEW.left_duration, 0) + COALESCE(NEW.right_duration, 0);
  
  -- Calculate total amount
  NEW.total_amount = COALESCE(NEW.left_amount, 0) + COALESCE(NEW.right_amount, 0);
  
  -- Update timestamp
  NEW.updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_pumping_totals
  BEFORE INSERT OR UPDATE ON pumping_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_pumping_totals();