import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireSuperAdminAuth } from '@/lib/auth/superAdminAuth'
import {
  getCityInsightsSchemaStatus,
  isMissingCityInsightsColumnError,
  missingCityInsightsColumnsMessage,
} from '@/lib/utils/city-insights-schema'
import { normalizeCitySlug, normalizeCardCategory } from '@/lib/utils/city-insights'

const getSupabaseAdmin = () =>
  createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

const MISSING_TABLE_MESSAGE =
  'City cards table not set up. Run scripts/03_city_insights.sql in Supabase SQL Editor.'

const UNLIMITED_CARDS_MIGRATION = 'scripts/07_city_insights_unlimited_cards.sql'

function isMissingCityInsightsTable(error: { code?: string; message?: string } | null | undefined) {
  if (!error) return false
  if (error.code === '42P01') return true
  const message = (error.message || '').toLowerCase()
  return message.includes('city_insights') && message.includes('does not exist')
}

function missingTableResponse() {
  return NextResponse.json({ error: MISSING_TABLE_MESSAGE }, { status: 503 })
}

function missingColumnsResponse(detail?: string) {
  return NextResponse.json(
    {
      error: detail || missingCityInsightsColumnsMessage(),
      migration_script: 'scripts/06_promo_card_smart_fields.sql',
      migration_required: true,
    },
    { status: 503 },
  )
}

function isLegacyUniqueCardError(error: { code?: string; message?: string } | null | undefined) {
  if (!error) return false
  if (error.code === '23505') return true
  const message = (error.message || '').toLowerCase()
  return (
    message.includes('idx_city_insights_slug_category') ||
    message.includes('idx_city_insights_city_category') ||
    message.includes('city_insights_city_slug_key')
  )
}

function legacyUniqueCardResponse() {
  return NextResponse.json(
    {
      error: `Database still limits one card per city/category. Run ${UNLIMITED_CARDS_MIGRATION} in Supabase SQL Editor to allow unlimited cards.`,
      migration_script: UNLIMITED_CARDS_MIGRATION,
    },
    { status: 409 },
  )
}

function normalizeInsightRow(row: Record<string, unknown>) {
  const cityName = String(row.city_name || 'Lagos')
  const category = normalizeCardCategory(row.card_category)
  const defaultHeadline =
    category === 'bulletproof_vehicle'
      ? `Book a Bulletproof Vehicle in ${cityName}`
      : category === 'vehicle'
        ? `Book a Vehicle in ${cityName}`
        : `Protector in ${cityName}`

  return {
    ...row,
    card_category: category,
    headline: String(row.headline || defaultHeadline),
    description: String(row.description || row.metrics_label || ''),
  }
}

function mapCityInsightBody(body: Record<string, unknown>, smartFieldsReady: boolean) {
  const cityName = String(body.city_name || '').trim()
  const cardCategory = normalizeCardCategory(body.card_category)
  const defaultHeadline =
    cardCategory === 'bulletproof_vehicle'
      ? `Book a Bulletproof Vehicle in ${cityName}`
      : cardCategory === 'vehicle'
        ? `Book a Vehicle in ${cityName}`
        : `Protector in ${cityName}`

  const base = {
    city_name: cityName,
    city_slug: normalizeCitySlug(String(body.city_slug || cityName)),
    image_url: String(body.image_url || '').trim(),
    response_time_label: String(body.response_time_label || '15–45 min').trim(),
    metrics_label: String(body.metrics_label || 'Avg mission price').trim(),
    price_min: Number(body.price_min ?? 250000),
    price_max: Number(body.price_max ?? 700000),
    currency: String(body.currency || 'NGN').trim(),
    cta_label: String(body.cta_label || 'Get city insights →').trim(),
    cta_url: body.cta_url ? String(body.cta_url).trim() : null,
    is_active: body.is_active !== false,
    is_default: Boolean(body.is_default),
    sort_order: Number(body.sort_order ?? 0),
  }

  if (!smartFieldsReady) return base

  return {
    ...base,
    card_category: cardCategory,
    headline: String(body.headline || '').trim() || defaultHeadline,
    description: String(body.description || body.metrics_label || '').trim(),
  }
}

function handleWriteError(error: { code?: string; message?: string }) {
  if (isMissingCityInsightsTable(error)) return missingTableResponse()
  if (isMissingCityInsightsColumnError(error)) return missingColumnsResponse(error.message)
  if (isLegacyUniqueCardError(error)) return legacyUniqueCardResponse()
  return NextResponse.json({ error: error.message }, { status: 500 })
}

export async function GET(request: NextRequest) {
  const authResult = await requireSuperAdminAuth(request)
  if (authResult.error) return authResult.response

  try {
    const supabase = getSupabaseAdmin()
    const schemaStatus = await getCityInsightsSchemaStatus(supabase)

    const { data, error } = await supabase
      .from('city_insights')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('city_name', { ascending: true })
      .order('created_at', { ascending: true })
      .range(0, 4999)

    if (error) {
      if (isMissingCityInsightsTable(error)) return missingTableResponse()
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      data: (data || []).map((row) => normalizeInsightRow(row as Record<string, unknown>)),
      migration_required: !schemaStatus.smartFieldsReady,
      migration_message: schemaStatus.smartFieldsReady ? null : schemaStatus.error,
      migration_script: schemaStatus.smartFieldsReady ? null : 'scripts/06_promo_card_smart_fields.sql',
    })
  } catch (error) {
    console.error('Super admin city insights list error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const authResult = await requireSuperAdminAuth(request)
  if (authResult.error) return authResult.response

  try {
    const body = await request.json()
    const supabase = getSupabaseAdmin()
    const schemaStatus = await getCityInsightsSchemaStatus(supabase)
    const payload = mapCityInsightBody(body, schemaStatus.smartFieldsReady)

    if (!payload.city_name || !payload.image_url) {
      return NextResponse.json({ error: 'city_name and image_url are required' }, { status: 400 })
    }

    if (!schemaStatus.smartFieldsReady) {
      return missingColumnsResponse(schemaStatus.error)
    }

    if (payload.is_default) {
      await supabase.from('city_insights').update({ is_default: false }).eq('is_default', true)
    }

    const { data, error } = await supabase.from('city_insights').insert(payload).select('*').single()
    if (error) return handleWriteError(error)

    return NextResponse.json({ success: true, data: normalizeInsightRow(data as Record<string, unknown>) })
  } catch (error) {
    console.error('Super admin city insights create error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  const authResult = await requireSuperAdminAuth(request)
  if (authResult.error) return authResult.response

  try {
    const body = await request.json()
    const id = String(body.id || '').trim()
    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()
    const schemaStatus = await getCityInsightsSchemaStatus(supabase)
    const payload = mapCityInsightBody(body, schemaStatus.smartFieldsReady)

    if (!schemaStatus.smartFieldsReady) {
      return missingColumnsResponse(schemaStatus.error)
    }

    if (payload.is_default) {
      await supabase.from('city_insights').update({ is_default: false }).neq('id', id)
    }

    const { data, error } = await supabase
      .from('city_insights')
      .update(payload)
      .eq('id', id)
      .select('*')
      .single()

    if (error) return handleWriteError(error)

    return NextResponse.json({ success: true, data: normalizeInsightRow(data as Record<string, unknown>) })
  } catch (error) {
    console.error('Super admin city insights update error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const authResult = await requireSuperAdminAuth(request)
  if (authResult.error) return authResult.response

  try {
    const id = new URL(request.url).searchParams.get('id')
    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()
    const { error } = await supabase.from('city_insights').delete().eq('id', id)

    if (error) {
      if (isMissingCityInsightsTable(error)) return missingTableResponse()
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Super admin city insights delete error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
