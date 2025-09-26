'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function AuthCallback() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('Verifying your email...')
  const router = useRouter()

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        const supabase = createClient()
        
        // Handle the auth callback - this processes the URL hash/fragment
        const { data, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('Auth callback error:', error)
          setStatus('error')
          setMessage('Email verification failed. Please try again.')
          return
        }

        if (data.session && data.session.user) {
          // Check if email is verified
          if (data.session.user.email_confirmed_at) {
            setStatus('success')
            setMessage('Email verified successfully! Redirecting to your dashboard...')
            
            // Redirect to the main app after 2 seconds
            setTimeout(() => {
              router.push('/app')
            }, 2000)
          } else {
            // Session exists but email not verified yet
            setStatus('error')
            setMessage('Email verification is still pending. Please check your email and click the verification link.')
          }
        } else {
          // No session found, try to get user from URL hash
          const { data: hashData, error: hashError } = await supabase.auth.getUser()
          
          if (hashError) {
            console.error('Hash auth error:', hashError)
            setStatus('error')
            setMessage('Email verification failed. Please try signing up again.')
          } else if (hashData.user && hashData.user.email_confirmed_at) {
            setStatus('success')
            setMessage('Email verified successfully! Redirecting to your dashboard...')
            
            setTimeout(() => {
              router.push('/app')
            }, 2000)
          } else {
            setStatus('error')
            setMessage('Email verification failed. Please try signing up again.')
          }
        }
      } catch (error) {
        console.error('Callback error:', error)
        setStatus('error')
        setMessage('An error occurred. Please try again.')
      }
    }

    handleAuthCallback()
  }, [router])

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 flex items-center justify-center p-4">
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 max-w-md w-full text-center border border-white/20">
        <div className="mb-6">
          {status === 'loading' && (
            <div className="w-16 h-16 mx-auto mb-4">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-400"></div>
            </div>
          )}
          
          {status === 'success' && (
            <div className="w-16 h-16 mx-auto mb-4 bg-green-500/20 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          )}
          
          {status === 'error' && (
            <div className="w-16 h-16 mx-auto mb-4 bg-red-500/20 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
          )}
        </div>

        <h1 className="text-2xl font-bold text-white mb-4">
          {status === 'loading' && 'Verifying Email...'}
          {status === 'success' && 'Email Verified!'}
          {status === 'error' && 'Verification Failed'}
        </h1>

        <p className="text-gray-300 mb-6">
          {message}
        </p>

        {status === 'error' && (
          <div className="space-y-4">
            <button
              onClick={() => router.push('/')}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-xl transition-colors duration-200"
            >
              Try Again
            </button>
            
            <button
              onClick={() => window.location.href = '/'}
              className="w-full bg-gray-600 hover:bg-gray-700 text-white font-medium py-3 px-6 rounded-xl transition-colors duration-200"
            >
              Go to Home
            </button>
          </div>
        )}

        {status === 'success' && (
          <div className="text-sm text-gray-400">
            You will be redirected automatically...
          </div>
        )}
      </div>
    </div>
  )
}
