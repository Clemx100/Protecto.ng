"use client"

// Force dynamic rendering to prevent useSearchParams prerendering issues
export const dynamic = 'force-dynamic'

import { useState, useEffect } from "react"
import OperatorDashboard from "@/components/operator-dashboard"
import OperatorLogin from "@/components/operator-login"
import { createClient } from "@/lib/supabase/client"

export default function OperatorPage() {
  const [user, setUser] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    // Check if user is already logged in
    const checkUser = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user) {
          // Check if user has operator/admin role
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single()

          if (profile && (profile.role === 'admin' || profile.role === 'agent' || profile.role === 'operator')) {
            setUser(session.user)
          }
        }
      } catch (error) {
        console.error('Error checking user:', error)
      } finally {
        setIsLoading(false)
      }
    }

    checkUser()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        // Check user role
        supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single()
          .then(({ data: profile }) => {
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

    return () => subscription.unsubscribe()
  }, [supabase])

  const handleLoginSuccess = (user: any) => {
    setUser(user)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setUser(null)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-white">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <OperatorLogin onLoginSuccess={handleLoginSuccess} />
  }

  return <OperatorDashboard onLogout={handleLogout} />
}