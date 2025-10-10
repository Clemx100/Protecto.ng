'use client'

// Force dynamic rendering to prevent useSearchParams prerendering issues
export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, HelpCircle, Search, ChevronDown, ChevronRight, Book, Shield, Phone, MessageCircle } from 'lucide-react'

export default function HelpCenterPage() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedItems, setExpandedItems] = useState<string[]>([])

  const toggleExpanded = (itemId: string) => {
    setExpandedItems(prev => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    )
  }

  const faqData = [
    {
      id: 'booking',
      title: 'Booking & Services',
      icon: Shield,
      items: [
        {
          id: 'how-to-book',
          question: 'How do I book a protection service?',
          answer: 'To book a protection service, go to the main page and click "Request Protection". Fill in your pickup location, destination, service type, and other details. Our system will process your request and assign security personnel.'
        },
        {
          id: 'service-types',
          question: 'What types of protection services do you offer?',
          answer: 'We offer armed and unarmed protection services, executive protection, event security, and emergency response. Services can be customized based on your specific security needs.'
        },
        {
          id: 'pricing',
          question: 'How is pricing calculated?',
          answer: 'Pricing is based on service type, duration, number of personnel required, and location. Base rates start from ₦25,000 per hour for armed protection. Final pricing is calculated during the booking process.'
        },
        {
          id: 'cancellation',
          question: 'Can I cancel or modify my booking?',
          answer: 'Yes, you can cancel or modify bookings through your account dashboard or by contacting our support team. Cancellation policies vary based on timing and service type.'
        }
      ]
    },
    {
      id: 'account',
      title: 'Account & Profile',
      icon: Book,
      items: [
        {
          id: 'profile-setup',
          question: 'How do I set up my profile?',
          answer: 'Complete your profile by providing accurate personal information, emergency contacts, and preferences. This helps us provide better service and ensures proper identification during protection assignments.'
        },
        {
          id: 'password-reset',
          question: 'How do I reset my password?',
          answer: 'Go to Account Settings > Change Password. You can also reset your password by clicking "Forgot Password" on the login page. A reset link will be sent to your registered email.'
        },
        {
          id: 'update-info',
          question: 'How do I update my personal information?',
          answer: 'Navigate to your Account settings to update personal information, contact details, and emergency contacts. Changes are reflected immediately in your profile.'
        }
      ]
    },
    {
      id: 'safety',
      title: 'Safety & Security',
      icon: Shield,
      items: [
        {
          id: 'emergency-procedures',
          question: 'What should I do in an emergency?',
          answer: 'In an emergency, immediately contact your assigned security team using the emergency number provided. Also contact local emergency services (199 for police, 199 for emergency). Our team is trained in emergency response procedures.'
        },
        {
          id: 'security-verification',
          question: 'How do I verify security personnel identity?',
          answer: 'All our security personnel carry official identification cards with photo, name, and unique ID number. You can verify their identity through our mobile app or by calling our verification hotline.'
        },
        {
          id: 'safety-tips',
          question: 'What safety tips should I follow?',
          answer: 'Always confirm your booking details, verify security personnel identity, maintain communication with your security team, and follow their professional guidance during protection assignments.'
        }
      ]
    },
    {
      id: 'technical',
      title: 'Technical Support',
      icon: MessageCircle,
      items: [
        {
          id: 'app-issues',
          question: 'The app is not working properly. What should I do?',
          answer: 'Try restarting the app, checking your internet connection, and updating to the latest version. If issues persist, contact our technical support team for assistance.'
        },
        {
          id: 'location-services',
          question: 'Why do you need access to my location?',
          answer: 'Location access is required for accurate pickup and drop-off coordination, emergency response, and real-time tracking during protection assignments. Your location data is encrypted and securely stored.'
        },
        {
          id: 'notifications',
          question: 'I\'m not receiving notifications. How can I fix this?',
          answer: 'Check your device notification settings, ensure the app has notification permissions, and verify your notification preferences in Account Settings > Notification Preferences.'
        }
      ]
    }
  ]

  const filteredFAQs = faqData.map(category => ({
    ...category,
    items: category.items.filter(item =>
      item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.answer.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(category => category.items.length > 0)

  const quickActions = [
    {
      title: 'Contact Support',
      description: 'Get immediate help from our support team',
      icon: Phone,
      action: () => router.push('/account/support')
    },
    {
      title: 'Emergency Contact',
      description: '24/7 emergency response hotline',
      icon: Shield,
      action: () => window.open('tel:+2347120005328')
    },
    {
      title: 'Live Chat',
      description: 'Chat with our support agents',
      icon: MessageCircle,
      action: () => router.push('/account/support')
    }
  ]

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
          <HelpCircle className="h-5 w-5 text-blue-400" />
          <h1 className="text-lg font-semibold">Help Center</h1>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 p-4 space-y-4 overflow-y-auto pb-20">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search help articles..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-gray-400"
          />
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 gap-4">
          <h2 className="text-lg font-semibold text-white">Quick Actions</h2>
          {quickActions.map((action, index) => (
            <button
              key={index}
              onClick={action.action}
              className="flex items-center space-x-4 p-4 bg-gray-800 hover:bg-gray-700 rounded-lg border border-gray-700 transition-colors"
            >
              <action.icon className="h-6 w-6 text-blue-400" />
              <div className="text-left">
                <h3 className="font-medium text-white">{action.title}</h3>
                <p className="text-sm text-gray-400">{action.description}</p>
              </div>
            </button>
          ))}
        </div>

        {/* FAQ Sections */}
        <div className="space-y-6">
          <h2 className="text-lg font-semibold text-white">Frequently Asked Questions</h2>
          
          {filteredFAQs.map((category) => (
            <div key={category.id} className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
              <div className="flex items-center space-x-3 p-4 bg-gray-700">
                <category.icon className="h-5 w-5 text-blue-400" />
                <h3 className="font-semibold text-white">{category.title}</h3>
              </div>
              
              <div className="divide-y divide-gray-700">
                {category.items.map((item) => (
                  <div key={item.id} className="p-4">
                    <button
                      onClick={() => toggleExpanded(item.id)}
                      className="w-full flex items-center justify-between text-left"
                    >
                      <span className="font-medium text-white pr-4">{item.question}</span>
                      {expandedItems.includes(item.id) ? (
                        <ChevronDown className="h-5 w-5 text-gray-400 flex-shrink-0" />
                      ) : (
                        <ChevronRight className="h-5 w-5 text-gray-400 flex-shrink-0" />
                      )}
                    </button>
                    
                    {expandedItems.includes(item.id) && (
                      <div className="mt-3 pt-3 border-t border-gray-700">
                        <p className="text-gray-300 leading-relaxed">{item.answer}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* No Results */}
        {searchQuery && filteredFAQs.length === 0 && (
          <div className="text-center py-8">
            <HelpCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">No results found</h3>
            <p className="text-gray-400 mb-4">Try searching with different keywords or contact our support team.</p>
            <button
              onClick={() => router.push('/account/support')}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
            >
              Contact Support
            </button>
          </div>
        )}

        {/* Contact Information */}
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4">Still need help?</h3>
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <Phone className="h-5 w-5 text-green-400" />
              <div>
                <p className="text-white font-medium">Emergency Hotline</p>
                <p className="text-gray-400">+234 712 000 5328</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <MessageCircle className="h-5 w-5 text-blue-400" />
              <div>
                <p className="text-white font-medium">Support Email</p>
                <p className="text-gray-400">support@protector.ng</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Shield className="h-5 w-5 text-purple-400" />
              <div>
                <p className="text-white font-medium">Available 24/7</p>
                <p className="text-gray-400">Round-the-clock support for your security needs</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
