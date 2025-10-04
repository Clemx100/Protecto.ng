// COMPLETE CHAT SYSTEM DIAGNOSIS
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  'https://mjdbhusnplveeaveeovd.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qZGJodXNucGx2ZWVhdmVlb3ZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Nzk0NTk1MywiZXhwIjoyMDczNTIxOTUzfQ.7KGWZNRe7q2OvE-DeOJL8MKKx_NP7iACNvOC2FCkR5E'
)

async function completeChatDiagnosis() {
  console.log('🔍 COMPLETE CHAT SYSTEM DIAGNOSIS')
  console.log('=' .repeat(60))
  console.log('Finding the REAL problem with client-operator communication')
  console.log('')
  
  const issues = []
  const working = []
  
  try {
    // 1. Check database schema
    console.log('1. 🗄️ CHECKING DATABASE SCHEMA...')
    try {
      const { data: messages, error } = await supabase
        .from('messages')
        .select('*')
        .limit(1)
      
      if (error) {
        issues.push(`Database schema error: ${error.message}`)
        console.log('❌ Database schema has issues')
      } else {
        working.push('Database schema is correct')
        console.log('✅ Database schema is working')
        console.log('📋 Available columns:', Object.keys(messages[0] || {}))
      }
    } catch (err) {
      issues.push(`Database connection failed: ${err.message}`)
      console.log('❌ Database connection failed')
    }
    
    // 2. Check if client app is using the right service
    console.log('\n2. 🔧 CHECKING CLIENT APP INTEGRATION...')
    try {
      const fs = require('fs')
      const clientAppPath = 'components/protector-app.tsx'
      
      if (fs.existsSync(clientAppPath)) {
        const clientAppContent = fs.readFileSync(clientAppPath, 'utf8')
        
        if (clientAppContent.includes('unifiedChatService')) {
          working.push('Client app is using unifiedChatService')
          console.log('✅ Client app is using unifiedChatService')
        } else {
          issues.push('Client app is NOT using unifiedChatService')
          console.log('❌ Client app is NOT using unifiedChatService')
        }
        
        if (clientAppContent.includes('createClientMessage')) {
          working.push('Client app has createClientMessage function')
          console.log('✅ Client app has createClientMessage function')
        } else {
          issues.push('Client app missing createClientMessage function')
          console.log('❌ Client app missing createClientMessage function')
        }
      } else {
        issues.push('Client app file not found')
        console.log('❌ Client app file not found')
      }
    } catch (err) {
      issues.push(`Client app check failed: ${err.message}`)
      console.log('❌ Client app check failed')
    }
    
    // 3. Check operator dashboard integration
    console.log('\n3. 🛡️ CHECKING OPERATOR DASHBOARD INTEGRATION...')
    try {
      const fs = require('fs')
      const operatorDashboardPath = 'components/operator-dashboard.tsx'
      
      if (fs.existsSync(operatorDashboardPath)) {
        const operatorContent = fs.readFileSync(operatorDashboardPath, 'utf8')
        
        if (operatorContent.includes('unifiedChatService')) {
          working.push('Operator dashboard is using unifiedChatService')
          console.log('✅ Operator dashboard is using unifiedChatService')
        } else {
          issues.push('Operator dashboard is NOT using unifiedChatService')
          console.log('❌ Operator dashboard is NOT using unifiedChatService')
        }
        
        if (operatorContent.includes('createOperatorMessage')) {
          working.push('Operator dashboard has createOperatorMessage function')
          console.log('✅ Operator dashboard has createOperatorMessage function')
        } else {
          issues.push('Operator dashboard missing createOperatorMessage function')
          console.log('❌ Operator dashboard missing createOperatorMessage function')
        }
      } else {
        issues.push('Operator dashboard file not found')
        console.log('❌ Operator dashboard file not found')
      }
    } catch (err) {
      issues.push(`Operator dashboard check failed: ${err.message}`)
      console.log('❌ Operator dashboard check failed')
    }
    
    // 4. Check API endpoints
    console.log('\n4. 🌐 CHECKING API ENDPOINTS...')
    try {
      const response = await fetch('http://localhost:3000/api/messages?bookingId=test')
      if (response.status === 200) {
        working.push('Client messages API is responding')
        console.log('✅ Client messages API is responding')
      } else {
        issues.push(`Client messages API returned ${response.status}`)
        console.log(`❌ Client messages API returned ${response.status}`)
      }
    } catch (err) {
      issues.push(`Client messages API failed: ${err.message}`)
      console.log('❌ Client messages API failed')
    }
    
    try {
      const response = await fetch('http://localhost:3000/api/operator/messages?bookingId=test')
      if (response.status === 200) {
        working.push('Operator messages API is responding')
        console.log('✅ Operator messages API is responding')
      } else {
        issues.push(`Operator messages API returned ${response.status}`)
        console.log(`❌ Operator messages API returned ${response.status}`)
      }
    } catch (err) {
      issues.push(`Operator messages API failed: ${err.message}`)
      console.log('❌ Operator messages API failed')
    }
    
    // 5. Check if unifiedChatService exists and is working
    console.log('\n5. 🔧 CHECKING UNIFIED CHAT SERVICE...')
    try {
      const fs = require('fs')
      const servicePath = 'lib/services/unifiedChatService.ts'
      
      if (fs.existsSync(servicePath)) {
        working.push('unifiedChatService file exists')
        console.log('✅ unifiedChatService file exists')
        
        const serviceContent = fs.readFileSync(servicePath, 'utf8')
        if (serviceContent.includes('createClientMessage')) {
          working.push('unifiedChatService has createClientMessage')
          console.log('✅ unifiedChatService has createClientMessage')
        } else {
          issues.push('unifiedChatService missing createClientMessage')
          console.log('❌ unifiedChatService missing createClientMessage')
        }
        
        if (serviceContent.includes('createOperatorMessage')) {
          working.push('unifiedChatService has createOperatorMessage')
          console.log('✅ unifiedChatService has createOperatorMessage')
        } else {
          issues.push('unifiedChatService missing createOperatorMessage')
          console.log('❌ unifiedChatService missing createOperatorMessage')
        }
      } else {
        issues.push('unifiedChatService file not found')
        console.log('❌ unifiedChatService file not found')
      }
    } catch (err) {
      issues.push(`unifiedChatService check failed: ${err.message}`)
      console.log('❌ unifiedChatService check failed')
    }
    
    // 6. Test actual message flow
    console.log('\n6. 💬 TESTING ACTUAL MESSAGE FLOW...')
    try {
      const { data: bookings } = await supabase
        .from('bookings')
        .select('id, client_id')
        .limit(1)
      
      if (bookings && bookings.length > 0) {
        const booking = bookings[0]
        
        // Test client message
        const { data: clientMsg, error: clientError } = await supabase
          .from('messages')
          .insert({
            booking_id: booking.id,
            sender_id: booking.client_id,
            recipient_id: booking.client_id,
            content: 'DIAGNOSIS: Client test message',
            message_type: 'text',
            sender_type: 'client'
          })
          .select()
          .single()
        
        if (clientError) {
          issues.push(`Client message creation failed: ${clientError.message}`)
          console.log('❌ Client message creation failed')
        } else {
          working.push('Client message creation works')
          console.log('✅ Client message creation works')
        }
        
        // Test operator message
        const { data: operatorMsg, error: operatorError } = await supabase
          .from('messages')
          .insert({
            booking_id: booking.id,
            sender_id: '4d2535f4-e7c7-4e06-b78a-469f68cc96be',
            recipient_id: booking.client_id,
            content: 'DIAGNOSIS: Operator test message',
            message_type: 'text',
            sender_type: 'operator'
          })
          .select()
          .single()
        
        if (operatorError) {
          issues.push(`Operator message creation failed: ${operatorError.message}`)
          console.log('❌ Operator message creation failed')
        } else {
          working.push('Operator message creation works')
          console.log('✅ Operator message creation works')
        }
        
        // Clean up test messages
        if (clientMsg) await supabase.from('messages').delete().eq('id', clientMsg.id)
        if (operatorMsg) await supabase.from('messages').delete().eq('id', operatorMsg.id)
      }
    } catch (err) {
      issues.push(`Message flow test failed: ${err.message}`)
      console.log('❌ Message flow test failed')
    }
    
    // 7. FINAL DIAGNOSIS
    console.log('\n' + '=' .repeat(60))
    console.log('🔍 DIAGNOSIS RESULTS')
    console.log('=' .repeat(60))
    
    console.log('\n✅ WORKING COMPONENTS:')
    working.forEach(item => console.log(`  ✅ ${item}`))
    
    console.log('\n❌ ISSUES FOUND:')
    issues.forEach(item => console.log(`  ❌ ${item}`))
    
    console.log('\n📊 SUMMARY:')
    console.log(`  Working: ${working.length} components`)
    console.log(`  Issues: ${issues.length} problems`)
    
    if (issues.length === 0) {
      console.log('\n🎉 ALL SYSTEMS WORKING - ISSUE IS IN UI INTEGRATION')
      console.log('💡 The problem is likely that the UI components are not properly')
      console.log('   connected to the chat service or not calling the right functions.')
    } else {
      console.log('\n🔧 FIXES NEEDED:')
      issues.forEach((issue, index) => {
        console.log(`  ${index + 1}. ${issue}`)
      })
    }
    
  } catch (error) {
    console.error('❌ Diagnosis failed:', error)
  }
}

// Run the diagnosis
completeChatDiagnosis()

