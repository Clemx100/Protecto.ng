import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireSuperAdminAuth } from '@/lib/auth/superAdminAuth'

const getSupabaseAdmin = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

/**
 * GET: Return vehicles with current_location and agents with current_location
 * for super admin live map. Optionally filter by booking_id for trip tracking.
 */
export async function GET(request: NextRequest) {
  const authResult = await requireSuperAdminAuth(request)
  if (authResult.error) return authResult.response

  try {
    const supabase = getSupabaseAdmin()
    const { searchParams } = new URL(request.url)
    const bookingId = searchParams.get('booking_id')

    const [vehiclesRes, agentsRes, trackingRes] = await Promise.all([
      supabase
        .from('vehicles')
        .select('id, vehicle_code, make, model, license_plate, current_location, is_available, updated_at'),
      supabase
        .from('agents')
        .select(`
          id,
          agent_code,
          current_location,
          availability_status,
          last_seen,
          profile:profiles(id, first_name, last_name)
        `),
      bookingId
        ? supabase
            .from('location_tracking')
            .select('*')
            .eq('booking_id', bookingId)
            .order('timestamp', { ascending: false })
            .limit(500)
        : Promise.resolve({ data: null, error: null })
    ])

    const vehicles =
      vehiclesRes.data?.filter(
        (v: any) => v.current_location && (v.current_location.x != null || v.current_location?.lat != null)
      ).map((v: any) => ({
        id: v.id,
        vehicle_code: v.vehicle_code,
        make: v.make,
        model: v.model,
        license_plate: v.license_plate,
        is_available: v.is_available,
        updated_at: v.updated_at,
        location: normalizeLocation(v.current_location)
      })) ?? []

    const agents =
      agentsRes.data?.filter(
        (a: any) => a.current_location && (a.current_location.x != null || a.current_location?.lat != null)
      ).map((a: any) => ({
        id: a.id,
        agent_code: a.agent_code,
        availability_status: a.availability_status,
        last_seen: a.last_seen,
        profile: a.profile,
        location: normalizeLocation(a.current_location)
      })) ?? []

    const tracking =
      trackingRes.data?.map((t: any) => ({
        id: t.id,
        booking_id: t.booking_id,
        agent_id: t.agent_id,
        vehicle_id: t.vehicle_id,
        location: normalizeLocation(t.location),
        heading: t.heading,
        speed: t.speed,
        timestamp: t.timestamp
      })) ?? []

    return NextResponse.json({
      vehicles,
      agents,
      tracking
    })
  } catch (e) {
    console.error('Super admin tracking error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function normalizeLocation(loc: any): { lat: number; lng: number } | null {
  if (!loc) return null
  const lat = loc.lat ?? loc.y ?? loc.x
  const lng = loc.lng ?? loc.x ?? loc.y
  if (typeof lat !== 'number' || typeof lng !== 'number') return null
  return { lat, lng }
}
