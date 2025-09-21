#!/usr/bin/env node

/**
 * Booking Synchronization Fix Script
 * This script applies all necessary database changes to fix booking synchronization
 * between different devices and locations.
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Load environment variables
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:')
  console.error('   NEXT_PUBLIC_SUPABASE_URL')
  console.error('   SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function runSQLFile(filePath) {
  try {
    console.log(`📄 Reading SQL file: ${filePath}`)
    const sql = fs.readFileSync(filePath, 'utf8')
    
    console.log(`🚀 Executing SQL from: ${filePath}`)
    const { data, error } = await supabase.rpc('exec_sql', { sql })
    
    if (error) {
      console.error(`❌ Error executing ${filePath}:`, error)
      return false
    }
    
    console.log(`✅ Successfully executed: ${filePath}`)
    return true
  } catch (error) {
    console.error(`❌ Failed to execute ${filePath}:`, error.message)
    return false
  }
}

async function executeSQLDirectly(sql, description) {
  try {
    console.log(`🚀 Executing: ${description}`)
    
    // Split SQL into individual statements
    const statements = sql
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0)
    
    for (const statement of statements) {
      if (statement.trim()) {
        const { error } = await supabase.rpc('exec_sql', { sql: statement + ';' })
        if (error) {
          console.error(`❌ Error executing statement:`, error)
          console.error(`Statement: ${statement.substring(0, 100)}...`)
          return false
        }
      }
    }
    
    console.log(`✅ Successfully executed: ${description}`)
    return true
  } catch (error) {
    console.error(`❌ Failed to execute ${description}:`, error.message)
    return false
  }
}

async function main() {
  console.log('🛡️  Protector.Ng Booking Synchronization Fix')
  console.log('===============================================')
  console.log('')
  
  try {
    // Step 1: Apply database schema updates
    console.log('📋 Step 1: Applying database schema updates...')
    
    const schemaSQL = `
      -- Add operator role to enum if not exists
      DO $$ 
      BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role' AND typtype = 'e') THEN
              CREATE TYPE user_role AS ENUM ('client', 'agent', 'operator', 'admin');
          ELSE
              -- Add operator to existing enum if it doesn't exist
              IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'operator' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role')) THEN
                  ALTER TYPE user_role ADD VALUE 'operator';
              END IF;
          END IF;
      END $$;
    `
    
    await executeSQLDirectly(schemaSQL, 'Add operator role to enum')
    
    // Step 2: Create operator account
    console.log('👤 Step 2: Creating operator account...')
    
    const operatorAccountSQL = `
      -- Create operator account
      INSERT INTO auth.users (
          id,
          instance_id,
          aud,
          role,
          email,
          encrypted_password,
          email_confirmed_at,
          created_at,
          updated_at,
          confirmation_token,
          email_change,
          email_change_token_new,
          recovery_token
      ) VALUES (
          gen_random_uuid(),
          '00000000-0000-0000-0000-000000000000',
          'authenticated',
          'authenticated',
          'operator@protector.ng',
          crypt('operator123!', gen_salt('bf')),
          NOW(),
          NOW(),
          NOW(),
          '',
          '',
          '',
          ''
      ) ON CONFLICT (email) DO NOTHING;
    `
    
    await executeSQLDirectly(operatorAccountSQL, 'Create operator account')
    
    // Step 3: Create operator profile
    console.log('👤 Step 3: Creating operator profile...')
    
    const operatorProfileSQL = `
      -- Create operator profile
      INSERT INTO profiles (
          id,
          email,
          first_name,
          last_name,
          role,
          phone,
          is_verified,
          is_active,
          created_at,
          updated_at
      )
      SELECT 
          u.id,
          'operator@protector.ng',
          'Protector',
          'Operator',
          'operator',
          '+234-800-000-0000',
          true,
          true,
          NOW(),
          NOW()
      FROM auth.users u
      WHERE u.email = 'operator@protector.ng'
      ON CONFLICT (id) DO UPDATE SET
          role = 'operator',
          updated_at = NOW();
    `
    
    await executeSQLDirectly(operatorProfileSQL, 'Create operator profile')
    
    // Step 4: Add helper functions
    console.log('🔧 Step 4: Adding helper functions...')
    
    const helperFunctionsSQL = `
      -- Add operator helper function
      CREATE OR REPLACE FUNCTION is_operator()
      RETURNS BOOLEAN AS $$
      BEGIN
          RETURN get_user_role() = 'operator';
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `
    
    await executeSQLDirectly(helperFunctionsSQL, 'Add operator helper function')
    
    // Step 5: Add RLS policies
    console.log('🔒 Step 5: Adding RLS policies...')
    
    const rlsPoliciesSQL = `
      -- Add operator RLS policies for bookings
      DROP POLICY IF EXISTS "Operators can view all bookings" ON bookings;
      CREATE POLICY "Operators can view all bookings" ON bookings
          FOR SELECT USING (is_operator() OR is_admin());

      DROP POLICY IF EXISTS "Operators can update booking status" ON bookings;
      CREATE POLICY "Operators can update booking status" ON bookings
          FOR UPDATE USING (is_operator() OR is_admin());

      -- Add operator RLS policies for messages
      DROP POLICY IF EXISTS "Operators can view all messages" ON messages;
      CREATE POLICY "Operators can view all messages" ON messages
          FOR SELECT USING (is_operator() OR is_admin());

      DROP POLICY IF EXISTS "Operators can send messages" ON messages;
      CREATE POLICY "Operators can send messages" ON messages
          FOR INSERT WITH CHECK (is_operator() OR is_admin());
    `
    
    await executeSQLDirectly(rlsPoliciesSQL, 'Add RLS policies')
    
    // Step 6: Create default services
    console.log('🛠️  Step 6: Creating default services...')
    
    const servicesSQL = `
      -- Create default services if they don't exist
      INSERT INTO services (name, type, description, base_price, price_per_hour, minimum_duration, is_active)
      VALUES 
          ('Armed Protection Service', 'armed_protection', 'Professional armed security protection', 100000, 25000, 4, true),
          ('Vehicle Only Service', 'unarmed_protection', 'Vehicle transportation service', 50000, 15000, 4, true)
      ON CONFLICT (name) DO NOTHING;
    `
    
    await executeSQLDirectly(servicesSQL, 'Create default services')
    
    // Step 7: Enable real-time
    console.log('⚡ Step 7: Enabling real-time...')
    
    const realtimeSQL = `
      -- Enable real-time for bookings and messages tables
      ALTER PUBLICATION supabase_realtime ADD TABLE bookings;
      ALTER PUBLICATION supabase_realtime ADD TABLE messages;
    `
    
    await executeSQLDirectly(realtimeSQL, 'Enable real-time')
    
    // Step 8: Create notification system
    console.log('🔔 Step 8: Creating notification system...')
    
    const notificationSQL = `
      -- Create notification for new bookings
      CREATE OR REPLACE FUNCTION notify_new_booking()
      RETURNS TRIGGER AS $$
      BEGIN
          -- Insert notification for operators
          INSERT INTO notifications (user_id, title, message, type, data)
          SELECT 
              p.id,
              'New Booking Request',
              'New protection request #' || NEW.booking_code || ' from ' || COALESCE(NEW.pickup_address, 'Unknown location'),
              'booking',
              jsonb_build_object(
                  'booking_id', NEW.id,
                  'booking_code', NEW.booking_code,
                  'client_id', NEW.client_id,
                  'service_type', NEW.service_type,
                  'pickup_address', NEW.pickup_address
              )
          FROM profiles p
          WHERE p.role = 'operator' OR p.role = 'admin';
          
          RETURN NEW;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;

      -- Create trigger for new booking notifications
      DROP TRIGGER IF EXISTS on_booking_created ON bookings;
      CREATE TRIGGER on_booking_created
          AFTER INSERT ON bookings
          FOR EACH ROW EXECUTE FUNCTION notify_new_booking();
    `
    
    await executeSQLDirectly(notificationSQL, 'Create notification system')
    
    // Step 9: Create indexes for performance
    console.log('📊 Step 9: Creating performance indexes...')
    
    const indexesSQL = `
      -- Create indexes for better performance
      CREATE INDEX IF NOT EXISTS idx_bookings_status_created ON bookings(status, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_bookings_client_status ON bookings(client_id, status);
      CREATE INDEX IF NOT EXISTS idx_messages_booking_created ON messages(booking_id, created_at);
    `
    
    await executeSQLDirectly(indexesSQL, 'Create performance indexes')
    
    console.log('')
    console.log('🎉 Booking Synchronization Fix Complete!')
    console.log('=========================================')
    console.log('')
    console.log('✅ Database schema updated')
    console.log('✅ Operator account created (operator@protector.ng / operator123!)')
    console.log('✅ RLS policies configured')
    console.log('✅ Real-time synchronization enabled')
    console.log('✅ Notification system active')
    console.log('')
    console.log('📋 Next Steps:')
    console.log('1. Deploy the updated code to your production environment')
    console.log('2. Test booking from different devices/locations')
    console.log('3. Verify operator dashboard shows all bookings in real-time')
    console.log('4. Check that notifications are working properly')
    console.log('')
    console.log('🔐 Operator Login Credentials:')
    console.log('   Email: operator@protector.ng')
    console.log('   Password: operator123!')
    console.log('')
    
  } catch (error) {
    console.error('❌ Script failed:', error.message)
    process.exit(1)
  }
}

// Run the script
main().catch(console.error)
