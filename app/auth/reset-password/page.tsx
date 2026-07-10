'use client'

import { useEffect, useMemo, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, CheckCircle, Eye, EyeOff, Lock } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const validatePassword = (password: string) => {
  const minLength = password.length >= 8
  const hasUpperCase = /[A-Z]/.test(password)
  const hasLowerCase = /[a-z]/.test(password)
  const hasNumbers = /\d/.test(password)

  return {
    minLength,
    hasUpperCase,
    hasLowerCase,
    hasNumbers,
    isValid: minLength && hasUpperCase && hasLowerCase && hasNumbers,
  }
}

export default function ResetPasswordPage() {
  const supabase = useMemo(() => createClient(), [])
  const router = useRouter()

  const [formData, setFormData] = useState({
    newPassword: '',
    confirmPassword: '',
  })

  const [showPasswords, setShowPasswords] = useState({
    new: false,
    confirm: false,
  })

  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState<'success' | 'error' | ''>('')
  const [sessionStatus, setSessionStatus] = useState<'checking' | 'valid' | 'expired'>('checking')

  useEffect(() => {
    let isMounted = true

    const verifySession = async () => {
      try {
        const hashParams = new URLSearchParams(
          typeof window !== 'undefined' && window.location.hash
            ? window.location.hash.substring(1)
            : '',
        )
        const searchParams =
          typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams()

        const code = searchParams.get('code') ?? hashParams.get('code')
        const accessToken =
          hashParams.get('access_token') ?? searchParams.get('access_token')
        const refreshToken =
          hashParams.get('refresh_token') ?? searchParams.get('refresh_token')
        const tokenHash =
          hashParams.get('token_hash') ?? searchParams.get('token_hash')
        const type = hashParams.get('type') ?? searchParams.get('type')

        // PKCE: email link redirected here with ?code=
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code)
          if (typeof window !== 'undefined') {
            window.history.replaceState(null, '', window.location.pathname)
          }
          if (!isMounted) return
          if (error) {
            setSessionStatus('expired')
            setMessage('This reset link expired. Request a new one from the login page.')
            setMessageType('error')
            return
          }
          setSessionStatus('valid')
          return
        }

        // Implicit: tokens in hash or query
        if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          })
          if (typeof window !== 'undefined') {
            window.history.replaceState(null, '', window.location.pathname)
          }
          if (!isMounted) return
          if (error) {
            setSessionStatus('expired')
            setMessage('This reset link expired. Request a new one from the login page.')
            setMessageType('error')
            return
          }
          setSessionStatus('valid')
          return
        }

        // Older OTP hash format
        if (tokenHash && (type === 'recovery' || !type)) {
          const { error } = await supabase.auth.verifyOtp({
            type: 'recovery',
            token_hash: tokenHash,
          })
          if (typeof window !== 'undefined') {
            window.history.replaceState(null, '', window.location.pathname)
          }
          if (!isMounted) return
          if (error) {
            setSessionStatus('expired')
            setMessage('This reset link expired. Request a new one from the login page.')
            setMessageType('error')
            return
          }
          setSessionStatus('valid')
          return
        }

        const { data, error } = await supabase.auth.getSession()

        if (!isMounted) return

        if (error || !data.session) {
          setSessionStatus('expired')
          setMessage('This reset link expired. Request a new one from the login page.')
          setMessageType('error')
          return
        }

        setSessionStatus('valid')
      } catch (error) {
        if (!isMounted) return
        console.error('Failed to verify Supabase session for password recovery', error)
        setSessionStatus('expired')
        setMessage('We could not open this reset link. Please request a new one.')
        setMessageType('error')
      }
    }

    verifySession()

    return () => {
      isMounted = false
    }
  }, [supabase])

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const togglePasswordVisibility = (field: 'new' | 'confirm') => {
    setShowPasswords((prev) => ({
      ...prev,
      [field]: !prev[field],
    }))
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setMessage('')
    setMessageType('')

    if (sessionStatus !== 'valid') {
      setMessage('Your reset session expired. Please request a new link.')
      setMessageType('error')
      setIsLoading(false)
      return
    }

    if (formData.newPassword !== formData.confirmPassword) {
      setMessage('Passwords do not match')
      setMessageType('error')
      setIsLoading(false)
      return
    }

    const passwordValidation = validatePassword(formData.newPassword)
    if (!passwordValidation.isValid) {
      setMessage('Use at least 8 characters with uppercase, lowercase, and a number.')
      setMessageType('error')
      setIsLoading(false)
      return
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: formData.newPassword,
      })

      if (error) {
        if (
          error.message.toLowerCase().includes('session') ||
          error.message.toLowerCase().includes('token')
        ) {
          throw new Error('This reset link expired or was already used. Request a new one.')
        }
        throw error
      }

      const {
        data: { user },
      } = await supabase.auth.getUser()
      const email = user?.email

      await supabase.auth.signOut()

      setMessage('Password updated! Taking you to login...')
      setMessageType('success')
      setFormData({
        newPassword: '',
        confirmPassword: '',
      })

      setTimeout(() => {
        const redirectUrl = email
          ? `/app?reset=success&email=${encodeURIComponent(email)}`
          : '/app?reset=success'
        window.location.href = redirectUrl
      }, 1200)
    } catch (error: any) {
      setMessage(error.message ?? 'Could not update password. Please try again.')
      setMessageType('error')
    } finally {
      setIsLoading(false)
    }
  }

  const passwordValidation = validatePassword(formData.newPassword)
  const isCheckingSession = sessionStatus === 'checking'
  const isSessionInvalid = sessionStatus === 'expired'
  const fieldsDisabled = isCheckingSession || isSessionInvalid || isLoading
  const passwordsMatch =
    formData.confirmPassword.length > 0 && formData.newPassword === formData.confirmPassword

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col bg-gradient-to-b from-[#12151d] via-[#171b26] to-[#12151d] text-white">
      <div className="border-b border-white/10 bg-[#1e2433]/95 p-4 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/app')}
            className="rounded-full p-2 text-blue-300/80 transition-colors hover:bg-white/10 hover:text-white"
            disabled={isCheckingSession}
            aria-label="Back to app"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-r from-blue-500 to-indigo-600">
            <Lock className="h-4 w-4 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-semibold">Choose a new password</h1>
            <p className="text-xs text-gray-400">Quick and secure</p>
          </div>
        </div>
      </div>

      <main className="flex-1 space-y-5 overflow-y-auto p-4 pb-20">
        {isCheckingSession && (
          <div className="rounded-2xl border border-blue-400/20 bg-blue-500/10 p-4 text-sm text-blue-100">
            Opening your reset link...
          </div>
        )}

        {sessionStatus === 'valid' && (
          <div className="rounded-2xl border border-blue-400/20 bg-gradient-to-br from-blue-500/15 to-indigo-500/10 p-4 text-sm text-blue-100">
            Pick a password you can remember. Then sign in with it.
          </div>
        )}

        {isSessionInvalid && (
          <div className="space-y-4 rounded-2xl border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-100">
            <p>{message || 'This reset link can no longer be used.'}</p>
            <Link
              href="/app"
              className="inline-flex rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 px-4 py-2 text-sm font-medium text-white"
            >
              Back to login
            </Link>
          </div>
        )}

        {sessionStatus === 'valid' && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <label htmlFor="newPassword" className="mb-2 block text-sm font-medium text-gray-300">
                New password
              </label>
              <div className="relative">
                <input
                  type={showPasswords.new ? 'text' : 'password'}
                  id="newPassword"
                  name="newPassword"
                  value={formData.newPassword}
                  onChange={handleInputChange}
                  required
                  disabled={fieldsDisabled}
                  autoComplete="new-password"
                  className="w-full rounded-xl border border-white/10 bg-[#12151d] px-4 py-3 pr-12 text-white placeholder:text-gray-500 focus:border-blue-400/50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                  placeholder="Create a new password"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (fieldsDisabled) return
                    togglePasswordVisibility('new')
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-300/80 hover:text-white"
                  disabled={fieldsDisabled}
                  aria-label={showPasswords.new ? 'Hide password' : 'Show password'}
                >
                  {showPasswords.new ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>

              {formData.newPassword && (
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <div
                    className={`flex items-center gap-1.5 ${
                      passwordValidation.minLength ? 'text-green-400' : 'text-gray-500'
                    }`}
                  >
                    <CheckCircle className="h-3.5 w-3.5" />
                    8+ characters
                  </div>
                  <div
                    className={`flex items-center gap-1.5 ${
                      passwordValidation.hasUpperCase ? 'text-green-400' : 'text-gray-500'
                    }`}
                  >
                    <CheckCircle className="h-3.5 w-3.5" />
                    Uppercase
                  </div>
                  <div
                    className={`flex items-center gap-1.5 ${
                      passwordValidation.hasLowerCase ? 'text-green-400' : 'text-gray-500'
                    }`}
                  >
                    <CheckCircle className="h-3.5 w-3.5" />
                    Lowercase
                  </div>
                  <div
                    className={`flex items-center gap-1.5 ${
                      passwordValidation.hasNumbers ? 'text-green-400' : 'text-gray-500'
                    }`}
                  >
                    <CheckCircle className="h-3.5 w-3.5" />
                    A number
                  </div>
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <label
                htmlFor="confirmPassword"
                className="mb-2 block text-sm font-medium text-gray-300"
              >
                Confirm password
              </label>
              <div className="relative">
                <input
                  type={showPasswords.confirm ? 'text' : 'password'}
                  id="confirmPassword"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  required
                  disabled={fieldsDisabled}
                  autoComplete="new-password"
                  className="w-full rounded-xl border border-white/10 bg-[#12151d] px-4 py-3 pr-12 text-white placeholder:text-gray-500 focus:border-blue-400/50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                  placeholder="Type it again"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (fieldsDisabled) return
                    togglePasswordVisibility('confirm')
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-300/80 hover:text-white"
                  disabled={fieldsDisabled}
                  aria-label={showPasswords.confirm ? 'Hide password' : 'Show password'}
                >
                  {showPasswords.confirm ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
              {formData.confirmPassword && !passwordsMatch && (
                <p className="mt-2 text-sm text-red-400">Passwords do not match</p>
              )}
              {passwordsMatch && (
                <p className="mt-2 text-sm text-green-400">Passwords match</p>
              )}
            </div>

            {message && (
              <div
                className={`rounded-xl p-4 text-sm ${
                  messageType === 'success'
                    ? 'border border-green-500/30 bg-green-500/10 text-green-300'
                    : 'border border-red-500/30 bg-red-500/10 text-red-300'
                }`}
              >
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={
                fieldsDisabled || !passwordValidation.isValid || !passwordsMatch
              }
              className="w-full rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 py-3.5 font-semibold text-white shadow-lg transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoading ? 'Saving...' : 'Save new password'}
            </button>
          </form>
        )}

        <p className="text-center text-sm text-gray-400">
          {sessionStatus === 'valid' ? (
            <>
              Didn&apos;t mean to reset?{' '}
              <Link href="/app" className="text-blue-300 hover:text-white">
                Back to login
              </Link>
            </>
          ) : (
            !isSessionInvalid && (
              <>
                Need help?{' '}
                <Link href="/app" className="text-blue-300 hover:text-white">
                  Return to login
                </Link>
              </>
            )
          )}
        </p>
      </main>
    </div>
  )
}
