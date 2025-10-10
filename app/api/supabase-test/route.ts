import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    console.log('🧪 Testing Supabase client creation...')
    
    // Test 1: Try with hardcoded values
    console.log('📝 Test 1: Creating client with hardcoded values...')
    const supabase1 = createClient(
      'https://kifcevffaputepvpjpip.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpZmNldmZmYXB1dGVwdnBqcGlwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTc5NDQ3NiwiZXhwIjoyMDc1MzcwNDc2fQ.O2hluhPKj1GiERmTlXQ0N35mV2loJ2L2WGsnOkIQpio'
    )
    console.log('✅ Client 1 created successfully')
    
    // Test 2: Try with environment variables
    console.log('📝 Test 2: Creating client with environment variables...')
    console.log('NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)
    console.log('SUPABASE_SERVICE_ROLE_KEY exists:', !!process.env.SUPABASE_SERVICE_ROLE_KEY)
    
    const supabase2 = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kifcevffaputepvpjpip.supabase.co',
      process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpZmNldmZmYXB1dGVwdnBqcGlwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTc5NDQ3NiwiZXhwIjoyMDc1MzcwNDc2fQ.O2hluhPKj1GiERmTlXQ0N35mV2loJ2L2WGsnOkIQpio'
    )
    console.log('✅ Client 2 created successfully')
    
    // Test 3: Try a simple query
    console.log('📝 Test 3: Testing simple query...')
    const { data, error } = await supabase1
      .from('bookings')
      .select('count')
      .limit(1)
    
    if (error) {
      console.error('❌ Query error:', error)
      return NextResponse.json({ 
        error: 'Query failed', 
        details: error.message 
      }, { status: 500 })
    }
    
    console.log('✅ Query successful, data:', data)
    
    return NextResponse.json({
      success: true,
      message: 'Supabase client creation and query test successful!',
      queryResult: data
    })
    
  } catch (error) {
    console.error('❌ Supabase test error:', error)
    return NextResponse.json({ 
      error: 'Supabase test failed', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}








