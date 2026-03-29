import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireSuperAdminAuth } from '@/lib/auth/superAdminAuth'
import type { VehicleType } from '@/lib/types/database'

const getSupabaseAdmin = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

export async function GET(request: NextRequest) {
  const authResult = await requireSuperAdminAuth(request)
  if (authResult.error) return authResult.response

  try {
    const supabase = getSupabaseAdmin()
    const { searchParams } = new URL(request.url)
    const available = searchParams.get('available')
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)))
    const offset = (page - 1) * limit

    let query = supabase.from('vehicles').select('*', { count: 'exact' })
    if (available === 'true') query = query.eq('is_available', true)
    if (available === 'false') query = query.eq('is_available', false)
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
    console.error('Super admin vehicles list error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const authResult = await requireSuperAdminAuth(request)
  if (authResult.error) return authResult.response

  try {
    const body = await request.json()
    const {
      vehicle_code,
      make,
      model,
      year,
      type = 'suv',
      is_armored = false,
      capacity = 4,
      license_plate,
      color,
      features = [],
      image_url,
      photo_urls = []
    } = body as {
      vehicle_code?: string
      make: string
      model: string
      year: number
      type?: VehicleType
      is_armored?: boolean
      capacity?: number
      license_plate: string
      color?: string
      features?: string[]
      image_url?: string
      photo_urls?: string[]
    }

    if (!make || !model || !license_plate || !year) {
      return NextResponse.json(
        { error: 'make, model, license_plate, and year are required' },
        { status: 400 }
      )
    }

    const code = vehicle_code || `VH${Date.now().toString().slice(-6)}`
    const supabase = getSupabaseAdmin()
    const insertPayload: Record<string, unknown> = {
      vehicle_code: code,
      make,
      model,
      year: Number(year),
      type: type || 'suv',
      is_armored: Boolean(is_armored),
      capacity: Number(capacity) || 4,
      license_plate,
      color: color || null,
      features: Array.isArray(features) ? features : [],
      is_available: true
    }
    if (image_url != null) insertPayload.image_url = image_url
    if (Array.isArray(photo_urls) && photo_urls.length > 0) insertPayload.photo_urls = photo_urls

    const { data, error } = await supabase
      .from('vehicles')
      .insert(insertPayload)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (e) {
    console.error('Super admin create vehicle error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  const authResult = await requireSuperAdminAuth(request)
  if (authResult.error) return authResult.response

  try {
    const body = await request.json()
    const {
      vehicle_id,
      image_url,
      photo_urls,
      make,
      model,
      year,
      type,
      is_armored,
      capacity,
      license_plate,
      color,
      is_available
    } = body as {
      vehicle_id: string
      image_url?: string
      photo_urls?: string[]
      make?: string
      model?: string
      year?: number
      type?: VehicleType
      is_armored?: boolean
      capacity?: number
      license_plate?: string
      color?: string
      is_available?: boolean
    }

    if (!vehicle_id) {
      return NextResponse.json({ error: 'vehicle_id is required' }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (image_url !== undefined) updates.image_url = image_url
    if (photo_urls !== undefined) updates.photo_urls = Array.isArray(photo_urls) ? photo_urls : []
    if (make !== undefined) updates.make = make
    if (model !== undefined) updates.model = model
    if (year !== undefined) updates.year = year
    if (type !== undefined) updates.type = type
    if (is_armored !== undefined) updates.is_armored = is_armored
    if (capacity !== undefined) updates.capacity = capacity
    if (license_plate !== undefined) updates.license_plate = license_plate
    if (color !== undefined) updates.color = color
    if (is_available !== undefined) updates.is_available = is_available

    const { data, error } = await supabase
      .from('vehicles')
      .update(updates)
      .eq('id', vehicle_id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
  } catch (e) {
    console.error('Super admin update vehicle error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const authResult = await requireSuperAdminAuth(request)
  if (authResult.error) return authResult.response

  try {
    const { searchParams } = new URL(request.url)
    const vehicleId = searchParams.get('id')
    if (!vehicleId) {
      return NextResponse.json({ error: 'Vehicle id is required' }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()
    const { error } = await supabase.from('vehicles').delete().eq('id', vehicleId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'Vehicle removed' })
  } catch (e) {
    console.error('Super admin delete vehicle error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
