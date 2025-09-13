"use client"

import { useState, useEffect } from "react"
import { 
  Shield, 
  Users, 
  Calendar, 
  Car, 
  AlertTriangle, 
  TrendingUp, 
  MapPin,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  Settings,
  BarChart3,
  Bell,
  Search,
  Filter,
  Download
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { AdminAPI } from "@/lib/api"
import { createClient } from "@/lib/supabase/client"

export default function AdminDashboard() {
  const supabase = createClient()
  
  // State management
  const [activeTab, setActiveTab] = useState("overview")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  
  // Dashboard data
  const [stats, setStats] = useState<any>(null)
  const [bookings, setBookings] = useState<any[]>([])
  const [agents, setAgents] = useState<any[]>([])
  const [vehicles, setVehicles] = useState<any[]>([])
  const [emergencyAlerts, setEmergencyAlerts] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  
  // Filters and pagination
  const [filters, setFilters] = useState({
    bookingStatus: "",
    agentStatus: "",
    vehicleAvailable: undefined as boolean | undefined,
    emergencyStatus: ""
  })
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)

  // Real-time subscriptions
  const [subscriptions, setSubscriptions] = useState<any[]>([])

  // Initialize dashboard
  useEffect(() => {
    initializeDashboard()
    setupRealTimeSubscriptions()
    
    return () => {
      // Cleanup subscriptions
      subscriptions.forEach(sub => supabase.removeChannel(sub))
    }
  }, [])

  const initializeDashboard = async () => {
    try {
      setIsLoading(true)
      await Promise.all([
        loadDashboardStats(),
        loadBookings(),
        loadAgents(),
        loadVehicles(),
        loadEmergencyAlerts(),
        loadUsers()
      ])
    } catch (error) {
      console.error('Failed to initialize dashboard:', error)
      setError('Failed to load dashboard data')
    } finally {
      setIsLoading(false)
    }
  }

  const setupRealTimeSubscriptions = () => {
    const bookingSub = AdminAPI.subscribeToBookings((payload) => {
      console.log('Booking update:', payload)
      loadBookings() // Refresh bookings
    })

    const emergencySub = AdminAPI.subscribeToEmergencyAlerts((payload) => {
      console.log('Emergency alert:', payload)
      loadEmergencyAlerts() // Refresh emergency alerts
      // Show notification
      setSuccess('New emergency alert received!')
    })

    const agentSub = AdminAPI.subscribeToAgents((payload) => {
      console.log('Agent update:', payload)
      loadAgents() // Refresh agents
    })

    setSubscriptions([bookingSub, emergencySub, agentSub])
  }

  const loadDashboardStats = async () => {
    try {
      const { data, error } = await AdminAPI.getDashboardStats()
      if (data && !error) {
        setStats(data)
      }
    } catch (error) {
      console.error('Failed to load stats:', error)
    }
  }

  const loadBookings = async () => {
    try {
      const { data, error } = await AdminAPI.getAllBookings(filters.bookingStatus, currentPage, itemsPerPage)
      if (data && !error) {
        setBookings(data.data)
      }
    } catch (error) {
      console.error('Failed to load bookings:', error)
    }
  }

  const loadAgents = async () => {
    try {
      const { data, error } = await AdminAPI.getAllAgents(filters.agentStatus, currentPage, itemsPerPage)
      if (data && !error) {
        setAgents(data.data)
      }
    } catch (error) {
      console.error('Failed to load agents:', error)
    }
  }

  const loadVehicles = async () => {
    try {
      const { data, error } = await AdminAPI.getAllVehicles(filters.vehicleAvailable, currentPage, itemsPerPage)
      if (data && !error) {
        setVehicles(data.data)
      }
    } catch (error) {
      console.error('Failed to load vehicles:', error)
    }
  }

  const loadEmergencyAlerts = async () => {
    try {
      const { data, error } = await AdminAPI.getAllEmergencyAlerts(filters.emergencyStatus, currentPage, itemsPerPage)
      if (data && !error) {
        setEmergencyAlerts(data.data)
      }
    } catch (error) {
      console.error('Failed to load emergency alerts:', error)
    }
  }

  const loadUsers = async () => {
    try {
      const { data, error } = await AdminAPI.getAllUsers(undefined, currentPage, itemsPerPage)
      if (data && !error) {
        setUsers(data.data)
      }
    } catch (error) {
      console.error('Failed to load users:', error)
    }
  }

  // Action handlers
  const handleAssignAgent = async (bookingId: string, agentId: string) => {
    try {
      const { error } = await AdminAPI.assignAgentToBooking(bookingId, agentId)
      if (!error) {
        setSuccess('Agent assigned successfully!')
        loadBookings()
      } else {
        setError(error || 'Failed to assign agent')
      }
    } catch (error) {
      setError('Failed to assign agent')
    }
  }

  const handleAssignVehicle = async (bookingId: string, vehicleId: string) => {
    try {
      const { error } = await AdminAPI.assignVehicleToBooking(bookingId, vehicleId)
      if (!error) {
        setSuccess('Vehicle assigned successfully!')
        loadBookings()
      } else {
        setError(error || 'Failed to assign vehicle')
      }
    } catch (error) {
      setError('Failed to assign vehicle')
    }
  }

  const handleUpdateBookingStatus = async (bookingId: string, status: string) => {
    try {
      const { error } = await AdminAPI.updateBookingStatus(bookingId, status)
      if (!error) {
        setSuccess('Booking status updated successfully!')
        loadBookings()
      } else {
        setError(error || 'Failed to update booking status')
      }
    } catch (error) {
      setError('Failed to update booking status')
    }
  }

  const handleApproveAgent = async (agentId: string) => {
    try {
      const { error } = await AdminAPI.approveAgent(agentId, {
        background_check_status: 'approved',
        is_armed: true
      })
      if (!error) {
        setSuccess('Agent approved successfully!')
        loadAgents()
      } else {
        setError(error || 'Failed to approve agent')
      }
    } catch (error) {
      setError('Failed to approve agent')
    }
  }

  const handleRespondToEmergency = async (alertId: string, agentId: string) => {
    try {
      const { error } = await AdminAPI.respondToEmergency(alertId, agentId)
      if (!error) {
        setSuccess('Emergency response initiated!')
        loadEmergencyAlerts()
      } else {
        setError(error || 'Failed to respond to emergency')
      }
    } catch (error) {
      setError('Failed to respond to emergency')
    }
  }

  // Render loading state
  if (isLoading && !stats) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-white">Loading Admin Dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <div className="bg-black/20 backdrop-blur-lg border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Shield className="h-8 w-8 text-blue-400" />
              <h1 className="text-xl font-bold text-white">Protector.Ng Admin</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Bell className="h-6 w-6 text-white" />
              <span className="text-white">Admin Dashboard</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Error/Success Messages */}
        {error && (
          <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 mb-6">
            <p className="text-red-200">{error}</p>
          </div>
        )}

        {success && (
          <div className="bg-green-500/20 border border-green-500/50 rounded-lg p-4 mb-6">
            <p className="text-green-200">{success}</p>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex space-x-1 bg-white/10 rounded-lg p-1 mb-8">
          {[
            { id: "overview", label: "Overview", icon: BarChart3 },
            { id: "analytics", label: "Analytics", icon: TrendingUp },
            { id: "bookings", label: "Bookings", icon: Calendar },
            { id: "agents", label: "Agents", icon: Users },
            { id: "vehicles", label: "Vehicles", icon: Car },
            { id: "emergency", label: "Emergency", icon: AlertTriangle },
            { id: "users", label: "Users", icon: Users },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-md transition-colors ${
                activeTab === id
                  ? "bg-blue-600 text-white"
                  : "text-gray-300 hover:text-white hover:bg-white/10"
              }`}
            >
              <Icon className="h-5 w-5" />
              <span>{label}</span>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === "analytics" && (
          <div className="space-y-8">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-white mb-4">Analytics Dashboard</h2>
              <p className="text-gray-300">Comprehensive insights into your security service operations</p>
            </div>
            
            {/* Import the analytics component */}
            <div className="bg-white/10 rounded-xl p-6 border border-white/20">
              <div className="text-center py-12">
                <TrendingUp className="h-16 w-16 text-blue-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">Advanced Analytics</h3>
                <p className="text-gray-300 mb-6">
                  Detailed analytics and reporting features are available in the dedicated analytics dashboard.
                </p>
                <Button
                  onClick={() => window.open('/admin/analytics', '_blank')}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg"
                >
                  Open Analytics Dashboard
                </Button>
              </div>
            </div>
          </div>
        )}

        {activeTab === "overview" && (
          <div className="space-y-8">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white/10 rounded-xl p-6 border border-white/20">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-300 text-sm">Total Clients</p>
                    <p className="text-3xl font-bold text-white">{stats?.total_clients || 0}</p>
                  </div>
                  <Users className="h-8 w-8 text-blue-400" />
                </div>
              </div>

              <div className="bg-white/10 rounded-xl p-6 border border-white/20">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-300 text-sm">Active Agents</p>
                    <p className="text-3xl font-bold text-white">{stats?.total_agents || 0}</p>
                  </div>
                  <Shield className="h-8 w-8 text-green-400" />
                </div>
              </div>

              <div className="bg-white/10 rounded-xl p-6 border border-white/20">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-300 text-sm">Available Vehicles</p>
                    <p className="text-3xl font-bold text-white">{stats?.available_vehicles || 0}</p>
                  </div>
                  <Car className="h-8 w-8 text-purple-400" />
                </div>
              </div>

              <div className="bg-white/10 rounded-xl p-6 border border-white/20">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-300 text-sm">Active Bookings</p>
                    <p className="text-3xl font-bold text-white">{stats?.active_bookings || 0}</p>
                  </div>
                  <Calendar className="h-8 w-8 text-orange-400" />
                </div>
              </div>
            </div>

            {/* Revenue and Emergency Alerts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white/10 rounded-xl p-6 border border-white/20">
                <h3 className="text-lg font-semibold text-white mb-4">Revenue (30 Days)</h3>
                <div className="flex items-center space-x-4">
                  <TrendingUp className="h-8 w-8 text-green-400" />
                  <div>
                    <p className="text-3xl font-bold text-white">₦{stats?.revenue_30d?.toLocaleString() || 0}</p>
                    <p className="text-gray-300 text-sm">Completed Bookings: {stats?.completed_bookings_30d || 0}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white/10 rounded-xl p-6 border border-white/20">
                <h3 className="text-lg font-semibold text-white mb-4">Emergency Alerts</h3>
                <div className="flex items-center space-x-4">
                  <AlertTriangle className="h-8 w-8 text-red-400" />
                  <div>
                    <p className="text-3xl font-bold text-white">{stats?.emergency_alerts || 0}</p>
                    <p className="text-gray-300 text-sm">Active Alerts</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white/10 rounded-xl p-6 border border-white/20">
              <h3 className="text-lg font-semibold text-white mb-4">Recent Activity</h3>
              <div className="space-y-4">
                {bookings.slice(0, 5).map((booking) => (
                  <div key={booking.id} className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                    <div className="flex items-center space-x-4">
                      <Calendar className="h-5 w-5 text-blue-400" />
                      <div>
                        <p className="text-white font-medium">
                          {booking.client?.first_name} {booking.client?.last_name}
                        </p>
                        <p className="text-gray-300 text-sm">{booking.service?.name}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        booking.status === 'pending' ? 'bg-yellow-500/20 text-yellow-300' :
                        booking.status === 'accepted' ? 'bg-blue-500/20 text-blue-300' :
                        booking.status === 'in_service' ? 'bg-green-500/20 text-green-300' :
                        'bg-gray-500/20 text-gray-300'
                      }`}>
                        {booking.status.replace('_', ' ').toUpperCase()}
                      </span>
                      <span className="text-blue-400 font-semibold">
                        ₦{booking.total_price?.toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Bookings Tab */}
        {activeTab === "bookings" && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-white">Booking Management</h2>
              <div className="flex space-x-2">
                <select
                  value={filters.bookingStatus}
                  onChange={(e) => setFilters(prev => ({ ...prev, bookingStatus: e.target.value }))}
                  className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
                >
                  <option value="">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="accepted">Accepted</option>
                  <option value="en_route">En Route</option>
                  <option value="arrived">Arrived</option>
                  <option value="in_service">In Service</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
                <Button
                  onClick={loadBookings}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Search className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
              </div>
            </div>

            <div className="bg-white/10 rounded-xl border border-white/20 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-white/5">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-medium text-gray-300">Client</th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-gray-300">Service</th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-gray-300">Status</th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-gray-300">Agent</th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-gray-300">Vehicle</th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-gray-300">Amount</th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-gray-300">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {bookings.map((booking) => (
                      <tr key={booking.id} className="hover:bg-white/5">
                        <td className="px-6 py-4">
                          <div>
                            <p className="text-white font-medium">
                              {booking.client?.first_name} {booking.client?.last_name}
                            </p>
                            <p className="text-gray-300 text-sm">{booking.client?.email}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-white">{booking.service?.name}</p>
                          <p className="text-gray-300 text-sm">{booking.pickup_address}</p>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                            booking.status === 'pending' ? 'bg-yellow-500/20 text-yellow-300' :
                            booking.status === 'accepted' ? 'bg-blue-500/20 text-blue-300' :
                            booking.status === 'en_route' ? 'bg-purple-500/20 text-purple-300' :
                            booking.status === 'arrived' ? 'bg-green-500/20 text-green-300' :
                            booking.status === 'in_service' ? 'bg-green-500/20 text-green-300' :
                            booking.status === 'completed' ? 'bg-gray-500/20 text-gray-300' :
                            'bg-red-500/20 text-red-300'
                          }`}>
                            {booking.status.replace('_', ' ').toUpperCase()}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {booking.assigned_agent ? (
                            <div>
                              <p className="text-white">
                                {booking.assigned_agent.profile?.first_name} {booking.assigned_agent.profile?.last_name}
                              </p>
                              <p className="text-gray-300 text-sm">{booking.assigned_agent.agent_code}</p>
                            </div>
                          ) : (
                            <select
                              onChange={(e) => handleAssignAgent(booking.id, e.target.value)}
                              className="px-3 py-1 bg-white/10 border border-white/20 rounded text-white text-sm"
                            >
                              <option value="">Assign Agent</option>
                              {agents.filter(a => a.availability_status === 'available').map(agent => (
                                <option key={agent.id} value={agent.id}>
                                  {agent.profile?.first_name} {agent.profile?.last_name}
                                </option>
                              ))}
                            </select>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {booking.assigned_vehicle ? (
                            <div>
                              <p className="text-white">{booking.assigned_vehicle.make} {booking.assigned_vehicle.model}</p>
                              <p className="text-gray-300 text-sm">{booking.assigned_vehicle.license_plate}</p>
                            </div>
                          ) : (
                            <select
                              onChange={(e) => handleAssignVehicle(booking.id, e.target.value)}
                              className="px-3 py-1 bg-white/10 border border-white/20 rounded text-white text-sm"
                            >
                              <option value="">Assign Vehicle</option>
                              {vehicles.filter(v => v.is_available).map(vehicle => (
                                <option key={vehicle.id} value={vehicle.id}>
                                  {vehicle.make} {vehicle.model}
                                </option>
                              ))}
                            </select>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-white font-semibold">₦{booking.total_price?.toLocaleString()}</p>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex space-x-2">
                            <select
                              onChange={(e) => handleUpdateBookingStatus(booking.id, e.target.value)}
                              className="px-3 py-1 bg-white/10 border border-white/20 rounded text-white text-sm"
                            >
                              <option value="">Update Status</option>
                              <option value="accepted">Accept</option>
                              <option value="en_route">En Route</option>
                              <option value="arrived">Arrived</option>
                              <option value="in_service">In Service</option>
                              <option value="completed">Complete</option>
                              <option value="cancelled">Cancel</option>
                            </select>
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-white/20 text-white hover:bg-white/10"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Agents Tab */}
        {activeTab === "agents" && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-white">Agent Management</h2>
              <div className="flex space-x-2">
                <select
                  value={filters.agentStatus}
                  onChange={(e) => setFilters(prev => ({ ...prev, agentStatus: e.target.value }))}
                  className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
                >
                  <option value="">All Status</option>
                  <option value="available">Available</option>
                  <option value="busy">Busy</option>
                  <option value="offline">Offline</option>
                </select>
                <Button
                  onClick={loadAgents}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Search className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
              </div>
            </div>

            <div className="bg-white/10 rounded-xl border border-white/20 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-white/5">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-medium text-gray-300">Agent</th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-gray-300">Code</th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-gray-300">Status</th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-gray-300">Rating</th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-gray-300">Experience</th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-gray-300">Background Check</th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-gray-300">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {agents.map((agent) => (
                      <tr key={agent.id} className="hover:bg-white/5">
                        <td className="px-6 py-4">
                          <div>
                            <p className="text-white font-medium">
                              {agent.profile?.first_name} {agent.profile?.last_name}
                            </p>
                            <p className="text-gray-300 text-sm">{agent.profile?.email}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-white font-mono">{agent.agent_code}</p>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                            agent.availability_status === 'available' ? 'bg-green-500/20 text-green-300' :
                            agent.availability_status === 'busy' ? 'bg-yellow-500/20 text-yellow-300' :
                            'bg-gray-500/20 text-gray-300'
                          }`}>
                            {agent.availability_status.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-2">
                            <span className="text-white">{agent.rating}</span>
                            <div className="flex">
                              {[...Array(5)].map((_, i) => (
                                <span
                                  key={i}
                                  className={`text-sm ${
                                    i < Math.floor(agent.rating) ? 'text-yellow-400' : 'text-gray-400'
                                  }`}
                                >
                                  ★
                                </span>
                              ))}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-white">{agent.experience_years} years</p>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                            agent.background_check_status === 'approved' ? 'bg-green-500/20 text-green-300' :
                            agent.background_check_status === 'pending' ? 'bg-yellow-500/20 text-yellow-300' :
                            'bg-red-500/20 text-red-300'
                          }`}>
                            {agent.background_check_status.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex space-x-2">
                            {agent.background_check_status === 'pending' && (
                              <Button
                                size="sm"
                                onClick={() => handleApproveAgent(agent.id)}
                                className="bg-green-600 hover:bg-green-700 text-white"
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Approve
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-white/20 text-white hover:bg-white/10"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Vehicles Tab */}
        {activeTab === "vehicles" && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-white">Vehicle Management</h2>
              <div className="flex space-x-2">
                <select
                  value={filters.vehicleAvailable?.toString()}
                  onChange={(e) => setFilters(prev => ({ 
                    ...prev, 
                    vehicleAvailable: e.target.value === '' ? undefined : e.target.value === 'true'
                  }))}
                  className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
                >
                  <option value="">All Vehicles</option>
                  <option value="true">Available</option>
                  <option value="false">Unavailable</option>
                </select>
                <Button
                  onClick={loadVehicles}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Search className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {vehicles.map((vehicle) => (
                <div key={vehicle.id} className="bg-white/10 rounded-xl p-6 border border-white/20">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-white">
                        {vehicle.make} {vehicle.model}
                      </h3>
                      <p className="text-gray-300 text-sm">{vehicle.year}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      vehicle.is_available ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'
                    }`}>
                      {vehicle.is_available ? 'Available' : 'Unavailable'}
                    </span>
                  </div>
                  
                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between">
                      <span className="text-gray-300">Type:</span>
                      <span className="text-white">{vehicle.type.toUpperCase()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">Capacity:</span>
                      <span className="text-white">{vehicle.capacity} passengers</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">License:</span>
                      <span className="text-white font-mono">{vehicle.license_plate}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">Armored:</span>
                      <span className="text-white">{vehicle.is_armored ? 'Yes' : 'No'}</span>
                    </div>
                  </div>

                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      onClick={() => {
                        // Toggle vehicle availability
                        AdminAPI.updateVehicleStatus(vehicle.id, !vehicle.is_available)
                          .then(() => {
                            setSuccess('Vehicle status updated!')
                            loadVehicles()
                          })
                          .catch(() => setError('Failed to update vehicle status'))
                      }}
                      className={`${
                        vehicle.is_available 
                          ? 'bg-red-600 hover:bg-red-700' 
                          : 'bg-green-600 hover:bg-green-700'
                      } text-white`}
                    >
                      {vehicle.is_available ? 'Mark Unavailable' : 'Mark Available'}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-white/20 text-white hover:bg-white/10"
                    >
                      <Settings className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Emergency Tab */}
        {activeTab === "emergency" && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-white">Emergency Control Center</h2>
              <div className="flex space-x-2">
                <select
                  value={filters.emergencyStatus}
                  onChange={(e) => setFilters(prev => ({ ...prev, emergencyStatus: e.target.value }))}
                  className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
                >
                  <option value="">All Alerts</option>
                  <option value="active">Active</option>
                  <option value="resolved">Resolved</option>
                  <option value="false_alarm">False Alarm</option>
                </select>
                <Button
                  onClick={loadEmergencyAlerts}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Search className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
              </div>
            </div>

            <div className="space-y-4">
              {emergencyAlerts.map((alert) => (
                <div key={alert.id} className="bg-red-900/20 border border-red-500/50 rounded-xl p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center space-x-4">
                      <AlertTriangle className="h-8 w-8 text-red-400" />
                      <div>
                        <h3 className="text-lg font-semibold text-white">
                          Emergency Alert - {alert.alert_type}
                        </h3>
                        <p className="text-gray-300">
                          From: {alert.client?.first_name} {alert.client?.last_name}
                        </p>
                        <p className="text-gray-300 text-sm">{alert.address}</p>
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      alert.status === 'active' ? 'bg-red-500/20 text-red-300' :
                      alert.status === 'resolved' ? 'bg-green-500/20 text-green-300' :
                      'bg-yellow-500/20 text-yellow-300'
                    }`}>
                      {alert.status.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>

                  {alert.description && (
                    <p className="text-gray-300 mb-4">{alert.description}</p>
                  )}

                  <div className="flex justify-between items-center">
                    <div className="text-sm text-gray-400">
                      <p>Time: {new Date(alert.created_at).toLocaleString()}</p>
                      {alert.responded_by_agent && (
                        <p>Responded by: {alert.responded_by_agent.profile?.first_name} {alert.responded_by_agent.profile?.last_name}</p>
                      )}
                    </div>
                    
                    {alert.status === 'active' && (
                      <div className="flex space-x-2">
                        <select
                          onChange={(e) => handleRespondToEmergency(alert.id, e.target.value)}
                          className="px-3 py-1 bg-white/10 border border-white/20 rounded text-white text-sm"
                        >
                          <option value="">Assign Agent</option>
                          {agents.filter(a => a.availability_status === 'available').map(agent => (
                            <option key={agent.id} value={agent.id}>
                              {agent.profile?.first_name} {agent.profile?.last_name}
                            </option>
                          ))}
                        </select>
                        <Button
                          size="sm"
                          onClick={() => handleRespondToEmergency(alert.id, '')}
                          className="bg-green-600 hover:bg-green-700 text-white"
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Resolve
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === "users" && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-white">User Management</h2>
              <Button
                onClick={loadUsers}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Search className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>

            <div className="bg-white/10 rounded-xl border border-white/20 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-white/5">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-medium text-gray-300">User</th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-gray-300">Role</th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-gray-300">Status</th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-gray-300">Joined</th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-gray-300">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {users.map((user) => (
                      <tr key={user.id} className="hover:bg-white/5">
                        <td className="px-6 py-4">
                          <div>
                            <p className="text-white font-medium">
                              {user.first_name} {user.last_name}
                            </p>
                            <p className="text-gray-300 text-sm">{user.email}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                            user.role === 'admin' ? 'bg-purple-500/20 text-purple-300' :
                            user.role === 'agent' ? 'bg-blue-500/20 text-blue-300' :
                            'bg-gray-500/20 text-gray-300'
                          }`}>
                            {user.role.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                            user.is_active ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'
                          }`}>
                            {user.is_active ? 'ACTIVE' : 'INACTIVE'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-white">{new Date(user.created_at).toLocaleDateString()}</p>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex space-x-2">
                            <Button
                              size="sm"
                              onClick={() => {
                                AdminAPI.updateUserStatus(user.id, !user.is_active)
                                  .then(() => {
                                    setSuccess('User status updated!')
                                    loadUsers()
                                  })
                                  .catch(() => setError('Failed to update user status'))
                              }}
                              className={`${
                                user.is_active 
                                  ? 'bg-red-600 hover:bg-red-700' 
                                  : 'bg-green-600 hover:bg-green-700'
                              } text-white`}
                            >
                              {user.is_active ? 'Deactivate' : 'Activate'}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-white/20 text-white hover:bg-white/10"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
