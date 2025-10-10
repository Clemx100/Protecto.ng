-- ====================================================================
-- ADD MISSING COLUMNS TO MESSAGES TABLE
-- Run this in Supabase SQL Editor to add missing columns
-- ====================================================================

-- Step 1: Add missing columns to messages table
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
    ELSE
        RAISE NOTICE 'recipient_id column already exists';
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
    ELSE
        RAISE NOTICE 'sender_type column already exists';
    END IF;
    
    -- Add message column if it doesn't exist (instead of content)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'messages' 
        AND column_name = 'message'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE messages ADD COLUMN message TEXT;
        RAISE NOTICE 'Added message column';
    ELSE
        RAISE NOTICE 'message column already exists';
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
    ELSE
        RAISE NOTICE 'message_type column already exists';
    END IF;
END $$;

-- Step 2: Enable real-time on messages table
DO $$
BEGIN
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE messages;
        RAISE NOTICE 'Real-time enabled on messages table';
    EXCEPTION
        WHEN duplicate_object THEN
            RAISE NOTICE 'Real-time already enabled on messages table';
    END;
END $$;

-- Step 3: Drop and recreate RLS policies
DROP POLICY IF EXISTS "Enable read access for all users" ON messages;
DROP POLICY IF EXISTS "Enable insert access for all users" ON messages;
DROP POLICY IF EXISTS "Allow all operations for testing" ON messages;

-- Create simple permissive policies
CREATE POLICY "Enable read access for all users" ON messages
FOR SELECT USING (true);

CREATE POLICY "Enable insert access for all users" ON messages
FOR INSERT WITH CHECK (true);

-- Step 4: Ensure RLS is enabled
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Step 5: Show current table structure
SELECT 
  'Current messages table structure' as info,
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'messages' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- Step 6: Find an existing booking ID first
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
          'Real-time test message - ' || NOW(),
          'text'
        ) RETURNING id, created_at, message;
        
        RAISE NOTICE 'Test message inserted successfully with booking_id: %', existing_booking_id;
    ELSE
        RAISE NOTICE 'No bookings found in database - skipping test insert';
    END IF;
END $$;

-- Step 7: Verify setup
SELECT 
  'Setup Complete' as status,
  'All columns added and real-time enabled' as message;
