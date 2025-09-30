'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Eye, Shield, Database, Users, Download, Trash2 } from 'lucide-react'

export default function PrivacyPage() {
  const router = useRouter()
  const [privacySettings, setPrivacySettings] = useState({
    profileVisibility: {
      showToOperators: true,
      showToOtherClients: false,
      allowContactSharing: false
    },
    dataCollection: {
      analyticsTracking: true,
      crashReporting: true,
      usageStatistics: false,
      locationTracking: true
    },
    communication: {
      allowMarketingEmails: false,
      allowMarketingSMS: false,
      allowThirdPartySharing: false,
      allowDataProcessing: true
    }
  })
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState<'success' | 'error' | ''>('')

  const handleToggle = (category: keyof typeof privacySettings, setting: string) => {
    setPrivacySettings(prev => ({
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
      
      setMessage('Privacy settings saved successfully!')
      setMessageType('success')
      
      setTimeout(() => {
        setMessage('')
      }, 3000)
    } catch (error) {
      setMessage('Failed to save settings. Please try again.')
      setMessageType('error')
      
      setTimeout(() => {
        setMessage('')
      }, 3000)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDownloadData = async () => {
    setIsLoading(true)
    setMessage('')

    try {
      // Simulate data download
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      setMessage('Your data has been prepared for download. Check your email for the download link.')
      setMessageType('success')
      
      setTimeout(() => {
        setMessage('')
      }, 5000)
    } catch (error) {
      setMessage('Failed to prepare data download. Please try again.')
      setMessageType('error')
      
      setTimeout(() => {
        setMessage('')
      }, 3000)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteAccount = async () => {
    const confirmed = window.confirm(
      'Are you sure you want to delete your account? This action cannot be undone and will permanently remove all your data.'
    )
    
    if (!confirmed) return

    setIsLoading(true)
    setMessage('')

    try {
      // Simulate account deletion
      await new Promise(resolve => setTimeout(resolve, 3000))
      
      setMessage('Account deletion initiated. You will receive a confirmation email within 24 hours.')
      setMessageType('success')
      
      setTimeout(() => {
        router.push('/')
      }, 3000)
    } catch (error) {
      setMessage('Failed to delete account. Please contact support.')
      setMessageType('error')
      
      setTimeout(() => {
        setMessage('')
      }, 3000)
    } finally {
      setIsLoading(false)
    }
  }

  const PrivacySection = ({ 
    title, 
    icon: Icon, 
    category, 
    settings 
  }: {
    title: string
    icon: any
    category: keyof typeof privacySettings
    settings: { key: string; label: string; description: string }[]
  }) => (
    <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
      <div className="flex items-center space-x-3 mb-4">
        <Icon className="h-6 w-6 text-purple-400" />
        <h3 className="text-lg font-semibold text-white">{title}</h3>
      </div>
      
      <div className="space-y-4">
        {settings.map((setting) => (
          <div key={setting.key} className="flex items-start justify-between">
            <div className="flex-1">
              <span className="text-white font-medium block mb-1">{setting.label}</span>
              <p className="text-sm text-gray-400">{setting.description}</p>
            </div>
            
            <button
              onClick={() => handleToggle(category, setting.key)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                privacySettings[category][setting.key as keyof typeof privacySettings[typeof category]]
                  ? 'bg-purple-600'
                  : 'bg-gray-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  privacySettings[category][setting.key as keyof typeof privacySettings[typeof category]]
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
          <Eye className="h-5 w-5 text-purple-400" />
          <h1 className="text-lg font-semibold">Privacy Settings</h1>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 p-4 space-y-4 overflow-y-auto pb-20">
        {/* Profile Visibility */}
        <PrivacySection
          title="Profile Visibility"
          icon={Users}
          category="profileVisibility"
          settings={[
            {
              key: 'showToOperators',
              label: 'Show to Operators',
              description: 'Allow security operators to see your profile information during active bookings'
            },
            {
              key: 'showToOtherClients',
              label: 'Show to Other Clients',
              description: 'Allow other clients to see your profile in shared protection scenarios'
            },
            {
              key: 'allowContactSharing',
              label: 'Allow Contact Sharing',
              description: 'Permit sharing of contact information with assigned security personnel'
            }
          ]}
        />

        {/* Data Collection */}
        <PrivacySection
          title="Data Collection"
          icon={Database}
          category="dataCollection"
          settings={[
            {
              key: 'analyticsTracking',
              label: 'Analytics Tracking',
              description: 'Allow collection of usage analytics to improve our services'
            },
            {
              key: 'crashReporting',
              label: 'Crash Reporting',
              description: 'Send crash reports to help us fix technical issues'
            },
            {
              key: 'usageStatistics',
              label: 'Usage Statistics',
              description: 'Share anonymous usage statistics for service improvement'
            },
            {
              key: 'locationTracking',
              label: 'Location Tracking',
              description: 'Allow location tracking for emergency response and service delivery'
            }
          ]}
        />

        {/* Communication */}
        <PrivacySection
          title="Communication & Data Sharing"
          icon={Shield}
          category="communication"
          settings={[
            {
              key: 'allowMarketingEmails',
              label: 'Marketing Emails',
              description: 'Receive promotional emails and service updates'
            },
            {
              key: 'allowMarketingSMS',
              label: 'Marketing SMS',
              description: 'Receive promotional text messages and alerts'
            },
            {
              key: 'allowThirdPartySharing',
              label: 'Third Party Sharing',
              description: 'Allow sharing of data with trusted third-party partners'
            },
            {
              key: 'allowDataProcessing',
              label: 'Data Processing',
              description: 'Allow processing of your data for service improvement and analytics'
            }
          ]}
        />

        {/* Data Management */}
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <div className="flex items-center space-x-3 mb-4">
            <Database className="h-6 w-6 text-blue-400" />
            <h3 className="text-lg font-semibold text-white">Data Management</h3>
          </div>
          
          <div className="space-y-4">
            <button
              onClick={handleDownloadData}
              disabled={isLoading}
              className="w-full flex items-center justify-center space-x-3 p-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
            >
              <Download className="h-5 w-5" />
              <span>Download My Data</span>
            </button>
            
            <button
              onClick={handleDeleteAccount}
              disabled={isLoading}
              className="w-full flex items-center justify-center space-x-3 p-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
            >
              <Trash2 className="h-5 w-5" />
              <span>Delete Account</span>
            </button>
          </div>
        </div>

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
          className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white py-3 px-4 rounded-lg font-medium transition-colors"
        >
          {isLoading ? 'Saving...' : 'Save Privacy Settings'}
        </button>
      </main>
    </div>
  )
}
