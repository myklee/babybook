-- Enable Row Level Security
ALTER DATABASE postgres SET "app.jwt_secret" TO 'your-jwt-secret';

-- Create tables
CREATE TABLE IF NOT EXISTS babies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS feedings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  baby_id UUID NOT NULL REFERENCES babies(id) ON DELETE CASCADE,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  amount INTEGER NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('breast', 'formula', 'solid')),
  notes TEXT,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS diaper_changes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  baby_id UUID NOT NULL REFERENCES babies(id) ON DELETE CASCADE,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('wet', 'dirty', 'both')),
  notes TEXT,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_babies_user_id ON babies(user_id);
CREATE INDEX IF NOT EXISTS idx_feedings_user_id ON feedings(user_id);
CREATE INDEX IF NOT EXISTS idx_feedings_baby_id ON feedings(baby_id);
CREATE INDEX IF NOT EXISTS idx_feedings_timestamp ON feedings(timestamp);
CREATE INDEX IF NOT EXISTS idx_diaper_changes_user_id ON diaper_changes(user_id);
CREATE INDEX IF NOT EXISTS idx_diaper_changes_baby_id ON diaper_changes(baby_id);
CREATE INDEX IF NOT EXISTS idx_diaper_changes_timestamp ON diaper_changes(timestamp);

-- Enable Row Level Security
ALTER TABLE babies ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedings ENABLE ROW LEVEL SECURITY;
ALTER TABLE diaper_changes ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own babies" ON babies
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own babies" ON babies
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own babies" ON babies
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own babies" ON babies
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own feedings" ON feedings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own feedings" ON feedings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own feedings" ON feedings
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own feedings" ON feedings
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own diaper changes" ON diaper_changes
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own diaper changes" ON diaper_changes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own diaper changes" ON diaper_changes
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own diaper changes" ON diaper_changes
  FOR DELETE USING (auth.uid() = user_id); 