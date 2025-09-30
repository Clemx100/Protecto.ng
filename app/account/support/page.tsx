'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, MessageCircle, Phone, Mail, Clock, Send, AlertCircle, CheckCircle } from 'lucide-react'

export default function ContactSupportPage() {
  const router = useRouter()
  const [contactMethod, setContactMethod] = useState<'chat' | 'email' | 'phone'>('chat')
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: '',
    priority: 'medium',
    category: 'general'
  })
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState<'success' | 'error' | ''>('')

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setMessage('')

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      setMessage('Your message has been sent successfully! Our support team will respond within 24 hours.')
      setMessageType('success')
      
      // Reset form
      setFormData({
        name: '',
        email: '',
        phone: '',
        subject: '',
        message: '',
        priority: 'medium',
        category: 'general'
      })
      
      setTimeout(() => {
        setMessage('')
      }, 5000)
    } catch (error) {
      setMessage('Failed to send message. Please try again or contact us directly.')
      setMessageType('error')
      
      setTimeout(() => {
        setMessage('')
      }, 3000)
    } finally {
      setIsLoading(false)
    }
  }

  const contactMethods = [
    {
      id: 'chat' as const,
      title: 'Live Chat',
      description: 'Chat with our support team in real-time',
      icon: MessageCircle,
      availability: 'Available now',
      responseTime: 'Instant',
      color: 'text-green-400'
    },
    {
      id: 'email' as const,
      title: 'Email Support',
      description: 'Send us a detailed message',
      icon: Mail,
      availability: '24/7',
      responseTime: 'Within 24 hours',
      color: 'text-blue-400'
    },
    {
      id: 'phone' as const,
      title: 'Phone Support',
      description: 'Speak directly with our team',
      icon: Phone,
      availability: '24/7',
      responseTime: 'Immediate',
      color: 'text-purple-400'
    }
  ]

  const categories = [
    { value: 'general', label: 'General Inquiry' },
    { value: 'booking', label: 'Booking Issues' },
    { value: 'account', label: 'Account Problems' },
    { value: 'payment', label: 'Payment Issues' },
    { value: 'technical', label: 'Technical Support' },
    { value: 'emergency', label: 'Emergency Support' },
    { value: 'feedback', label: 'Feedback' }
  ]

  const priorities = [
    { value: 'low', label: 'Low', description: 'General questions or feedback' },
    { value: 'medium', label: 'Medium', description: 'Account or booking issues' },
    { value: 'high', label: 'High', description: 'Urgent but not emergency' },
    { value: 'emergency', label: 'Emergency', description: 'Critical security issues' }
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
          <MessageCircle className="h-5 w-5 text-green-400" />
          <h1 className="text-lg font-semibold">Contact Support</h1>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 p-4 space-y-4 overflow-y-auto pb-20">
        {/* Contact Methods */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-white">Choose Contact Method</h2>
          <div className="grid grid-cols-1 gap-4">
            {contactMethods.map((method) => (
              <button
                key={method.id}
                onClick={() => setContactMethod(method.id)}
                className={`p-4 rounded-lg border transition-colors ${
                  contactMethod === method.id
                    ? 'border-blue-500 bg-blue-900/20'
                    : 'border-gray-700 bg-gray-800 hover:bg-gray-700'
                }`}
              >
                <div className="flex items-center space-x-4">
                  <method.icon className={`h-6 w-6 ${method.color}`} />
                  <div className="flex-1 text-left">
                    <h3 className="font-medium text-white">{method.title}</h3>
                    <p className="text-sm text-gray-400">{method.description}</p>
                    <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                      <span className="flex items-center space-x-1">
                        <Clock className="h-3 w-3" />
                        <span>{method.availability}</span>
                      </span>
                      <span>Response: {method.responseTime}</span>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Emergency Contact */}
        <div className="bg-red-900/20 border border-red-500 rounded-lg p-4">
          <div className="flex items-center space-x-3 mb-2">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <h3 className="font-medium text-white">Emergency Contact</h3>
          </div>
          <p className="text-sm text-gray-300 mb-3">
            For immediate security assistance or emergencies, call our 24/7 hotline:
          </p>
          <a
            href="tel:+2347120005328"
            className="inline-flex items-center space-x-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            <Phone className="h-4 w-4" />
            <span>+234 712 000 5328</span>
          </a>
        </div>

        {/* Contact Form */}
        {contactMethod === 'email' && (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <h3 className="text-lg font-semibold text-white mb-4">Send us a Message</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium mb-2">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white"
                    placeholder="Enter your full name"
                  />
                </div>
                
                <div>
                  <label htmlFor="email" className="block text-sm font-medium mb-2">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white"
                    placeholder="Enter your email"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label htmlFor="phone" className="block text-sm font-medium mb-2">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white"
                    placeholder="Enter your phone number"
                  />
                </div>
                
                <div>
                  <label htmlFor="category" className="block text-sm font-medium mb-2">
                    Category *
                  </label>
                  <select
                    id="category"
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white"
                  >
                    {categories.map((category) => (
                      <option key={category.value} value={category.value}>
                        {category.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mb-4">
                <label htmlFor="priority" className="block text-sm font-medium mb-2">
                  Priority Level *
                </label>
                <select
                  id="priority"
                  name="priority"
                  value={formData.priority}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white"
                >
                  {priorities.map((priority) => (
                    <option key={priority.value} value={priority.value}>
                      {priority.label} - {priority.description}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mb-4">
                <label htmlFor="subject" className="block text-sm font-medium mb-2">
                  Subject *
                </label>
                <input
                  type="text"
                  id="subject"
                  name="subject"
                  value={formData.subject}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white"
                  placeholder="Brief description of your issue"
                />
              </div>

              <div className="mb-6">
                <label htmlFor="message" className="block text-sm font-medium mb-2">
                  Message *
                </label>
                <textarea
                  id="message"
                  name="message"
                  value={formData.message}
                  onChange={handleInputChange}
                  required
                  rows={5}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white resize-none"
                  placeholder="Please provide detailed information about your issue or inquiry..."
                />
              </div>

              {/* Message */}
              {message && (
                <div className={`mb-4 p-4 rounded-lg flex items-center space-x-2 ${
                  messageType === 'success' 
                    ? 'bg-green-900/50 border border-green-500 text-green-400' 
                    : 'bg-red-900/50 border border-red-500 text-red-400'
                }`}>
                  {messageType === 'success' ? (
                    <CheckCircle className="h-5 w-5" />
                  ) : (
                    <AlertCircle className="h-5 w-5" />
                  )}
                  <span>{message}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
              >
                <Send className="h-5 w-5" />
                <span>{isLoading ? 'Sending...' : 'Send Message'}</span>
              </button>
            </div>
          </form>
        )}

        {/* Live Chat */}
        {contactMethod === 'chat' && (
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <div className="text-center py-8">
              <MessageCircle className="h-12 w-12 text-green-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">Live Chat</h3>
              <p className="text-gray-400 mb-6">
                Our support team is available to chat with you right now. Click below to start a conversation.
              </p>
              <button
                onClick={() => {
                  // In a real app, this would open a chat widget
                  setMessage('Live chat feature will be available soon. Please use email support for now.')
                  setMessageType('error')
                }}
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
              >
                Start Live Chat
              </button>
            </div>
          </div>
        )}

        {/* Phone Support */}
        {contactMethod === 'phone' && (
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <div className="text-center py-8">
              <Phone className="h-12 w-12 text-purple-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">Phone Support</h3>
              <p className="text-gray-400 mb-6">
                Speak directly with our support team. Available 24/7 for all your security needs.
              </p>
              <div className="space-y-4">
                <a
                  href="tel:+2347120005328"
                  className="block bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                >
                  Call +234 712 000 5328
                </a>
                <p className="text-sm text-gray-500">
                  Average wait time: 2-3 minutes
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Message Display */}
        {message && contactMethod === 'chat' && (
          <div className={`p-4 rounded-lg flex items-center space-x-2 ${
            messageType === 'success' 
              ? 'bg-green-900/50 border border-green-500 text-green-400' 
              : 'bg-red-900/50 border border-red-500 text-red-400'
          }`}>
            {messageType === 'success' ? (
              <CheckCircle className="h-5 w-5" />
            ) : (
              <AlertCircle className="h-5 w-5" />
            )}
            <span>{message}</span>
          </div>
        )}

        {/* Additional Contact Info */}
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4">Other Ways to Reach Us</h3>
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <Mail className="h-5 w-5 text-blue-400" />
              <div>
                <p className="text-white font-medium">Email Support</p>
                <p className="text-gray-400">support@protector.ng</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Phone className="h-5 w-5 text-green-400" />
              <div>
                <p className="text-white font-medium">Emergency Hotline</p>
                <p className="text-gray-400">+234 712 000 5328</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Clock className="h-5 w-5 text-yellow-400" />
              <div>
                <p className="text-white font-medium">Support Hours</p>
                <p className="text-gray-400">24/7 - Always available for your security needs</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
