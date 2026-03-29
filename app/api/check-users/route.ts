import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/config/database'
import { blockInProduction } from '@/lib/api/route-security'

export async function GET(_request: NextRequest) {
  try {
    console.log('🔍 Checking existing users...')

    const blocked = blockInProduction()
    if (blocked) return blocked

    const supabase = createServiceRoleClient()
    
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








