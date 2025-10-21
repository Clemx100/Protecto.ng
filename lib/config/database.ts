/**
 * Centralized Database Configuration for PROTECTOR.NG
 * This ensures all parts of the application use the same database instance
 */

// Import backup configuration
import { getDatabaseConfig } from './database-backup'

// Get the appropriate database configuration
const config = getDatabaseConfig()

// PROTECTOR.NG Database Configuration
export const DATABASE_CONFIG = {
  // Supabase Project URL
  SUPABASE_URL: config.SUPABASE_URL,
  
  // Anonymous Key (for client-side operations)
  SUPABASE_ANON_KEY: config.SUPABASE_ANON_KEY,
  
  // Service Role Key (for server-side operations with elevated privileges)
  SUPABASE_SERVICE_ROLE_KEY: config.SUPABASE_SERVICE_ROLE_KEY
}

// Database Connection Helpers
export const createDatabaseClient = () => {
  const { createClient } = require('@supabase/supabase-js')
  return createClient(DATABASE_CONFIG.SUPABASE_URL, DATABASE_CONFIG.SUPABASE_ANON_KEY)
}

export const createServiceRoleClient = () => {
  const { createClient } = require('@supabase/supabase-js')
  return createClient(DATABASE_CONFIG.SUPABASE_URL, DATABASE_CONFIG.SUPABASE_SERVICE_ROLE_KEY)
}

// Database Status Check
export const checkDatabaseConnection = async () => {
  try {
    const supabase = createServiceRoleClient()
    const { data, error } = await supabase.from('profiles').select('count').limit(1)
    
    if (error) {
      console.error('❌ Database connection failed:', error.message)
      return { connected: false, error: error.message }
    }
    
    console.log('✅ Database connection successful')
    return { connected: true, error: null }
  } catch (error) {
    console.error('❌ Database connection error:', error)
    return { connected: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

// Export for easy access
export default DATABASE_CONFIG
