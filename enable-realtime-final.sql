-- ====================================================================
-- ENABLE REAL-TIME FOR MESSAGES - FINAL WORKING VERSION
-- Run this in Supabase SQL Editor
-- ====================================================================

-- Step 1: Try to remove messages from publication (ignore error if not there)
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime DROP TABLE messages;
  RAISE NOTICE 'Removed messages from publication';
EXCEPTION
  WHEN undefined_object THEN
    RAISE NOTICE 'Messages table was not in publication (this is fine)';
  WHEN OTHERS THEN
    RAISE NOTICE 'Could not remove table: %', SQLERRM;
END $$;

-- Step 2: Add messages table to real-time publication
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE messages;
  RAISE NOTICE '✅ Added messages to real-time publication';
EXCEPTION
  WHEN duplicate_object THEN
    RAISE NOTICE '✅ Messages already in publication (this is fine)';
  WHEN OTHERS THEN
    RAISE NOTICE '❌ Error adding to publication: %', SQLERRM;
END $$;

-- Step 3: Add sender_type column if missing
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='messages' AND column_name='sender_type'
    ) THEN
        ALTER TABLE messages ADD COLUMN sender_type TEXT;
        RAISE NOTICE '✅ Added sender_type column';
    ELSE
        RAISE NOTICE '✅ sender_type column already exists';
    END IF;
END $$;

-- Step 4: Create RLS policy (drop if exists first)
DO $$
BEGIN
    DROP POLICY IF EXISTS "Allow authenticated users" ON messages;
    CREATE POLICY "Allow authenticated users" ON messages
    FOR ALL 
    TO authenticated
    USING (true) 
    WITH CHECK (true);
    RAISE NOTICE '✅ RLS policy created';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '⚠️ Policy creation: %', SQLERRM;
END $$;

-- Step 5: Verify real-time is enabled
DO $$
DECLARE
    is_enabled boolean;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'messages'
    ) INTO is_enabled;
    
    IF is_enabled THEN
        RAISE NOTICE '';
        RAISE NOTICE '🎉 SUCCESS! Real-time is ENABLED for messages table';
        RAISE NOTICE '';
    ELSE
        RAISE NOTICE '';
        RAISE NOTICE '❌ WARNING: Real-time is NOT enabled';
        RAISE NOTICE '';
    END IF;
END $$;

