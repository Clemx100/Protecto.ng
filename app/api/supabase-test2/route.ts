import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    console.log('🧪 Testing Supabase client creation with direct import...')
    
    // Import dynamically to avoid issues
    const { createClient } = await import('@supabase/supabase-js')
    
    // Test 1: Try with hardcoded values
    console.log('📝 Test 1: Creating client with hardcoded values...')
    const supabase = createClient(
      'https://mjdbhusnplveeaveeovd.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qZGJodXNucGx2ZWVhdmVlb3ZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Nzk0NTk1MywiZXhwIjoyMDczNTIxOTUzfQ.7KGWZNRe7q2OvE-DeOJL8MKKx_NP7iACNvOC2FCkR5E'
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







