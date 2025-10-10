-- ====================================================================
-- FIX BOOKING CREATION ISSUES - PROTECTOR.NG LIVE
-- ====================================================================
-- This script fixes RLS policies and constraints for booking creation
-- ====================================================================

-- 1. Check current RLS policies on bookings table
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'bookings';

-- 2. DISABLE RLS temporarily to test (we'll re-enable with proper policies)
ALTER TABLE bookings DISABLE ROW LEVEL SECURITY;
ALTER TABLE messages DISABLE ROW LEVEL SECURITY;

-- 3. CREATE PERMISSIVE POLICIES

-- Allow authenticated users to insert their own bookings
CREATE POLICY "Users can create their own bookings"
ON bookings FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = client_id);

-- Allow service role (API) to insert any booking
CREATE POLICY "Service role can insert any booking"
ON bookings FOR INSERT
TO service_role
WITH CHECK (true);

-- Allow authenticated users to view their own bookings
CREATE POLICY "Users can view their own bookings"
ON bookings FOR SELECT
TO authenticated
USING (auth.uid() = client_id);

-- Allow operators to view all bookings
CREATE POLICY "Operators can view all bookings"
ON bookings FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('operator', 'admin', 'agent')
  )
);

-- Allow operators to update bookings
CREATE POLICY "Operators can update bookings"
ON bookings FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('operator', 'admin', 'agent')
  )
);

-- 4. CREATE POLICIES FOR MESSAGES TABLE

-- Allow service role to insert any message
CREATE POLICY "Service role can insert messages"
ON messages FOR INSERT
TO service_role
WITH CHECK (true);

-- Allow authenticated users to insert messages for their bookings
CREATE POLICY "Users can create messages for their bookings"
ON messages FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM bookings
    WHERE bookings.id = messages.booking_id
    AND bookings.client_id = auth.uid()
  )
);

-- Allow users to view messages for their bookings
CREATE POLICY "Users can view their booking messages"
ON messages FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM bookings
    WHERE bookings.id = messages.booking_id
    AND bookings.client_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('operator', 'admin', 'agent')
  )
);

-- 5. RE-ENABLE RLS
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- 6. Verify the setup
SELECT 
  'bookings' as table_name,
  COUNT(*) as policy_count
FROM pg_policies
WHERE tablename = 'bookings'
UNION ALL
SELECT 
  'messages' as table_name,
  COUNT(*) as policy_count
FROM pg_policies
WHERE tablename = 'messages';

-- ====================================================================
-- SUCCESS MESSAGE
-- ====================================================================
-- ✅ RLS policies configured for bookings and messages
-- ✅ Users can create bookings
-- ✅ Operators can view all bookings
-- ✅ Service role has full access
-- ====================================================================

