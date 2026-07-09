/**
 * Adds card_category, headline, and description to city_insights.
 * Usage: node scripts/run-city-insights-migration.js
 */
const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return
  const content = fs.readFileSync(filePath, 'utf8')
  for (const line of content.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    let value = trimmed.slice(eq + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    if (!process.env[key]) process.env[key] = value
  }
}

async function main() {
  loadEnvFile(path.join(process.cwd(), '.env.local'))
  loadEnvFile(path.join(process.cwd(), '.env'))

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey)
  const sqlPath = path.join(process.cwd(), 'scripts', '06_promo_card_smart_fields.sql')
  const sql = fs.readFileSync(sqlPath, 'utf8')

  const statements = sql
    .split(';')
    .map((part) => part.replace(/--.*$/gm, '').trim())
    .filter(Boolean)

  console.log(`Running ${statements.length} migration statements...`)

  for (const statement of statements) {
    const { error } = await supabase.rpc('exec_sql', { sql: `${statement};` })
    if (error) {
      const message = (error.message || '').toLowerCase()
      if (message.includes('exec_sql')) {
        console.error('Automatic migration unavailable. Run scripts/06_promo_card_smart_fields.sql in Supabase SQL Editor.')
        process.exit(1)
      }
      const message = (error.message || '').toLowerCase()
      if (message.includes('already exists')) {
        console.log('Skipped (already applied):', statement.slice(0, 60), '...')
        continue
      }
      console.error('Migration failed:', error.message)
      console.error('Statement:', statement)
      process.exit(1)
    }
    console.log('OK:', statement.slice(0, 60), '...')
  }

  const verify = await supabase.from('city_insights').select('card_category, headline, description').limit(1)
  if (verify.error) {
    console.error('Verification failed:', verify.error.message)
    console.error('Run scripts/06_promo_card_smart_fields.sql manually in Supabase SQL Editor.')
    process.exit(1)
  }

  console.log('City insights smart fields migration completed.')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
