"use client"

import { useState, useEffect } from "react"
import { Shield, Calendar, User, ArrowLeft, MapPin, Car, CheckCircle, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/client"

// Auth Component
function AuthComponent({ onLogin, onRegister, authStep, setAuthStep, authForm, setAuthForm, authLoading, authError, authSuccess, handleAuth, handleRegister, handleEmailVerification, emailVerificationSent, verificationEmail, setVerificationEmail }: any) {
  if (authStep === "email-verification") {
    return (
      <div className="w-full max-w-md mx-auto bg-black min-h-screen flex flex-col text-white">
        <div className="flex flex-col h-full p-4 pt-8">
          <div className="flex-1 flex flex-col justify-center w-full space-y-6">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-2xl font-bold">Check Your Email</h1>
              <p className="text-gray-400">
                We've sent a verification link to <strong>{verificationEmail}</strong>
              </p>
              <p className="text-sm text-gray-500">
                Click the link in your email to verify your account and continue.
              </p>
            </div>
            
            {emailVerificationSent && (
              <div className="bg-green-900/20 border border-green-500/20 rounded-lg p-4 text-center">
                <p className="text-green-400 text-sm">
                  Verification email sent! Check your inbox and spam folder.
                </p>
              </div>
            )}
            
            <div className="space-y-4">
              <Button
                onClick={() => handleEmailVerification()}
                disabled={authLoading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              >
                {authLoading ? "Sending..." : "Resend Verification Email"}
              </Button>
              
              <Button
                onClick={() => setAuthStep("login")}
                variant="outline"
                className="w-full border-gray-600 text-gray-300 hover:bg-gray-800"
              >
                Back to Login
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-md mx-auto bg-black min-h-screen flex flex-col text-white">
      <div className="flex flex-col h-full p-4 pt-8">
        <div className="flex-1 flex flex-col justify-center w-full space-y-6">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold">Protector.ng</h1>
            <p className="text-gray-400">
              {authStep === "login" ? "Sign in to your account" : "Create your account"}
            </p>
          </div>

          {authError && (
            <div className="bg-red-900/20 border border-red-500/20 rounded-lg p-4">
              <p className="text-red-400 text-sm">{authError}</p>
            </div>
          )}

          {authSuccess && (
            <div className="bg-green-900/20 border border-green-500/20 rounded-lg p-4">
              <p className="text-green-400 text-sm">{authSuccess}</p>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <input
                type="email"
                placeholder="Email address"
                value={authForm.email}
                onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <input
                type="password"
                placeholder="Password"
                value={authForm.password}
                onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {authStep === "register" && (
              <div>
                <input
                  type="password"
                  placeholder="Confirm Password"
                  value={authForm.confirmPassword}
                  onChange={(e) => setAuthForm({ ...authForm, confirmPassword: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}

            <Button
              onClick={authStep === "login" ? handleAuth : handleRegister}
              disabled={authLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            >
              {authLoading ? "Please wait..." : (authStep === "login" ? "Sign In" : "Create Account")}
            </Button>

            <Button
              onClick={() => setAuthStep(authStep === "login" ? "register" : "login")}
              variant="outline"
              className="w-full border-gray-600 text-gray-300 hover:bg-gray-800"
            >
              {authStep === "login" ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Main App Component
export default function ProtectorApp() {
  const supabase = createClient()
  
  // Core state
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [authStep, setAuthStep] = useState("login")
  const [authLoading, setAuthLoading] = useState(false)
  const [authError, setAuthError] = useState("")
  const [authSuccess, setAuthSuccess] = useState("")
  const [emailVerificationSent, setEmailVerificationSent] = useState(false)
  const [verificationEmail, setVerificationEmail] = useState("")
  
  const [authForm, setAuthForm] = useState({
    email: "",
    password: "",
    confirmPassword: "",
  })

  // Auth handlers
  const handleAuth = async () => {
    setAuthLoading(true)
    setAuthError("")
    setAuthSuccess("")
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: authForm.email,
        password: authForm.password,
      })
      
      if (error) throw error
      
      if (data.user && !data.user.email_confirmed_at) {
        setVerificationEmail(authForm.email)
        setAuthStep("email-verification")
        setEmailVerificationSent(true)
      } else {
        setUser(data.user)
        setIsLoggedIn(true)
        setAuthSuccess("Successfully signed in!")
      }
    } catch (error: any) {
      setAuthError(error.message)
    } finally {
      setAuthLoading(false)
    }
  }

  const handleRegister = async () => {
    if (authForm.password !== authForm.confirmPassword) {
      setAuthError("Passwords do not match")
      return
    }
    
    setAuthLoading(true)
    setAuthError("")
    setAuthSuccess("")
    
    try {
      const { data, error } = await supabase.auth.signUp({
        email: authForm.email,
        password: authForm.password,
      })
      
      if (error) throw error
      
      setVerificationEmail(authForm.email)
      setAuthStep("email-verification")
      setEmailVerificationSent(true)
      setAuthSuccess("Account created! Please check your email to verify your account.")
    } catch (error: any) {
      setAuthError(error.message)
    } finally {
      setAuthLoading(false)
    }
  }

  const handleEmailVerification = async () => {
    setAuthLoading(true)
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: verificationEmail,
      })
      
      if (error) throw error
      setEmailVerificationSent(true)
    } catch (error: any) {
      setAuthError(error.message)
    } finally {
      setAuthLoading(false)
    }
  }

  // Check auth status on mount
  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUser(user)
        setIsLoggedIn(true)
      }
    }
    checkUser()
  }, [supabase.auth])

  if (!isLoggedIn) {
    return (
      <AuthComponent
        onLogin={handleAuth}
        onRegister={handleRegister}
        authStep={authStep}
        setAuthStep={setAuthStep}
        authForm={authForm}
        setAuthForm={setAuthForm}
        authLoading={authLoading}
        authError={authError}
        authSuccess={authSuccess}
        handleAuth={handleAuth}
        handleRegister={handleRegister}
        handleEmailVerification={handleEmailVerification}
        emailVerificationSent={emailVerificationSent}
        verificationEmail={verificationEmail}
        setVerificationEmail={setVerificationEmail}
      />
    )
  }

  return (
    <div className="w-full max-w-md mx-auto bg-black min-h-screen flex flex-col text-white">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 w-full max-w-md mx-auto bg-black text-white p-4 z-50 border-b border-gray-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="w-6 h-6 text-blue-400" />
            <h1 className="text-lg font-bold">Protector.ng</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => supabase.auth.signOut()}
              variant="outline"
              size="sm"
              className="border-gray-600 text-gray-300 hover:bg-gray-800"
            >
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 pt-20 p-4">
        <div className="text-center space-y-6">
          <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center mx-auto">
            <Shield className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl font-bold">Welcome to Protector.ng</h2>
          <p className="text-gray-400">
            Professional armed protection and security services in Nigeria
          </p>
          <div className="space-y-4">
            <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">
              Book Protection Service
            </Button>
            <Button variant="outline" className="w-full border-gray-600 text-gray-300 hover:bg-gray-800">
              View Active Bookings
            </Button>
          </div>
        </div>
      </main>
    </div>
  )
}
