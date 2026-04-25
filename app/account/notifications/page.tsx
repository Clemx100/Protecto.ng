'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Bell, Smartphone, Mail, MessageSquare, Shield, AlertTriangle, MapPin } from 'lucide-react'
import {
  registerPushSubscription,
  sendPushTestNotification,
  unregisterPushSubscription,
} from '@/lib/utils/push-subscriptions'

type NotificationState = {
  push: {
    bookingUpdates: boolean
    securityAlerts: boolean
    promotionalOffers: boolean
    emergencyNotifications: boolean
  }
  email: {
    bookingConfirmations: boolean
    securityAlerts: boolean
    promotionalOffers: boolean
    weeklyDigest: boolean
  }
  sms: {
    emergencyAlerts: boolean
    bookingReminders: boolean
    promotionalOffers: boolean
  }
  securityProgram: {
    cityWelcome: boolean
    nearbySafety: boolean
    dailyTips: boolean
    bulletproofEducation: boolean
  }
}

const DEFAULT_NOTIFICATION_STATE: NotificationState = {
  push: {
    bookingUpdates: true,
    securityAlerts: true,
    promotionalOffers: false,
    emergencyNotifications: true,
  },
  email: {
    bookingConfirmations: true,
    securityAlerts: true,
    promotionalOffers: false,
    weeklyDigest: true,
  },
  sms: {
    emergencyAlerts: true,
    bookingReminders: true,
    promotionalOffers: false,
  },
  securityProgram: {
    cityWelcome: true,
    nearbySafety: true,
    dailyTips: true,
    bulletproofEducation: true,
  },
}

function mapApiPreferencesToState(preferences: any): NotificationState {
  return {
    push: {
      ...DEFAULT_NOTIFICATION_STATE.push,
      ...(preferences?.pushSettings || {}),
    },
    email: {
      ...DEFAULT_NOTIFICATION_STATE.email,
      ...(preferences?.emailSettings || {}),
    },
    sms: {
      ...DEFAULT_NOTIFICATION_STATE.sms,
      ...(preferences?.smsSettings || {}),
    },
    securityProgram: {
      cityWelcome: preferences?.cityWelcomeEnabled !== false,
      nearbySafety: preferences?.nearbySafetyEnabled !== false,
      dailyTips: preferences?.dailySecurityTipsEnabled !== false,
      bulletproofEducation: preferences?.bulletproofEducationEnabled !== false,
    },
  }
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationState>(DEFAULT_NOTIFICATION_STATE)
  const [isBootstrapping, setIsBootstrapping] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [isTestingPush, setIsTestingPush] = useState(false)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState<'success' | 'error' | ''>('')

  useEffect(() => {
    const loadPreferences = async () => {
      setIsBootstrapping(true)
      try {
        const response = await fetch('/api/notifications/preferences', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        })

        if (!response.ok) {
          throw new Error('Unable to load notification preferences.')
        }

        const result = await response.json().catch(() => null)
        if (result?.preferences) {
          setNotifications(mapApiPreferencesToState(result.preferences))
        }
      } catch (error: any) {
        setMessage(error?.message || 'Failed to load preferences. Default settings are being used.')
        setMessageType('error')
      } finally {
        setIsBootstrapping(false)
      }
    }

    void loadPreferences()
  }, [])

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
      const response = await fetch('/api/notifications/preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pushSettings: notifications.push,
          emailSettings: notifications.email,
          smsSettings: notifications.sms,
          cityWelcomeEnabled: notifications.securityProgram.cityWelcome,
          nearbySafetyEnabled: notifications.securityProgram.nearbySafety,
          dailySecurityTipsEnabled: notifications.securityProgram.dailyTips,
          bulletproofEducationEnabled: notifications.securityProgram.bulletproofEducation,
        }),
      })

      const result = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(result?.error || 'Failed to save preferences. Please try again.')
      }

      if (result?.preferences) {
        setNotifications(mapApiPreferencesToState(result.preferences))
      }

      if (notifications.push.securityAlerts) {
        const pushRegistrationResult = await registerPushSubscription()
        if (!pushRegistrationResult.ok) {
          console.warn(
            'Push subscription registration skipped:',
            'reason' in pushRegistrationResult ? pushRegistrationResult.reason : 'unknown_reason',
          )
        }
      } else {
        const unsubscribeResult = await unregisterPushSubscription()
        if (!unsubscribeResult.ok) {
          console.warn('Push unsubscribe skipped:', unsubscribeResult.reason)
        }
      }

      setMessage(result?.message || 'Notification preferences saved successfully!')
      setMessageType('success')

      setTimeout(() => {
        setMessage('')
      }, 3000)
    } catch (error: any) {
      setMessage(error?.message || 'Failed to save preferences. Please try again.')
      setMessageType('error')

      setTimeout(() => {
        setMessage('')
      }, 3000)
    } finally {
      setIsLoading(false)
    }
  }

  const handlePushTest = async () => {
    setIsTestingPush(true)
    setMessage('')
    try {
      const result = await sendPushTestNotification()
      if (!result.ok) {
        throw new Error(result.reason || 'Unable to send push test notification.')
      }

      setMessage('Push test sent. Check your device notification tray.')
      setMessageType('success')
    } catch (error: any) {
      setMessage(error?.message || 'Push test failed. Confirm permission is granted and push is configured.')
      setMessageType('error')
    } finally {
      setIsTestingPush(false)
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
    <div className="w-full max-w-md mx-auto bg-black min-h-screen flex flex-col text-white page-transition">
      {/* Header */}
      <div className="bg-black border-b border-gray-800 p-4">
        <div className="flex items-center space-x-3">
          <Link 
            href="/app?tab=account"
            prefetch={true}
            className="p-2 hover:bg-gray-800 rounded-lg transition-all duration-200 active:scale-95"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
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

        {/* Security Program Notifications */}
        <NotificationSection
          title="Security Program Alerts"
          icon={Shield}
          category="securityProgram"
          settings={[
            {
              key: 'cityWelcome',
              label: 'City Welcome Alerts',
              description: 'Welcome and guidance alerts when you enter supported cities',
              icon: MapPin
            },
            {
              key: 'nearbySafety',
              label: 'Nearby Safety Locations',
              description: 'Show nearby police station/checkpoint guidance in alerts',
              icon: AlertTriangle
            },
            {
              key: 'dailyTips',
              label: 'Daily Security Tips',
              description: 'Receive one security awareness tip each day',
              icon: Bell
            },
            {
              key: 'bulletproofEducation',
              label: 'Bulletproof Vehicle Awareness',
              description: 'Include educational tips on armored vehicle use-cases',
              icon: Shield
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

        {isBootstrapping && (
          <div className="text-sm text-blue-300 bg-blue-900/20 border border-blue-500 rounded-lg px-4 py-3">
            Loading your notification preferences...
          </div>
        )}

        {/* Save Button */}
        <button
          onClick={handleSave}
          disabled={isLoading || isBootstrapping}
          className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white py-3 px-4 rounded-lg font-medium transition-colors"
        >
          {isLoading ? 'Saving...' : isBootstrapping ? 'Loading...' : 'Save Preferences'}
        </button>

        <button
          onClick={handlePushTest}
          disabled={isTestingPush || isBootstrapping}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white py-3 px-4 rounded-lg font-medium transition-colors"
        >
          {isTestingPush ? 'Sending Test...' : 'Send Push Test'}
        </button>
      </main>
    </div>
  )
}
