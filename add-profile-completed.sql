-- Add profile_completed column to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS profile_completed BOOLEAN DEFAULT FALSE;

-- Update existing profiles to mark them as completed
UPDATE profiles 
SET profile_completed = TRUE 
WHERE first_name IS NOT NULL 
  AND last_name IS NOT NULL 
  AND phone IS NOT NULL 
  AND address IS NOT NULL 
  AND emergency_contact IS NOT NULL 
  AND emergency_phone IS NOT NULL;

-- Verify the column was added
SELECT id, first_name, last_name, profile_completed 
FROM profiles 
LIMIT 5;

