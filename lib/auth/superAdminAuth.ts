import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { NextRequest } from 'next/server'
import { shouldUseMockDatabase } from '@/lib/config/database-backup'

const getSupabaseAdmin = () => {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

const getSupabaseSessionClient = (request: NextRequest) => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    return null
  }

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll() {
        // Read-only auth checks do not need to mutate cookies here.
      }
    }
  })
}

/**
 * Verify that the request is from an authenticated super admin (role === 'admin')
 */
export async function verifySuperAdminAuth(request: NextRequest): Promise<{
  isAuthorized: boolean
  userId: string | null
  role: string | null
  error?: string
}> {
  try {
    if (shouldUseMockDatabase()) {
      const authHeader = request.headers.get('authorization')
      if (authHeader?.startsWith('Bearer ')) {
        return { isAuthorized: true, userId: 'admin-1', role: 'admin' }
      }
      return {
        isAuthorized: false,
        userId: null,
        role: null,
        error: 'No authorization token provided'
      }
    }

    const authHeader = request.headers.get('authorization')
    const supabase = getSupabaseAdmin()
    let user: { id: string } | null = null

    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '')
      const { data, error: tokenError } = await supabase.auth.getUser(token)
      if (!tokenError && data.user) {
        user = data.user
      }
    }

    if (!user) {
      const sessionClient = getSupabaseSessionClient(request)
      if (sessionClient) {
        const { data, error: sessionError } = await sessionClient.auth.getUser()
        if (!sessionError && data.user) {
          user = data.user
        }
      }
    }

    if (!user) {
      return {
        isAuthorized: false,
        userId: null,
        role: null,
        error: 'Invalid, expired, or missing authentication'
      }
    }

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

    if (profile.role !== 'admin') {
      return {
        isAuthorized: false,
        userId: user.id,
        role: profile.role,
        error: `Access denied. Super admin requires role 'admin'. Your role: '${profile.role}'`
      }
    }

    return {
      isAuthorized: true,
      userId: user.id,
      role: profile.role
    }
  } catch (error: any) {
    console.error('Super admin auth error:', error)
    return {
      isAuthorized: false,
      userId: null,
      role: null,
      error: error?.message || 'Authentication error'
    }
  }
}

export async function requireSuperAdminAuth(request: NextRequest) {
  const authResult = await verifySuperAdminAuth(request)

  if (!authResult.isAuthorized) {
    return {
      error: true,
      response: Response.json(
        {
          error: 'Unauthorized',
          message: authResult.error || 'Super admin access required'
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
