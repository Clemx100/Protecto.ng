"use client"

import { useState } from "react"
import dynamic from "next/dynamic"
import { AuthAPI } from "@/lib/api"
import { AlertTriangle, Shield, Lock, Mail, Loader2 } from "lucide-react"
import LoadingLogo from "@/components/loading-logo"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const SuperAdminDashboard = dynamic(
  () => import("@/components/super-admin-dashboard"),
  {
    ssr: false,
    loading: () => <LoadingLogo label="Loading dashboard..." />
  }
)

export default function SuperAdminPage() {
  // Start with login form so the page never sticks on loading
  const [status, setStatus] = useState<"login" | "denied" | "dashboard">("login")
  const [user, setUser] = useState<any>(null)
  const [loginEmail, setLoginEmail] = useState("clemxbanking@gmail.com")
  const [loginPassword, setLoginPassword] = useState("")
  const [loginError, setLoginError] = useState("")
  const [loginLoading, setLoginLoading] = useState(false)

  // Always show login form first. Only go to dashboard after successful sign-in
  // (removed background getCurrentUser so we never jump to "Loading dashboard..." on mount)
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    // #region agent log
    fetch('http://127.0.0.1:7379/ingest/0c0b09ec-0795-419f-8cb5-0e4e2d4cba59',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'0b732d'},body:JSON.stringify({sessionId:'0b732d',hypothesisId:'H3',location:'super-admin/page.tsx:handleLogin',message:'handleLogin called',data:{hasEmail:!!loginEmail?.trim(),hasPassword:!!loginPassword},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    setLoginError("")
    if (!loginEmail.trim() || !loginPassword) {
      setLoginError("Email and password are required.")
      return
    }
    setLoginLoading(true)
    try {
      const { data: profile, error } = await AuthAPI.signIn(loginEmail.trim(), loginPassword)
      // #region agent log
      fetch('http://127.0.0.1:7379/ingest/0c0b09ec-0795-419f-8cb5-0e4e2d4cba59',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'0b732d'},body:JSON.stringify({sessionId:'0b732d',hypothesisId:'H1_H2_H5',location:'super-admin/page.tsx:after signIn',message:'signIn result',data:{hasProfile:!!profile,hasError:!!error,errorText:error||null,profileRole:profile?.role},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
      if (error) {
        setLoginError(error || "Invalid email or password.")
        return
      }
      if (!profile) {
        setLoginError("Login failed. Please try again.")
        return
      }
      if (profile.role !== "admin") {
        setUser(profile)
        setStatus("denied")
        setLoginPassword("")
        return
      }
      setUser(profile)
      setStatus("dashboard")
      setLoginPassword("")
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : "Login failed.")
    } finally {
      setLoginLoading(false)
    }
  }

  const handleLogout = async () => {
    await AuthAPI.signOut()
    setUser(null)
    setLoginError("")
    setStatus("login")
  }

  if (status === "login") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-slate-800/60 backdrop-blur-lg rounded-2xl p-8 border border-slate-600/50 shadow-xl">
            <div className="flex flex-col items-center mb-8">
              <div className="rounded-full bg-amber-500/20 p-4 mb-4">
                <Shield className="h-10 w-10 text-amber-400" />
              </div>
              <h1 className="text-2xl font-bold text-white text-center">Super Admin</h1>
              <p className="text-slate-400 text-sm mt-2 text-center">
                Sign in with an admin account to access the dashboard.
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
              {loginError && (
                <div className="flex items-center gap-2 rounded-lg bg-red-500/20 border border-red-500/40 px-4 py-3 text-red-200 text-sm">
                  <AlertTriangle className="h-5 w-5 flex-shrink-0" />
                  {loginError}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="super-admin-email" className="text-slate-300">
                  Email
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
                  <Input
                    id="super-admin-email"
                    type="email"
                    placeholder="admin@protector.ng"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    autoComplete="email"
                    className="pl-10 bg-slate-900/80 border-slate-600 text-white placeholder:text-slate-500"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="super-admin-password" className="text-slate-300">
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
                  <Input
                    id="super-admin-password"
                    type="password"
                    placeholder="••••••••"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    autoComplete="current-password"
                    className="pl-10 bg-slate-900/80 border-slate-600 text-white placeholder:text-slate-500"
                  />
                </div>
              </div>
              <Button
                type="submit"
                className="w-full bg-amber-600 hover:bg-amber-700 text-white font-medium py-3"
                disabled={loginLoading}
              >
                {loginLoading ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  "Sign in"
                )}
              </Button>
            </form>

            <p className="mt-6 text-center text-slate-500 text-sm">
              Only accounts with role <span className="text-amber-400 font-medium">admin</span> can access the dashboard.
            </p>
          </div>
          <p className="mt-6 text-center">
            <a href="/" className="text-slate-400 hover:text-white text-sm">
              ← Back to Protector.Ng
            </a>
          </p>
        </div>
      </div>
    )
  }

  if (status === "denied") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-red-900/20 backdrop-blur-lg rounded-2xl p-8 border border-red-500/50 text-center">
            <AlertTriangle className="h-16 w-16 text-red-400 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-white mb-4">Access Denied</h1>
            <p className="text-red-200 mb-6">
              Only super administrators can access this dashboard. Your role does not have permission.
            </p>
            <div className="space-y-4">
              {user && (
                <>
                  <p className="text-slate-300 text-sm">
                    Logged in as: {user.first_name} {user.last_name}
                  </p>
                  <p className="text-slate-300 text-sm">Role: {(user.role || "").toUpperCase()}</p>
                </>
              )}
              <Button
                onClick={handleLogout}
                className="w-full bg-slate-600 hover:bg-slate-700 text-white"
              >
                Sign out and use another account
              </Button>
              <Button
                variant="outline"
                onClick={() => window.location.href = "/"}
                className="w-full border-white/20 text-white hover:bg-white/10"
              >
                Return to App
              </Button>
              <Button
                variant="outline"
                onClick={() => window.location.href = "/admin"}
                className="w-full border-white/20 text-white hover:bg-white/10"
              >
                Go to Admin Dashboard
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return <SuperAdminDashboard />
}
