const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function setupOperatorAccounts() {
  console.log('🔧 Setting up operator accounts...')

  try {
    // Create operator user
    const { data: operatorUser, error: operatorError } = await supabase.auth.admin.createUser({
      email: 'operator@protector.ng',
      password: 'operator123',
      email_confirm: true
    })

    if (operatorError) {
      console.error('Error creating operator user:', operatorError)
    } else {
      console.log('✅ Operator user created:', operatorUser.user.email)
      
      // Create operator profile
      const { error: operatorProfileError } = await supabase
        .from('profiles')
        .insert({
          id: operatorUser.user.id,
          first_name: 'Operator',
          last_name: 'User',
          email: 'operator@protector.ng',
          role: 'operator',
          phone: '+2348000000000'
        })

      if (operatorProfileError) {
        console.error('Error creating operator profile:', operatorProfileError)
      } else {
        console.log('✅ Operator profile created')
      }
    }

    // Create admin user
    const { data: adminUser, error: adminError } = await supabase.auth.admin.createUser({
      email: 'admin@protector.ng',
      password: 'admin123',
      email_confirm: true
    })

    if (adminError) {
      console.error('Error creating admin user:', adminError)
    } else {
      console.log('✅ Admin user created:', adminUser.user.email)
      
      // Create admin profile
      const { error: adminProfileError } = await supabase
        .from('profiles')
        .insert({
          id: adminUser.user.id,
          first_name: 'Admin',
          last_name: 'User',
          email: 'admin@protector.ng',
          role: 'admin',
          phone: '+2348000000001'
        })

      if (adminProfileError) {
        console.error('Error creating admin profile:', adminProfileError)
      } else {
        console.log('✅ Admin profile created')
      }
    }

    console.log('\n🎉 Operator accounts setup complete!')
    console.log('\n📋 Login Credentials:')
    console.log('Operator: operator@protector.ng / operator123')
    console.log('Admin: admin@protector.ng / admin123')
    console.log('\n🌐 Access URLs:')
    console.log('Operator Dashboard: http://192.168.1.142:3000/operator')
    console.log('Client App: http://192.168.1.142:3000/app')

  } catch (error) {
    console.error('Setup failed:', error)
  }
}

setupOperatorAccounts()



