import type { SupabaseClient } from '@supabase/supabase-js'

export const CITY_INSIGHTS_SMART_FIELDS_MIGRATION = 'scripts/06_promo_card_smart_fields.sql'

export function isMissingCityInsightsColumnError(
  error: { code?: string; message?: string } | null | undefined,
) {
  if (!error) return false
  const message = (error.message || '').toLowerCase()
  return (
    message.includes('card_category') ||
    message.includes('headline') ||
    message.includes('description') ||
    (message.includes('schema cache') && message.includes('city_insights'))
  )
}

export function isExecSqlUnavailableError(message?: string) {
  if (!message) return false
  const normalized = message.toLowerCase()
  return normalized.includes('exec_sql') && normalized.includes('schema cache')
}

export function missingCityInsightsColumnsMessage() {
  return `City card categories require a one-time database update. Open Supabase → SQL Editor → run ${CITY_INSIGHTS_SMART_FIELDS_MIGRATION}.`
}

export function needsCityInsightsMigration(message?: string) {
  if (!message) return false
  if (isExecSqlUnavailableError(message)) return true
  return isMissingCityInsightsColumnError({ message })
}

export type CityInsightsSchemaStatus = {
  smartFieldsReady: boolean
  error?: string
}

export async function getCityInsightsSchemaStatus(
  supabase: SupabaseClient,
): Promise<CityInsightsSchemaStatus> {
  const probe = await supabase.from('city_insights').select('card_category').limit(1)

  if (!probe.error) {
    return { smartFieldsReady: true }
  }

  if (probe.error.code === '42P01') {
    return {
      smartFieldsReady: false,
      error: 'city_insights table not found. Run scripts/03_city_insights.sql first.',
    }
  }

  if (isMissingCityInsightsColumnError(probe.error)) {
    return {
      smartFieldsReady: false,
      error: missingCityInsightsColumnsMessage(),
    }
  }

  return {
    smartFieldsReady: false,
    error: probe.error.message,
  }
}
