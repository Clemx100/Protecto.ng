const { createClient } = require('@supabase/supabase-js')

// Supabase configuration
const supabaseUrl = 'https://mjdbhusnplveeaveeovd.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qZGJodXNucGx2ZWVhdmVlb3ZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc5NDU5NTMsImV4cCI6MjA3MzUyMTk1M30.Jhsz_eRvmotyGgRzszwfKF8czxSnNE92q1SBupR9DB4'

const supabase = createClient(supabaseUrl, supabaseKey)

async function fixProfileCompletedColumn() {
  try {
    console.log('🔧 Fixing profile_completed column issue...')
    
    // Add the profile_completed column
    console.log('📝 Adding profile_completed column...')
    const { error: alterError } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE profiles 
        ADD COLUMN IF NOT EXISTS profile_completed BOOLEAN DEFAULT FALSE;
      `
    })
    
    if (alterError) {
      console.error('❌ Error adding column:', alterError)
      return
    }
    
    console.log('✅ Column added successfully!')
    
    // Update existing profiles to mark them as completed if they have all required fields
    console.log('🔄 Updating existing profiles...')
    const { error: updateError } = await supabase.rpc('exec_sql', {
      sql: `
        UPDATE profiles 
        SET profile_completed = TRUE 
        WHERE first_name IS NOT NULL 
          AND last_name IS NOT NULL 
          AND phone IS NOT NULL 
          AND address IS NOT NULL 
          AND emergency_contact IS NOT NULL 
          AND emergency_phone IS NOT NULL;
      `
    })
    
    if (updateError) {
      console.error('❌ Error updating profiles:', updateError)
      return
    }
    
    console.log('✅ Existing profiles updated!')
    
    // Verify the column exists
    console.log('🔍 Verifying column exists...')
    const { data, error: verifyError } = await supabase
      .from('profiles')
      .select('id, profile_completed')
      .limit(1)
    
    if (verifyError) {
      console.error('❌ Error verifying column:', verifyError)
      return
    }
    
    console.log('✅ Column verification successful!')
    console.log('🎉 Database schema fixed successfully!')
    console.log('📊 Sample data:', data)
    
  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

// Run the fix
fixProfileCompletedColumn()

