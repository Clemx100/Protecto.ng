-- Add vehicle image support for Super Admin.
-- Run in Supabase SQL Editor if your vehicles table doesn't have these columns yet.
-- For storage uploads, also run scripts/05_storage_buckets.sql (or uploads will use inline image fallback).

-- Add columns to vehicles (skip if they already exist)
ALTER TABLE vehicles
  ADD COLUMN IF NOT EXISTS image_url text,
  ADD COLUMN IF NOT EXISTS photo_urls jsonb DEFAULT '[]'::jsonb;

-- Optional: comment for documentation
COMMENT ON COLUMN vehicles.image_url IS 'Primary vehicle image URL (e.g. from Supabase Storage)';
COMMENT ON COLUMN vehicles.photo_urls IS 'Array of additional image URLs';
