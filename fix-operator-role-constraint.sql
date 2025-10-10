-- ====================================================================
-- FIX OPERATOR ROLE CONSTRAINT - PROTECTOR.NG LIVE
-- ====================================================================
-- This script fixes the role constraint to allow 'operator', 'admin', and 'agent' roles
-- ====================================================================

-- Drop the existing check constraint if it exists
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

-- Add new check constraint that allows operator, admin, agent, and client roles
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check 
  CHECK (role IN ('client', 'operator', 'admin', 'agent'));

-- Update the user to have operator role
UPDATE profiles 
SET role = 'operator', updated_at = NOW()
WHERE email = 'iwewezinemstephen@gmail.com';

-- Verify the update
SELECT id, email, role, first_name, last_name, created_at
FROM profiles
WHERE email = 'iwewezinemstephen@gmail.com';

-- ====================================================================
-- SUCCESS MESSAGE
-- ====================================================================
-- ✅ Constraint updated to allow: client, operator, admin, agent
-- ✅ User iwewezinemstephen@gmail.com updated to 'operator' role
-- ====================================================================

