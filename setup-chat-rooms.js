// Setup script to create chat room tables in Supabase
const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')

const supabase = createClient(
  'https://mjdbhusnplveeaveeovd.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qZGJodXNucGx2ZWVhdmVlb3ZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Nzk0NTk1MywiZXhwIjoyMDczNTIxOTUzfQ.7KGWZNRe7q2OvE-DeOJL8MKKx_NP7iACNvOC2FCkR5E'
)

async function setupChatRooms() {
  console.log('🔧 Setting up chat room tables...')
  
  try {
    // Read the SQL file
    const sqlContent = fs.readFileSync('create-chat-room-tables.sql', 'utf8')
    
    // Split by semicolon and execute each statement
    const statements = sqlContent.split(';').filter(stmt => stmt.trim())
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i].trim()
      if (statement) {
        console.log(`\nExecuting statement ${i + 1}/${statements.length}...`)
        console.log(statement.substring(0, 100) + '...')
        
        const { error } = await supabase.rpc('exec_sql', { sql: statement })
        
        if (error) {
          console.log(`⚠️ Statement ${i + 1} warning:`, error.message)
          // Continue with other statements
        } else {
          console.log(`✅ Statement ${i + 1} executed successfully`)
        }
      }
    }
    
    console.log('\n🎉 Chat room setup completed!')
    console.log('\nNext steps:')
    console.log('1. Verify tables were created in your Supabase dashboard')
    console.log('2. Run: node test-chat-room-system.js')
    console.log('3. Start your Next.js server: npm run dev')
    
  } catch (error) {
    console.error('❌ Setup failed:', error)
    console.log('\nManual setup required:')
    console.log('1. Go to your Supabase dashboard')
    console.log('2. Open the SQL Editor')
    console.log('3. Copy and paste the contents of create-chat-room-tables.sql')
    console.log('4. Execute the SQL')
  }
}

setupChatRooms()










