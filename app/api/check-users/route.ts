import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Checking existing users...')
    
    // Import Supabase client dynamically
    const { createClient } = await import('@supabase/supabase-js')
    
    // Use service role for demo API to bypass RLS
    const supabase = createClient(
      'https://mjdbhusnplveeaveeovd.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qZGJodXNucGx2ZWVhdmVlb3ZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Nzk0NTk1MywiZXhwIjoyMDczNTIxOTUzfQ.7KGWZNRe7q2OvE-DeOJL8MKKx_NP7iACNvOC2FCkR5E'
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



