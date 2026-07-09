import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireSuperAdminAuth } from '@/lib/auth/superAdminAuth'
import { normalizeCitySlug } from '@/lib/utils/city-insights'

const getSupabaseAdmin = () =>
  createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

const MISSING_TABLE_MESSAGE =
  'City cards table not set up. Run scripts/03_city_insights.sql in Supabase SQL Editor.'

function isMissingCityInsightsTable(error: { code?: string; message?: string } | null | undefined) {
  if (!error) return false
  if (error.code === '42P01') return true
  const message = (error.message || '').toLowerCase()
  return message.includes('city_insights') && message.includes('does not exist')
}

function missingTableResponse() {
  return NextResponse.json({ error: MISSING_TABLE_MESSAGE }, { status: 503 })
}

function isDuplicateSlugError(error: { code?: string; message?: string } | null | undefined) {
  if (!error) return false
  if (error.code === '23505') return true
  const message = (error.message || '').toLowerCase()
  return (
    message.includes('city_insights_city_slug_key') ||
    message.includes('idx_city_insights_slug_category') ||
    message.includes('city_slug')
  )
}

function duplicateSlugResponse(cityName: string, category: string, existingId?: string) {
  return NextResponse.json(
    {
      error: `A ${category} card for "${cityName}" already exists. Edit the existing card instead of creating a duplicate.`,
      existing_id: existingId,
    },
    { status: 409 },
  )
}

async function findCityInsightBySlugAndCategory(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  citySlug: string,
  cardCategory: string,
  excludeId?: string,
) {
  let query = supabase
    .from('city_insights')
    .select('id, city_name, card_category')
    .eq('city_slug', citySlug)
    .eq('card_category', cardCategory)
  if (excludeId) {
    query = query.neq('id', excludeId)
  }
  const { data } = await query.maybeSingle()
  return data
}

function mapCityInsightBody(body: Record<string, unknown>) {
  const cityName = String(body.city_name || '').trim()
  const cardCategory = body.card_category === 'vehicle' ? 'vehicle' : 'protector'
  return {
    city_name: cityName,
    city_slug: normalizeCitySlug(String(body.city_slug || cityName)),
    card_category: cardCategory,
    headline: String(body.headline || '').trim() ||
      (cardCategory === 'vehicle' ? `Book a Vehicle in ${cityName}` : `Protector in ${cityName}`),
    description: String(body.description || body.metrics_label || '').trim(),
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
}

export async function GET(request: NextRequest) {
  const authResult = await requireSuperAdminAuth(request)
  if (authResult.error) return authResult.response

  try {
    const supabase = getSupabaseAdmin()
    const { data, error } = await supabase
      .from('city_insights')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('city_name', { ascending: true })

    if (error) {
      if (isMissingCityInsightsTable(error)) return missingTableResponse()
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data: data || [] })
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
    const payload = mapCityInsightBody(body)

    if (!payload.city_name || !payload.image_url) {
      return NextResponse.json({ error: 'city_name and image_url are required' }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()

    const existing = await findCityInsightBySlugAndCategory(
      supabase,
      payload.city_slug,
      payload.card_category,
    )
    if (existing) {
      return duplicateSlugResponse(existing.city_name, payload.card_category, existing.id)
    }

    if (payload.is_default) {
      await supabase.from('city_insights').update({ is_default: false }).eq('is_default', true)
    }

    const { data, error } = await supabase.from('city_insights').insert(payload).select('*').single()
    if (error) {
      if (isMissingCityInsightsTable(error)) return missingTableResponse()
      if (isDuplicateSlugError(error)) {
        return duplicateSlugResponse(payload.city_name, payload.card_category)
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
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

    const payload = mapCityInsightBody(body)
    const supabase = getSupabaseAdmin()

    const existing = await findCityInsightBySlugAndCategory(
      supabase,
      payload.city_slug,
      payload.card_category,
      id,
    )
    if (existing) {
      return duplicateSlugResponse(existing.city_name, payload.card_category, existing.id)
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

    if (error) {
      if (isMissingCityInsightsTable(error)) return missingTableResponse()
      if (isDuplicateSlugError(error)) {
        return duplicateSlugResponse(payload.city_name, payload.card_category, id)
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
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
