"use client"

import { useState, useEffect } from "react"
import { Shield, Calendar, User, MapPin, AlertTriangle, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import { 
  AuthAPI, 
  BookingAPI, 
  ServicesAPI, 
  RealtimeAPI,
  type Profile,
  type Service,
  type BookingWithDetails
} from "@/lib/api"

export default function ProtectorApp() {
  // Authentication state
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [user, setUser] = useState<Profile | null>(null)
  const [authLoading, setAuthLoading] = useState(false)
  const [authError, setAuthError] = useState("")
  const [authSuccess, setAuthSuccess] = useState("")

  // UI state
  const [activeTab, setActiveTab] = useState("protector")
  const [isLogin, setIsLogin] = useState(true)

  // Booking state
  const [selectedService, setSelectedService] = useState<Service | null>(null)
  const [bookingData, setBookingData] = useState({
    service_type: "" as any,
    protector_count: 1,
    protectee_count: 1,
    dress_code: "tactical_casual" as any,
    duration_hours: 4,
    pickup_address: "",
    pickup_coordinates: { x: 0, y: 0 },
    destination_address: "",
    destination_coordinates: { x: 0, y: 0 },
    scheduled_date: "",
    scheduled_time: "",
    special_instructions: "",
    emergency_contact: "",
    emergency_phone: ""
  })

  // Data state
  const [services, setServices] = useState<Service[]>([])
  const [locations, setLocations] = useState<any[]>([])
  const [bookings, setBookings] = useState<BookingWithDetails[]>([])
  const [activeBookings, setActiveBookings] = useState<BookingWithDetails[]>([])
  const [bookingHistory, setBookingHistory] = useState<BookingWithDetails[]>([])

  // UI state
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [locationSuggestions, setLocationSuggestions] = useState<string[]>([])
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false)

  // Real-time state
  const [showChatThread, setShowChatThread] = useState(false)
  const [selectedBooking, setSelectedBooking] = useState<BookingWithDetails | null>(null)
  const [chatMessages, setChatMessages] = useState<any[]>([])
  const [newMessage, setNewMessage] = useState("")

  // Emergency state
  const [showEmergencyAlert, setShowEmergencyAlert] = useState(false)

  // Auth form state
  const [authForm, setAuthForm] = useState({
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    phone: ""
  })

  // Initialize app
  useEffect(() => {
    initializeApp()
  }, [])

  const initializeApp = async () => {
    try {
      setIsLoading(true)
      
      // Check if user is logged in
      const { data: currentUser, error: userError } = await AuthAPI.getCurrentUser()
      if (currentUser && !userError) {
        setUser(currentUser)
        setIsLoggedIn(true)
        await loadUserData()
      }

      // Load public data
      await loadServices()
      await loadLocations()
      
    } catch (error) {
      setError('Failed to initialize application')
    } finally {
      setIsLoading(false)
    }
  }

  const loadUserData = async () => {
    if (!user) return

    try {
      const { data: userBookings } = await BookingAPI.getUserBookings()
      if (userBookings) {
        setBookings(userBookings.data)
        setActiveBookings(userBookings.data.filter(b => 
          ['pending', 'accepted', 'en_route', 'arrived', 'in_service'].includes(b.status)
        ))
        setBookingHistory(userBookings.data.filter(b => b.status === 'completed'))
      }
    } catch (error) {
      // Handle error silently
    }
  }

  const loadServices = async () => {
    try {
      const { data, error } = await ServicesAPI.getServices()
      if (data && !error) {
        setServices(data)
      }
    } catch (error) {
      // Handle error silently
    }
  }

  const loadLocations = async () => {
    try {
      const { data, error } = await ServicesAPI.getLocations()
      if (data && !error) {
        setLocations(data)
      }
    } catch (error) {
      // Handle error silently
    }
  }

  // Authentication functions
  const handleLogin = async (email: string, password: string) => {
    try {
      setAuthLoading(true)
      setAuthError("")

      const { data, error } = await AuthAPI.signIn(email, password)
      if (data && !error) {
        setUser(data)
        setIsLoggedIn(true)
        setAuthSuccess("Login successful!")
        await loadUserData()
      } else {
        setAuthError(error || "Login failed")
      }
    } catch (error) {
      setAuthError("Login failed. Please try again.")
    } finally {
      setAuthLoading(false)
    }
  }

  const handleRegister = async (formData: any) => {
    try {
      setAuthLoading(true)
      setAuthError("")

      const { data, error } = await AuthAPI.signUp(
        formData.email,
        formData.password,
        {
          firstName: formData.firstName,
          lastName: formData.lastName,
          phone: formData.phone,
          role: 'client'
        }
      )

      if (data && !error) {
        setUser(data)
        setIsLoggedIn(true)
        setAuthSuccess("Registration successful!")
        await loadUserData()
      } else {
        setAuthError(error || "Registration failed")
      }
    } catch (error) {
      setAuthError("Registration failed. Please try again.")
    } finally {
      setAuthLoading(false)
    }
  }

  const handleLogout = async () => {
    try {
      await AuthAPI.signOut()
      setUser(null)
      setIsLoggedIn(false)
      setBookings([])
      setActiveBookings([])
      setBookingHistory([])
      setAuthSuccess("Logged out successfully!")
    } catch (error) {
      // Handle error silently
    }
  }

  // Booking functions
  const handleCreateBooking = async () => {
    if (!selectedService || !user) return

    try {
      setIsLoading(true)
      setError("")

      const { data, error } = await BookingAPI.createBooking({
        service_id: selectedService.id,
        service_type: bookingData.service_type,
        protector_count: bookingData.protector_count,
        protectee_count: bookingData.protectee_count,
        dress_code: bookingData.dress_code,
        duration_hours: bookingData.duration_hours,
        pickup_address: bookingData.pickup_address,
        pickup_coordinates: bookingData.pickup_coordinates,
        destination_address: bookingData.destination_address,
        destination_coordinates: bookingData.destination_coordinates,
        scheduled_date: bookingData.scheduled_date,
        scheduled_time: bookingData.scheduled_time,
        special_instructions: bookingData.special_instructions,
        emergency_contact: bookingData.emergency_contact,
        emergency_phone: bookingData.emergency_phone
      })

      if (data && !error) {
        setSuccess("Booking created successfully!")
        setSelectedService(null)
        await loadUserData()
        setActiveTab("bookings")
      } else {
        setError(error || "Failed to create booking")
      }
    } catch (error) {
      setError("Failed to create booking. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancelBooking = async (bookingId: string) => {
    try {
      const { error } = await BookingAPI.cancelBooking(bookingId)
      if (!error) {
        setSuccess("Booking cancelled successfully!")
        await loadUserData()
      } else {
        setError(error || "Failed to cancel booking")
      }
    } catch (error) {
      setError("Failed to cancel booking. Please try again.")
    }
  }

  // Location functions
  const handleLocationSearch = async (query: string) => {
    if (query.length < 2) return

    try {
      const { data, error } = await ServicesAPI.searchLocations(query)
      if (data && !error) {
        setLocationSuggestions(data.map(loc => loc.address))
        setShowLocationSuggestions(true)
      }
    } catch (error) {
      // Handle error silently
    }
  }

  const handleLocationSelect = (address: string) => {
    setBookingData(prev => ({ ...prev, pickup_address: address }))
    setShowLocationSuggestions(false)
    
    const location = locations.find(loc => loc.address === address)
    if (location) {
      setBookingData(prev => ({
        ...prev,
        pickup_coordinates: { x: location.coordinates.x, y: location.coordinates.y }
      }))
    }
  }

  // Real-time functions
  const handleSendMessage = async () => {
    if (!selectedBooking || !newMessage.trim()) return

    try {
      const { error } = await RealtimeAPI.sendMessage({
        booking_id: selectedBooking.id,
        recipient_id: selectedBooking.assigned_agent?.id || "",
        content: newMessage,
        message_type: "text"
      })

      if (!error) {
        setNewMessage("")
        await loadChatMessages()
      }
    } catch (error) {
      // Handle error silently
    }
  }

  const loadChatMessages = async () => {
    if (!selectedBooking) return

    try {
      const { data, error } = await RealtimeAPI.getBookingMessages(selectedBooking.id)
      if (data && !error) {
        setChatMessages(data)
      }
    } catch (error) {
      // Handle error silently
    }
  }

  // Emergency functions
  const handleEmergencyAlert = async () => {
    try {
      if (!user) return

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const location = {
            x: position.coords.longitude,
            y: position.coords.latitude
          }

          const { error } = await RealtimeAPI.createEmergencyAlert({
            alert_type: "SOS",
            location,
            address: bookingData.pickup_address,
            description: "Emergency assistance required"
          })

          if (!error) {
            setSuccess("Emergency alert sent! Help is on the way.")
            setShowEmergencyAlert(false)
          } else {
            setError("Failed to send emergency alert")
          }
        },
        (error) => {
          setError("Location access required for emergency alerts")
        }
      )
    } catch (error) {
      setError("Failed to send emergency alert")
    }
  }

  // Get current location
  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            x: position.coords.longitude,
            y: position.coords.latitude
          }
          setBookingData(prev => ({ ...prev, pickup_coordinates: location }))
          setBookingData(prev => ({ 
            ...prev, 
            pickup_address: "Current Location" 
          }))
        },
        (error) => {
          // Handle error silently
        }
      )
    }
  }

  // Render loading state
  if (isLoading && !isLoggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-white">Loading Protector.Ng...</p>
        </div>
      </div>
    )
  }

  // Render login form if not logged in
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20">
            <div className="text-center mb-8">
              <Shield className="h-12 w-12 text-blue-400 mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-white mb-2">Protector.Ng</h1>
              <p className="text-gray-300">Premium Security Services</p>
              <div className="mt-4">
                <Button
                  onClick={() => window.open('/operator', '_blank')}
                  variant="outline"
                  className="border-purple-500/50 text-purple-300 hover:bg-purple-500/20"
                >
                  Operator Dashboard
                </Button>
              </div>
            </div>

            {authError && (
              <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3 mb-4">
                <p className="text-red-200 text-sm">{authError}</p>
              </div>
            )}

            {authSuccess && (
              <div className="bg-green-500/20 border border-green-500/50 rounded-lg p-3 mb-4">
                <p className="text-green-200 text-sm">{authSuccess}</p>
              </div>
            )}

            {isLogin ? (
              <div className="space-y-4">
                <div>
                  <input
                    type="email"
                    placeholder="Email"
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    onChange={(e) => setAuthForm(prev => ({ ...prev, email: e.target.value }))}
                  />
                </div>
                <div>
                  <input
                    type="password"
                    placeholder="Password"
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    onChange={(e) => setAuthForm(prev => ({ ...prev, password: e.target.value }))}
                  />
                </div>
                <Button
                  onClick={() => handleLogin(authForm.email, authForm.password)}
                  disabled={authLoading}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-medium"
                >
                  {authLoading ? "Signing In..." : "Sign In"}
                </Button>
                <p className="text-center text-gray-300">
                  Don't have an account?{" "}
                  <button
                    onClick={() => setIsLogin(false)}
                    className="text-blue-400 hover:text-blue-300"
                  >
                    Sign Up
                  </button>
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <input
                    type="text"
                    placeholder="First Name"
                    className="px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    onChange={(e) => setAuthForm(prev => ({ ...prev, firstName: e.target.value }))}
                  />
                  <input
                    type="text"
                    placeholder="Last Name"
                    className="px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    onChange={(e) => setAuthForm(prev => ({ ...prev, lastName: e.target.value }))}
                  />
                </div>
                <div>
                  <input
                    type="email"
                    placeholder="Email"
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    onChange={(e) => setAuthForm(prev => ({ ...prev, email: e.target.value }))}
                  />
                </div>
                <div>
                  <input
                    type="password"
                    placeholder="Password"
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    onChange={(e) => setAuthForm(prev => ({ ...prev, password: e.target.value }))}
                  />
                </div>
                <div>
                  <input
                    type="tel"
                    placeholder="Phone Number"
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    onChange={(e) => setAuthForm(prev => ({ ...prev, phone: e.target.value }))}
                  />
                </div>
                <Button
                  onClick={() => handleRegister(authForm)}
                  disabled={authLoading}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-medium"
                >
                  {authLoading ? "Creating Account..." : "Create Account"}
                </Button>
                <p className="text-center text-gray-300">
                  Already have an account?{" "}
                  <button
                    onClick={() => setIsLogin(true)}
                    className="text-blue-400 hover:text-blue-300"
                  >
                    Sign In
                  </button>
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Main app interface
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <div className="bg-black/20 backdrop-blur-lg border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Shield className="h-8 w-8 text-blue-400" />
              <h1 className="text-xl font-bold text-white">Protector.Ng</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-white">Welcome, {user?.first_name}</span>
              <Button
                onClick={() => window.open('/operator', '_blank')}
                variant="outline"
                className="border-purple-500/50 text-purple-300 hover:bg-purple-500/20"
              >
                Operator Dashboard
              </Button>
              <Button
                onClick={handleLogout}
                variant="outline"
                className="border-white/20 text-white hover:bg-white/10"
              >
                Logout
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Emergency SOS Button */}
      <div className="fixed top-20 right-4 z-50">
        <Button
          onClick={() => setShowEmergencyAlert(true)}
          className="bg-red-600 hover:bg-red-700 text-white rounded-full w-16 h-16 shadow-lg"
        >
          <AlertTriangle className="h-6 w-6" />
        </Button>
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
            { id: "protector", label: "Protector", icon: Shield },
            { id: "bookings", label: "Bookings", icon: Calendar },
            { id: "operator", label: "Operator", icon: Settings },
            { id: "account", label: "Account", icon: User },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => {
                if (id === "operator") {
                  window.open('/operator', '_blank')
                } else {
                  setActiveTab(id)
                }
              }}
              className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-md transition-colors ${
                activeTab === id
                  ? "bg-blue-600 text-white"
                  : id === "operator"
                  ? "text-purple-300 hover:text-purple-200 hover:bg-purple-500/20"
                  : "text-gray-300 hover:text-white hover:bg-white/10"
              }`}
            >
              <Icon className="h-5 w-5" />
              <span>{label}</span>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === "protector" && (
          <div className="space-y-8">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-white mb-4">Request Security Service</h2>
              <p className="text-gray-300">Choose your protection level and get matched with the best agents</p>
            </div>

            {/* Service Selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {services.map((service) => (
                <div
                  key={service.id}
                  onClick={() => {
                    setSelectedService(service)
                    setBookingData(prev => ({ ...prev, service_type: service.type }))
                  }}
                  className={`p-6 rounded-xl border-2 cursor-pointer transition-all ${
                    selectedService?.id === service.id
                      ? "border-blue-500 bg-blue-500/20"
                      : "border-white/20 bg-white/10 hover:border-white/40"
                  }`}
                >
                  <h3 className="text-xl font-semibold text-white mb-2">{service.name}</h3>
                  <p className="text-gray-300 mb-4">{service.description}</p>
                  <div className="flex justify-between items-center">
                    <span className="text-2xl font-bold text-blue-400">
                      ₦{service.base_price.toLocaleString()}
                    </span>
                    <span className="text-sm text-gray-400">
                      {service.price_per_hour ? `₦${service.price_per_hour}/hr` : "Fixed"}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Booking Form */}
            {selectedService && (
              <div className="bg-white/10 rounded-xl p-6">
                <h3 className="text-xl font-semibold text-white mb-6">Booking Details</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Pickup Location
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={bookingData.pickup_address}
                        onChange={(e) => {
                          setBookingData(prev => ({ ...prev, pickup_address: e.target.value }))
                          handleLocationSearch(e.target.value)
                        }}
                        placeholder="Enter pickup address"
                        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <Button
                        onClick={getCurrentLocation}
                        className="absolute right-2 top-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 text-sm"
                      >
                        <MapPin className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    {showLocationSuggestions && locationSuggestions.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-white/90 backdrop-blur-lg rounded-lg shadow-lg max-h-60 overflow-y-auto">
                        {locationSuggestions.map((suggestion, index) => (
                          <button
                            key={index}
                            onClick={() => handleLocationSelect(suggestion)}
                            className="w-full text-left px-4 py-3 hover:bg-white/20 text-gray-800"
                          >
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Destination (Optional)
                    </label>
                    <input
                      type="text"
                      value={bookingData.destination_address}
                      onChange={(e) => setBookingData(prev => ({ ...prev, destination_address: e.target.value }))}
                      placeholder="Enter destination address"
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Date
                    </label>
                    <input
                      type="date"
                      value={bookingData.scheduled_date}
                      onChange={(e) => setBookingData(prev => ({ ...prev, scheduled_date: e.target.value }))}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Time
                    </label>
                    <input
                      type="time"
                      value={bookingData.scheduled_time}
                      onChange={(e) => setBookingData(prev => ({ ...prev, scheduled_time: e.target.value }))}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Duration (Hours)
                    </label>
                    <select
                      value={bookingData.duration_hours}
                      onChange={(e) => setBookingData(prev => ({ ...prev, duration_hours: parseInt(e.target.value) }))}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value={4}>4 hours</option>
                      <option value={8}>8 hours</option>
                      <option value={12}>12 hours</option>
                      <option value={24}>24 hours</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Dress Code
                    </label>
                    <select
                      value={bookingData.dress_code}
                      onChange={(e) => setBookingData(prev => ({ ...prev, dress_code: e.target.value as any }))}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="business_formal">Business Formal</option>
                      <option value="business_casual">Business Casual</option>
                      <option value="tactical_casual">Tactical Casual</option>
                      <option value="tactical_gear">Tactical Gear</option>
                      <option value="plainclothes">Plainclothes</option>
                    </select>
                  </div>
                </div>

                <div className="mt-6">
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Special Instructions
                  </label>
                  <textarea
                    value={bookingData.special_instructions}
                    onChange={(e) => setBookingData(prev => ({ ...prev, special_instructions: e.target.value }))}
                    placeholder="Any special requirements or instructions..."
                    rows={3}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="mt-6 flex justify-end">
                  <Button
                    onClick={handleCreateBooking}
                    disabled={isLoading || !bookingData.pickup_address || !bookingData.scheduled_date || !bookingData.scheduled_time}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-medium"
                  >
                    {isLoading ? "Creating Booking..." : "Create Booking"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Bookings Tab */}
        {activeTab === "bookings" && (
          <div className="space-y-8">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-white mb-4">Your Bookings</h2>
              <p className="text-gray-300">Manage your security service bookings</p>
            </div>

            {/* Active Bookings */}
            {activeBookings.length > 0 && (
              <div>
                <h3 className="text-xl font-semibold text-white mb-4">Active Bookings</h3>
                <div className="space-y-4">
                  {activeBookings.map((booking) => (
                    <div key={booking.id} className="bg-white/10 rounded-xl p-6">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="text-lg font-semibold text-white">
                            {booking.service?.name}
                          </h4>
                          <p className="text-gray-300">
                            {booking.pickup_address}
                          </p>
                          <p className="text-sm text-gray-400">
                            {booking.scheduled_date} at {booking.scheduled_time}
                          </p>
                          <div className="flex items-center space-x-4 mt-2">
                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                              booking.status === 'pending' ? 'bg-yellow-500/20 text-yellow-300' :
                              booking.status === 'accepted' ? 'bg-blue-500/20 text-blue-300' :
                              booking.status === 'en_route' ? 'bg-purple-500/20 text-purple-300' :
                              booking.status === 'arrived' ? 'bg-green-500/20 text-green-300' :
                              'bg-gray-500/20 text-gray-300'
                            }`}>
                              {booking.status.replace('_', ' ').toUpperCase()}
                            </span>
                            <span className="text-blue-400 font-semibold">
                              ₦{booking.total_price.toLocaleString()}
                            </span>
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <Button
                            onClick={() => {
                              setSelectedBooking(booking)
                              setShowChatThread(true)
                              loadChatMessages()
                            }}
                            variant="outline"
                            className="border-white/20 text-white hover:bg-white/10"
                          >
                            Chat
                          </Button>
                          {booking.status === 'pending' && (
                            <Button
                              onClick={() => handleCancelBooking(booking.id)}
                              variant="outline"
                              className="border-red-500/50 text-red-300 hover:bg-red-500/20"
                            >
                              Cancel
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Booking History */}
            {bookingHistory.length > 0 && (
              <div>
                <h3 className="text-xl font-semibold text-white mb-4">Booking History</h3>
                <div className="space-y-4">
                  {bookingHistory.map((booking) => (
                    <div key={booking.id} className="bg-white/10 rounded-xl p-6">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="text-lg font-semibold text-white">
                            {booking.service?.name}
                          </h4>
                          <p className="text-gray-300">
                            {booking.pickup_address}
                          </p>
                          <p className="text-sm text-gray-400">
                            {booking.scheduled_date} at {booking.scheduled_time}
                          </p>
                          <div className="flex items-center space-x-4 mt-2">
                            <span className="px-3 py-1 rounded-full text-sm font-medium bg-green-500/20 text-green-300">
                              COMPLETED
                            </span>
                            <span className="text-blue-400 font-semibold">
                              ₦{booking.total_price.toLocaleString()}
                            </span>
                          </div>
                        </div>
                        <Button
                          onClick={() => {
                            setSelectedBooking(booking)
                            setShowChatThread(true)
                            loadChatMessages()
                          }}
                          variant="outline"
                          className="border-white/20 text-white hover:bg-white/10"
                        >
                          View Details
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeBookings.length === 0 && bookingHistory.length === 0 && (
              <div className="text-center py-12">
                <Calendar className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">No Bookings Yet</h3>
                <p className="text-gray-300 mb-6">Create your first security service booking</p>
                <Button
                  onClick={() => setActiveTab("protector")}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg"
                >
                  Request Service
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Account Tab */}
        {activeTab === "account" && (
          <div className="space-y-8">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-white mb-4">Account Settings</h2>
              <p className="text-gray-300">Manage your profile and preferences</p>
            </div>

            <div className="bg-white/10 rounded-xl p-6">
              <h3 className="text-xl font-semibold text-white mb-6">Profile Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    First Name
                  </label>
                  <input
                    type="text"
                    value={user?.first_name || ""}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white"
                    readOnly
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Last Name
                  </label>
                  <input
                    type="text"
                    value={user?.last_name || ""}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white"
                    readOnly
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={user?.email || ""}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white"
                    readOnly
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={user?.phone || ""}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white"
                    readOnly
                  />
                </div>
              </div>
            </div>

            {/* Operator Dashboard Access */}
            <div className="bg-white/10 rounded-xl p-6">
              <h3 className="text-xl font-semibold text-white mb-6">Operator Access</h3>
              <div className="text-center">
                <p className="text-gray-300 mb-6">
                  Access the operator dashboard to manage bookings, communicate with clients, and handle service requests.
                </p>
                <Button
                  onClick={() => window.open('/operator', '_blank')}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-3 rounded-lg font-medium"
                >
                  Open Operator Dashboard
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Chat Thread Modal */}
      {showChatThread && selectedBooking && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 w-full max-w-md max-h-[80vh] flex flex-col">
            <div className="p-4 border-b border-white/20">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-white">Chat with Agent</h3>
                <Button
                  onClick={() => setShowChatThread(false)}
                  variant="outline"
                  className="border-white/20 text-white hover:bg-white/10"
                >
                  ×
                </Button>
              </div>
            </div>
            <div className="flex-1 p-4 overflow-y-auto">
              <div className="space-y-4">
                {chatMessages.map((message, index) => (
                  <div
                    key={index}
                    className={`flex ${message.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-xs px-4 py-2 rounded-lg ${
                        message.sender_id === user?.id
                          ? 'bg-blue-600 text-white'
                          : 'bg-white/20 text-white'
                      }`}
                    >
                      <p className="text-sm">{message.content}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="p-4 border-t border-white/20">
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim()}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
                >
                  Send
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Emergency Alert Modal */}
      {showEmergencyAlert && (
        <div className="fixed inset-0 bg-red-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-red-900/90 backdrop-blur-lg rounded-xl border border-red-500/50 w-full max-w-md p-6">
            <div className="text-center">
              <AlertTriangle className="h-16 w-16 text-red-400 mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-white mb-4">Emergency Alert</h3>
              <p className="text-red-200 mb-6">
                Are you sure you want to send an emergency alert? This will notify our security team and emergency contacts.
              </p>
              <div className="flex space-x-4">
                <Button
                  onClick={() => setShowEmergencyAlert(false)}
                  variant="outline"
                  className="flex-1 border-white/20 text-white hover:bg-white/10"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleEmergencyAlert}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                >
                  Send Alert
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
