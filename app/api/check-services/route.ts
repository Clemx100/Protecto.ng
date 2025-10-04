import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Checking existing services...')
    
    // Import Supabase client dynamically
    const { createClient } = await import('@supabase/supabase-js')
    
    // Use service role for demo API to bypass RLS
    const supabase = createClient(
      'https://mjdbhusnplveeaveeovd.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qZGJodXNucGx2ZWVhdmVlb3ZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Nzk0NTk1MywiZXhwIjoyMDczNTIxOTUzfQ.7KGWZNRe7q2OvE-DeOJL8MKKx_NP7iACNvOC2FCkR5E'
    )
    
    // Check services table
    const { data: services, error: servicesError } = await supabase
      .from('services')
      .select('id, name, type, base_price, price_per_hour')
      .limit(10)
    
    if (servicesError) {
      console.error('Error fetching services:', servicesError)
      return NextResponse.json({ 
        error: 'Failed to fetch services', 
        details: servicesError.message 
      }, { status: 500 })
    }
    
    console.log('✅ Found services:', services)
    
    return NextResponse.json({
      success: true,
      services: services,
      count: services?.length || 0
    })
    
  } catch (error) {
    console.error('❌ Check services error:', error)
    return NextResponse.json({ 
      error: 'Check services failed', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}








