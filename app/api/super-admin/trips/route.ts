import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireSuperAdminAuth } from '@/lib/auth/superAdminAuth'
import type { BookingStatus } from '@/lib/types/database'

const getSupabaseAdmin = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

/**
 * PATCH: Update trip (e.g. end trip by setting status to completed).
 */
export async function PATCH(request: NextRequest) {
  const authResult = await requireSuperAdminAuth(request)
  if (authResult.error) return authResult.response

  try {
    const body = await request.json()
    const { trip_id, status } = body as { trip_id: string; status?: BookingStatus }

    if (!trip_id) {
      return NextResponse.json({ error: 'trip_id is required' }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (status !== undefined) updates.status = status

    const { data, error } = await supabase
      .from('bookings')
      .update(updates)
      .eq('id', trip_id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data,
      message: status === 'completed' ? 'Trip ended' : 'Trip updated'
    })
  } catch (e) {
    console.error('Super admin update trip error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * GET: List all trips (bookings) for super admin with client, service, agent, vehicle.
 */
export async function GET(request: NextRequest) {
  const authResult = await requireSuperAdminAuth(request)
  if (authResult.error) return authResult.response

  try {
    const supabase = getSupabaseAdmin()
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || undefined
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)))
    const offset = (page - 1) * limit

    let query = supabase
      .from('bookings')
      .select(
        `
        *,
        client:profiles!bookings_client_id_fkey(id, first_name, last_name, email, phone),
        service:services(id, name, type, description),
        assigned_agent:agents(id, agent_code, profile:profiles(first_name, last_name)),
        assigned_vehicle:vehicles(id, vehicle_code, make, model, license_plate)
      `,
        { count: 'exact' }
      )
    if (status) query = query.eq('status', status)
    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      data: data ?? [],
      count: count ?? 0,
      page,
      limit,
      total_pages: Math.ceil((count ?? 0) / limit)
    })
  } catch (e) {
    console.error('Super admin trips error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
