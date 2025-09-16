// Create operator account for testing
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://mjdbhusnplveeaveeovd.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qZGJodXNucGx2ZWVhdmVlb3ZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc5NDU5NTMsImV4cCI6MjA3MzUyMTk1M30.Jhsz_eRvmotyGgRzszwfKF8czxSnNE92q1SBupR9DB4'

const supabase = createClient(supabaseUrl, supabaseKey)

async function createOperatorAccount() {
  console.log('🔐 Creating Operator Account...')
  
  try {
    // Create operator user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: 'admin@protector.ng',
      password: 'admin123',
      options: {
        data: {
          first_name: 'Admin',
          last_name: 'Operator',
          role: 'admin'
        }
      }
    })
    
    if (authError) {
      console.log('❌ Auth creation failed:', authError.message)
      
      // Try to sign in if user already exists
      if (authError.message.includes('already registered')) {
        console.log('User already exists, trying to sign in...')
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: 'admin@protector.ng',
          password: 'admin123'
        })
        
        if (signInError) {
          console.log('❌ Sign in failed:', signInError.message)
        } else {
          console.log('✅ Sign in successful!')
          console.log('User ID:', signInData.user?.id)
        }
      }
    } else {
      console.log('✅ Operator account created successfully!')
      console.log('User ID:', authData.user?.id)
      console.log('Email:', authData.user?.email)
    }
    
    // Create agent account as well
    console.log('Creating Agent Account...')
    const { data: agentAuthData, error: agentAuthError } = await supabase.auth.signUp({
      email: 'agent@protector.ng',
      password: 'agent123',
      options: {
        data: {
          first_name: 'Security',
          last_name: 'Agent',
          role: 'agent'
        }
      }
    })
    
    if (agentAuthError) {
      console.log('❌ Agent auth creation failed:', agentAuthError.message)
      
      // Try to sign in if user already exists
      if (agentAuthError.message.includes('already registered')) {
        console.log('Agent already exists, trying to sign in...')
        const { data: agentSignInData, error: agentSignInError } = await supabase.auth.signInWithPassword({
          email: 'agent@protector.ng',
          password: 'agent123'
        })
        
        if (agentSignInError) {
          console.log('❌ Agent sign in failed:', agentSignInError.message)
        } else {
          console.log('✅ Agent sign in successful!')
          console.log('Agent ID:', agentSignInData.user?.id)
        }
      }
    } else {
      console.log('✅ Agent account created successfully!')
      console.log('Agent ID:', agentAuthData.user?.id)
      console.log('Email:', agentAuthData.user?.email)
    }
    
    console.log('')
    console.log('🎉 Operator accounts ready!')
    console.log('')
    console.log('Login Credentials:')
    console.log('Admin: admin@protector.ng / admin123')
    console.log('Agent: agent@protector.ng / agent123')
    console.log('')
    console.log('You can now test the operator login at: http://localhost:3000/operator')
    
  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

createOperatorAccount()
