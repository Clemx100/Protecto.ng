import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/config/database'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

// GET /api/mobile/status
// Mobile-specific status endpoint
export async function GET(request: NextRequest) {
  try {
    console.log('📱 Mobile status API called')
    
    const userAgent = request.headers.get('user-agent') || ''
    const isMobile = /iPhone|iPad|iPod|Android|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)
    
    const supabase = createServiceRoleClient()

    const { count, error: bookingsError } = await supabase
      .from('bookings')
      .select('id', { count: 'exact', head: true })

    const bookingsCount = bookingsError ? 0 : (count || 0)
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin

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
        client: baseUrl,
        operator: `${baseUrl}/operator`,
        api: `${baseUrl}/api`,
        chat: `${baseUrl}/api/messages`,
        bookings: `${baseUrl}/api/bookings`
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







