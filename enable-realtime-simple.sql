-- ====================================================================
-- SIMPLE REAL-TIME SETUP FOR MESSAGES TABLE
-- Run this in Supabase SQL Editor
-- ====================================================================

-- 1. Remove messages from publication (if it exists) to start fresh
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS messages;
EXCEPTION
  WHEN undefined_object THEN
    -- Table wasn't in publication, that's fine
    NULL;
END $$;

-- 2. Add messages table to real-time publication
ALTER PUBLICATION supabase_realtime ADD TABLE messages;

-- 3. Add sender_type column if missing
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='messages' AND column_name='sender_type'
    ) THEN
        ALTER TABLE messages ADD COLUMN sender_type TEXT;
    END IF;
END $$;

-- 4. Create simple policy for testing (allows all authenticated users)
DROP POLICY IF EXISTS "Allow authenticated users" ON messages;
CREATE POLICY "Allow authenticated users" ON messages
FOR ALL 
TO authenticated
USING (true) 
WITH CHECK (true);

-- 5. Verify setup
SELECT 
  CASE WHEN EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'messages'
  ) THEN '✅ Real-time ENABLED' ELSE '❌ Real-time NOT enabled' END as status;
