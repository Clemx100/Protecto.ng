import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface SessionTimeoutOptions {
  timeoutMinutes?: number // Time before requiring re-auth (default: 15 minutes)
  warningMinutes?: number // Time before showing warning (default: 13 minutes)
  enableBiometric?: boolean // Enable biometric unlock
  onTimeout?: () => void
  onWarning?: () => void
  onUnlock?: () => void
}

export function useSessionTimeout(options: SessionTimeoutOptions = {}) {
  const {
    timeoutMinutes = 15,
    warningMinutes = 13,
    enableBiometric = true,
    onTimeout,
    onWarning,
    onUnlock
  } = options

  const [isLocked, setIsLocked] = useState(false)
  const [showWarning, setShowWarning] = useState(false)
  const [timeRemaining, setTimeRemaining] = useState(timeoutMinutes * 60)
  const [biometricAvailable, setBiometricAvailable] = useState(false)

  const timeoutRef = useRef<NodeJS.Timeout>()
  const warningRef = useRef<NodeJS.Timeout>()
  const countdownRef = useRef<NodeJS.Timeout>()
  const lastActivityRef = useRef<number>(Date.now())

  const router = useRouter()
  const supabase = createClient()

  // Check if biometric authentication is available
  useEffect(() => {
    const checkBiometric = async () => {
      if (!enableBiometric) return

      try {
        // Check if Web Authentication API is available
        if (window.PublicKeyCredential) {
          const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
          setBiometricAvailable(available)
          console.log('🔐 Biometric authentication available:', available)
        }
      } catch (error) {
        console.log('⚠️ Biometric check failed:', error)
        setBiometricAvailable(false)
      }
    }

    checkBiometric()
  }, [enableBiometric])

  // Reset activity timer
  const resetActivity = () => {
    lastActivityRef.current = Date.now()
    setTimeRemaining(timeoutMinutes * 60)
    setShowWarning(false)

    // Clear existing timers
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    if (warningRef.current) clearTimeout(warningRef.current)
    if (countdownRef.current) clearInterval(countdownRef.current)

    // Set warning timer
    warningRef.current = setTimeout(() => {
      setShowWarning(true)
      onWarning?.()
      console.log('⚠️ Session timeout warning')
    }, warningMinutes * 60 * 1000)

    // Set timeout timer
    timeoutRef.current = setTimeout(() => {
      lockSession()
    }, timeoutMinutes * 60 * 1000)

    // Start countdown
    countdownRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - lastActivityRef.current) / 1000)
      const remaining = (timeoutMinutes * 60) - elapsed
      setTimeRemaining(Math.max(0, remaining))
    }, 1000)
  }

  // Lock the session
  const lockSession = async () => {
    console.log('🔒 Session locked due to inactivity')
    setIsLocked(true)
    setShowWarning(false)
    
    // Store lock state in localStorage
    localStorage.setItem('session_locked', 'true')
    localStorage.setItem('lock_timestamp', Date.now().toString())
    
    onTimeout?.()
  }

  // Unlock with password
  const unlockWithPassword = async (password: string): Promise<boolean> => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.user?.email) {
        console.error('❌ No active session')
        return false
      }

      // Verify password by attempting to sign in
      const { error } = await supabase.auth.signInWithPassword({
        email: session.user.email,
        password: password
      })

      if (error) {
        console.error('❌ Invalid password:', error.message)
        return false
      }

      // Unlock successful
      await unlockSession()
      return true
    } catch (error) {
      console.error('❌ Unlock failed:', error)
      return false
    }
  }

  // Unlock with biometric
  const unlockWithBiometric = async (): Promise<boolean> => {
    if (!biometricAvailable) {
      console.error('❌ Biometric authentication not available')
      return false
    }

    try {
      // Create a challenge for biometric authentication
      const challenge = new Uint8Array(32)
      crypto.getRandomValues(challenge)

      const publicKeyCredentialRequestOptions: PublicKeyCredentialRequestOptions = {
        challenge: challenge,
        timeout: 60000,
        userVerification: 'required'
      }

      // Request biometric authentication
      const credential = await navigator.credentials.get({
        publicKey: publicKeyCredentialRequestOptions
      }) as PublicKeyCredential

      if (credential) {
        console.log('✅ Biometric authentication successful')
        await unlockSession()
        return true
      }

      return false
    } catch (error: any) {
      if (error.name === 'NotAllowedError') {
        console.log('⚠️ Biometric authentication cancelled by user')
      } else {
        console.error('❌ Biometric authentication failed:', error)
      }
      return false
    }
  }

  // Unlock session
  const unlockSession = async () => {
    setIsLocked(false)
    localStorage.removeItem('session_locked')
    localStorage.removeItem('lock_timestamp')
    resetActivity()
    onUnlock?.()
    console.log('🔓 Session unlocked')
  }

  // Logout completely
  const logout = async () => {
    await supabase.auth.signOut()
    localStorage.clear()
    router.push('/')
    console.log('👋 User logged out')
  }

  // Track user activity
  useEffect(() => {
    // Check if session was locked before
    const wasLocked = localStorage.getItem('session_locked') === 'true'
    const lockTimestamp = localStorage.getItem('lock_timestamp')
    
    if (wasLocked && lockTimestamp) {
      const elapsed = Date.now() - parseInt(lockTimestamp)
      // If locked more than timeout period, require re-auth
      if (elapsed > timeoutMinutes * 60 * 1000) {
        setIsLocked(true)
        return
      }
    }

    // Activity events to track
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click']

    const handleActivity = () => {
      if (!isLocked) {
        resetActivity()
      }
    }

    // Add event listeners
    events.forEach(event => {
      window.addEventListener(event, handleActivity)
    })

    // Initial reset
    resetActivity()

    // Cleanup
    return () => {
      events.forEach(event => {
        window.removeEventListener(event, handleActivity)
      })
      
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      if (warningRef.current) clearTimeout(warningRef.current)
      if (countdownRef.current) clearInterval(countdownRef.current)
    }
  }, [isLocked, timeoutMinutes, warningMinutes])

  // Check for visibility changes (tab switching)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // User switched away - record time
        localStorage.setItem('last_visible', Date.now().toString())
      } else {
        // User came back - check elapsed time
        const lastVisible = localStorage.getItem('last_visible')
        if (lastVisible) {
          const elapsed = Date.now() - parseInt(lastVisible)
          // If away for more than timeout period, lock
          if (elapsed > timeoutMinutes * 60 * 1000) {
            lockSession()
          }
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [timeoutMinutes])

  return {
    isLocked,
    showWarning,
    timeRemaining,
    biometricAvailable,
    unlockWithPassword,
    unlockWithBiometric,
    unlockSession,
    logout,
    resetActivity,
    lockSession
  }
}

