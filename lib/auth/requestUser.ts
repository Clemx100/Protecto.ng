import { NextRequest } from "next/server"
import { createServiceRoleClient } from "@/lib/config/database"
import { createClient as createServerSupabaseClient } from "@/lib/supabase/server"

export interface RequestUserContext {
  id: string
  role: string | null
  email: string | null
}

/**
 * Resolve authenticated user from bearer token first, then cookie session.
 */
export async function getRequestUserContext(request: NextRequest): Promise<RequestUserContext | null> {
  const supabase = createServiceRoleClient()
  let user: { id: string; email?: string | null } | null = null

  const authHeader = request.headers.get("authorization")
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.replace("Bearer ", "")
    const { data, error } = await supabase.auth.getUser(token)
    if (!error && data.user) {
      user = data.user
    }
  }

  if (!user) {
    try {
      const sessionSupabase = await createServerSupabaseClient()
      const {
        data: { user: sessionUser },
        error,
      } = await sessionSupabase.auth.getUser()
      if (!error && sessionUser) {
        user = sessionUser
      }
    } catch {
      user = null
    }
  }

  if (!user?.id) {
    return null
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, email")
    .eq("id", user.id)
    .maybeSingle()

  return {
    id: user.id,
    role: profile?.role || null,
    email: profile?.email || user.email || null,
  }
}
