"use client"

// Force dynamic rendering to prevent useSearchParams prerendering issues
export const dynamic = 'force-dynamic'

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import AdminAnalyticsDashboard from "@/components/admin-analytics-dashboard"
import { AuthAPI } from "@/lib/api"
import { Shield, AlertTriangle } from "lucide-react"

export default function AdminAnalyticsPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    checkAdminAccess()
  }, [])

  const checkAdminAccess = async () => {
    try {
      // Check if user is logged in
      const { data: currentUser, error: userError } = await AuthAPI.getCurrentUser()
      
      if (userError || !currentUser) {
        router.push('/')
        return
      }

      setUser(currentUser)

      // Check if user is admin
      if (currentUser.role !== 'admin') {
        setIsAuthorized(false)
        setIsLoading(false)
        return
      }

      setIsAuthorized(true)
    } catch (error) {
      console.error('Failed to check admin access:', error)
      router.push('/')
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-white">Checking admin access...</p>
        </div>
      </div>
    )
  }

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-red-900/20 backdrop-blur-lg rounded-2xl p-8 border border-red-500/50 text-center">
            <AlertTriangle className="h-16 w-16 text-red-400 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-white mb-4">Access Denied</h1>
            <p className="text-red-200 mb-6">
              You don't have permission to access the analytics dashboard. 
              Only administrators can view this page.
            </p>
            <div className="space-y-4">
              <p className="text-gray-300 text-sm">
                Current user: {user?.first_name} {user?.last_name}
              </p>
              <p className="text-gray-300 text-sm">
                Role: {user?.role?.toUpperCase()}
              </p>
              <button
                onClick={() => router.push('/')}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-medium transition-colors"
              >
                Return to App
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return <AdminAnalyticsDashboard />
}

