-- Supabase Storage buckets for admin uploads (vehicle images, city promo cards)
-- Run in Supabase SQL Editor if uploads fail with "Bucket not found".

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'vehicle-images',
  'vehicle-images',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE
SET public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Public read for vehicle-images bucket
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Public read vehicle images'
  ) THEN
    CREATE POLICY "Public read vehicle images"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'vehicle-images');
  END IF;
END
$$;

-- Service role / authenticated uploads are handled via API using service role key.
