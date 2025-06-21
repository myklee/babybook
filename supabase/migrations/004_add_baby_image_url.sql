-- Add image_url column to babies table
ALTER TABLE babies ADD COLUMN IF NOT EXISTS image_url TEXT; 