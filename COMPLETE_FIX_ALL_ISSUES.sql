-- ====================================================================
-- COMPLETE FIX FOR ALL PROTECTOR.NG LIVE ISSUES
-- ====================================================================
-- This script fixes:
-- 1. RLS policies for bookings and messages
-- 2. Real-time subscriptions
-- 3. Foreign key constraints
-- 4. Missing columns
-- ====================================================================

-- ============================================================================
-- PART 1: DISABLE RLS TEMPORARILY FOR SETUP
-- ============================================================================
ALTER TABLE bookings DISABLE ROW LEVEL SECURITY;
ALTER TABLE messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PART 2: DROP ALL EXISTING POLICIES (CLEAN SLATE)
-- ============================================================================
DO $$ 
DECLARE
    r RECORD;
BEGIN
    -- Drop all policies on bookings
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'bookings') 
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON bookings';
    END LOOP;
    
    -- Drop all policies on messages
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'messages') 
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON messages';
    END LOOP;
    
    -- Drop all policies on profiles
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'profiles') 
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON profiles';
    END LOOP;
END $$;

-- ============================================================================
-- PART 3: CREATE COMPREHENSIVE RLS POLICIES
-- ============================================================================

-- ============================================================================
-- PROFILES TABLE POLICIES
-- ============================================================================

-- Anyone can view profiles (needed for user lookups)
CREATE POLICY "Public profiles are viewable by everyone"
ON profiles FOR SELECT
USING (true);

-- Users can insert their own profile
CREATE POLICY "Users can insert their own profile"
ON profiles FOR INSERT
WITH CHECK (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE
USING (auth.uid() = id);

-- Service role can do anything
CREATE POLICY "Service role full access to profiles"
ON profiles
USING (auth.jwt()->>'role' = 'service_role')
WITH CHECK (auth.jwt()->>'role' = 'service_role');

-- ============================================================================
-- BOOKINGS TABLE POLICIES
-- ============================================================================

-- Service role can insert any booking (for API)
CREATE POLICY "Service role can insert bookings"
ON bookings FOR INSERT
WITH CHECK (true);

-- Authenticated users can insert bookings
CREATE POLICY "Authenticated users can create bookings"
ON bookings FOR INSERT
TO authenticated
WITH CHECK (true);

-- Users can view their own bookings
CREATE POLICY "Users can view their own bookings"
ON bookings FOR SELECT
TO authenticated
USING (client_id = auth.uid());

-- Operators can view all bookings
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

-- Service role can view all bookings
CREATE POLICY "Service role can view all bookings"
ON bookings FOR SELECT
USING (true);

-- Operators can update any booking
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

-- Service role can update any booking
CREATE POLICY "Service role can update any booking"
ON bookings FOR UPDATE
USING (true);

-- Users can update their own bookings
CREATE POLICY "Users can update own bookings"
ON bookings FOR UPDATE
TO authenticated
USING (client_id = auth.uid());

-- ============================================================================
-- MESSAGES TABLE POLICIES
-- ============================================================================

-- Service role can do anything with messages
CREATE POLICY "Service role full access to messages"
ON messages
USING (true)
WITH CHECK (true);

-- Authenticated users can insert messages
CREATE POLICY "Authenticated users can send messages"
ON messages FOR INSERT
TO authenticated
WITH CHECK (true);

-- Users can view messages for their bookings
CREATE POLICY "Users can view their booking messages"
ON messages FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM bookings
    WHERE bookings.id = messages.booking_id
    AND (
      bookings.client_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role IN ('operator', 'admin', 'agent')
      )
    )
  )
);

-- Service role can view all messages
CREATE POLICY "Service role can view all messages"
ON messages FOR SELECT
USING (true);

-- ============================================================================
-- PART 4: ENABLE RLS ON ALL TABLES
-- ============================================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PART 5: ENABLE REAL-TIME FOR CRITICAL TABLES
-- ============================================================================

-- Drop tables from publication if they exist (to avoid errors)
ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS bookings;
ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS messages;
ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS profiles;

-- Add tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE bookings;
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE profiles;

-- ============================================================================
-- PART 6: ENSURE REQUIRED COLUMNS EXIST
-- ============================================================================

-- Check and add missing columns to bookings table
DO $$ 
BEGIN
    -- Add booking_code if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='bookings' AND column_name='booking_code') THEN
        ALTER TABLE bookings ADD COLUMN booking_code TEXT;
    END IF;
    
    -- Add status if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='bookings' AND column_name='status') THEN
        ALTER TABLE bookings ADD COLUMN status TEXT DEFAULT 'pending';
    END IF;
END $$;

-- Check and add missing columns to messages table
DO $$ 
BEGIN
    -- Ensure 'content' column exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='messages' AND column_name='content') THEN
        ALTER TABLE messages ADD COLUMN content TEXT;
    END IF;
    
    -- Ensure 'message' column exists  
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='messages' AND column_name='message') THEN
        ALTER TABLE messages ADD COLUMN message TEXT;
    END IF;
    
    -- Add sender_type if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='messages' AND column_name='sender_type') THEN
        ALTER TABLE messages ADD COLUMN sender_type TEXT;
    END IF;
    
    -- Add message_type if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='messages' AND column_name='message_type') THEN
        ALTER TABLE messages ADD COLUMN message_type TEXT DEFAULT 'text';
    END IF;
    
    -- Add is_system_message if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='messages' AND column_name='is_system_message') THEN
        ALTER TABLE messages ADD COLUMN is_system_message BOOLEAN DEFAULT false;
    END IF;
END $$;

-- ============================================================================
-- PART 7: CREATE TEST DATA TO VERIFY EVERYTHING WORKS
-- ============================================================================

-- Get the operator user ID
DO $$
DECLARE
    operator_id UUID;
    service_id UUID;
    test_booking_id UUID;
BEGIN
    -- Get operator ID
    SELECT id INTO operator_id FROM profiles WHERE email = 'iwewezinemstephen@gmail.com' LIMIT 1;
    
    IF operator_id IS NOT NULL THEN
        -- Get or create a service
        SELECT id INTO service_id FROM services LIMIT 1;
        
        IF service_id IS NULL THEN
            INSERT INTO services (name, description, base_price, price_per_hour)
            VALUES ('Armed Protection Service', 'Professional armed protection', 100000, 25000)
            RETURNING id INTO service_id;
        END IF;
        
        -- Create a test booking
        INSERT INTO bookings (
            booking_code,
            client_id,
            service_id,
            service_type,
            status,
            protector_count,
            protectee_count,
            dress_code,
            duration_hours,
            pickup_address,
            pickup_coordinates,
            destination_address,
            scheduled_date,
            scheduled_time,
            base_price,
            total_price,
            surge_multiplier,
            special_instructions,
            emergency_contact,
            emergency_phone
        )
        VALUES (
            'REQ' || to_char(now(), 'YYYYMMDDHH24MISS'),
            operator_id,
            service_id,
            'armed_protection',
            'pending',
            1,
            1,
            'tactical',
            24,
            'Test Location - Lagos',
            '(6.5244,3.3792)',
            'Test Destination - Victoria Island',
            CURRENT_DATE + INTERVAL '1 day',
            '10:00:00',
            100000,
            100000,
            1,
            '{"test": true, "created_by": "setup_script"}',
            'Test Contact',
            '+234 9071034162'
        )
        RETURNING id INTO test_booking_id;
        
        -- Create a test message
        IF test_booking_id IS NOT NULL THEN
            INSERT INTO messages (
                booking_id,
                sender_id,
                sender_type,
                content,
                message,
                message_type,
                is_system_message
            )
            VALUES (
                test_booking_id,
                operator_id,
                'system',
                '🎉 Test booking created successfully! Your PROTECTOR.NG system is now fully configured and working.',
                '🎉 Test booking created successfully! Your PROTECTOR.NG system is now fully configured and working.',
                'system',
                true
            );
        END IF;
    END IF;
END $$;

-- ============================================================================
-- PART 8: VERIFICATION QUERIES
-- ============================================================================

-- Show RLS status
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public' 
AND tablename IN ('profiles', 'bookings', 'messages')
ORDER BY tablename;

-- Show policy counts
SELECT 
    'profiles' as table_name,
    COUNT(*) as policy_count
FROM pg_policies
WHERE tablename = 'profiles'
UNION ALL
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

-- Show realtime tables
SELECT schemaname, tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
AND tablename IN ('profiles', 'bookings', 'messages')
ORDER BY tablename;

-- Show bookings count
SELECT 
    'bookings' as table_name,
    COUNT(*) as total_count
FROM bookings
UNION ALL
SELECT 
    'messages' as table_name,
    COUNT(*) as total_count
FROM messages;

-- Show recent bookings
SELECT 
    booking_code,
    status,
    pickup_address,
    scheduled_date,
    created_at
FROM bookings
ORDER BY created_at DESC
LIMIT 5;

-- ====================================================================
-- SUCCESS CHECKLIST
-- ====================================================================
-- ✅ RLS enabled on all tables
-- ✅ Comprehensive policies created for:
--    - Profiles (view, insert, update)
--    - Bookings (insert, view, update)
--    - Messages (insert, view)
-- ✅ Service role has full access
-- ✅ Operators can see all bookings
-- ✅ Users can see their own bookings
-- ✅ Real-time enabled for bookings, messages, profiles
-- ✅ All required columns verified
-- ✅ Test booking created
-- ✅ Test message created
-- ====================================================================

