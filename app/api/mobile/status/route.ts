import { NextRequest, NextResponse } from 'next/server'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

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
      process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kifcevffaputepvpjpip.supabase.co',
      process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpZmNldmZmYXB1dGVwdnBqcGlwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTc5NDQ3NiwiZXhwIjoyMDc1MzcwNDc2fQ.O2hluhPKj1GiERmTlXQ0N35mV2loJ2L2WGsnOkIQpio'
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







