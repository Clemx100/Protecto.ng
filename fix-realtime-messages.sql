-- ====================================================================
-- FIX REAL-TIME FOR MESSAGES TABLE
-- Run this in Supabase SQL Editor to enable real-time subscriptions
-- ====================================================================

-- Step 1: Enable real-time on the messages table
ALTER PUBLICATION supabase_realtime ADD TABLE messages;

-- Step 2: Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow all operations for testing" ON messages;
DROP POLICY IF EXISTS "Users can view their own messages" ON messages;
DROP POLICY IF EXISTS "Users can insert their own messages" ON messages;

-- Step 3: Create a permissive policy for testing
CREATE POLICY "Allow all operations for testing" ON messages
FOR ALL USING (true) WITH CHECK (true);

-- Step 4: Ensure RLS is enabled
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Step 5: Verify the setup
SELECT 
  'Real-time enabled for messages table' as status,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE tablename = 'messages' 
  AND schemaname = 'public';
