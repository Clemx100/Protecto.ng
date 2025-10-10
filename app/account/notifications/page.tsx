'use client'

// Force dynamic rendering to prevent useSearchParams prerendering issues
export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Bell, Smartphone, Mail, MessageSquare, Shield, AlertTriangle } from 'lucide-react'

export default function NotificationsPage() {
  const router = useRouter()
  const [notifications, setNotifications] = useState({
    push: {
      bookingUpdates: true,
      securityAlerts: true,
      promotionalOffers: false,
      emergencyNotifications: true
    },
    email: {
      bookingConfirmations: true,
      securityAlerts: true,
      promotionalOffers: false,
      weeklyDigest: true
    },
    sms: {
      emergencyAlerts: true,
      bookingReminders: true,
      promotionalOffers: false
    }
  })
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState<'success' | 'error' | ''>('')

  const handleToggle = (category: keyof typeof notifications, setting: string) => {
    setNotifications(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [setting]: !prev[category][setting as keyof typeof prev[typeof category]]
      }
    }))
  }

  const handleSave = async () => {
    setIsLoading(true)
    setMessage('')

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      setMessage('Notification preferences saved successfully!')
      setMessageType('success')
      
      setTimeout(() => {
        setMessage('')
      }, 3000)
    } catch (error) {
      setMessage('Failed to save preferences. Please try again.')
      setMessageType('error')
      
      setTimeout(() => {
        setMessage('')
      }, 3000)
    } finally {
      setIsLoading(false)
    }
  }

  const NotificationSection = ({ 
    title, 
    icon: Icon, 
    category, 
    settings 
  }: {
    title: string
    icon: any
    category: keyof typeof notifications
    settings: { key: string; label: string; description: string; icon?: any }[]
  }) => (
    <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
      <div className="flex items-center space-x-3 mb-4">
        <Icon className="h-6 w-6 text-blue-400" />
        <h3 className="text-lg font-semibold text-white">{title}</h3>
      </div>
      
      <div className="space-y-4">
        {settings.map((setting) => (
          <div key={setting.key} className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-1">
                {setting.icon && <setting.icon className="h-4 w-4 text-gray-400" />}
                <span className="text-white font-medium">{setting.label}</span>
              </div>
              <p className="text-sm text-gray-400">{setting.description}</p>
            </div>
            
            <button
              onClick={() => handleToggle(category, setting.key)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                notifications[category][setting.key as keyof typeof notifications[typeof category]]
                  ? 'bg-blue-600'
                  : 'bg-gray-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  notifications[category][setting.key as keyof typeof notifications[typeof category]]
                    ? 'translate-x-6'
                    : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        ))}
      </div>
    </div>
  )

  return (
    <div className="w-full max-w-md mx-auto bg-black min-h-screen flex flex-col text-white">
      {/* Header */}
      <div className="bg-black border-b border-gray-800 p-4">
        <div className="flex items-center space-x-3">
          <button 
            onClick={() => router.push('/account')}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <Bell className="h-5 w-5 text-green-400" />
          <h1 className="text-lg font-semibold">Notification Preferences</h1>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 p-4 space-y-4 overflow-y-auto pb-20">
        {/* Push Notifications */}
        <NotificationSection
          title="Push Notifications"
          icon={Smartphone}
          category="push"
          settings={[
            {
              key: 'bookingUpdates',
              label: 'Booking Updates',
              description: 'Get notified when your booking status changes',
              icon: Shield
            },
            {
              key: 'securityAlerts',
              label: 'Security Alerts',
              description: 'Important security notifications and updates',
              icon: AlertTriangle
            },
            {
              key: 'promotionalOffers',
              label: 'Promotional Offers',
              description: 'Special deals and promotional content',
              icon: Bell
            },
            {
              key: 'emergencyNotifications',
              label: 'Emergency Notifications',
              description: 'Critical alerts and emergency updates',
              icon: AlertTriangle
            }
          ]}
        />

        {/* Email Notifications */}
        <NotificationSection
          title="Email Notifications"
          icon={Mail}
          category="email"
          settings={[
            {
              key: 'bookingConfirmations',
              label: 'Booking Confirmations',
              description: 'Receive email confirmations for your bookings',
              icon: Shield
            },
            {
              key: 'securityAlerts',
              label: 'Security Alerts',
              description: 'Important security notifications via email',
              icon: AlertTriangle
            },
            {
              key: 'promotionalOffers',
              label: 'Promotional Offers',
              description: 'Marketing emails and special offers',
              icon: Bell
            },
            {
              key: 'weeklyDigest',
              label: 'Weekly Digest',
              description: 'Weekly summary of your protection services',
              icon: MessageSquare
            }
          ]}
        />

        {/* SMS Notifications */}
        <NotificationSection
          title="SMS Notifications"
          icon={MessageSquare}
          category="sms"
          settings={[
            {
              key: 'emergencyAlerts',
              label: 'Emergency Alerts',
              description: 'Critical emergency notifications via SMS',
              icon: AlertTriangle
            },
            {
              key: 'bookingReminders',
              label: 'Booking Reminders',
              description: 'SMS reminders for upcoming bookings',
              icon: Shield
            },
            {
              key: 'promotionalOffers',
              label: 'Promotional Offers',
              description: 'Special offers and promotions via SMS',
              icon: Bell
            }
          ]}
        />

        {/* Message */}
        {message && (
          <div className={`p-4 rounded-lg ${
            messageType === 'success' 
              ? 'bg-green-900/50 border border-green-500 text-green-400' 
              : 'bg-red-900/50 border border-red-500 text-red-400'
          }`}>
            {message}
          </div>
        )}

        {/* Save Button */}
        <button
          onClick={handleSave}
          disabled={isLoading}
          className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white py-3 px-4 rounded-lg font-medium transition-colors"
        >
          {isLoading ? 'Saving...' : 'Save Preferences'}
        </button>
      </main>
    </div>
  )
}
