"use client"

import { useState, useEffect } from 'react'
import { Shield, Lock, Fingerprint, Eye, AlertTriangle } from 'lucide-react'
import { Button } from './button'

interface SessionLockScreenProps {
  userName?: string
  userEmail?: string
  timeRemaining?: number
  biometricAvailable?: boolean
  onUnlockPassword: (password: string) => Promise<boolean>
  onUnlockBiometric: () => Promise<boolean>
  onLogout: () => void
}

export function SessionLockScreen({
  userName = 'User',
  userEmail,
  timeRemaining = 0,
  biometricAvailable = false,
  onUnlockPassword,
  onUnlockBiometric,
  onLogout
}: SessionLockScreenProps) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  // Format time remaining
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Handle password unlock
  const handlePasswordUnlock = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!password.trim()) {
      setError('Please enter your password')
      return
    }

    setLoading(true)
    setError('')

    try {
      const success = await onUnlockPassword(password)
      
      if (!success) {
        setError('Invalid password. Please try again.')
        setPassword('')
      }
    } catch (err) {
      setError('Failed to unlock. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Handle biometric unlock
  const handleBiometricUnlock = async () => {
    setLoading(true)
    setError('')

    try {
      const success = await onUnlockBiometric()
      
      if (!success) {
        setError('Biometric authentication failed')
      }
    } catch (err) {
      setError('Biometric authentication failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
          backgroundSize: '40px 40px'
        }} />
      </div>

      {/* Lock Screen Card */}
      <div className="relative w-full max-w-md mx-4">
        {/* Floating Shield Icon */}
        <div className="absolute -top-16 left-1/2 transform -translate-x-1/2">
          <div className="relative">
            <div className="absolute inset-0 bg-blue-500 rounded-full blur-xl opacity-50 animate-pulse" />
            <div className="relative bg-gradient-to-br from-blue-500 to-purple-600 p-6 rounded-full">
              <Lock className="h-12 w-12 text-white" />
            </div>
          </div>
        </div>

        {/* Card */}
        <div className="bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl p-8 mt-8 border border-white/20">
          {/* Header */}
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-white mb-2">
              Session Locked
            </h2>
            <p className="text-gray-300 text-sm">
              {userName}
            </p>
            {userEmail && (
              <p className="text-gray-400 text-xs mt-1">
                {userEmail}
              </p>
            )}
          </div>

          {/* Warning Message */}
          <div className="bg-yellow-500/20 border border-yellow-500/50 rounded-xl p-4 mb-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-yellow-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-yellow-200 text-sm font-medium">
                  Security Lock Activated
                </p>
                <p className="text-yellow-300/80 text-xs mt-1">
                  Your session was locked due to inactivity. Please authenticate to continue.
                </p>
              </div>
            </div>
          </div>

          {/* Biometric Unlock (if available) */}
          {biometricAvailable && (
            <div className="mb-6">
              <Button
                onClick={handleBiometricUnlock}
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold py-4 rounded-xl flex items-center justify-center gap-3 transition-all transform hover:scale-105"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Authenticating...</span>
                  </>
                ) : (
                  <>
                    <Fingerprint className="h-5 w-5" />
                    <span>Unlock with Fingerprint / Face ID</span>
                  </>
                )}
              </Button>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/20" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-transparent text-gray-400">or unlock with password</span>
                </div>
              </div>
            </div>
          )}

          {/* Password Form */}
          <form onSubmit={handlePasswordUnlock} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  disabled={loading}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                >
                  <Eye className={`h-5 w-5 ${showPassword ? 'text-blue-400' : ''}`} />
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-3">
                <p className="text-red-200 text-sm text-center">
                  {error}
                </p>
              </div>
            )}

            <Button
              type="submit"
              disabled={loading || !password.trim()}
              className="w-full bg-white text-gray-900 hover:bg-gray-100 font-semibold py-3 rounded-xl transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-gray-900/30 border-t-gray-900 rounded-full animate-spin" />
                  <span>Unlocking...</span>
                </div>
              ) : (
                'Unlock'
              )}
            </Button>
          </form>

          {/* Logout Button */}
          <div className="mt-6 pt-6 border-t border-white/10">
            <button
              onClick={onLogout}
              className="w-full text-sm text-gray-400 hover:text-white transition-colors py-2"
            >
              Sign out and use a different account
            </button>
          </div>
        </div>

        {/* Footer Info */}
        <div className="mt-6 text-center">
          <p className="text-gray-400 text-xs">
            🔒 Protected by Protector.Ng Security
          </p>
        </div>
      </div>
    </div>
  )
}

