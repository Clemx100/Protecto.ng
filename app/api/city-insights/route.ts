import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/config/database'
import { DEFAULT_CITY_INSIGHT, findMatchingCityInsight } from '@/lib/utils/city-insights'

export async function GET(request: NextRequest) {
  try {
    const city = request.nextUrl.searchParams.get('city')?.trim() || ''
    const supabase = createServiceRoleClient()

    const { data: rows, error } = await supabase
      .from('city_insights')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })

    if (error) {
      if (error.code === '42P01') {
        return NextResponse.json({
          success: true,
          data: { ...DEFAULT_CITY_INSIGHT, city_name: city || DEFAULT_CITY_INSIGHT.city_name },
          fallback: true,
        })
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const insights = rows || []

    if (!city) {
      return NextResponse.json({
        success: true,
        data: insights,
        list: true,
      })
    }

    const matched =
      findMatchingCityInsight(insights, city) ||
      insights.find((row) => row.is_default) ||
      insights[0]

    if (!matched) {
      return NextResponse.json({
        success: true,
        data: {
          ...DEFAULT_CITY_INSIGHT,
          city_name: city || DEFAULT_CITY_INSIGHT.city_name,
        },
        fallback: true,
      })
    }

    return NextResponse.json({
      success: true,
      data: matched,
      fallback: false,
    })
  } catch (error) {
    console.error('City insights GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
