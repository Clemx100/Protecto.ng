import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/config/database'
import { blockInProduction } from '@/lib/api/route-security'

export async function GET(_request: NextRequest) {
  try {
    console.log('🧪 Testing Supabase client creation...')

    const blocked = blockInProduction()
    if (blocked) return blocked

    const supabase = createServiceRoleClient()
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
      message: 'Supabase service client query test successful!',
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








