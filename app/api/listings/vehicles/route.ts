import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/config/database'
import { createClient as createServerSupabaseClient } from '@/lib/supabase/server'
import {
  getListingSchemaMissingMessage,
  isListingSchemaMissingError,
  LISTING_SCHEMA_MIGRATION_SCRIPT,
} from '@/lib/utils/listing-schema'

async function getUserId() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user?.id || null
}

export async function GET(request: NextRequest) {
  const supabase = createServiceRoleClient()
  const mine = request.nextUrl.searchParams.get('mine') === '1'
  const userId = await getUserId()

  let query = supabase.from('vehicle_listings').select('*').order('created_at', { ascending: false })
  if (mine && userId) query = query.eq('owner_id', userId)
  if (!mine) query = query.eq('approval_status', 'approved').eq('kyc_status', 'verified')

  const { data, error } = await query
  if (error) {
    if (isListingSchemaMissingError(error, ['vehicle_listings'])) {
      return NextResponse.json({
        success: true,
        data: [],
        warning: getListingSchemaMissingMessage('vehicle_listings'),
        migration_required: true,
        migration_script: LISTING_SCHEMA_MIGRATION_SCRIPT,
      })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ success: true, data: data || [] })
}

export async function POST(request: NextRequest) {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const supabase = createServiceRoleClient()

  const { data, error } = await supabase
    .from('vehicle_listings')
    .insert({
      owner_id: userId,
      title: body.title,
      description: body.description || null,
      make: body.make,
      model: body.model,
      year: body.year,
      type: body.type || 'suv',
      seats: body.seats || 4,
      with_driver: Boolean(body.with_driver),
      price_per_day: body.price_per_day,
      photos: body.photos || [],
      availability: body.availability || {},
      kyc_status: 'submitted',
      approval_status: 'pending'
    })
    .select('*')
    .single()

  if (error) {
    if (isListingSchemaMissingError(error, ['vehicle_listings'])) {
      return NextResponse.json(
        {
          error: getListingSchemaMissingMessage('vehicle_listings'),
          migration_required: true,
          migration_script: LISTING_SCHEMA_MIGRATION_SCRIPT,
        },
        { status: 503 }
      )
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ success: true, data })
}

