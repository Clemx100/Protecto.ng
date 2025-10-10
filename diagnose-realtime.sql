-- ====================================================================
-- DIAGNOSE REAL-TIME ISSUE
-- Run this in Supabase SQL Editor to check real-time status
-- ====================================================================

-- Check if messages table is in real-time publication
SELECT 
  'Messages table real-time status' as check_type,
  schemaname,
  tablename
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' 
  AND tablename = 'messages';

-- Check RLS status on messages table
SELECT 
  'RLS status on messages table' as check_type,
  schemaname,
  tablename,
  rowsecurity,
  relowner
FROM pg_tables 
WHERE tablename = 'messages' 
  AND schemaname = 'public';

-- Check existing policies on messages table
SELECT 
  'Existing policies on messages table' as check_type,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'messages' 
  AND schemaname = 'public';

-- Check messages table structure
SELECT 
  'Messages table structure' as check_type,
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'messages' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- Test inserting a message directly
INSERT INTO messages (
  booking_id, 
  sender_id, 
  sender_type, 
  content, 
  message_type
) VALUES (
  '819eb493-6c9e-468b-a46e-d160eb396c9f',
  '9882762d-93e4-484c-b055-a14737f76cba',
  'client',
  'Direct SQL test message - ' || NOW(),
  'text'
) RETURNING id, created_at;
