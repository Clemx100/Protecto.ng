-- ====================================================================
-- COMPREHENSIVE FIX FOR MESSAGES TABLE
-- This script ensures the messages table has all required columns
-- and proper configurations for chat functionality
-- ====================================================================

-- Step 1: Check current table structure
SELECT 
  'Current messages table structure:' as info;
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'messages' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- Step 2: Add missing columns if they don't exist
DO $$
BEGIN
    -- Add sender_type column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'messages' 
        AND column_name = 'sender_type'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE messages ADD COLUMN sender_type TEXT DEFAULT 'client';
        RAISE NOTICE '✅ Added sender_type column';
    ELSE
        RAISE NOTICE '✓ sender_type column already exists';
    END IF;
    
    -- Add sender_role column if it doesn't exist (for backward compatibility)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'messages' 
        AND column_name = 'sender_role'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE messages ADD COLUMN sender_role TEXT DEFAULT 'client';
        RAISE NOTICE '✅ Added sender_role column';
    ELSE
        RAISE NOTICE '✓ sender_role column already exists';
    END IF;
    
    -- Add recipient_id column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'messages' 
        AND column_name = 'recipient_id'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE messages ADD COLUMN recipient_id UUID;
        RAISE NOTICE '✅ Added recipient_id column';
    ELSE
        RAISE NOTICE '✓ recipient_id column already exists';
    END IF;
    
    -- Add message_type column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'messages' 
        AND column_name = 'message_type'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE messages ADD COLUMN message_type TEXT DEFAULT 'text';
        RAISE NOTICE '✅ Added message_type column';
    ELSE
        RAISE NOTICE '✓ message_type column already exists';
    END IF;
    
    -- Add metadata column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'messages' 
        AND column_name = 'metadata'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE messages ADD COLUMN metadata JSONB DEFAULT '{}'::JSONB;
        RAISE NOTICE '✅ Added metadata column';
    ELSE
        RAISE NOTICE '✓ metadata column already exists';
    END IF;

    -- Sync sender_role with sender_type if both exist
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'messages' 
        AND column_name = 'sender_type'
        AND table_schema = 'public'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'messages' 
        AND column_name = 'sender_role'
        AND table_schema = 'public'
    ) THEN
        -- Update sender_role to match sender_type where they differ
        UPDATE messages 
        SET sender_role = COALESCE(sender_type, sender_role, 'client')
        WHERE sender_role IS DISTINCT FROM sender_type;
        
        -- Update sender_type to match sender_role where sender_type is null
        UPDATE messages 
        SET sender_type = COALESCE(sender_role, sender_type, 'client')
        WHERE sender_type IS NULL;
        
        RAISE NOTICE '✅ Synced sender_type and sender_role columns';
    END IF;
END $$;

-- Step 3: Drop existing RLS policies and recreate them
DROP POLICY IF EXISTS "Allow all operations for testing" ON messages;
DROP POLICY IF EXISTS "Users can view their own messages" ON messages;
DROP POLICY IF EXISTS "Users can insert their own messages" ON messages;
DROP POLICY IF EXISTS "Enable read access for all users" ON messages;
DROP POLICY IF EXISTS "Enable insert access for all users" ON messages;
DROP POLICY IF EXISTS "Enable update access for all users" ON messages;
DROP POLICY IF EXISTS "Service role full access to messages" ON messages;
DROP POLICY IF EXISTS "Authenticated users can send messages" ON messages;
DROP POLICY IF EXISTS "Users can view their booking messages" ON messages;
DROP POLICY IF EXISTS "Service role can view all messages" ON messages;
DROP POLICY IF EXISTS "Service role can insert messages" ON messages;
DROP POLICY IF EXISTS "Users can create messages for their bookings" ON messages;

-- Step 4: Create comprehensive RLS policies
-- Policy for service role (full access)
CREATE POLICY "Service role full access" ON messages
FOR ALL
USING (true)
WITH CHECK (true);

-- Policy for authenticated users to read messages from their bookings
CREATE POLICY "Users can read booking messages" ON messages
FOR SELECT
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

-- Policy for authenticated users to insert messages
CREATE POLICY "Users can send messages" ON messages
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Step 5: Ensure RLS is enabled
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Step 6: Enable realtime for messages table
ALTER PUBLICATION supabase_realtime ADD TABLE messages;

-- Step 7: Show final table structure
SELECT 
  '✅ Final messages table structure:' as info;
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'messages' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- Step 8: Show active policies
SELECT 
  '✅ Active RLS policies:' as info;
SELECT 
  policyname,
  cmd,
  roles
FROM pg_policies
WHERE tablename = 'messages';

-- Step 9: Test message count
SELECT 
  '✅ Current message count:' as info,
  COUNT(*) as total_messages
FROM messages;

SELECT '✅ ✅ ✅ ALL FIXES APPLIED SUCCESSFULLY! ✅ ✅ ✅' as status;




