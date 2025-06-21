-- Create storage bucket for baby images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('baby-images', 'baby-images', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']);

-- Allow authenticated users to upload any files to the bucket
CREATE POLICY "Allow authenticated uploads" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'baby-images' AND auth.role() = 'authenticated');

-- Allow public to view files
CREATE POLICY "Allow public access" ON storage.objects
FOR SELECT USING (bucket_id = 'baby-images');

-- Allow authenticated users to delete files
CREATE POLICY "Allow authenticated deletes" ON storage.objects
FOR DELETE USING (bucket_id = 'baby-images' AND auth.role() = 'authenticated'); 