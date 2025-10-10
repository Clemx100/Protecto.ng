-- ====================================================================
-- ENABLE REAL-TIME FOR BOOKINGS AND MESSAGES
-- ====================================================================

-- Add tables to realtime publication
ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS bookings;
ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS messages;

ALTER PUBLICATION supabase_realtime ADD TABLE bookings;
ALTER PUBLICATION supabase_realtime ADD TABLE messages;

-- Verify
SELECT tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime'
AND tablename IN ('bookings', 'messages');

-- ====================================================================
-- ✅ Real-time enabled for bookings and messages
-- ✅ Operator dashboard will now show notifications in real-time
-- ====================================================================

