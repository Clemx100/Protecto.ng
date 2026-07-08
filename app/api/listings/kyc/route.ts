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

export async function POST(request: NextRequest) {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const supabase = createServiceRoleClient()

  const { data, error } = await supabase
    .from('listing_documents')
    .insert({
      listing_type: body.listing_type,
      listing_id: body.listing_id,
      provider_id: userId,
      document_type: body.document_type,
      file_url: body.file_url,
      metadata: body.metadata || {},
      verification_status: 'pending'
    })
    .select('*')
    .single()

  if (error) {
    if (isListingSchemaMissingError(error, ['listing_documents'])) {
      return NextResponse.json(
        {
          error: getListingSchemaMissingMessage('listing_documents'),
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

