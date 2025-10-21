#!/usr/bin/env node

/**
 * Setup Chat System Tables in Supabase
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mjdbhusnplveeaveeovd.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseServiceKey) {
  console.error('❌ Error: SUPABASE_SERVICE_ROLE_KEY is not set')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function setupChatTables() {
  console.log('🚀 Setting up Chat System Tables')
  console.log('=' .repeat(70))
  
  try {
    console.log('\n📋 Step 1: Creating chat_rooms table...')
    
    // Create chat_rooms table
    const { error: roomsError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS chat_rooms (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          booking_id TEXT NOT NULL UNIQUE,
          client_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
          agent_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
          status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'closed', 'archived')),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          last_message_at TIMESTAMP WITH TIME ZONE,
          last_message TEXT,
          unread_count_client INTEGER DEFAULT 0,
          unread_count_agent INTEGER DEFAULT 0
        );
        
        CREATE INDEX IF NOT EXISTS idx_chat_rooms_booking_id ON chat_rooms(booking_id);
        CREATE INDEX IF NOT EXISTS idx_chat_rooms_client_id ON chat_rooms(client_id);
        CREATE INDEX IF NOT EXISTS idx_chat_rooms_agent_id ON chat_rooms(agent_id);
        CREATE INDEX IF NOT EXISTS idx_chat_rooms_status ON chat_rooms(status);
      `
    })

    // If rpc doesn't work, try direct approach
    console.log('\n   Using alternative method to create tables...')
    
    // We'll manually check and inform the user to run SQL
    console.log('   ⚠️  Direct SQL execution from Node.js is limited.')
    console.log('   Please run the SQL manually in Supabase dashboard.')
    
    // Let's try a simpler approach - checking if tables exist
    const { data: existingRooms, error: checkRoomsError } = await supabase
      .from('chat_rooms')
      .select('id')
      .limit(1)
    
    if (checkRoomsError && checkRoomsError.message.includes('does not exist')) {
      console.log('\n❌ Chat rooms table does not exist')
      console.log('   We need to create it manually in Supabase SQL Editor')
    } else if (checkRoomsError) {
      console.log(`\n⚠️  Error checking chat_rooms: ${checkRoomsError.message}`)
    } else {
      console.log('\n✅ chat_rooms table already exists!')
    }

    const { data: existingMessages, error: checkMessagesError } = await supabase
      .from('chat_messages')
      .select('id')
      .limit(1)
    
    if (checkMessagesError && checkMessagesError.message.includes('does not exist')) {
      console.log('❌ Chat messages table does not exist')
    } else if (checkMessagesError) {
      console.log(`⚠️  Error checking chat_messages: ${checkMessagesError.message}`)
    } else {
      console.log('✅ chat_messages table already exists!')
    }

  } catch (error) {
    console.error('❌ Error:', error.message)
  }

  console.log('\n' + '=' .repeat(70))
  console.log('📝 MANUAL SETUP REQUIRED')
  console.log('=' .repeat(70))
  console.log('\nPlease follow these steps to complete the setup:\n')
  console.log('1. Go to: https://supabase.com/dashboard/project/mjdbhusnplveeaveeovd/editor')
  console.log('2. Click on "SQL Editor" in the left sidebar')
  console.log('3. Click "New Query"')
  console.log('4. Copy and paste the SQL from: create-chat-room-tables-fixed.sql')
  console.log('5. Click "Run" (or press Ctrl+Enter)')
  console.log('\n' + '=' .repeat(70))
}

// Create a fixed SQL file
async function createFixedSQL() {
  const sql = `
-- ====================================================================
-- Protector.Ng Chat System Setup
-- Run this in Supabase SQL Editor
-- ====================================================================

-- Step 1: Create chat_rooms table
CREATE TABLE IF NOT EXISTS chat_rooms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id TEXT NOT NULL UNIQUE,
  client_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'closed', 'archived')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_message_at TIMESTAMP WITH TIME ZONE,
  last_message TEXT,
  unread_count_client INTEGER DEFAULT 0,
  unread_count_agent INTEGER DEFAULT 0
);

-- Step 2: Create chat_messages table
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  sender_type VARCHAR(20) NOT NULL CHECK (sender_type IN ('client', 'agent', 'system')),
  message TEXT NOT NULL,
  message_type VARCHAR(20) DEFAULT 'text' CHECK (message_type IN ('text', 'system', 'invoice', 'status_update')),
  metadata JSONB,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 3: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_chat_rooms_booking_id ON chat_rooms(booking_id);
CREATE INDEX IF NOT EXISTS idx_chat_rooms_client_id ON chat_rooms(client_id);
CREATE INDEX IF NOT EXISTS idx_chat_rooms_agent_id ON chat_rooms(agent_id);
CREATE INDEX IF NOT EXISTS idx_chat_rooms_status ON chat_rooms(status);
CREATE INDEX IF NOT EXISTS idx_chat_rooms_last_message_at ON chat_rooms(last_message_at DESC);

CREATE INDEX IF NOT EXISTS idx_chat_messages_room_id ON chat_messages(room_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender_id ON chat_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at);

-- Step 4: Enable Row Level Security
ALTER TABLE chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Step 5: Create RLS policies for chat_rooms
DROP POLICY IF EXISTS "Users can view their own chat rooms" ON chat_rooms;
CREATE POLICY "Users can view their own chat rooms" ON chat_rooms
  FOR SELECT USING (
    auth.uid() = client_id OR 
    auth.uid() = agent_id OR
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role IN ('admin', 'agent')
    )
  );

DROP POLICY IF EXISTS "Users can insert their own chat rooms" ON chat_rooms;
CREATE POLICY "Users can insert their own chat rooms" ON chat_rooms
  FOR INSERT WITH CHECK (
    auth.uid() = client_id OR
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role IN ('admin', 'agent')
    )
  );

DROP POLICY IF EXISTS "Agents can update chat rooms" ON chat_rooms;
CREATE POLICY "Agents can update chat rooms" ON chat_rooms
  FOR UPDATE USING (
    auth.uid() = agent_id OR
    auth.uid() = client_id OR
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role IN ('admin', 'agent')
    )
  );

-- Step 6: Create RLS policies for chat_messages
DROP POLICY IF EXISTS "Users can view messages in their chat rooms" ON chat_messages;
CREATE POLICY "Users can view messages in their chat rooms" ON chat_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM chat_rooms 
      WHERE id = room_id AND (
        client_id = auth.uid() OR 
        agent_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM profiles 
          WHERE id = auth.uid() AND role IN ('admin', 'agent')
        )
      )
    )
  );

DROP POLICY IF EXISTS "Users can insert messages in their chat rooms" ON chat_messages;
CREATE POLICY "Users can insert messages in their chat rooms" ON chat_messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM chat_rooms 
      WHERE id = room_id AND (
        client_id = auth.uid() OR 
        agent_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM profiles 
          WHERE id = auth.uid() AND role IN ('admin', 'agent')
        )
      )
    )
  );

DROP POLICY IF EXISTS "Users can update their own messages" ON chat_messages;
CREATE POLICY "Users can update their own messages" ON chat_messages
  FOR UPDATE USING (
    sender_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role IN ('admin', 'agent')
    )
  );

-- Step 7: Create function to update chat room last message
CREATE OR REPLACE FUNCTION update_chat_room_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE chat_rooms 
  SET 
    last_message = NEW.message,
    last_message_at = NEW.created_at,
    updated_at = NOW()
  WHERE id = NEW.room_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 8: Create trigger to update chat room when message is inserted
DROP TRIGGER IF EXISTS trigger_update_chat_room_message ON chat_messages;
CREATE TRIGGER trigger_update_chat_room_message
  AFTER INSERT ON chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_chat_room_last_message();

-- ====================================================================
-- Success! Chat system is now set up
-- ====================================================================
`;

  fs.writeFileSync('create-chat-room-tables-fixed.sql', sql)
  console.log('✅ Created SQL file: create-chat-room-tables-fixed.sql')
}

async function main() {
  await createFixedSQL()
  await setupChatTables()
}

main()

























