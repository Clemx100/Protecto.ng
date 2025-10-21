"use client"

import { useState } from "react"
import { Shield, Eye, EyeOff, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/client"
import { fallbackAuth } from "@/lib/services/fallbackAuth"

interface OperatorLoginProps {
  onLoginSuccess: (user: any) => void
}

export default function OperatorLogin({ onLoginSuccess }: OperatorLoginProps) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    try {
      console.log('🔐 Attempting operator login for:', email)

      // Try Supabase authentication first
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (error) {
        console.error('❌ Supabase auth error:', error.message)
        
        // Only use fallback for network/connection errors, NOT invalid credentials
        const isNetworkError = error.message?.toLowerCase().includes('fetch') || 
                              error.message?.toLowerCase().includes('network') ||
                              error.message?.toLowerCase().includes('connection')
        
        if (isNetworkError) {
          console.log('🔄 Network error detected, trying fallback auth...')
          
          // Fallback to mock authentication ONLY for network issues
          const result = await fallbackAuth.signInWithPassword(email, password)
          
          if (result.error) {
            setError(result.error)
            return
          }

          if (result.user) {
            // Check if user has operator/admin role
            if (fallbackAuth.hasRole(result.user, ['admin', 'agent', 'operator'])) {
              // Convert mock user to expected format
              const mockUser = {
                id: result.user.id,
                email: result.user.email,
                user_metadata: {
                  full_name: result.user.full_name || 'Operator'
                }
              }
              onLoginSuccess(mockUser)
              return
            } else {
              setError(`Access denied. Your account has role '${result.user.role}'. Only operators, admins, and agents can access this dashboard.`)
              return
            }
          }
        } else {
          // For authentication errors (wrong password), show error immediately
          setError('Invalid email or password. Please check your credentials and try again.')
          return
        }
      }

      if (data.user) {
        console.log('✅ Supabase auth successful, checking role...')
        
        // Check if user has operator/admin role
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .single()

        console.log('👤 User profile:', profile)

        if (profile && (profile.role === 'admin' || profile.role === 'agent' || profile.role === 'operator')) {
          console.log('✅ User has valid operator role:', profile.role)
          onLoginSuccess(data.user)
          return
        } else {
          // User logged in successfully but doesn't have operator role
          console.log('❌ User does not have operator role:', profile?.role)
          await supabase.auth.signOut()
          setError(`Access denied. Your account has role '${profile?.role || 'unknown'}'. Only operators, admins, and agents can access this dashboard.`)
          return
        }
      }

    } catch (err: any) {
      console.error('❌ Unexpected login error:', err)
      setError("Login failed. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
      <div className="max-w-md w-full mx-4">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <Shield className="h-12 w-12 text-blue-400" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Operator Login</h1>
          <p className="text-gray-300">Access the Protector.Ng operator dashboard</p>
        </div>

        {/* Login Form */}
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-8 border border-white/20">
          <form onSubmit={handleLogin} className="space-y-6">
            {/* Error Message */}
            {error && (
              <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4">
                <p className="text-red-200 text-sm">{error}</p>
              </div>
            )}

            {/* Email Input */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-white mb-2">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                placeholder="operator@protector.ng"
                disabled={isLoading}
              />
            </div>

            {/* Password Input */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-white mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 pr-12"
                  placeholder="Enter your password"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                  disabled={isLoading}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {/* Login Button */}
            <Button
              type="submit"
              disabled={isLoading || !email || !password}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 text-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  Signing In...
                </div>
              ) : (
                "Sign In to Dashboard"
              )}
            </Button>
          </form>

        </div>

      </div>
    </div>
  )
}
