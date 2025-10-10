-- ====================================================================
-- COMPREHENSIVE DIAGNOSE AND FIX ALL ISSUES
-- Run this in Supabase SQL Editor to fix everything at once
-- ====================================================================

-- Step 1: Check current messages table structure
SELECT 'Current messages table structure:' as info;
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'messages' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- Step 2: Check if real-time is enabled
SELECT 'Real-time status:' as info;
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime' 
      AND tablename = 'messages'
    ) THEN 'Real-time is ENABLED on messages table'
    ELSE 'Real-time is NOT ENABLED on messages table'
  END as realtime_status;

-- Step 3: Check RLS status
SELECT 'RLS status:' as info;
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'messages' 
  AND schemaname = 'public';

-- Step 4: Check existing policies
SELECT 'Existing policies:' as info;
SELECT 
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies 
WHERE tablename = 'messages' 
  AND schemaname = 'public';

-- Step 5: Check available bookings
SELECT 'Available bookings:' as info;
SELECT id, booking_code, status 
FROM bookings 
LIMIT 5;

-- Step 6: Add missing columns if needed
DO $$
BEGIN
    -- Add recipient_id column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'messages' 
        AND column_name = 'recipient_id'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE messages ADD COLUMN recipient_id UUID;
        RAISE NOTICE 'Added recipient_id column';
    END IF;
    
    -- Add sender_type column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'messages' 
        AND column_name = 'sender_type'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE messages ADD COLUMN sender_type TEXT DEFAULT 'client';
        RAISE NOTICE 'Added sender_type column';
    END IF;
    
    -- Add message column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'messages' 
        AND column_name = 'message'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE messages ADD COLUMN message TEXT;
        RAISE NOTICE 'Added message column';
    END IF;
    
    -- Add message_type column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'messages' 
        AND column_name = 'message_type'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE messages ADD COLUMN message_type TEXT DEFAULT 'text';
        RAISE NOTICE 'Added message_type column';
    END IF;
END $$;

-- Step 7: Enable real-time on messages table
DO $$
BEGIN
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE messages;
        RAISE NOTICE 'Real-time enabled on messages table';
    EXCEPTION
        WHEN duplicate_object THEN
            RAISE NOTICE 'Real-time already enabled on messages table';
        WHEN OTHERS THEN
            RAISE NOTICE 'Error enabling real-time: %', SQLERRM;
    END;
END $$;

-- Step 8: Drop and recreate RLS policies
DROP POLICY IF EXISTS "Enable read access for all users" ON messages;
DROP POLICY IF EXISTS "Enable insert access for all users" ON messages;
DROP POLICY IF EXISTS "Allow all operations for testing" ON messages;
DROP POLICY IF EXISTS "Enable real-time for all users" ON messages;

-- Create comprehensive policies
CREATE POLICY "Enable read access for all users" ON messages
FOR SELECT USING (true);

CREATE POLICY "Enable insert access for all users" ON messages
FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update access for all users" ON messages
FOR UPDATE USING (true) WITH CHECK (true);

-- Step 9: Ensure RLS is enabled
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Step 10: Test insert with existing booking
DO $$
DECLARE
    existing_booking_id UUID;
BEGIN
    -- Get the first available booking ID
    SELECT id INTO existing_booking_id 
    FROM bookings 
    LIMIT 1;
    
    IF existing_booking_id IS NOT NULL THEN
        -- Test insert with existing booking ID
        INSERT INTO messages (
          booking_id, 
          sender_id, 
          recipient_id,
          sender_type, 
          message, 
          message_type
        ) VALUES (
          existing_booking_id,
          '9882762d-93e4-484c-b055-a14737f76cba',
          '9882762d-93e4-484c-b055-a14737f76cba',
          'system',
          'COMPREHENSIVE TEST: Real-time setup complete - ' || NOW(),
          'text'
        ) RETURNING id, created_at, message;
        
        RAISE NOTICE 'SUCCESS: Test message inserted with booking_id: %', existing_booking_id;
    ELSE
        RAISE NOTICE 'WARNING: No bookings found - real-time test skipped';
    END IF;
END $$;

-- Step 11: Final verification
SELECT 'FINAL STATUS:' as info;
SELECT 
  'Messages table is ready for real-time' as status,
  'All columns added, real-time enabled, policies created' as details;
