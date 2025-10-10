import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Checking existing services...')
    
    // Import Supabase client dynamically
    const { createClient } = await import('@supabase/supabase-js')
    
    // Use service role for demo API to bypass RLS
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kifcevffaputepvpjpip.supabase.co',
      process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpZmNldmZmYXB1dGVwdnBqcGlwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTc5NDQ3NiwiZXhwIjoyMDc1MzcwNDc2fQ.O2hluhPKj1GiERmTlXQ0N35mV2loJ2L2WGsnOkIQpio'
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








