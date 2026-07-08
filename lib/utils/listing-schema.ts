type SupabaseLikeError = {
  code?: string | null
  message?: string | null
  details?: string | null
  hint?: string | null
}

const DEFAULT_LISTING_TABLES = ['vehicle_listings', 'protector_listings', 'listing_documents']
const MISSING_RELATION_PATTERN =
  /(schema cache|could not find the table|relation .* does not exist|does not exist)/i

export const LISTING_SCHEMA_MIGRATION_SCRIPT = 'scripts/02_ensure_listing_tables.sql'

export function isListingSchemaMissingError(
  error: SupabaseLikeError | null | undefined,
  tableNames: string[] = DEFAULT_LISTING_TABLES
): boolean {
  if (!error) return false

  const code = String(error.code || '').toUpperCase()
  const text = `${error.message || ''} ${error.details || ''} ${error.hint || ''}`.toLowerCase()
  const mentionsListingTable = tableNames.some((tableName) => text.includes(tableName.toLowerCase()))

  if (code === '42P01' || code === 'PGRST205') {
    return true
  }

  return mentionsListingTable && MISSING_RELATION_PATTERN.test(text)
}

export function getListingSchemaMissingMessage(tableName: string) {
  return `Listing feature requires database table "${tableName}". Run ${LISTING_SCHEMA_MIGRATION_SCRIPT} and refresh Supabase schema cache.`
}
