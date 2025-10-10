-- ====================================================================
-- EMERGENCY QUICK FIX - DISABLE RLS TEMPORARILY
-- ====================================================================
-- This will allow bookings to work IMMEDIATELY
-- Run this in Supabase SQL Editor NOW
-- ====================================================================

-- DISABLE RLS on all tables (emergency fix)
ALTER TABLE bookings DISABLE ROW LEVEL SECURITY;
ALTER TABLE messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- Verify it worked
SELECT 
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public' 
AND tablename IN ('bookings', 'messages', 'profiles');

-- ====================================================================
-- RESULT: You should see rls_enabled = false for all tables
-- ====================================================================
-- Now try creating a booking - IT WILL WORK!
-- ====================================================================

