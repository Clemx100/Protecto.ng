// Fix messages table schema - add missing updated_at column
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  'https://mjdbhusnplveeaveeovd.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qZGJodXNucGx2ZWVhdmVlb3ZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Nzk0NTk1MywiZXhwIjoyMDczNTIxOTUzfQ.7KGWZNRe7q2OvE-DeOJL8MKKx_NP7iACNvOC2FCkR5E'
)

async function fixMessagesTableSchema() {
  console.log('🔧 Fixing messages table schema...')
  
  try {
    // Add missing updated_at column
    console.log('1. Adding updated_at column to messages table...')
    const { error: alterError } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE messages 
        ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
      `
    })
    
    if (alterError) {
      console.log('❌ Error adding updated_at column:', alterError.message)
      // Try alternative approach
      console.log('2. Trying alternative approach...')
      const { error: alterError2 } = await supabase
        .from('messages')
        .select('updated_at')
        .limit(1)
      
      if (alterError2) {
        console.log('❌ Column does not exist, trying to add it...')
        // Use direct SQL execution
        const { data, error } = await supabase
          .rpc('exec', {
            query: 'ALTER TABLE messages ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();'
          })
        
        if (error) {
          console.log('❌ Failed to add updated_at column:', error.message)
        } else {
          console.log('✅ Successfully added updated_at column')
        }
      } else {
        console.log('✅ updated_at column already exists')
      }
    } else {
      console.log('✅ Successfully added updated_at column')
    }
    
    // Add missing sender_type column if it doesn't exist
    console.log('3. Checking sender_type column...')
    const { error: senderTypeError } = await supabase
      .from('messages')
      .select('sender_type')
      .limit(1)
    
    if (senderTypeError) {
      console.log('4. Adding sender_type column...')
      const { error: addSenderTypeError } = await supabase.rpc('exec_sql', {
        sql: `
          ALTER TABLE messages 
          ADD COLUMN IF NOT EXISTS sender_type VARCHAR(20) DEFAULT 'client';
        `
      })
      
      if (addSenderTypeError) {
        console.log('❌ Error adding sender_type column:', addSenderTypeError.message)
      } else {
        console.log('✅ Successfully added sender_type column')
      }
    } else {
      console.log('✅ sender_type column already exists')
    }
    
    // Test the table structure
    console.log('5. Testing updated table structure...')
    const { data: testData, error: testError } = await supabase
      .from('messages')
      .select('*')
      .limit(1)
    
    if (testError) {
      console.log('❌ Error testing table structure:', testError.message)
    } else {
      console.log('✅ Table structure test successful')
      console.log('📋 Available columns:', Object.keys(testData[0] || {}))
    }
    
    console.log('\n🎉 Messages table schema fix completed!')
    
  } catch (error) {
    console.error('❌ Schema fix failed:', error)
  }
}

// Run the fix
fixMessagesTableSchema()

