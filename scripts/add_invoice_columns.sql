-- Add invoice and system message columns to messages table
-- Run this in your Supabase SQL Editor

-- Add new columns to messages table
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS has_invoice BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS invoice_data JSONB,
ADD COLUMN IF NOT EXISTS is_system_message BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS sender_type TEXT DEFAULT 'client';

-- Update existing messages to have proper sender_type
UPDATE messages 
SET sender_type = 'client' 
WHERE sender_type IS NULL;

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_messages_has_invoice ON messages(has_invoice);
CREATE INDEX IF NOT EXISTS idx_messages_is_system_message ON messages(is_system_message);
CREATE INDEX IF NOT EXISTS idx_messages_sender_type ON messages(sender_type);

-- Update RLS policies to handle new columns
DROP POLICY IF EXISTS "Users can view booking messages" ON messages;
DROP POLICY IF EXISTS "Users can send booking messages" ON messages;

-- Recreate RLS policies with updated column references
CREATE POLICY "Users can view booking messages" ON messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM bookings 
            WHERE bookings.id = messages.booking_id 
            AND (bookings.client_id = auth.uid() OR bookings.assigned_agent_id = auth.uid())
        ) OR is_admin()
    );

CREATE POLICY "Users can send booking messages" ON messages
    FOR INSERT WITH CHECK (
        auth.uid() = sender_id 
        AND EXISTS (
            SELECT 1 FROM bookings 
            WHERE bookings.id = messages.booking_id 
            AND (bookings.client_id = auth.uid() OR bookings.assigned_agent_id = auth.uid())
        )
    );

-- Allow system messages (when sender_id is 'operator' or 'system')
CREATE POLICY "Allow system messages" ON messages
    FOR INSERT WITH CHECK (
        sender_id IN ('operator', 'system') 
        OR auth.uid() = sender_id
    );

-- Allow operators to send messages
CREATE POLICY "Allow operator messages" ON messages
    FOR INSERT WITH CHECK (
        sender_id = 'operator'
        OR auth.uid() = sender_id
    );
