'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Shield, 
  Calendar, 
  User, 
  Lock, 
  Bell, 
  Eye, 
  HelpCircle, 
  MessageCircle, 
  FileText,
  ChevronRight,
  ArrowLeft,
  Mail,
  Phone,
  Edit,
  LogOut
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function AccountPage() {
  const router = useRouter()
  const supabase = createClient()
  const [activeTab, setActiveTab] = useState('account')
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editLoading, setEditLoading] = useState(false)
  const [editForm, setEditForm] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    email: ''
  })

  useEffect(() => {
    const getUser = async () => {
      try {
        // Check for cached user data first
        const cachedUser = localStorage.getItem('user')
        if (cachedUser) {
          const userData = JSON.parse(cachedUser)
          console.log('Using cached user data:', userData)
          setUser(userData)
          
          // Set profile from cached data immediately
          const cachedProfile = {
            id: userData.id,
            first_name: userData.user_metadata?.first_name || userData.user_metadata?.firstName || 'User',
            last_name: userData.user_metadata?.last_name || userData.user_metadata?.lastName || '',
            phone: userData.user_metadata?.phone || '',
            email: userData.email
          }
          console.log('Setting cached profile:', cachedProfile)
          setProfile(cachedProfile)
          setLoading(false)
        }
        
        // Then verify with server in background
        const { data: { user }, error } = await supabase.auth.getUser()
        if (error || !user) {
          router.push('/client') // Redirect to login if not authenticated
          return
        }
        
        console.log('Fresh user data from server:', user)
        console.log('User metadata:', user.user_metadata)
        console.log('User email:', user.email)
        
        // Update with fresh data
        setUser(user)
        localStorage.setItem('user', JSON.stringify(user))
        
        // Get user profile from profiles table
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()
        
        if (profileError) {
          console.log('Profile not found, using user data:', profileError.message)
          // If no profile exists, create a basic one from user data
          const fallbackProfile = {
            id: user.id,
            first_name: user.user_metadata?.first_name || user.user_metadata?.firstName || 'User',
            last_name: user.user_metadata?.last_name || user.user_metadata?.lastName || '',
            phone: user.user_metadata?.phone || '',
            email: user.email
          }
          console.log('Setting fallback profile:', fallbackProfile)
          setProfile(fallbackProfile)
        } else {
          console.log('Profile found:', profile)
          // Ensure profile has name data, fallback to user metadata if needed
          const enhancedProfile = {
            ...profile,
            first_name: profile.first_name || user.user_metadata?.first_name || user.user_metadata?.firstName || 'User',
            last_name: profile.last_name || user.user_metadata?.last_name || user.user_metadata?.lastName || '',
            phone: profile.phone || user.user_metadata?.phone || '',
            email: profile.email || user.email
          }
          console.log('Enhanced profile:', enhancedProfile)
          setProfile(enhancedProfile)
        }
        
        // If we still don't have a proper name, try to get it from the bookings table
        const currentProfile = profile || {
          id: user.id,
          first_name: user.user_metadata?.first_name || user.user_metadata?.firstName || 'User',
          last_name: user.user_metadata?.last_name || user.user_metadata?.lastName || '',
          phone: user.user_metadata?.phone || '',
          email: user.email
        }
        
        if (!currentProfile.first_name || currentProfile.first_name === 'User') {
          console.log('No proper name found, checking bookings table...')
          try {
            const { data: bookingData } = await supabase
              .from('bookings')
              .select('client:profiles!bookings_client_id_fkey(first_name, last_name)')
              .eq('client_id', user.id)
              .limit(1)
              .single()
            
            if (bookingData?.client && Array.isArray(bookingData.client) && bookingData.client.length > 0) {
              console.log('Found client data in bookings:', bookingData.client)
              const clientData = bookingData.client[0]
              const clientProfile = {
                id: user.id,
                first_name: clientData.first_name || 'User',
                last_name: clientData.last_name || '',
                phone: user.user_metadata?.phone || '',
                email: user.email
              }
              console.log('Setting client profile from bookings:', clientProfile)
              setProfile(clientProfile)
            }
          } catch (bookingError) {
            console.log('No booking data found:', bookingError)
          }
        }
      } catch (error) {
        console.error('Error getting user:', error)
        router.push('/client')
      } finally {
        setLoading(false)
      }
    }

    getUser()
  }, [router, supabase])

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) {
        console.error('Error logging out:', error.message)
      } else {
        // Clear localStorage and redirect to login
        localStorage.clear()
        router.push('/client')
      }
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  const handleEditProfile = () => {
    if (profile) {
      setEditForm({
        first_name: profile.first_name || '',
        last_name: profile.last_name || '',
        phone: profile.phone || '',
        email: profile.email || ''
      })
      setShowEditModal(true)
    }
  }

  const handleSaveProfile = async () => {
    setEditLoading(true)
    try {
      // Update user email in Supabase auth if it changed
      if (editForm.email !== profile.email) {
        const { error: emailError } = await supabase.auth.updateUser({
          email: editForm.email
        })
        if (emailError) {
          console.error('Error updating email:', emailError.message)
          alert('Error updating email: ' + emailError.message)
          setEditLoading(false)
          return
        }
      }

      // Update profile in profiles table
      const { data, error } = await supabase
        .from('profiles')
        .update({
          first_name: editForm.first_name,
          last_name: editForm.last_name,
          phone: editForm.phone,
          email: editForm.email
        })
        .eq('id', user.id)
        .select()
        .single()

      if (error) {
        console.error('Error updating profile:', error.message)
        alert('Error updating profile: ' + error.message)
      } else {
        setProfile(data)
        setShowEditModal(false)
        alert('Profile updated successfully!')
      }
    } catch (error) {
      console.error('Profile update error:', error)
      alert('Error updating profile')
    } finally {
      setEditLoading(false)
    }
  }

  const handleCancelEdit = () => {
    setShowEditModal(false)
    setEditForm({
      first_name: '',
      last_name: '',
      phone: '',
      email: ''
    })
  }

  const handleNavigation = (tab: string) => {
    setActiveTab(tab)
    if (tab === 'protector') {
      router.push('/')
    } else if (tab === 'bookings') {
      router.push('/client')
    }
  }

  const handleAccountAction = (action: string) => {
    switch (action) {
      case 'change-password':
        router.push('/account/change-password')
        break
      case 'notification-preferences':
        router.push('/account/notifications')
        break
      case 'privacy-settings':
        router.push('/account/privacy')
        break
      case 'help-center':
        router.push('/account/help')
        break
      case 'contact-support':
        router.push('/account/support')
        break
      case 'terms-of-service':
        router.push('/account/terms')
        break
      default:
        console.log('Action not implemented:', action)
    }
  }

  // Remove the separate loading screen - show content immediately

  return (
    <div className="w-full max-w-md mx-auto bg-black min-h-screen flex flex-col text-white">
      {/* Header */}
      <div className="bg-black border-b border-gray-800 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Shield className="h-6 w-6 text-blue-400" />
            <h1 className="text-lg font-bold">Protector.ng</h1>
          </div>
          <button 
            onClick={() => router.push('/')}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 p-4 space-y-4 overflow-y-auto pb-20">
        {/* User Profile Section */}
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-white">Profile</h2>
            {profile && (
              <button 
                onClick={handleEditProfile}
                className="p-1 hover:bg-gray-700 rounded-lg transition-colors"
              >
                <Edit className="h-4 w-4 text-gray-400" />
              </button>
            )}
          </div>
          
          {loading ? (
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gray-700 rounded-full flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              </div>
              <div className="flex-1">
                <div className="h-4 bg-gray-700 rounded animate-pulse mb-2" />
                <div className="h-3 bg-gray-700 rounded animate-pulse w-16" />
              </div>
            </div>
          ) : profile ? (
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
                  <User className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-white font-medium">
                    {profile.first_name && profile.last_name 
                      ? `${profile.first_name} ${profile.last_name}`
                      : profile.first_name || profile.last_name || 'User'
                    }
                  </h3>
                  <p className="text-gray-400 text-sm">Client</p>
                </div>
              </div>
              
              <div className="space-y-2 pt-2 border-t border-gray-700">
                <div className="flex items-center space-x-3">
                  <Mail className="h-4 w-4 text-gray-400" />
                  <span className="text-white text-sm">{profile.email}</span>
                </div>
                {profile.phone && (
                  <div className="flex items-center space-x-3">
                    <Phone className="h-4 w-4 text-gray-400" />
                    <span className="text-white text-sm">{profile.phone}</span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-gray-400 text-sm">Unable to load profile</p>
            </div>
          )}
        </div>
        {/* Account Settings Section */}
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
          <h2 className="text-base font-semibold mb-3 text-white">Account Settings</h2>
          
          <div className="space-y-2">
            <button
              onClick={() => handleAccountAction('change-password')}
              className="w-full flex items-center justify-between p-3 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors group"
            >
              <div className="flex items-center space-x-3">
                <Lock className="h-4 w-4 text-gray-400 group-hover:text-blue-400" />
                <span className="text-white text-sm">Change Password</span>
              </div>
              <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-white" />
            </button>

            <button
              onClick={() => handleAccountAction('notification-preferences')}
              className="w-full flex items-center justify-between p-3 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors group"
            >
              <div className="flex items-center space-x-3">
                <Bell className="h-4 w-4 text-gray-400 group-hover:text-green-400" />
                <span className="text-white text-sm">Notification Preferences</span>
              </div>
              <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-white" />
            </button>

            <button
              onClick={() => handleAccountAction('privacy-settings')}
              className="w-full flex items-center justify-between p-3 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors group"
            >
              <div className="flex items-center space-x-3">
                <Eye className="h-4 w-4 text-gray-400 group-hover:text-purple-400" />
                <span className="text-white text-sm">Privacy Settings</span>
              </div>
              <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-white" />
            </button>
          </div>
        </div>

        {/* Support Section */}
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
          <h2 className="text-base font-semibold mb-3 text-white">Support</h2>
          
          <div className="space-y-2">
            <button
              onClick={() => handleAccountAction('help-center')}
              className="w-full flex items-center justify-between p-3 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors group"
            >
              <div className="flex items-center space-x-3">
                <HelpCircle className="h-4 w-4 text-gray-400 group-hover:text-blue-400" />
                <span className="text-white text-sm">Help Center</span>
              </div>
              <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-white" />
            </button>

            <button
              onClick={() => handleAccountAction('contact-support')}
              className="w-full flex items-center justify-between p-3 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors group"
            >
              <div className="flex items-center space-x-3">
                <MessageCircle className="h-4 w-4 text-gray-400 group-hover:text-green-400" />
                <span className="text-white text-sm">Contact Support</span>
              </div>
              <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-white" />
            </button>

            <button
              onClick={() => handleAccountAction('terms-of-service')}
              className="w-full flex items-center justify-between p-3 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors group"
            >
              <div className="flex items-center space-x-3">
                <FileText className="h-4 w-4 text-gray-400 group-hover:text-yellow-400" />
                <span className="text-white text-sm">Terms of Service</span>
              </div>
              <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-white" />
            </button>
          </div>
        </div>

        {/* Logout Section */}
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center space-x-3 p-3 bg-red-600 hover:bg-red-700 rounded-lg transition-colors group"
          >
            <LogOut className="h-4 w-4 text-white" />
            <span className="text-white font-medium">Logout</span>
          </button>
        </div>
      </main>

      {/* Bottom Navigation */}
      <footer className="fixed bottom-0 left-0 right-0 w-full max-w-md mx-auto bg-black text-white p-4 z-50 border-t border-gray-800">
        <div className="flex items-center justify-between">
          <button
            onClick={() => handleNavigation('protector')}
            className={`flex flex-col items-center justify-center gap-1 ${
              activeTab === 'protector' ? 'text-blue-500' : 'text-gray-400'
            }`}
          >
            <Shield className="h-5 w-5" />
            <span className="text-xs">Protector</span>
          </button>
          
          <button
            onClick={() => handleNavigation('bookings')}
            className={`flex flex-col items-center justify-center gap-1 ${
              activeTab === 'bookings' ? 'text-blue-500' : 'text-gray-400'
            }`}
          >
            <Calendar className="h-5 w-5" />
            <span className="text-xs">Bookings</span>
          </button>
          
          <button
            onClick={() => handleNavigation('account')}
            className={`flex flex-col items-center justify-center gap-1 ${
              activeTab === 'account' ? 'text-blue-500' : 'text-gray-400'
            }`}
          >
            <User className="h-5 w-5" />
            <span className="text-xs">Account</span>
          </button>
        </div>
      </footer>

      {/* Edit Profile Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl p-6 w-full max-w-md border border-gray-700">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-white">Edit Profile</h2>
              <button
                onClick={handleCancelEdit}
                className="p-1 hover:bg-gray-700 rounded-lg transition-colors"
              >
                <ArrowLeft className="h-5 w-5 text-gray-400" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  First Name
                </label>
                <input
                  type="text"
                  value={editForm.first_name}
                  onChange={(e) => setEditForm({...editForm, first_name: e.target.value})}
                  className="w-full p-3 rounded-lg bg-gray-700 border border-gray-600 text-white focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter first name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Last Name
                </label>
                <input
                  type="text"
                  value={editForm.last_name}
                  onChange={(e) => setEditForm({...editForm, last_name: e.target.value})}
                  className="w-full p-3 rounded-lg bg-gray-700 border border-gray-600 text-white focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter last name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({...editForm, email: e.target.value})}
                  className="w-full p-3 rounded-lg bg-gray-700 border border-gray-600 text-white focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter email"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Phone
                </label>
                <input
                  type="tel"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({...editForm, phone: e.target.value})}
                  className="w-full p-3 rounded-lg bg-gray-700 border border-gray-600 text-white focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter phone number"
                />
              </div>
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                onClick={handleCancelEdit}
                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-3 px-4 rounded-lg font-medium transition-colors"
                disabled={editLoading}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveProfile}
                disabled={editLoading}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center"
              >
                {editLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
