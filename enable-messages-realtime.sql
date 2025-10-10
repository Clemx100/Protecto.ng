-- ====================================================================
-- Enable Real-time on Messages Table
-- Run this in Supabase SQL Editor to fix CHANNEL_ERROR
-- ====================================================================

-- Step 1: Enable real-time on the messages table
ALTER PUBLICATION supabase_realtime ADD TABLE messages;

-- Step 2: Create or update RLS policies for messages table
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own messages" ON messages;
DROP POLICY IF EXISTS "Users can insert their own messages" ON messages;
DROP POLICY IF EXISTS "Allow all operations for testing" ON messages;

-- Create RLS policies for messages table
CREATE POLICY "Allow all operations for testing" ON messages
FOR ALL USING (true) WITH CHECK (true);

-- Step 3: Ensure RLS is enabled on messages table
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Step 4: Verify the table structure
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'messages' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- Step 5: Check if real-time is enabled
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE tablename = 'messages' 
  AND schemaname = 'public';

-- Step 6: Verify publication includes messages table
SELECT 
  schemaname,
  tablename
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' 
  AND tablename = 'messages';
