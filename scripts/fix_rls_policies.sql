-- Fix RLS policies for operator messages
-- Run this in your Supabase SQL Editor

-- Drop conflicting policies
DROP POLICY IF EXISTS "Users can send booking messages" ON messages;
DROP POLICY IF EXISTS "Allow system messages" ON messages;
DROP POLICY IF EXISTS "Allow operator messages" ON messages;

-- Create a single comprehensive policy that handles all cases
CREATE POLICY "Allow all message operations" ON messages
    FOR ALL USING (
        -- Allow viewing messages if user is involved in the booking
        EXISTS (
            SELECT 1 FROM bookings 
            WHERE bookings.id = messages.booking_id 
            AND (bookings.client_id = auth.uid() OR bookings.assigned_agent_id = auth.uid())
        )
        -- OR if it's a system/operator message (for real-time subscriptions)
        OR sender_type IN ('operator', 'system')
    )
    WITH CHECK (
        -- Allow inserting messages if user is involved in the booking
        EXISTS (
            SELECT 1 FROM bookings 
            WHERE bookings.id = messages.booking_id 
            AND (bookings.client_id = auth.uid() OR bookings.assigned_agent_id = auth.uid())
        )
        -- OR if it's a system/operator message
        OR sender_type IN ('operator', 'system')
    );
