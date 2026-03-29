"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import {
  Shield,
  Users,
  Car,
  Calendar,
  MapPin,
  Video,
  Plus,
  Trash2,
  RefreshCw,
  LogOut,
  BarChart3,
  AlertTriangle,
  TrendingUp,
  Search,
  UserCog,
  Square
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import { SuperAdminAPI, type SuperAdminStats } from "@/lib/api"
import { createClient } from "@/lib/supabase/client"
import LoadingLogo from "@/components/loading-logo"
import SuperAdminMap from "@/components/super-admin-map"

const TABS = [
  { id: "overview", label: "Overview", icon: BarChart3 },
  { id: "users", label: "Users", icon: Users },
  { id: "vehicles", label: "Vehicles", icon: Car },
  { id: "trips", label: "Trips", icon: Calendar },
  { id: "map", label: "Live Map", icon: MapPin },
  { id: "drone", label: "Drone View", icon: Video }
] as const

export default function SuperAdminDashboard() {
  const router = useRouter()
  const supabase = createClient()
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]["id"]>("overview")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const [stats, setStats] = useState<SuperAdminStats | null>(null)
  const [users, setUsers] = useState<any[]>([])
  const [usersPage, setUsersPage] = useState(1)
  const [usersTotalPages, setUsersTotalPages] = useState(1)
  const [userRoleFilter, setUserRoleFilter] = useState("")
  const [vehicles, setVehicles] = useState<any[]>([])
  const [vehiclesPage, setVehiclesPage] = useState(1)
  const [vehiclesTotalPages, setVehiclesTotalPages] = useState(1)
  const [trips, setTrips] = useState<any[]>([])
  const [tripsPage, setTripsPage] = useState(1)
  const [tripsTotalPages, setTripsTotalPages] = useState(1)
  const [tripsStatusFilter, setTripsStatusFilter] = useState("")
  const [tracking, setTracking] = useState<{ vehicles: any[]; agents: any[] }>({ vehicles: [], agents: [] })

  const [addUserOpen, setAddUserOpen] = useState(false)
  const [addUserLoading, setAddUserLoading] = useState(false)
  const [addUserForm, setAddUserForm] = useState({
    email: "",
    password: "",
    first_name: "",
    last_name: "",
    phone: "",
    role: "client"
  })

  const [addVehicleOpen, setAddVehicleOpen] = useState(false)
  const [addVehicleLoading, setAddVehicleLoading] = useState(false)
  const [addVehicleForm, setAddVehicleForm] = useState({
    make: "",
    model: "",
    year: new Date().getFullYear(),
    license_plate: "",
    type: "suv",
    capacity: 4,
    color: "",
    is_armored: false
  })
  const [vehiclePhotos, setVehiclePhotos] = useState<File[]>([])

  const [editUserOpen, setEditUserOpen] = useState(false)
  const [editUserTarget, setEditUserTarget] = useState<any>(null)
  const [editUserLoading, setEditUserLoading] = useState(false)
  const [editUserForm, setEditUserForm] = useState({ role: "client", newPassword: "" })

  const [deleteUserOpen, setDeleteUserOpen] = useState(false)
  const [deleteUserTarget, setDeleteUserTarget] = useState<any>(null)
  const [deleteUserPassword, setDeleteUserPassword] = useState("")
  const [deleteUserLoading, setDeleteUserLoading] = useState(false)

  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const loadStats = useCallback(async () => {
    const { data, error: e } = await SuperAdminAPI.getStats()
    if (e) return setError(e)
    setStats(data ?? null)
  }, [])

  const loadUsers = useCallback(async () => {
    try {
      const res = await SuperAdminAPI.getUsers({
        role: userRoleFilter || undefined,
        page: usersPage,
        limit: 20
      })
      setUsers(res.data ?? [])
      setUsersTotalPages(res.total_pages ?? 1)
    } catch (e: any) {
      setError(e?.message || "Failed to load users")
    }
  }, [userRoleFilter, usersPage])

  const loadVehicles = useCallback(async () => {
    try {
      const res = await SuperAdminAPI.getVehicles({ page: vehiclesPage, limit: 20 })
      setVehicles(res.data ?? [])
      setVehiclesTotalPages(res.total_pages ?? 1)
    } catch (e: any) {
      setError(e?.message || "Failed to load vehicles")
    }
  }, [vehiclesPage])

  const loadTrips = useCallback(async () => {
    try {
      const res = await SuperAdminAPI.getTrips({
        status: tripsStatusFilter || undefined,
        page: tripsPage,
        limit: 20
      })
      setTrips(res.data ?? [])
      setTripsTotalPages(res.total_pages ?? 1)
    } catch (e: any) {
      setError(e?.message || "Failed to load trips")
    }
  }, [tripsStatusFilter, tripsPage])

  const loadTracking = useCallback(async () => {
    try {
      const data = await SuperAdminAPI.getTracking()
      setTracking({ vehicles: data.vehicles ?? [], agents: data.agents ?? [] })
    } catch (e: any) {
      setError(e?.message || "Failed to load tracking")
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    async function init() {
      setLoading(true)
      setError("")
      try {
        await loadStats()
        if (cancelled) return
        await loadUsers()
        if (cancelled) return
        await loadVehicles()
        if (cancelled) return
        await loadTrips()
        if (cancelled) return
        await loadTracking()
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    init()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (activeTab === "users") loadUsers()
  }, [activeTab, userRoleFilter, usersPage, loadUsers])

  useEffect(() => {
    if (activeTab === "vehicles") loadVehicles()
  }, [activeTab, vehiclesPage, loadVehicles])

  useEffect(() => {
    if (activeTab === "trips") loadTrips()
  }, [activeTab, tripsStatusFilter, tripsPage, loadTrips])

  useEffect(() => {
    if (activeTab === "map") loadTracking()
  }, [activeTab, loadTracking])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/")
  }

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setAddUserLoading(true)
    setError("")
    try {
      await SuperAdminAPI.createUser({
        email: addUserForm.email,
        password: addUserForm.password,
        first_name: addUserForm.first_name,
        last_name: addUserForm.last_name,
        phone: addUserForm.phone || undefined,
        role: addUserForm.role
      })
      setSuccess("User created successfully")
      setAddUserOpen(false)
      setAddUserForm({ email: "", password: "", first_name: "", last_name: "", phone: "", role: "client" })
      loadUsers()
      loadStats()
    } catch (err: any) {
      setError(err?.message || "Failed to create user")
    } finally {
      setAddUserLoading(false)
    }
  }

  const openEditUser = (user: any) => {
    setEditUserTarget(user)
    setEditUserForm({ role: user?.role ?? "client", newPassword: "" })
    setEditUserOpen(true)
  }

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editUserTarget?.id) return
    setEditUserLoading(true)
    setError("")
    try {
      await SuperAdminAPI.updateUser({
        user_id: editUserTarget.id,
        ...(editUserForm.role ? { role: editUserForm.role } : {}),
        ...(editUserForm.newPassword.trim() ? { password: editUserForm.newPassword.trim() } : {})
      })
      setSuccess("User updated")
      setEditUserOpen(false)
      setEditUserTarget(null)
      loadUsers()
      loadStats()
    } catch (err: any) {
      setError(err?.message || "Failed to update user")
    } finally {
      setEditUserLoading(false)
    }
  }

  const openDeleteUser = (user: any) => {
    setDeleteUserTarget(user)
    setDeleteUserPassword("")
    setDeleteUserOpen(true)
  }

  const handleDeleteUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!deleteUserTarget?.id || !deleteUserPassword.trim()) {
      setError("Enter your super admin password to confirm")
      return
    }
    setDeleteUserLoading(true)
    setError("")
    try {
      await SuperAdminAPI.removeUser(deleteUserTarget.id, deleteUserPassword.trim())
      setSuccess("User permanently deleted")
      setDeleteUserOpen(false)
      setDeleteUserTarget(null)
      setDeleteUserPassword("")
      loadUsers()
      loadStats()
    } catch (err: any) {
      setError(err?.message || "Failed to delete user")
    } finally {
      setDeleteUserLoading(false)
    }
  }

  const handleDeactivateUser = async (userId: string) => {
    if (!confirm("Deactivate this user? They will no longer be able to sign in.")) return
    setActionLoading(userId)
    setError("")
    try {
      await SuperAdminAPI.removeUser(userId)
      setSuccess("User deactivated")
      loadUsers()
      loadStats()
    } catch (err: any) {
      setError(err?.message || "Failed to deactivate user")
    } finally {
      setActionLoading(null)
    }
  }

  const handleEndTrip = async (tripId: string) => {
    if (!confirm("End this trip (mark as completed)?")) return
    setActionLoading(tripId)
    setError("")
    try {
      await SuperAdminAPI.updateTrip({ trip_id: tripId, status: "completed" })
      setSuccess("Trip ended")
      loadTrips()
      loadStats()
    } catch (err: any) {
      setError(err?.message || "Failed to end trip")
    } finally {
      setActionLoading(null)
    }
  }

  const handleAddVehicle = async (e: React.FormEvent) => {
    e.preventDefault()
    setAddVehicleLoading(true)
    setError("")
    try {
      let image_url: string | undefined
      let photo_urls: string[] = []
      if (vehiclePhotos.length > 0) {
        const { urls } = await SuperAdminAPI.uploadVehicleImages(vehiclePhotos)
        if (urls.length > 0) {
          image_url = urls[0]
          if (urls.length > 1) photo_urls = urls.slice(1)
        }
      }
      await SuperAdminAPI.createVehicle({
        make: addVehicleForm.make,
        model: addVehicleForm.model,
        year: addVehicleForm.year,
        license_plate: addVehicleForm.license_plate,
        type: addVehicleForm.type as any,
        capacity: addVehicleForm.capacity,
        color: addVehicleForm.color || undefined,
        is_armored: addVehicleForm.is_armored,
        ...(image_url ? { image_url } : {}),
        ...(photo_urls.length ? { photo_urls } : {})
      })
      setSuccess("Vehicle added")
      setAddVehicleOpen(false)
      setAddVehicleForm({
        make: "",
        model: "",
        year: new Date().getFullYear(),
        license_plate: "",
        type: "suv",
        capacity: 4,
        color: "",
        is_armored: false
      })
      setVehiclePhotos([])
      loadVehicles()
      loadStats()
    } catch (err: any) {
      setError(err?.message || "Failed to add vehicle")
    } finally {
      setAddVehicleLoading(false)
    }
  }

  const handleRemoveVehicle = async (vehicleId: string) => {
    if (!confirm("Remove this vehicle from the fleet? This cannot be undone.")) return
    setActionLoading(vehicleId)
    setError("")
    try {
      await SuperAdminAPI.removeVehicle(vehicleId)
      setSuccess("Vehicle removed")
      loadVehicles()
      loadStats()
      loadTracking()
    } catch (err: any) {
      setError(err?.message || "Failed to remove vehicle")
    } finally {
      setActionLoading(null)
    }
  }

  const clearMessages = () => {
    setError("")
    setSuccess("")
  }

  if (loading && !stats) {
    return <LoadingLogo label="Loading super admin dashboard..." />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      <header className="border-b border-white/10 bg-black/20 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="h-8 w-8 text-amber-500" />
            <div>
              <h1 className="text-xl font-bold">Super Admin</h1>
              <p className="text-sm text-slate-400">Protector.Ng — Oversight & Control</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push("/")}
              className="border-white/20 text-white hover:bg-white/10"
            >
              App
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="border-white/20 text-white hover:bg-red-500/20"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {(error || success) && (
          <div
            className={`mb-6 rounded-xl border p-4 flex items-center justify-between ${
              error ? "bg-red-500/10 border-red-500/30 text-red-200" : "bg-green-500/10 border-green-500/30 text-green-200"
            }`}
          >
            <span>{error || success}</span>
            <Button variant="ghost" size="sm" onClick={clearMessages} className="text-inherit">
              Dismiss
            </Button>
          </div>
        )}

        <div className="flex flex-wrap gap-2 mb-8">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-colors ${
                activeTab === id
                  ? "bg-amber-600 text-white"
                  : "bg-white/10 text-slate-300 hover:bg-white/20 hover:text-white"
              }`}
            >
              <Icon className="h-5 w-5" />
              {label}
            </button>
          ))}
        </div>

        {activeTab === "overview" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="bg-white/5 border-white/10">
                <CardContent className="pt-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-slate-400 text-sm">Total Users</p>
                      <p className="text-3xl font-bold">{stats?.total_users ?? 0}</p>
                    </div>
                    <Users className="h-10 w-10 text-blue-400" />
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-white/5 border-white/10">
                <CardContent className="pt-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-slate-400 text-sm">Vehicles</p>
                      <p className="text-3xl font-bold">{stats?.total_vehicles ?? 0}</p>
                    </div>
                    <Car className="h-10 w-10 text-purple-400" />
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-white/5 border-white/10">
                <CardContent className="pt-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-slate-400 text-sm">Active Trips</p>
                      <p className="text-3xl font-bold">{stats?.active_trips ?? 0}</p>
                    </div>
                    <Calendar className="h-10 w-10 text-amber-400" />
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-white/5 border-white/10">
                <CardContent className="pt-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-slate-400 text-sm">Revenue (30d)</p>
                      <p className="text-2xl font-bold">₦{(stats?.revenue_30d ?? 0).toLocaleString()}</p>
                    </div>
                    <TrendingUp className="h-10 w-10 text-green-400" />
                  </div>
                </CardContent>
              </Card>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="bg-white/5 border-white/10">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Total Trips
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-4xl font-bold text-white">{stats?.total_trips ?? 0}</p>
                </CardContent>
              </Card>
              <Card className="bg-white/5 border-white/10">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-red-400" />
                    Active Emergencies
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-4xl font-bold text-white">{stats?.emergency_alerts ?? 0}</p>
                </CardContent>
              </Card>
            </div>
            <div className="flex justify-end">
              <Button onClick={loadStats} variant="outline" className="border-white/20 text-white">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh stats
              </Button>
            </div>
          </div>
        )}

        {activeTab === "users" && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <h2 className="text-2xl font-bold">User Management</h2>
              <div className="flex items-center gap-2">
                <Select value={userRoleFilter || "all"} onValueChange={(v) => setUserRoleFilter(v === "all" ? "" : v)}>
                  <SelectTrigger className="w-[140px] bg-white/10 border-white/20 text-white">
                    <SelectValue placeholder="Role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All roles</SelectItem>
                    <SelectItem value="client">Client</SelectItem>
                    <SelectItem value="agent">Agent</SelectItem>
                    <SelectItem value="operator">Operator</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={() => setAddUserOpen(true)} className="bg-amber-600 hover:bg-amber-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Add User
                </Button>
                <Button variant="outline" onClick={loadUsers} className="border-white/20 text-white">
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <Card className="bg-white/5 border-white/10 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-white/5">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium text-slate-400">Name</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-slate-400">Email</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-slate-400">Role</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-slate-400">Status</th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-slate-400">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {users.map((u) => (
                      <tr key={u.id} className="hover:bg-white/5">
                        <td className="px-4 py-3">
                          {u.first_name} {u.last_name}
                        </td>
                        <td className="px-4 py-3 text-slate-300">{u.email}</td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded bg-white/10 text-sm capitalize">{u.role}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={u.is_active ? "text-green-400" : "text-red-400"}>
                            {u.is_active ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1 flex-wrap">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-amber-400 hover:bg-amber-500/20"
                            onClick={() => openEditUser(u)}
                          >
                            <UserCog className="h-4 w-4 mr-1" />
                            Role / Password
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-400 hover:bg-red-500/20"
                            disabled={actionLoading === u.id}
                            onClick={() => openDeleteUser(u)}
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Delete
                          </Button>
                          {u.is_active && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-slate-400 hover:bg-slate-500/20"
                              disabled={actionLoading === u.id}
                              onClick={() => handleDeactivateUser(u.id)}
                            >
                              Deactivate
                            </Button>
                          )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {usersTotalPages > 1 && (
                <div className="flex justify-center gap-2 p-4 border-t border-white/10">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={usersPage <= 1}
                    onClick={() => setUsersPage((p) => p - 1)}
                    className="border-white/20 text-white"
                  >
                    Previous
                  </Button>
                  <span className="py-2 px-4 text-slate-400">
                    Page {usersPage} of {usersTotalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={usersPage >= usersTotalPages}
                    onClick={() => setUsersPage((p) => p + 1)}
                    className="border-white/20 text-white"
                  >
                    Next
                  </Button>
                </div>
              )}
            </Card>
          </div>
        )}

        {activeTab === "vehicles" && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <h2 className="text-2xl font-bold">Vehicle Fleet</h2>
              <div className="flex gap-2">
                <Button onClick={() => setAddVehicleOpen(true)} className="bg-amber-600 hover:bg-amber-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Vehicle
                </Button>
                <Button variant="outline" onClick={loadVehicles} className="border-white/20 text-white">
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <Card className="bg-white/5 border-white/10 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-white/5">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium text-slate-400">Photo</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-slate-400">Code</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-slate-400">Make / Model</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-slate-400">Plate</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-slate-400">Type</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-slate-400">Status</th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-slate-400">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {vehicles.map((v) => (
                      <tr key={v.id} className="hover:bg-white/5">
                        <td className="px-4 py-2">
                          {(v.image_url || v.photo_urls?.[0]) ? (
                            <img
                              src={v.image_url || v.photo_urls?.[0]}
                              alt=""
                              className="h-10 w-14 rounded object-cover bg-white/10"
                            />
                          ) : (
                            <span className="text-slate-500 text-xs">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 font-mono text-amber-300">{v.vehicle_code}</td>
                        <td className="px-4 py-3">
                          {v.make} {v.model} ({v.year})
                        </td>
                        <td className="px-4 py-3 text-slate-300">{v.license_plate}</td>
                        <td className="px-4 py-3 capitalize">{v.type}</td>
                        <td className="px-4 py-3">
                          <span className={v.is_available ? "text-green-400" : "text-amber-400"}>
                            {v.is_available ? "Available" : "In use"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-400 hover:bg-red-500/20"
                            disabled={actionLoading === v.id}
                            onClick={() => handleRemoveVehicle(v.id)}
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Remove
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {vehiclesTotalPages > 1 && (
                <div className="flex justify-center gap-2 p-4 border-t border-white/10">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={vehiclesPage <= 1}
                    onClick={() => setVehiclesPage((p) => p - 1)}
                    className="border-white/20 text-white"
                  >
                    Previous
                  </Button>
                  <span className="py-2 px-4 text-slate-400">
                    Page {vehiclesPage} of {vehiclesTotalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={vehiclesPage >= vehiclesTotalPages}
                    onClick={() => setVehiclesPage((p) => p + 1)}
                    className="border-white/20 text-white"
                  >
                    Next
                  </Button>
                </div>
              )}
            </Card>
          </div>
        )}

        {activeTab === "trips" && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <h2 className="text-2xl font-bold">Trips & Bookings</h2>
              <div className="flex items-center gap-2">
                <Select
                  value={tripsStatusFilter || "all"}
                  onValueChange={(v) => setTripsStatusFilter(v === "all" ? "" : v)}
                >
                  <SelectTrigger className="w-[160px] bg-white/10 border-white/20 text-white">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="accepted">Accepted</SelectItem>
                    <SelectItem value="en_route">En route</SelectItem>
                    <SelectItem value="arrived">Arrived</SelectItem>
                    <SelectItem value="in_service">In service</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" onClick={loadTrips} className="border-white/20 text-white">
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <Card className="bg-white/5 border-white/10 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-white/5">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium text-slate-400">Code</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-slate-400">Client</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-slate-400">Service</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-slate-400">Status</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-slate-400">Date / Time</th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-slate-400">Amount</th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-slate-400">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {trips.map((t) => (
                      <tr key={t.id} className="hover:bg-white/5">
                        <td className="px-4 py-3 font-mono text-amber-300">{t.booking_code}</td>
                        <td className="px-4 py-3">
                          {t.client?.first_name} {t.client?.last_name}
                        </td>
                        <td className="px-4 py-3 text-slate-300">{t.service?.name ?? t.service_type}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-0.5 rounded text-sm ${
                              t.status === "completed"
                                ? "bg-green-500/20 text-green-300"
                                : t.status === "cancelled"
                                  ? "bg-red-500/20 text-red-300"
                                  : "bg-amber-500/20 text-amber-300"
                            }`}
                          >
                            {String(t.status).replace(/_/g, " ")}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-300">
                          {t.scheduled_date} {t.scheduled_time}
                        </td>
                        <td className="px-4 py-3 text-right font-medium">
                          ₦{Number(t.total_price ?? 0).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {t.status !== "completed" && t.status !== "cancelled" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-amber-400 hover:bg-amber-500/20"
                              disabled={actionLoading === t.id}
                              onClick={() => handleEndTrip(t.id)}
                            >
                              <Square className="h-4 w-4 mr-1" />
                              End trip
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {tripsTotalPages > 1 && (
                <div className="flex justify-center gap-2 p-4 border-t border-white/10">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={tripsPage <= 1}
                    onClick={() => setTripsPage((p) => p - 1)}
                    className="border-white/20 text-white"
                  >
                    Previous
                  </Button>
                  <span className="py-2 px-4 text-slate-400">
                    Page {tripsPage} of {tripsTotalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={tripsPage >= tripsTotalPages}
                    onClick={() => setTripsPage((p) => p + 1)}
                    className="border-white/20 text-white"
                  >
                    Next
                  </Button>
                </div>
              )}
            </Card>
          </div>
        )}

        {activeTab === "map" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Live Vehicle & Agent Tracking</h2>
              <Button variant="outline" onClick={loadTracking} className="border-white/20 text-white">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
            <p className="text-slate-400 text-sm">
              Vehicles and agents with reported locations appear on the map. Click markers for details.
            </p>
            <SuperAdminMap
              vehicles={tracking.vehicles
                .filter((v) => v.location?.lat != null && v.location?.lng != null)
                .map((v) => ({
                  id: v.id,
                  vehicle_code: v.vehicle_code,
                  make: v.make,
                  model: v.model,
                  license_plate: v.license_plate,
                  location: v.location!,
                  is_available: v.is_available
                }))}
              agents={tracking.agents
                .filter((a) => a.location?.lat != null && a.location?.lng != null)
                .map((a) => ({
                  id: a.id,
                  agent_code: a.agent_code,
                  profile: a.profile,
                  location: a.location!,
                  availability_status: a.availability_status
                }))}
              height="600px"
            />
          </div>
        )}

        {activeTab === "drone" && (
          <Card className="bg-white/5 border-white/10 overflow-hidden">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Video className="h-6 w-6 text-amber-400" />
                Drone View — Real-time Site Feed
              </CardTitle>
              <p className="text-slate-400 text-sm">
                Connect a drone or fixed camera stream to monitor sites in real time.
              </p>
            </CardHeader>
            <CardContent>
              <div className="aspect-video rounded-xl bg-slate-800/50 border border-white/10 flex flex-col items-center justify-center gap-4 p-8">
                <Video className="h-16 w-16 text-slate-500" />
                <p className="text-slate-400 text-center max-w-md">
                  No live feed connected. Configure a drone or camera stream URL (e.g. WebRTC or RTSP) in settings to
                  view real-time footage here.
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" className="border-white/20 text-white" disabled>
                    Connect stream (coming soon)
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={addUserOpen} onOpenChange={setAddUserOpen}>
        <DialogContent className="bg-slate-900 border-white/20 text-white max-w-md">
          <DialogHeader>
            <DialogTitle>Add User</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddUser} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="first_name">First name</Label>
                <Input
                  id="first_name"
                  value={addUserForm.first_name}
                  onChange={(e) => setAddUserForm((f) => ({ ...f, first_name: e.target.value }))}
                  required
                  className="bg-white/10 border-white/20 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_name">Last name</Label>
                <Input
                  id="last_name"
                  value={addUserForm.last_name}
                  onChange={(e) => setAddUserForm((f) => ({ ...f, last_name: e.target.value }))}
                  required
                  className="bg-white/10 border-white/20 text-white"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={addUserForm.email}
                onChange={(e) => setAddUserForm((f) => ({ ...f, email: e.target.value }))}
                required
                className="bg-white/10 border-white/20 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={addUserForm.password}
                onChange={(e) => setAddUserForm((f) => ({ ...f, password: e.target.value }))}
                required
                minLength={6}
                className="bg-white/10 border-white/20 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone (optional)</Label>
              <Input
                id="phone"
                value={addUserForm.phone}
                onChange={(e) => setAddUserForm((f) => ({ ...f, phone: e.target.value }))}
                className="bg-white/10 border-white/20 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select
                value={addUserForm.role}
                onValueChange={(v) => setAddUserForm((f) => ({ ...f, role: v }))}
              >
                <SelectTrigger className="bg-white/10 border-white/20 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="client">Client</SelectItem>
                  <SelectItem value="agent">Agent</SelectItem>
                  <SelectItem value="operator">Operator</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAddUserOpen(false)} className="border-white/20 text-white">
                Cancel
              </Button>
              <Button type="submit" className="bg-amber-600 hover:bg-amber-700" disabled={addUserLoading}>
                {addUserLoading ? "Creating…" : "Create user"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={addVehicleOpen} onOpenChange={setAddVehicleOpen}>
        <DialogContent className="bg-slate-900 border-white/20 text-white max-w-md">
          <DialogHeader>
            <DialogTitle>Add Vehicle</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddVehicle} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="make">Make</Label>
                <Input
                  id="make"
                  value={addVehicleForm.make}
                  onChange={(e) => setAddVehicleForm((f) => ({ ...f, make: e.target.value }))}
                  required
                  className="bg-white/10 border-white/20 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="model">Model</Label>
                <Input
                  id="model"
                  value={addVehicleForm.model}
                  onChange={(e) => setAddVehicleForm((f) => ({ ...f, model: e.target.value }))}
                  required
                  className="bg-white/10 border-white/20 text-white"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="year">Year</Label>
                <Input
                  id="year"
                  type="number"
                  value={addVehicleForm.year}
                  onChange={(e) => setAddVehicleForm((f) => ({ ...f, year: parseInt(e.target.value, 10) || new Date().getFullYear() }))}
                  required
                  className="bg-white/10 border-white/20 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="license_plate">License plate</Label>
                <Input
                  id="license_plate"
                  value={addVehicleForm.license_plate}
                  onChange={(e) => setAddVehicleForm((f) => ({ ...f, license_plate: e.target.value }))}
                  required
                  className="bg-white/10 border-white/20 text-white"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  value={addVehicleForm.type}
                  onValueChange={(v) => setAddVehicleForm((f) => ({ ...f, type: v }))}
                >
                  <SelectTrigger className="bg-white/10 border-white/20 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sedan">Sedan</SelectItem>
                    <SelectItem value="suv">SUV</SelectItem>
                    <SelectItem value="van">Van</SelectItem>
                    <SelectItem value="motorcade">Motorcade</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="capacity">Capacity</Label>
                <Input
                  id="capacity"
                  type="number"
                  min={1}
                  value={addVehicleForm.capacity}
                  onChange={(e) => setAddVehicleForm((f) => ({ ...f, capacity: parseInt(e.target.value, 10) || 4 }))}
                  className="bg-white/10 border-white/20 text-white"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="color">Color (optional)</Label>
              <Input
                id="color"
                value={addVehicleForm.color}
                onChange={(e) => setAddVehicleForm((f) => ({ ...f, color: e.target.value }))}
                className="bg-white/10 border-white/20 text-white"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_armored"
                checked={addVehicleForm.is_armored}
                onChange={(e) => setAddVehicleForm((f) => ({ ...f, is_armored: e.target.checked }))}
                className="rounded border-white/20 bg-white/10"
              />
              <Label htmlFor="is_armored">Armored vehicle</Label>
            </div>
            <div className="space-y-2">
              <Label>Vehicle pictures (optional)</Label>
              <Input
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => {
                  const files = e.target.files
                  if (files?.length) setVehiclePhotos(Array.from(files))
                }}
                className="bg-white/10 border-white/20 text-white file:mr-2 file:rounded file:border-0 file:bg-amber-600 file:px-3 file:py-1 file:text-white"
              />
              {vehiclePhotos.length > 0 && (
                <p className="text-sm text-slate-400">{vehiclePhotos.length} file(s) selected</p>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAddVehicleOpen(false)} className="border-white/20 text-white">
                Cancel
              </Button>
              <Button type="submit" className="bg-amber-600 hover:bg-amber-700" disabled={addVehicleLoading}>
                {addVehicleLoading ? "Adding…" : "Add vehicle"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={editUserOpen} onOpenChange={setEditUserOpen}>
        <DialogContent className="bg-slate-900 border-white/20 text-white max-w-md">
          <DialogHeader>
            <DialogTitle>Change role / Reset password</DialogTitle>
            {editUserTarget && (
              <p className="text-sm text-slate-400">
                {editUserTarget.first_name} {editUserTarget.last_name} — {editUserTarget.email}
              </p>
            )}
          </DialogHeader>
          <form onSubmit={handleUpdateUser} className="space-y-4">
            <div className="space-y-2">
              <Label>Role</Label>
              <Select
                value={editUserForm.role}
                onValueChange={(v) => setEditUserForm((f) => ({ ...f, role: v }))}
              >
                <SelectTrigger className="bg-white/10 border-white/20 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="client">Client</SelectItem>
                  <SelectItem value="agent">Agent</SelectItem>
                  <SelectItem value="operator">Operator</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="newPassword">New password (leave blank to keep current)</Label>
              <Input
                id="newPassword"
                type="password"
                placeholder="Min 6 characters"
                value={editUserForm.newPassword}
                onChange={(e) => setEditUserForm((f) => ({ ...f, newPassword: e.target.value }))}
                className="bg-white/10 border-white/20 text-white"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditUserOpen(false)} className="border-white/20 text-white">
                Cancel
              </Button>
              <Button type="submit" className="bg-amber-600 hover:bg-amber-700" disabled={editUserLoading}>
                {editUserLoading ? "Saving…" : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteUserOpen} onOpenChange={setDeleteUserOpen}>
        <DialogContent className="bg-slate-900 border-white/20 text-white max-w-md">
          <DialogHeader>
            <DialogTitle>Permanently delete user</DialogTitle>
            {deleteUserTarget && (
              <p className="text-sm text-slate-400">
                This will remove <strong>{deleteUserTarget.first_name} {deleteUserTarget.last_name}</strong> ({deleteUserTarget.email}) from the system. Enter your super admin password to confirm.
              </p>
            )}
          </DialogHeader>
          <form onSubmit={handleDeleteUser} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="deletePassword">Your super admin password</Label>
              <Input
                id="deletePassword"
                type="password"
                placeholder="Enter your password"
                value={deleteUserPassword}
                onChange={(e) => setDeleteUserPassword(e.target.value)}
                required
                className="bg-white/10 border-white/20 text-white"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDeleteUserOpen(false)} className="border-white/20 text-white">
                Cancel
              </Button>
              <Button type="submit" variant="destructive" className="bg-red-600 hover:bg-red-700" disabled={deleteUserLoading || !deleteUserPassword.trim()}>
                {deleteUserLoading ? "Deleting…" : "Delete user"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
