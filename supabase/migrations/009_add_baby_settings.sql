-- Add baby settings table
CREATE TABLE IF NOT EXISTS baby_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  baby_id UUID NOT NULL REFERENCES babies(id) ON DELETE CASCADE,
  feeding_interval_hours INTEGER DEFAULT 3,
  default_breast_amount INTEGER DEFAULT 0,
  default_formula_amount INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(baby_id)
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_baby_settings_baby_id ON baby_settings(baby_id);

-- Enable Row Level Security
ALTER TABLE baby_settings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own baby settings" ON baby_settings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM babies 
      WHERE babies.id = baby_settings.baby_id 
      AND babies.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own baby settings" ON baby_settings
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM babies 
      WHERE babies.id = baby_settings.baby_id 
      AND babies.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own baby settings" ON baby_settings
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM babies 
      WHERE babies.id = baby_settings.baby_id 
      AND babies.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own baby settings" ON baby_settings
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM babies 
      WHERE babies.id = baby_settings.baby_id 
      AND babies.user_id = auth.uid()
    )
  );

-- Insert default settings for existing babies
INSERT INTO baby_settings (baby_id, feeding_interval_hours, default_breast_amount, default_formula_amount)
SELECT id, 3, 0, 0 FROM babies
ON CONFLICT (baby_id) DO NOTHING; 