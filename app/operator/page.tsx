"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import OperatorDashboard from "@/components/operator-dashboard"
import OperatorLogin from "@/components/operator-login"
import { createClient } from "@/lib/supabase/client"
import LoadingLogo from "@/components/loading-logo"

const OPERATOR_AUTH_TIMEOUT_MS = 15000
const AUTHORIZED_ROLES = ["admin", "agent", "operator"] as const
const OPERATOR_SESSION_HINT_KEY = "protector_operator_session_hint"

function isAuthorizedRole(role: string | null | undefined) {
  return !!role && AUTHORIZED_ROLES.includes(role as (typeof AUTHORIZED_ROLES)[number])
}

export default function OperatorPage() {
  const [user, setUser] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null)
  if (!supabaseRef.current) {
    supabaseRef.current = createClient()
  }
  const supabase = supabaseRef.current
  const restoringRef = useRef(true)

  const loadAuthorizedUser = useCallback(
    async (sessionUser: { id: string; email?: string | null }) => {
      // Retry profile reads — on hard refresh the session cookie/storage can lag RLS briefly.
      for (let attempt = 0; attempt < 4; attempt++) {
        const { data: profile, error } = await supabase
          .from("profiles")
          .select("id, role, email, first_name, last_name")
          .eq("id", sessionUser.id)
          .maybeSingle()

        if (profile && isAuthorizedRole(profile.role)) {
          try {
            sessionStorage.setItem(
              OPERATOR_SESSION_HINT_KEY,
              JSON.stringify({
                id: sessionUser.id,
                email: sessionUser.email || profile.email || "",
                role: profile.role,
                savedAt: Date.now(),
              }),
            )
          } catch {
            // ignore storage failures
          }
          return { ok: true as const, user: sessionUser, role: profile.role }
        }

        // Explicit unauthorized role — stop retrying.
        if (profile && !isAuthorizedRole(profile.role)) {
          return { ok: false as const, reason: "unauthorized" as const, role: profile.role }
        }

        // Profile missing / transient error — wait and retry.
        if (error) {
          console.warn("Operator profile lookup failed, retrying...", error.message)
        }
        await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)))
      }

      return { ok: false as const, reason: "profile_unavailable" as const }
    },
    [supabase],
  )

  useEffect(() => {
    let isMounted = true

    const checkUser = async () => {
      const loadingFailSafe = setTimeout(() => {
        if (isMounted) {
          setIsLoading(false)
          restoringRef.current = false
        }
      }, OPERATOR_AUTH_TIMEOUT_MS)

      try {
        // Fast path: show dashboard immediately if we recently verified this browser session.
        try {
          const hintRaw = sessionStorage.getItem(OPERATOR_SESSION_HINT_KEY)
          if (hintRaw) {
            const hint = JSON.parse(hintRaw)
            if (hint?.id && Date.now() - Number(hint.savedAt || 0) < 12 * 60 * 60 * 1000) {
              // Keep loading overlay until we confirm, but don't clear user prematurely.
            }
          }
        } catch {
          // ignore
        }

        let session = (await supabase.auth.getSession()).data.session

        // Hard refresh often needs an explicit refresh before getSession is ready.
        if (!session?.user) {
          const refreshed = await supabase.auth.refreshSession()
          session = refreshed.data.session
        }

        if (!session?.user) {
          // One more attempt via getUser (validates with server).
          const { data: userData } = await supabase.auth.getUser()
          if (userData.user) {
            session = (await supabase.auth.getSession()).data.session
          }
        }

        if (!session?.user) {
          if (isMounted) {
            setUser(null)
            try {
              sessionStorage.removeItem(OPERATOR_SESSION_HINT_KEY)
            } catch {
              // ignore
            }
          }
          return
        }

        const result = await loadAuthorizedUser(session.user)
        if (!isMounted) return

        if (result.ok) {
          setUser(result.user)
        } else if (result.reason === "unauthorized") {
          await supabase.auth.signOut()
          setUser(null)
          try {
            sessionStorage.removeItem(OPERATOR_SESSION_HINT_KEY)
          } catch {
            // ignore
          }
        } else {
          // Profile temporarily unavailable — keep session if hint says we're an operator.
          try {
            const hintRaw = sessionStorage.getItem(OPERATOR_SESSION_HINT_KEY)
            const hint = hintRaw ? JSON.parse(hintRaw) : null
            if (hint?.id === session.user.id && isAuthorizedRole(hint.role)) {
              console.warn("Using operator session hint while profile reloads")
              setUser(session.user)
            } else {
              setUser(null)
            }
          } catch {
            setUser(null)
          }
        }
      } catch (error) {
        console.error("Error checking operator session:", error)
        if (isMounted) setUser(null)
      } finally {
        clearTimeout(loadingFailSafe)
        if (isMounted) {
          setIsLoading(false)
          restoringRef.current = false
        }
      }
    }

    checkUser()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return

      // Don't wipe the dashboard on transient init events while we're still restoring.
      if (restoringRef.current && event === "INITIAL_SESSION" && !session) {
        return
      }

      if (event === "SIGNED_OUT") {
        setUser(null)
        try {
          sessionStorage.removeItem(OPERATOR_SESSION_HINT_KEY)
        } catch {
          // ignore
        }
        return
      }

      if (!session?.user) {
        // Ignore null sessions during token refresh races.
        if (event === "TOKEN_REFRESHED") return
        return
      }

      const result = await loadAuthorizedUser(session.user)
      if (!isMounted) return

      if (result.ok) {
        setUser(result.user)
      } else if (result.reason === "unauthorized") {
        setUser(null)
      }
      // profile_unavailable: keep current user state to avoid bounce to login
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [loadAuthorizedUser, supabase])

  const handleLoginSuccess = (loggedInUser: any) => {
    setUser(loggedInUser)
    restoringRef.current = false
    setIsLoading(false)
  }

  const handleLogout = async () => {
    try {
      sessionStorage.removeItem(OPERATOR_SESSION_HINT_KEY)
    } catch {
      // ignore
    }
    await supabase.auth.signOut()
    setUser(null)
  }

  if (isLoading) {
    return <LoadingLogo />
  }

  if (!user) {
    return <OperatorLogin onLoginSuccess={handleLoginSuccess} />
  }

  return <OperatorDashboard onLogout={handleLogout} />
}
