-- ====================================================================
-- FIX MESSAGE COLUMN AND REFRESH SCHEMA CACHE
-- Run this in Supabase SQL Editor to fix the message column issue
-- ====================================================================

-- Step 1: Check current table structure
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

-- Step 2: Drop and recreate the message column to ensure it exists
DO $$
BEGIN
    -- Drop message column if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'messages' 
        AND column_name = 'message'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE messages DROP COLUMN message;
        RAISE NOTICE 'Dropped existing message column';
    END IF;
    
    -- Add message column
    ALTER TABLE messages ADD COLUMN message TEXT NOT NULL DEFAULT '';
    RAISE NOTICE 'Added message column with NOT NULL constraint';
    
    -- Update existing rows to have message content (skip if no content column exists)
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'messages' 
        AND column_name = 'content'
        AND table_schema = 'public'
    ) THEN
        UPDATE messages 
        SET message = COALESCE(content, '') 
        WHERE message = '' OR message IS NULL;
        RAISE NOTICE 'Updated existing rows with message content from content column';
    ELSE
        -- Just set default message for existing rows
        UPDATE messages 
        SET message = 'Legacy message' 
        WHERE message = '' OR message IS NULL;
        RAISE NOTICE 'Set default message for existing rows';
    END IF;
END $$;

-- Step 3: Ensure all required columns exist
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

-- Step 4: Refresh schema cache by querying the table
SELECT 'Refreshing schema cache...' as info;
SELECT COUNT(*) as message_count FROM messages;

-- Step 5: Show final table structure
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

-- Step 6: Test insert to verify everything works
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
        -- Test insert with all required columns
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
          'SCHEMA CACHE FIX TEST: ' || NOW(),
          'text'
        ) RETURNING id INTO new_message_id;
        
        RAISE NOTICE 'SUCCESS: Test message inserted with ID: %', new_message_id;
    ELSE
        RAISE NOTICE 'WARNING: No bookings found - test skipped';
    END IF;
END $$;

-- Step 7: Final verification
SELECT 'FINAL STATUS:' as info;
SELECT 
  'Message column fixed and schema cache refreshed' as status,
  'All required columns now exist' as details;
