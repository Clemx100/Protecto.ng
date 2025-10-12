/**
 * Centralized Database Configuration for PROTECTOR.NG
 * This ensures all parts of the application use the same database instance
 */

// PROTECTOR.NG LIVE Database Configuration
export const DATABASE_CONFIG = {
  // Supabase Project URL
  SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kifcevffaputepvpjpip.supabase.co',
  
  // Anonymous Key (for client-side operations)
  SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpZmNldmZmYXB1dGVwdnBqcGlwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk3OTQ0NzYsImV4cCI6MjA3NTM3MDQ3Nn0.YuVbfSbrDUy2nPigODzCcaOWTEXaJlPrVGE1L0C3y6g',
  
  // Service Role Key (for server-side operations with elevated privileges)
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpZmNldmZmYXB1dGVwdnBqcGlwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTc5NDQ3NiwiZXhwIjoyMDc1MzcwNDc2fQ.O2hluhPKj1GiERmTlXQ0N35mV2loJ2L2WGsnOkIQpio'
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
