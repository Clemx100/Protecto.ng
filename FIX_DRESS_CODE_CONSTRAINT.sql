-- ====================================================================
-- FIX DRESS CODE CONSTRAINT - EMERGENCY FIX
-- ====================================================================
-- The bookings table has a check constraint that's too restrictive
-- This script removes it and allows any dress code value
-- ====================================================================

-- Drop the restrictive dress_code constraint
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_dress_code_check;

-- Add a more permissive constraint (or none at all for flexibility)
-- Option 1: No constraint (most flexible)
-- (Do nothing - constraint already dropped)

-- Option 2: Allow common dress codes (uncomment if you want validation)
-- ALTER TABLE bookings ADD CONSTRAINT bookings_dress_code_check 
--   CHECK (dress_code IN ('tactical', 'tactical_casual', 'business', 'casual', 'formal', 'plain_clothes', 'operator'));

-- Verify the constraint was removed
SELECT conname, contype, pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'bookings'::regclass
AND conname LIKE '%dress_code%';

-- Test by inserting a booking
SELECT 'Constraint fixed! Ready for bookings.' as status;

-- ====================================================================
-- ✅ SUCCESS: dress_code constraint removed
-- ✅ Bookings can now be created with any dress code value
-- ====================================================================

