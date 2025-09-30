#!/usr/bin/env node

/**
 * Database Rebuild Script for Protector.Ng
 * This script will rebuild the database schema and fix operator dashboard issues
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Load environment variables
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables')
  console.error('Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function runSQLScript(scriptPath) {
  try {
    console.log(`📄 Reading SQL script: ${scriptPath}`)
    const sqlScript = fs.readFileSync(scriptPath, 'utf8')
    
    console.log(`🚀 Executing SQL script: ${scriptPath}`)
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sqlScript })
    
    if (error) {
      console.error(`❌ Error executing ${scriptPath}:`, error)
      return false
    }
    
    console.log(`✅ Successfully executed ${scriptPath}`)
    return true
  } catch (err) {
    console.error(`❌ Error reading or executing ${scriptPath}:`, err.message)
    return false
  }
}

async function executeSQLDirect(sql) {
  try {
    console.log('🚀 Executing SQL directly...')
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql })
    
    if (error) {
      console.error('❌ Error executing SQL:', error)
      return false
    }
    
    console.log('✅ SQL executed successfully')
    return true
  } catch (err) {
    console.error('❌ Error executing SQL:', err.message)
    return false
  }
}

async function main() {
  console.log('🛡️  Protector.Ng Database Rebuild Script')
  console.log('==========================================')
  
  try {
    // Step 1: Rebuild database schema
    console.log('\n📋 Step 1: Rebuilding database schema...')
    const schemaScript = path.join(__dirname, 'rebuild-database-schema.sql')
    
    if (fs.existsSync(schemaScript)) {
      const success = await runSQLScript(schemaScript)
      if (!success) {
        console.error('❌ Failed to rebuild database schema')
        process.exit(1)
      }
    } else {
      console.error(`❌ Schema script not found: ${schemaScript}`)
      process.exit(1)
    }
    
    // Step 2: Fix operator dashboard API
    console.log('\n🔧 Step 2: Fixing operator dashboard API...')
    const operatorScript = path.join(__dirname, 'fix-operator-dashboard-api.sql')
    
    if (fs.existsSync(operatorScript)) {
      const success = await runSQLScript(operatorScript)
      if (!success) {
        console.error('❌ Failed to fix operator dashboard API')
        process.exit(1)
      }
    } else {
      console.error(`❌ Operator script not found: ${operatorScript}`)
      process.exit(1)
    }
    
    // Step 3: Test the connection
    console.log('\n🧪 Step 3: Testing database connection...')
    const { data: testData, error: testError } = await supabase
      .from('profiles')
      .select('count')
      .limit(1)
    
    if (testError) {
      console.error('❌ Database connection test failed:', testError)
      process.exit(1)
    }
    
    console.log('✅ Database connection test passed')
    
    // Step 4: Verify operator profiles exist
    console.log('\n👥 Step 4: Verifying operator profiles...')
    const { data: operators, error: operatorError } = await supabase
      .from('profiles')
      .select('*')
      .in('role', ['operator', 'admin'])
    
    if (operatorError) {
      console.error('❌ Error checking operator profiles:', operatorError)
    } else {
      console.log(`✅ Found ${operators?.length || 0} operator/admin profiles`)
    }
    
    // Step 5: Verify services exist
    console.log('\n🛠️  Step 5: Verifying services...')
    const { data: services, error: serviceError } = await supabase
      .from('services')
      .select('*')
    
    if (serviceError) {
      console.error('❌ Error checking services:', serviceError)
    } else {
      console.log(`✅ Found ${services?.length || 0} services`)
    }
    
    console.log('\n🎉 Database rebuild completed successfully!')
    console.log('\n📝 Next steps:')
    console.log('1. Restart your Next.js development server')
    console.log('2. Test the operator dashboard at http://localhost:3000/operator')
    console.log('3. Create a test booking to verify the connection')
    
  } catch (error) {
    console.error('❌ Fatal error during database rebuild:', error)
    process.exit(1)
  }
}

// Run the script
main().catch(console.error)

