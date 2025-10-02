-- ============================================================
-- Convert Test User to Real User
-- ============================================================
-- This SQL script converts a test user profile to a real user
-- Run this in your Supabase SQL Editor
-- ============================================================

-- STEP 1: Check current user data (verify before update)
-- Replace 'YOUR-USER-ID-HERE' with the actual user UUID
SELECT 
  id,
  first_name,
  last_name,
  email,
  phone,
  is_verified,
  is_active,
  credentials_completed,
  created_at,
  updated_at
FROM profiles
WHERE id = '4d2535f4-e7c7-4e06-b78a-469f68cc96be'; -- CHANGE THIS ID

-- STEP 2: Check bookings associated with this user
SELECT 
  COUNT(*) as total_bookings,
  status,
  COUNT(*) as count_by_status
FROM bookings
WHERE client_id = '4d2535f4-e7c7-4e06-b78a-469f68cc96be' -- CHANGE THIS ID
GROUP BY status;

-- STEP 3: Perform the conversion
-- Update the profile with real user information
UPDATE profiles
SET 
  first_name = 'Stephen',              -- CHANGE: Real first name
  last_name = 'Iwewezinem',            -- CHANGE: Real last name
  email = 'stephen@example.com',       -- CHANGE: Real email (if different)
  phone = '+2348012345678',            -- CHANGE: Real phone number
  address = 'Lagos, Nigeria',          -- CHANGE: Real address (optional)
  emergency_contact = 'Jane Doe',      -- CHANGE: Emergency contact name (optional)
  emergency_phone = '+2348087654321',  -- CHANGE: Emergency phone (optional)
  is_verified = true,                  -- Mark as verified
  is_active = true,                    -- Activate account
  credentials_completed = true,        -- Mark profile as complete
  updated_at = NOW()                   -- Update timestamp
WHERE id = '4d2535f4-e7c7-4e06-b78a-469f68cc96be' -- CHANGE THIS ID
RETURNING 
  id,
  first_name,
  last_name,
  email,
  phone,
  is_verified,
  credentials_completed;

-- STEP 4: Verify the conversion was successful
-- Check updated profile
SELECT 
  id,
  first_name,
  last_name,
  email,
  phone,
  is_verified,
  is_active,
  credentials_completed,
  updated_at
FROM profiles
WHERE id = '4d2535f4-e7c7-4e06-b78a-469f68cc96be'; -- CHANGE THIS ID

-- STEP 5: Verify bookings still show correct relationship
-- This query simulates what the operator dashboard shows
SELECT 
  b.id,
  b.booking_code,
  b.status,
  b.created_at,
  p.first_name || ' ' || p.last_name as client_name,
  p.email as client_email,
  p.phone as client_phone
FROM bookings b
JOIN profiles p ON b.client_id = p.id
WHERE b.client_id = '4d2535f4-e7c7-4e06-b78a-469f68cc96be' -- CHANGE THIS ID
ORDER BY b.created_at DESC
LIMIT 5;

-- ============================================================
-- BATCH CONVERSION (Optional)
-- ============================================================
-- If you need to convert multiple test users at once
-- Uncomment and modify the following:

/*
-- Find all test users
SELECT id, first_name, last_name, email 
FROM profiles 
WHERE first_name LIKE '%Test%' 
   OR email LIKE '%test%@example.com'
   OR last_name = 'User';

-- Convert multiple users (example)
UPDATE profiles
SET 
  first_name = CASE 
    WHEN id = 'uuid-1' THEN 'John'
    WHEN id = 'uuid-2' THEN 'Jane'
    ELSE first_name
  END,
  last_name = CASE 
    WHEN id = 'uuid-1' THEN 'Smith'
    WHEN id = 'uuid-2' THEN 'Doe'
    ELSE last_name
  END,
  email = CASE 
    WHEN id = 'uuid-1' THEN 'john.smith@example.com'
    WHEN id = 'uuid-2' THEN 'jane.doe@example.com'
    ELSE email
  END,
  is_verified = true,
  is_active = true,
  updated_at = NOW()
WHERE id IN ('uuid-1', 'uuid-2');
*/

-- ============================================================
-- ROLLBACK (Emergency)
-- ============================================================
-- If you need to revert changes, you can restore from a backup
-- Or manually update back to test data:

/*
UPDATE profiles
SET 
  first_name = 'Test',
  last_name = 'User',
  email = 'test@example.com',
  phone = '+2341234567890',
  is_verified = false,
  credentials_completed = false,
  updated_at = NOW()
WHERE id = 'YOUR-USER-ID-HERE';
*/

-- ============================================================
-- NOTES:
-- ============================================================
-- 1. Always backup your database before running updates
-- 2. Replace 'YOUR-USER-ID-HERE' with actual user UUID
-- 3. Update all the user information fields with real data
-- 4. Run each section one at a time to verify results
-- 5. Keep a log of converted users for audit purposes
-- ============================================================

