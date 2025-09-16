-- Add missing profile_completed column to profiles table
-- This fixes the error: "Could not find the 'profile_completed' column of 'profiles' in the schema cache"

-- Add the profile_completed column
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS profile_completed BOOLEAN DEFAULT FALSE;

-- Update existing profiles to mark them as completed if they have all required fields
UPDATE profiles 
SET profile_completed = TRUE 
WHERE first_name IS NOT NULL 
  AND last_name IS NOT NULL 
  AND phone IS NOT NULL 
  AND address IS NOT NULL 
  AND emergency_contact IS NOT NULL 
  AND emergency_phone IS NOT NULL;

-- Add a comment to document the column
COMMENT ON COLUMN profiles.profile_completed IS 'Indicates whether the user has completed their profile setup';

-- Verify the column was added
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
  AND column_name = 'profile_completed';

