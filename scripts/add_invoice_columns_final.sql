-- Add invoice and system message columns to messages table (FINAL VERSION)
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

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_messages_has_invoice ON messages(has_invoice);
CREATE INDEX IF NOT EXISTS idx_messages_is_system_message ON messages(is_system_message);
CREATE INDEX IF NOT EXISTS idx_messages_sender_type ON messages(sender_type);

-- Drop existing policies that might cause conflicts
DROP POLICY IF EXISTS "Users can view booking messages" ON messages;
DROP POLICY IF EXISTS "Users can send booking messages" ON messages;
DROP POLICY IF EXISTS "Allow system messages" ON messages;
DROP POLICY IF EXISTS "Allow operator messages" ON messages;

-- Create RLS policies that work with UUID sender_id
CREATE POLICY "Users can view booking messages" ON messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM bookings 
            WHERE bookings.id = messages.booking_id 
            AND (bookings.client_id = auth.uid() OR bookings.assigned_agent_id = auth.uid())
        )
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

-- Allow system messages based on sender_type instead of sender_id
CREATE POLICY "Allow system messages" ON messages
    FOR INSERT WITH CHECK (
        sender_type IN ('operator', 'system')
        OR auth.uid() = sender_id
    );

-- Allow operator messages based on sender_type
CREATE POLICY "Allow operator messages" ON messages
    FOR INSERT WITH CHECK (
        sender_type = 'operator'
        OR auth.uid() = sender_id
    );
