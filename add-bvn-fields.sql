-- Add BVN fields to profiles table for real user authentication
-- Run this in your Supabase SQL Editor

-- Add BVN fields to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bvn_number TEXT UNIQUE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bvn_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS credentials_completed BOOLEAN DEFAULT FALSE;

-- Add index for BVN lookup
CREATE INDEX IF NOT EXISTS idx_profiles_bvn ON profiles(bvn_number);

-- Add comments for documentation
COMMENT ON COLUMN profiles.bvn_number IS 'Bank Verification Number for user identity verification';
COMMENT ON COLUMN profiles.bvn_verified IS 'Whether BVN has been verified through external service';
COMMENT ON COLUMN profiles.credentials_completed IS 'Whether user has completed the credential form before email confirmation';

-- Verify the changes
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND column_name IN ('bvn_number', 'bvn_verified', 'credentials_completed');
