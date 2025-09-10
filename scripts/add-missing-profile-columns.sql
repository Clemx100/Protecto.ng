-- Add missing columns to profiles table for user registration
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS emergency_contact TEXT,
ADD COLUMN IF NOT EXISTS emergency_phone TEXT;

-- Update the profiles table to ensure all columns exist
COMMENT ON COLUMN profiles.address IS 'User home or business address';
COMMENT ON COLUMN profiles.emergency_contact IS 'Emergency contact person name';
COMMENT ON COLUMN profiles.emergency_phone IS 'Emergency contact phone number';
