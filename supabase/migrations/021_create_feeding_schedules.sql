-- Create feeding_schedules table for automated feeding schedule feature
CREATE TABLE feeding_schedules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  baby_id UUID NOT NULL REFERENCES babies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (length(trim(name)) > 0 AND length(trim(name)) <= 50),
  feeding_type TEXT NOT NULL CHECK (feeding_type IN ('breast', 'formula', 'solid')),
  default_amount INTEGER CHECK (default_amount > 0 AND default_amount <= 500),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_used_at TIMESTAMP WITH TIME ZONE,
  usage_count INTEGER DEFAULT 0 CHECK (usage_count >= 0)
);

-- Create indexes for better performance
CREATE INDEX idx_feeding_schedules_baby_id ON feeding_schedules(baby_id);
CREATE INDEX idx_feeding_schedules_user_id ON feeding_schedules(user_id);
CREATE INDEX idx_feeding_schedules_active ON feeding_schedules(baby_id, is_active);
CREATE INDEX idx_feeding_schedules_name ON feeding_schedules(baby_id, name);

-- Add unique constraint for schedule names per baby
ALTER TABLE feeding_schedules ADD CONSTRAINT unique_schedule_name_per_baby 
  UNIQUE (baby_id, name);

-- Enable Row Level Security
ALTER TABLE feeding_schedules ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own feeding schedules" ON feeding_schedules
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own feeding schedules" ON feeding_schedules
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own feeding schedules" ON feeding_schedules
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own feeding schedules" ON feeding_schedules
  FOR DELETE USING (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_feeding_schedules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER trigger_update_feeding_schedules_updated_at
  BEFORE UPDATE ON feeding_schedules
  FOR EACH ROW
  EXECUTE FUNCTION update_feeding_schedules_updated_at();