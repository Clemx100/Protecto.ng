-- ====================================================================
-- FIX MESSAGES TABLE SCHEMA - Add Missing Columns
-- Run this in Supabase SQL Editor to ensure messages work correctly
-- ====================================================================

-- Step 1: Add sender_type column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='messages' AND column_name='sender_type'
    ) THEN
        ALTER TABLE messages ADD COLUMN sender_type TEXT CHECK (sender_type IN ('client', 'operator', 'system', 'agent', 'admin'));
        RAISE NOTICE 'Added sender_type column to messages table';
    ELSE
        RAISE NOTICE 'sender_type column already exists in messages table';
    END IF;
END $$;

-- Step 2: Add updated_at column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='messages' AND column_name='updated_at'
    ) THEN
        ALTER TABLE messages ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        RAISE NOTICE 'Added updated_at column to messages table';
    ELSE
        RAISE NOTICE 'updated_at column already exists in messages table';
    END IF;
END $$;

-- Step 3: Ensure content column exists (some older schemas might use 'message' instead)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='messages' AND column_name='content'
    ) THEN
        -- If content doesn't exist but message does, rename message to content
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name='messages' AND column_name='message'
        ) THEN
            ALTER TABLE messages RENAME COLUMN message TO content;
            RAISE NOTICE 'Renamed message column to content in messages table';
        ELSE
            -- If neither exists, add content column
            ALTER TABLE messages ADD COLUMN content TEXT NOT NULL DEFAULT '';
            RAISE NOTICE 'Added content column to messages table';
        END IF;
    ELSE
        RAISE NOTICE 'content column already exists in messages table';
    END IF;
END $$;

-- Step 4: Backfill sender_type for existing messages (set default based on patterns)
UPDATE messages 
SET sender_type = 'client' 
WHERE sender_type IS NULL;

-- Step 5: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_messages_sender_type ON messages(sender_type);
CREATE INDEX IF NOT EXISTS idx_messages_booking_created ON messages(booking_id, created_at DESC);

-- Step 6: Enable real-time for messages table if not already enabled
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS messages;

-- Step 7: Verify the schema
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'messages'
ORDER BY ordinal_position;

RAISE NOTICE '✅ Messages table schema fix complete!';







