#!/usr/bin/env node

/**
 * 🔧 Fix User Data Persistence Issues
 * 
 * This script repairs user profiles that have missing or incomplete data
 * Syncs data from auth user_metadata to profiles table
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

// Load environment variables
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kifcevffaputepvpjpip.supabase.co'
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_SERVICE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY is required')
  console.log('💡 Add it to your .env file or vercel.json')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

async function fixUserDataPersistence() {
  console.log('\n' + '='.repeat(70))
  console.log('🔧 FIX USER DATA PERSISTENCE')
  console.log('='.repeat(70) + '\n')

  try {
    // Step 1: Get all auth users
    console.log('📥 Step 1: Fetching all auth users...')
    const { data: { users }, error: authError } = await supabase.auth.admin.listUsers()
    
    if (authError) {
      console.error('❌ Error fetching users:', authError.message)
      return
    }

    console.log(`✅ Found ${users.length} users\n`)

    // Step 2: Check each user's profile
    let fixed = 0
    let created = 0
    let skipped = 0
    let errors = 0

    for (const user of users) {
      console.log(`\n👤 Processing user: ${user.email}`)
      console.log(`   User ID: ${user.id}`)
      console.log(`   Email Verified: ${user.email_confirmed_at ? 'Yes' : 'No'}`)
      
      // Get user metadata
      const firstName = user.user_metadata?.first_name || 
                       user.user_metadata?.firstName || 
                       user.user_metadata?.fname || ''
      const lastName = user.user_metadata?.last_name || 
                      user.user_metadata?.lastName || 
                      user.user_metadata?.lname || ''
      const phone = user.user_metadata?.phone || 
                   user.user_metadata?.phoneNumber || 
                   user.user_metadata?.phone_number || ''
      
      console.log(`   Metadata - Name: ${firstName} ${lastName}, Phone: ${phone || 'N/A'}`)

      // Check if profile exists
      const { data: existingProfile, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle()

      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error(`   ❌ Error fetching profile: ${fetchError.message}`)
        errors++
        continue
      }

      if (!existingProfile) {
        // Create new profile
        console.log('   ➕ Profile does not exist, creating...')
        
        const newProfile = {
          id: user.id,
          email: user.email,
          first_name: firstName || 'User',
          last_name: lastName || '',
          phone: phone || '',
          role: user.user_metadata?.role || 'client',
          is_verified: user.email_confirmed_at ? true : false,
          is_active: true,
          created_at: user.created_at,
          updated_at: new Date().toISOString()
        }

        const { error: insertError } = await supabase
          .from('profiles')
          .insert(newProfile)

        if (insertError) {
          console.error(`   ❌ Error creating profile: ${insertError.message}`)
          errors++
        } else {
          console.log(`   ✅ Profile created successfully`)
          created++
        }
      } else {
        // Check if profile needs updating
        const needsUpdate = 
          !existingProfile.first_name || 
          existingProfile.first_name === 'User' || 
          !existingProfile.phone || 
          !existingProfile.email

        if (needsUpdate && (firstName || lastName || phone)) {
          console.log('   🔄 Profile exists but incomplete, updating...')
          console.log(`      Current: ${existingProfile.first_name} ${existingProfile.last_name}`)
          
          const updates = {
            updated_at: new Date().toISOString()
          }

          // Only update if we have better data
          if (firstName && (firstName !== 'User' || !existingProfile.first_name)) {
            updates.first_name = firstName
          }
          if (lastName && !existingProfile.last_name) {
            updates.last_name = lastName
          }
          if (phone && !existingProfile.phone) {
            updates.phone = phone
          }
          if (!existingProfile.email) {
            updates.email = user.email
          }

          console.log(`      Updates:`, updates)

          const { error: updateError } = await supabase
            .from('profiles')
            .update(updates)
            .eq('id', user.id)

          if (updateError) {
            console.error(`   ❌ Error updating profile: ${updateError.message}`)
            errors++
          } else {
            console.log(`   ✅ Profile updated successfully`)
            fixed++
          }
        } else {
          console.log('   ✓ Profile is complete, no action needed')
          skipped++
        }
      }
    }

    // Step 3: Summary
    console.log('\n' + '='.repeat(70))
    console.log('📊 SUMMARY')
    console.log('='.repeat(70))
    console.log(`✅ Profiles created: ${created}`)
    console.log(`🔄 Profiles fixed: ${fixed}`)
    console.log(`✓  Profiles skipped (already complete): ${skipped}`)
    console.log(`❌ Errors: ${errors}`)
    console.log(`📝 Total users processed: ${users.length}`)

    if (created + fixed > 0) {
      console.log('\n🎉 User data persistence issues fixed!')
      console.log('💡 Users should now see their profile data correctly')
    } else if (errors > 0) {
      console.log('\n⚠️ Some profiles could not be fixed. Check errors above.')
    } else {
      console.log('\n✅ All user profiles are already in good condition!')
    }

    // Step 4: Verify fixes
    console.log('\n' + '='.repeat(70))
    console.log('🔍 VERIFICATION')
    console.log('='.repeat(70))

    const { data: allProfiles, error: verifyError } = await supabase
      .from('profiles')
      .select('id, email, first_name, last_name, phone')
      .order('created_at', { ascending: false })
      .limit(5)

    if (verifyError) {
      console.error('❌ Error verifying profiles:', verifyError.message)
    } else {
      console.log('\n📋 Recent profiles:')
      allProfiles.forEach(profile => {
        const hasData = profile.first_name && profile.first_name !== 'User' && profile.phone
        console.log(`   ${hasData ? '✅' : '⚠️ '} ${profile.email}`)
        console.log(`      Name: ${profile.first_name || 'N/A'} ${profile.last_name || ''}`)
        console.log(`      Phone: ${profile.phone || 'Not provided'}`)
      })
    }

    console.log('\n')

  } catch (error) {
    console.error('❌ Fatal error:', error.message)
    console.error(error)
    process.exit(1)
  }
}

// Run the fix
fixUserDataPersistence().then(() => {
  console.log('🏁 Script completed')
  process.exit(0)
}).catch(error => {
  console.error('❌ Script failed:', error.message)
  process.exit(1)
})




