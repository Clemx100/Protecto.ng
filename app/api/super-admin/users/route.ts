import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireSuperAdminAuth } from '@/lib/auth/superAdminAuth'
import type { UserRole } from '@/lib/types/database'

const getSupabaseAdmin = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

export async function GET(request: NextRequest) {
  const authResult = await requireSuperAdminAuth(request)
  if (authResult.error) return authResult.response

  try {
    const supabase = getSupabaseAdmin()
    const { searchParams } = new URL(request.url)
    const role = searchParams.get('role') || undefined
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)))
    const offset = (page - 1) * limit

    let query = supabase.from('profiles').select('*', { count: 'exact' })
    if (role) query = query.eq('role', role)
    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      data: data ?? [],
      count: count ?? 0,
      page,
      limit,
      total_pages: Math.ceil((count ?? 0) / limit)
    })
  } catch (e) {
    console.error('Super admin users list error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const authResult = await requireSuperAdminAuth(request)
  if (authResult.error) return authResult.response

  try {
    const body = await request.json()
    const {
      email,
      password,
      first_name,
      last_name,
      phone,
      role = 'client'
    } = body as {
      email: string
      password: string
      first_name: string
      last_name: string
      phone?: string
      role?: UserRole
    }

    if (!email || !password || !first_name || !last_name) {
      return NextResponse.json(
        { error: 'email, password, first_name, and last_name are required' },
        { status: 400 }
      )
    }

    const supabase = getSupabaseAdmin()
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { first_name, last_name, role }
    })

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 })
    }

    if (!authData.user) {
      return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
    }

    const profilePayload = {
      id: authData.user.id,
      email,
      first_name,
      last_name,
      phone: phone || null,
      role: role || 'client',
      is_verified: true,
      is_active: true,
      updated_at: new Date().toISOString()
    }
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .upsert(profilePayload, { onConflict: 'id', ignoreDuplicates: false })
      .select()
      .single()

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 500 })
    }

    return NextResponse.json({ data: profile ?? profilePayload })
  } catch (e) {
    console.error('Super admin create user error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  const authResult = await requireSuperAdminAuth(request)
  if (authResult.error) return authResult.response

  try {
    const body = await request.json()
    const { user_id, role, password } = body as {
      user_id: string
      role?: UserRole
      password?: string
    }

    if (!user_id) {
      return NextResponse.json({ error: 'user_id is required' }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }

    if (role !== undefined) {
      updates.role = role
    }

    if (Object.keys(updates).length > 1) {
      const { error: profileError } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user_id)
      if (profileError) {
        return NextResponse.json({ error: profileError.message }, { status: 500 })
      }
    }

    if (password !== undefined && password !== '') {
      if (password.length < 6) {
        return NextResponse.json(
          { error: 'Password must be at least 6 characters' },
          { status: 400 }
        )
      }
      const { error: authError } = await supabase.auth.admin.updateUserById(user_id, {
        password: String(password)
      })
      if (authError) {
        return NextResponse.json({ error: authError.message }, { status: 400 })
      }
    }

    return NextResponse.json({
      success: true,
      message: [role !== undefined && 'Role updated', password && 'Password updated']
        .filter(Boolean)
        .join('. ') || 'User updated'
    })
  } catch (e) {
    console.error('Super admin update user error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const authResult = await requireSuperAdminAuth(request)
  if (authResult.error) return authResult.response

  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('id')
    if (!userId) {
      return NextResponse.json({ error: 'User id is required' }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()

    // Optional body for permanent delete with password confirmation
    let body: { password?: string } = {}
    try {
      body = await request.json()
    } catch {
      // No body: deactivate only
    }

    const superAdminPassword = body?.password?.trim()

    if (superAdminPassword) {
      // Permanent delete: verify super admin password first
      const { data: profile } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', authResult.userId!)
        .single()

      const superAdminEmail = profile?.email
      if (!superAdminEmail) {
        return NextResponse.json(
          { error: 'Super admin email not found' },
          { status: 400 }
        )
      }

      const { createClient } = await import('@supabase/supabase-js')
      const anon = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )
      const { error: signInError } = await anon.auth.signInWithPassword({
        email: superAdminEmail,
        password: superAdminPassword
      })
      if (signInError) {
        return NextResponse.json(
          { error: 'Invalid super admin password' },
          { status: 401 }
        )
      }

      // Prevent deleting yourself
      if (userId === authResult.userId) {
        return NextResponse.json(
          { error: 'You cannot delete your own account' },
          { status: 400 }
        )
      }

      const { error: deleteAuthError } = await supabase.auth.admin.deleteUser(userId)
      if (deleteAuthError) {
        return NextResponse.json(
          { error: deleteAuthError.message },
          { status: 500 }
        )
      }

      const { error: deleteProfileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userId)
      if (deleteProfileError) {
        return NextResponse.json(
          { error: deleteProfileError.message },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        message: 'User permanently deleted'
      })
    }

    // No password: deactivate only
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', userId)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'User deactivated' })
  } catch (e) {
    console.error('Super admin delete/deactivate user error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
