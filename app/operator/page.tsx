"use client"

import { useState, useEffect, useRef } from "react"
import OperatorDashboard from "@/components/operator-dashboard"
import OperatorLogin from "@/components/operator-login"
import { createClient } from "@/lib/supabase/client"
import LoadingLogo from "@/components/loading-logo"

const OPERATOR_AUTH_TIMEOUT_MS = 12000

export default function OperatorPage() {
  const [user, setUser] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const supabaseRef = useRef<any>(null)
  if (!supabaseRef.current) {
    supabaseRef.current = createClient()
  }
  const supabase = supabaseRef.current

  useEffect(() => {
    let isMounted = true

    // Check if user is already logged in
    const checkUser = async () => {
      const loadingFailSafe = setTimeout(() => {
        if (isMounted) {
          setIsLoading(false)
        }
      }, OPERATOR_AUTH_TIMEOUT_MS)

      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user) {
          // Check if user has operator/admin role
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .maybeSingle()

          if (profile && (profile.role === 'admin' || profile.role === 'agent' || profile.role === 'operator')) {
            if (isMounted) setUser(session.user)
          } else {
            if (isMounted) setUser(null)
          }
        } else {
          if (isMounted) setUser(null)
        }
      } catch (error) {
        console.error('Error checking user:', error)
      } finally {
        clearTimeout(loadingFailSafe)
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    checkUser()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) return
      if (session?.user) {
        // Check user role
        supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single()
          .then(({ data: profile }) => {
            if (!isMounted) return
            if (profile && (profile.role === 'admin' || profile.role === 'agent' || profile.role === 'operator')) {
              setUser(session.user)
            } else {
              setUser(null)
            }
          })
      } else {
        setUser(null)
      }
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [])

  const handleLoginSuccess = (user: any) => {
    setUser(user)
  }

  const handleLogout = async () => {
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