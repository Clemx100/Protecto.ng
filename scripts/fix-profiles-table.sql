-- Fix profiles table to have proper UUID generation
-- Run this in Supabase SQL Editor

-- First, let's see the current structure
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
ORDER BY ordinal_position;

-- Add UUID generation if missing
ALTER TABLE profiles ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- Ensure the id column is properly set up
ALTER TABLE profiles ALTER COLUMN id SET NOT NULL;

-- Create an index on email if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

-- Create an index on phone if it doesn't exist  
CREATE INDEX IF NOT EXISTS idx_profiles_phone ON profiles(phone);

-- Show the updated structure
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
ORDER BY ordinal_position;