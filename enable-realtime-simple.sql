-- ====================================================================
-- SIMPLE REAL-TIME ENABLEMENT
-- Run this in Supabase SQL Editor to enable real-time
-- ====================================================================

-- Step 1: Enable real-time on messages table (ignore if already exists)
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

-- Step 2: Drop and recreate RLS policies
DROP POLICY IF EXISTS "Enable read access for all users" ON messages;
DROP POLICY IF EXISTS "Enable insert access for all users" ON messages;
DROP POLICY IF EXISTS "Enable update access for all users" ON messages;
DROP POLICY IF EXISTS "Allow all operations for testing" ON messages;

-- Step 3: Create simple permissive policies
CREATE POLICY "Enable read access for all users" ON messages
FOR SELECT USING (true);

CREATE POLICY "Enable insert access for all users" ON messages
FOR INSERT WITH CHECK (true);

-- Step 4: Ensure RLS is enabled
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Step 5: Test insert to verify everything works
INSERT INTO messages (
  booking_id, 
  sender_id, 
  recipient_id,
  sender_type, 
  message, 
  message_type
) VALUES (
  '819eb493-6c9e-468b-a46e-d160eb396c9f',
  '9882762d-93e4-484c-b055-a14737f76cba',
  '9882762d-93e4-484c-b055-a14737f76cba',
  'system',
  'Real-time test message - ' || NOW(),
  'text'
) RETURNING id, created_at, message;

-- Step 6: Verify setup
SELECT 
  'Setup Complete' as status,
  'Real-time enabled on messages table' as message;
