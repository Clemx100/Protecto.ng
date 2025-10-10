import { NextRequest, NextResponse } from 'next/server'

// GET /api/mobile/status
// Mobile-specific status endpoint
export async function GET(request: NextRequest) {
  try {
    console.log('📱 Mobile status API called')
    
    const userAgent = request.headers.get('user-agent') || ''
    const isMobile = /iPhone|iPad|iPod|Android|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)
    
    // Get current bookings count
    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(
      'https://mjdbhusnplveeaveeovd.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qZGJodXNucGx2ZWVhdmVlb3ZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Nzk0NTk1MywiZXhwIjoyMDczNTIxOTUzfQ.7KGWZNRe7q2OvE-DeOJL8MKKx_NP7iACNvOC2FCkR5E'
    )

    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('id', { count: 'exact', head: true })
      .eq('client_id', '9882762d-93e4-484c-b055-a14737f76cba')

    const bookingsCount = bookingsError ? 0 : (bookings?.length || 0)

    const mobileStatus = {
      success: true,
      mobile: {
        detected: isMobile,
        userAgent: userAgent.substring(0, 100),
        device: isMobile ? 'Mobile Device' : 'Desktop',
        optimized: true
      },
      system: {
        status: 'operational',
        bookingsCount,
        chatEnabled: true,
        realTimeEnabled: true,
        operatorDashboardEnabled: true
      },
      endpoints: {
        client: 'http://localhost:3004',
        operator: 'http://localhost:3004/operator',
        api: 'http://localhost:3004/api',
        chat: 'http://localhost:3004/api/messages',
        bookings: 'http://localhost:3004/api/bookings'
      },
      features: {
        bookingCreation: true,
        realTimeChat: true,
        operatorCommunication: true,
        statusUpdates: true,
        mobileOptimized: true,
        crossPlatform: true
      },
      message: 'Protector.Ng Mobile System Ready'
    }

    return NextResponse.json(mobileStatus)

  } catch (error) {
    console.error('❌ Mobile status API error:', error)
    return NextResponse.json({ 
      error: 'Mobile status check failed',
      mobile: true 
    }, { status: 500 })
  }
}







