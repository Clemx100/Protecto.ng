import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Checking existing users...')
    
    // Import Supabase client dynamically
    const { createClient } = await import('@supabase/supabase-js')
    
    // Use service role for demo API to bypass RLS
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kifcevffaputepvpjpip.supabase.co',
      process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpZmNldmZmYXB1dGVwdnBqcGlwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTc5NDQ3NiwiZXhwIjoyMDc1MzcwNDc2fQ.O2hluhPKj1GiERmTlXQ0N35mV2loJ2L2WGsnOkIQpio'
    )
    
    // Check profiles table
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, email, first_name, last_name, role')
      .limit(10)
    
    if (profilesError) {
      console.error('Error fetching profiles:', profilesError)
      return NextResponse.json({ 
        error: 'Failed to fetch profiles', 
        details: profilesError.message 
      }, { status: 500 })
    }
    
    console.log('✅ Found profiles:', profiles)
    
    return NextResponse.json({
      success: true,
      profiles: profiles,
      count: profiles?.length || 0
    })
    
  } catch (error) {
    console.error('❌ Check users error:', error)
    return NextResponse.json({ 
      error: 'Check users failed', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}








