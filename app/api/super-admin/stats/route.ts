import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireSuperAdminAuth } from '@/lib/auth/superAdminAuth'

const getSupabaseAdmin = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

export async function GET(_request: NextRequest) {
  const authResult = await requireSuperAdminAuth(_request)
  if (authResult.error) return authResult.response

  try {
    const supabase = getSupabaseAdmin()

    const [
      { count: totalUsers },
      { count: totalVehicles },
      { count: totalBookings },
      { count: activeBookings },
      { data: payments },
      { count: activeAlerts }
    ] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('vehicles').select('*', { count: 'exact', head: true }),
      supabase.from('bookings').select('*', { count: 'exact', head: true }),
      supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .in('status', ['pending', 'accepted', 'en_route', 'arrived', 'in_service']),
      supabase
        .from('payments')
        .select('amount')
        .eq('status', 'completed')
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
      supabase
        .from('emergency_alerts')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active')
    ])

    const revenue30d = payments?.reduce((sum: number, p: { amount: number }) => sum + (p?.amount ?? 0), 0) ?? 0

    return NextResponse.json({
      total_users: totalUsers ?? 0,
      total_vehicles: totalVehicles ?? 0,
      total_trips: totalBookings ?? 0,
      active_trips: activeBookings ?? 0,
      revenue_30d: revenue30d,
      emergency_alerts: activeAlerts ?? 0
    })
  } catch (e) {
    console.error('Super admin stats error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
