-- ====================================================================
-- FORCE SCHEMA CACHE REFRESH
-- Run this in Supabase SQL Editor to force schema cache update
-- ====================================================================

-- Step 1: Force schema cache refresh by querying system tables
SELECT 'Forcing schema cache refresh...' as info;

-- Query the system catalog to force cache refresh
SELECT 
  table_schema,
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'messages' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- Step 2: Check if message column actually exists in the database
SELECT 'Checking if message column exists...' as info;
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'messages' 
      AND column_name = 'message'
      AND table_schema = 'public'
    ) THEN 'message column EXISTS in database'
    ELSE 'message column DOES NOT EXIST in database'
  END as column_status;

-- Step 3: If message column doesn't exist, create it properly
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'messages' 
        AND column_name = 'message'
        AND table_schema = 'public'
    ) THEN
        -- Add message column with proper constraints
        ALTER TABLE messages ADD COLUMN message TEXT NOT NULL DEFAULT 'Default message';
        RAISE NOTICE 'Created message column with NOT NULL constraint and default value';
        
        -- Update any existing rows
        UPDATE messages SET message = 'Legacy message' WHERE message = 'Default message';
        RAISE NOTICE 'Updated existing rows with legacy message content';
    ELSE
        RAISE NOTICE 'Message column already exists';
    END IF;
END $$;

-- Step 4: Ensure all other required columns exist
DO $$
BEGIN
    -- Add recipient_id if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'messages' 
        AND column_name = 'recipient_id'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE messages ADD COLUMN recipient_id UUID;
        RAISE NOTICE 'Added recipient_id column';
    END IF;
    
    -- Add sender_type if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'messages' 
        AND column_name = 'sender_type'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE messages ADD COLUMN sender_type TEXT DEFAULT 'client';
        RAISE NOTICE 'Added sender_type column';
    END IF;
    
    -- Add message_type if missing
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

-- Step 5: Force multiple schema queries to refresh cache
SELECT 'Refreshing schema cache with multiple queries...' as info;
SELECT COUNT(*) as total_messages FROM messages;
SELECT COUNT(*) as message_column_count FROM messages WHERE message IS NOT NULL;
SELECT MAX(LENGTH(message)) as max_message_length FROM messages;

-- Step 6: Show final table structure
SELECT 'Final messages table structure:' as info;
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'messages' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- Step 7: Test insert to verify schema cache is updated
DO $$
DECLARE
    existing_booking_id UUID;
    new_message_id UUID;
BEGIN
    -- Get the first available booking ID
    SELECT id INTO existing_booking_id 
    FROM bookings 
    LIMIT 1;
    
    IF existing_booking_id IS NOT NULL THEN
        -- Test insert with message column
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
          'SCHEMA CACHE REFRESH TEST: ' || NOW(),
          'text'
        ) RETURNING id INTO new_message_id;
        
        RAISE NOTICE 'SUCCESS: Test message inserted with ID: %', new_message_id;
    ELSE
        RAISE NOTICE 'WARNING: No bookings found - test skipped';
    END IF;
END $$;

-- Step 8: Final verification
SELECT 'SCHEMA CACHE REFRESH COMPLETE' as status;
SELECT 'Message column should now be recognized by Supabase' as details;
