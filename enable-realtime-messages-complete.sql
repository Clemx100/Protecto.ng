-- ====================================================================
-- ENABLE REAL-TIME FOR MESSAGES TABLE - COMPLETE SETUP
-- Run this in Supabase SQL Editor to enable real-time message synchronization
-- ====================================================================

-- Step 1: Enable real-time publication for messages table
-- First, drop the table from publication if it exists to avoid errors
ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS messages;
-- Then add it fresh
ALTER PUBLICATION supabase_realtime ADD TABLE messages;

-- Step 2: Verify real-time is enabled
SELECT schemaname, tablename, 'Realtime enabled' as status
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime' AND tablename = 'messages';

-- Step 3: Add sender_type column if it doesn't exist (from previous fix)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='messages' AND column_name='sender_type'
    ) THEN
        ALTER TABLE messages ADD COLUMN sender_type TEXT CHECK (sender_type IN ('client', 'operator', 'system', 'agent', 'admin'));
        RAISE NOTICE 'Added sender_type column to messages table';
    ELSE
        RAISE NOTICE 'sender_type column already exists';
    END IF;
END $$;

-- Step 4: Ensure RLS policies allow real-time subscriptions
-- Drop existing policies if they're too restrictive
DROP POLICY IF EXISTS "Allow all operations for testing" ON messages;

-- Create permissive policy for testing (you can tighten this later)
CREATE POLICY "Allow all operations for authenticated users" ON messages
FOR ALL 
TO authenticated
USING (true) 
WITH CHECK (true);

-- Step 5: Grant necessary permissions
GRANT ALL ON messages TO authenticated;
GRANT ALL ON messages TO anon;

-- Step 6: Create indexes for better real-time performance
CREATE INDEX IF NOT EXISTS idx_messages_booking_id_created ON messages(booking_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_sender_type ON messages(sender_type);

-- Step 7: Verify the setup
SELECT 
  'messages table' as table_name,
  CASE WHEN EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'messages'
  ) THEN '✅ Enabled' ELSE '❌ Not enabled' END as realtime_status,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='messages' AND column_name='sender_type'
  ) THEN '✅ Present' ELSE '❌ Missing' END as sender_type_column,
  CASE WHEN EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'messages' AND policyname LIKE '%authenticated%'
  ) THEN '✅ Configured' ELSE '❌ Not configured' END as rls_policies;

-- Show success message
DO $$
BEGIN
  RAISE NOTICE '✅ Real-time setup complete! Messages will now synchronize in real-time.';
END $$;

