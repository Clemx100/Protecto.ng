import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    console.log('🧪 Testing Supabase client creation with direct import...')
    
    // Import dynamically to avoid issues
    const { createClient } = await import('@supabase/supabase-js')
    
    // Test 1: Try with hardcoded values
    console.log('📝 Test 1: Creating client with hardcoded values...')
    const supabase = createClient(
      'https://kifcevffaputepvpjpip.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpZmNldmZmYXB1dGVwdnBqcGlwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTc5NDQ3NiwiZXhwIjoyMDc1MzcwNDc2fQ.O2hluhPKj1GiERmTlXQ0N35mV2loJ2L2WGsnOkIQpio'
    )
    console.log('✅ Client created successfully')
    
    // Test 2: Try a simple query
    console.log('📝 Test 2: Testing simple query...')
    const { data, error } = await supabase
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








