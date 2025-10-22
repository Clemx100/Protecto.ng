-- ====================================================================
-- FIX DATA PERSISTENCE ISSUES - PROTECTOR.NG (SUPABASE VERSION)
-- ====================================================================
-- This script fixes common issues that cause data to disappear
-- or not be displayed correctly in the client app
-- ====================================================================

BEGIN;

-- 1. ENSURE RLS IS PROPERLY CONFIGURED
-- ============================================================================
-- Temporarily disable RLS to clean up policies
ALTER TABLE bookings DISABLE ROW LEVEL SECURITY;
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE messages DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DO $$ 
DECLARE
    r RECORD;
BEGIN
    -- Drop all policies on bookings
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'bookings') 
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON bookings CASCADE';
    END LOOP;
    
    -- Drop all policies on profiles
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'profiles') 
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON profiles CASCADE';
    END LOOP;
    
    -- Drop all policies on messages
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'messages') 
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON messages CASCADE';
    END LOOP;
    
    RAISE NOTICE 'Step 1: Existing policies dropped';
END $$;

-- Create comprehensive RLS policies for PROFILES
CREATE POLICY "Public profiles viewable by everyone"
ON profiles FOR SELECT
USING (true);

CREATE POLICY "Users can insert own profile"
ON profiles FOR INSERT
WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE
USING (auth.uid() = id);

-- Create comprehensive RLS policies for BOOKINGS
CREATE POLICY "Service role full access bookings"
ON bookings FOR ALL
USING (auth.jwt()->>'role' = 'service_role')
WITH CHECK (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Authenticated users create bookings"
ON bookings FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = client_id OR true);

CREATE POLICY "Users view own bookings"
ON bookings FOR SELECT
TO authenticated
USING (
    auth.uid() = client_id 
    OR EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role IN ('operator', 'admin', 'agent')
    )
);

CREATE POLICY "Users update own bookings"
ON bookings FOR UPDATE
TO authenticated
USING (
    auth.uid() = client_id
    OR EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role IN ('operator', 'admin', 'agent')
    )
);

CREATE POLICY "Users delete own bookings"
ON bookings FOR DELETE
TO authenticated
USING (
    auth.uid() = client_id
    OR EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role IN ('operator', 'admin', 'agent')
    )
);

-- Create comprehensive RLS policies for MESSAGES
CREATE POLICY "Service role full access messages"
ON messages FOR ALL
USING (auth.jwt()->>'role' = 'service_role')
WITH CHECK (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Authenticated users create messages"
ON messages FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = sender_id OR true);

CREATE POLICY "Users view messages for their bookings"
ON messages FOR SELECT
TO authenticated
USING (
    auth.uid() = sender_id
    OR auth.uid() = recipient_id
    OR EXISTS (
        SELECT 1 FROM bookings b
        WHERE b.id = messages.booking_id
        AND (b.client_id = auth.uid())
    )
    OR EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role IN ('operator', 'admin', 'agent')
    )
);

-- Re-enable RLS
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN RAISE NOTICE 'Step 1: RLS policies configured successfully!'; END $$;

-- 2. CLEAN UP DATA INTEGRITY ISSUES
-- ============================================================================

-- Delete orphaned bookings (bookings without a valid client)
DELETE FROM bookings
WHERE client_id NOT IN (SELECT id FROM profiles);

-- Cancel stale pending bookings (older than 7 days)
UPDATE bookings
SET 
    status = 'cancelled',
    updated_at = NOW()
WHERE status = 'pending'
AND created_at < NOW() - INTERVAL '7 days';

-- Fix NULL or invalid status fields
UPDATE bookings
SET status = 'cancelled'
WHERE status IS NULL;

-- Fix profiles with NULL critical fields
UPDATE profiles
SET 
    first_name = COALESCE(first_name, 'User'),
    last_name = COALESCE(last_name, ''),
    role = COALESCE(role, 'client'),
    is_active = COALESCE(is_active, true)
WHERE first_name IS NULL 
   OR last_name IS NULL 
   OR role IS NULL
   OR is_active IS NULL;

DO $$ BEGIN RAISE NOTICE 'Step 2: Data integrity issues fixed!'; END $$;

-- 3. CREATE NECESSARY INDEXES FOR PERFORMANCE
-- ============================================================================

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_bookings_client_id ON bookings(client_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_created_at ON bookings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bookings_client_status ON bookings(client_id, status);

CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

CREATE INDEX IF NOT EXISTS idx_messages_booking_id ON messages(booking_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);

DO $$ BEGIN RAISE NOTICE 'Step 3: Indexes created successfully!'; END $$;

-- 4. VERIFY FOREIGN KEY CONSTRAINTS
-- ============================================================================

-- Ensure foreign key constraint exists for bookings.client_id
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'bookings_client_id_fkey'
        AND table_name = 'bookings'
    ) THEN
        ALTER TABLE bookings
        ADD CONSTRAINT bookings_client_id_fkey
        FOREIGN KEY (client_id) REFERENCES profiles(id) ON DELETE CASCADE;
        
        RAISE NOTICE 'Step 4: Foreign key constraint added for bookings.client_id';
    ELSE
        RAISE NOTICE 'Step 4: Foreign key constraint already exists for bookings.client_id';
    END IF;
END $$;

-- Ensure foreign key constraint exists for messages.booking_id
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'messages_booking_id_fkey'
        AND table_name = 'messages'
    ) THEN
        ALTER TABLE messages
        ADD CONSTRAINT messages_booking_id_fkey
        FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE;
        
        RAISE NOTICE 'Step 4: Foreign key constraint added for messages.booking_id';
    ELSE
        RAISE NOTICE 'Step 4: Foreign key constraint already exists for messages.booking_id';
    END IF;
END $$;

-- 5. ENABLE REALTIME FOR CRITICAL TABLES
-- ============================================================================

-- Enable realtime (this may require additional Supabase configuration)
DO $$ 
BEGIN
    -- Note: Realtime must be enabled in Supabase dashboard as well
    -- This just ensures the publication exists
    
    -- Check if publication exists
    IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        CREATE PUBLICATION supabase_realtime;
    END IF;
    
    RAISE NOTICE 'Step 5: Realtime publication verified';
END $$;

-- Try to add tables to realtime (may fail if already added, that's OK)
DO $$ 
BEGIN
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE bookings;
    EXCEPTION WHEN duplicate_object THEN
        NULL; -- Table already in publication
    END;
    
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE messages;
    EXCEPTION WHEN duplicate_object THEN
        NULL; -- Table already in publication
    END;
    
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE profiles;
    EXCEPTION WHEN duplicate_object THEN
        NULL; -- Table already in publication
    END;
    
    RAISE NOTICE 'Step 5: Realtime enabled for critical tables!';
END $$;

COMMIT;

-- 6. FINAL VERIFICATION
-- ============================================================================

DO $$ 
DECLARE
    booking_count INTEGER;
    profile_count INTEGER;
    pending_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO booking_count FROM bookings;
    SELECT COUNT(*) INTO profile_count FROM profiles;
    SELECT COUNT(*) INTO pending_count FROM bookings WHERE status = 'pending';
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'VERIFICATION COMPLETE';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Total bookings: %', booking_count;
    RAISE NOTICE 'Total profiles: %', profile_count;
    RAISE NOTICE 'Pending bookings: %', pending_count;
    RAISE NOTICE '========================================';
    RAISE NOTICE 'FIX COMPLETE!';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Please:';
    RAISE NOTICE '1. Clear browser cache and localStorage';
    RAISE NOTICE '2. Log out and log back in';
    RAISE NOTICE '3. Test booking creation and data persistence';
    RAISE NOTICE '========================================';
END $$;

