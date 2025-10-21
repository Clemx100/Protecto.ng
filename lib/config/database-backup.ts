/**
 * Backup Database Configuration for PROTECTOR.NG
 * This provides a working fallback when the main Supabase project is unavailable
 */

// Create a new Supabase project for Protector.Ng
// You can get these from: https://supabase.com/dashboard
export const BACKUP_DATABASE_CONFIG = {
  // New Supabase Project URL (replace with your actual project)
  SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://your-new-project.supabase.co',
  
  // Anonymous Key (replace with your actual key)
  SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'your-anon-key-here',
  
  // Service Role Key (replace with your actual key)
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || 'your-service-role-key-here'
}

// Mock database for development when Supabase is unavailable
export const MOCK_DATABASE_CONFIG = {
  SUPABASE_URL: 'http://localhost:54321',
  SUPABASE_ANON_KEY: 'mock-anon-key',
  SUPABASE_SERVICE_ROLE_KEY: 'mock-service-role-key'
}

// Check if we should use mock database
export const shouldUseMockDatabase = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  // Only use mock database for actual localhost or mock URLs
  return url.includes('localhost:54321') || url.includes('mock') || url === 'http://localhost:54321'
}

// Get the appropriate database configuration
export const getDatabaseConfig = () => {
  if (shouldUseMockDatabase()) {
    return MOCK_DATABASE_CONFIG
  }
  
  // Try to use environment variables first
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return {
      SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
      SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    }
  }
  
  // Fallback to backup config
  return BACKUP_DATABASE_CONFIG
}

