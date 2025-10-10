-- ====================================================================
-- FIX REAL-TIME PROPERLY
-- Run this in Supabase SQL Editor to fix real-time subscriptions
-- ====================================================================

-- Step 1: Drop all existing policies on messages table
DROP POLICY IF EXISTS "Allow all operations for testing" ON messages;
DROP POLICY IF EXISTS "Users can view their own messages" ON messages;
DROP POLICY IF EXISTS "Users can insert their own messages" ON messages;
DROP POLICY IF EXISTS "Enable real-time for all users" ON messages;

-- Step 2: Create proper RLS policies for real-time
-- Policy for SELECT (reading messages)
CREATE POLICY "Enable read access for all users" ON messages
FOR SELECT USING (true);

-- Policy for INSERT (creating messages)
CREATE POLICY "Enable insert access for all users" ON messages
FOR INSERT WITH CHECK (true);

-- Policy for UPDATE (updating messages)
CREATE POLICY "Enable update access for all users" ON messages
FOR UPDATE USING (true) WITH CHECK (true);

-- Step 3: Ensure RLS is enabled
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Step 4: Verify the messages table structure is correct
-- Check if all required columns exist
DO $$
BEGIN
    -- Check if recipient_id column exists, if not add it
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'messages' 
        AND column_name = 'recipient_id'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE messages ADD COLUMN recipient_id UUID;
    END IF;
    
    -- Check if sender_type column exists, if not add it
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'messages' 
        AND column_name = 'sender_type'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE messages ADD COLUMN sender_type TEXT DEFAULT 'client';
    END IF;
    
    -- Check if content column exists, if not add it
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'messages' 
        AND column_name = 'content'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE messages ADD COLUMN content TEXT;
    END IF;
    
    -- Check if message_type column exists, if not add it
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'messages' 
        AND column_name = 'message_type'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE messages ADD COLUMN message_type TEXT DEFAULT 'text';
    END IF;
END $$;

-- Step 5: Verify real-time is enabled
SELECT 
  'Real-time verification' as check_type,
  schemaname,
  tablename
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' 
  AND tablename = 'messages';

-- Step 6: Show final table structure
SELECT 
  'Final messages table structure' as check_type,
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'messages' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- Step 7: Test insert to verify everything works
INSERT INTO messages (
  booking_id, 
  sender_id, 
  recipient_id,
  sender_type, 
  content, 
  message_type
) VALUES (
  '819eb493-6c9e-468b-a46e-d160eb396c9f',
  '9882762d-93e4-484c-b055-a14737f76cba',
  '9882762d-93e4-484c-b055-a14737f76cba',
  'client',
  'Real-time test message - ' || NOW(),
  'text'
) RETURNING id, created_at;
