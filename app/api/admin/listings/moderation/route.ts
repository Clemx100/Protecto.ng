import { NextRequest, NextResponse } from 'next/server'
import { requireOperatorAuth } from '@/lib/auth/operatorAuth'
import { createServiceRoleClient } from '@/lib/config/database'
import {
  getListingSchemaMissingMessage,
  isListingSchemaMissingError,
  LISTING_SCHEMA_MIGRATION_SCRIPT,
} from '@/lib/utils/listing-schema'

export async function GET() {
  const supabase = createServiceRoleClient()
  const [vehiclesResult, protectorsResult] = await Promise.all([
    supabase.from('vehicle_listings').select('*').order('created_at', { ascending: false }),
    supabase.from('protector_listings').select('*').order('created_at', { ascending: false }),
  ])

  const vehiclesError = vehiclesResult.error
  const protectorsError = protectorsResult.error
  const hasListingSchemaGap =
    isListingSchemaMissingError(vehiclesError, ['vehicle_listings']) ||
    isListingSchemaMissingError(protectorsError, ['protector_listings'])

  if (hasListingSchemaGap) {
    return NextResponse.json({
      success: true,
      data: {
        vehicles: [],
        protectors: [],
      },
      warning: `${getListingSchemaMissingMessage('vehicle_listings')} ${getListingSchemaMissingMessage('protector_listings')}`,
      migration_required: true,
      migration_script: LISTING_SCHEMA_MIGRATION_SCRIPT,
    })
  }

  if (vehiclesError || protectorsError) {
    return NextResponse.json(
      {
        error: vehiclesError?.message || protectorsError?.message || 'Failed to load listing moderation data',
      },
      { status: 500 }
    )
  }

  return NextResponse.json({
    success: true,
    data: {
      vehicles: vehiclesResult.data || [],
      protectors: protectorsResult.data || [],
    }
  })
}

export async function PATCH(request: NextRequest) {
  const authResult = await requireOperatorAuth(request)
  if (authResult.error) return authResult.response

  const body = await request.json()
  const supabase = createServiceRoleClient()
  const table = body.listing_type === 'vehicle' ? 'vehicle_listings' : 'protector_listings'

  const updatePayload = {
    approval_status: body.approval_status,
    kyc_status: body.approval_status === 'approved' ? 'verified' : 'rejected',
    moderation_notes: body.moderation_notes || null,
    approved_by: authResult.userId,
    approved_at: new Date().toISOString()
  }

  const { data, error } = await supabase
    .from(table)
    .update(updatePayload)
    .eq('id', body.listing_id)
    .select('*')
    .single()

  if (error) {
    if (isListingSchemaMissingError(error, [table])) {
      return NextResponse.json(
        {
          error: getListingSchemaMissingMessage(table),
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

