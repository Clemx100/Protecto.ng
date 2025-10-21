import { createClient } from '@supabase/supabase-js'
import { NextRequest } from 'next/server'
import { fallbackAuth } from '@/lib/services/fallbackAuth'
import { shouldUseMockDatabase } from '@/lib/config/database-backup'

// Initialize Supabase client with service role for admin operations
const getSupabaseAdmin = () => {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

/**
 * Verify that the request is from an authenticated operator
 * Returns the operator's user ID if valid, null otherwise
 */
export async function verifyOperatorAuth(request: NextRequest): Promise<{
  isAuthorized: boolean
  userId: string | null
  role: string | null
  error?: string
}> {
  try {
    // Use mock database if configured
    if (shouldUseMockDatabase()) {
      console.log('🔄 Using mock database for operator authentication')
      // For mock database, we'll allow any request with a token
      const authHeader = request.headers.get('authorization')
      if (authHeader && authHeader.startsWith('Bearer ')) {
        return {
          isAuthorized: true,
          userId: 'operator-1',
          role: 'operator'
        }
      }
      return {
        isAuthorized: false,
        userId: null,
        role: null,
        error: 'No authorization token provided'
      }
    }

    // Get authorization header
    const authHeader = request.headers.get('authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        isAuthorized: false,
        userId: null,
        role: null,
        error: 'No authorization token provided'
      }
    }

    const token = authHeader.replace('Bearer ', '')
    const supabase = getSupabaseAdmin()

    // Verify the JWT token
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return {
        isAuthorized: false,
        userId: null,
        role: null,
        error: 'Invalid or expired token'
      }
    }

    // Check user's role in profiles table
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return {
        isAuthorized: false,
        userId: user.id,
        role: null,
        error: 'User profile not found'
      }
    }

    // Check if user has operator, admin, or agent role
    const authorizedRoles = ['operator', 'admin', 'agent']
    const isAuthorized = authorizedRoles.includes(profile.role)

    if (!isAuthorized) {
      return {
        isAuthorized: false,
        userId: user.id,
        role: profile.role,
        error: `Access denied. User role '${profile.role}' is not authorized for operator access.`
      }
    }

    return {
      isAuthorized: true,
      userId: user.id,
      role: profile.role
    }
  } catch (error: any) {
    console.error('Error verifying operator auth:', error)
    return {
      isAuthorized: false,
      userId: null,
      role: null,
      error: `Authentication error: ${error.message}`
    }
  }
}

/**
 * Middleware function to protect operator API routes
 * Returns error response if not authorized, null if authorized
 */
export async function requireOperatorAuth(request: NextRequest) {
  const authResult = await verifyOperatorAuth(request)

  if (!authResult.isAuthorized) {
    return {
      error: true,
      response: Response.json(
        {
          error: 'Unauthorized',
          message: authResult.error || 'Operator access required',
          details: 'You must be logged in as an operator, admin, or agent to access this resource.'
        },
        { status: 401 }
      )
    }
  }

  return {
    error: false,
    userId: authResult.userId,
    role: authResult.role
  }
}

