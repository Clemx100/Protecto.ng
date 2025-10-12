import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Checking existing services...')
    
    // Import Supabase client dynamically
    const { createClient } = await import('@supabase/supabase-js')
    
    // Use centralized database configuration
    const { createServiceRoleClient } = await import('@/lib/config/database')
    const supabase = createServiceRoleClient()
    
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








