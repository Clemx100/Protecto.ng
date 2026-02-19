'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Lock, Eye, EyeOff, CheckCircle } from 'lucide-react'

export default function ChangePasswordPage() {
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  })
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState<'success' | 'error' | ''>('')

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const togglePasswordVisibility = (field: 'current' | 'new' | 'confirm') => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field]
    }))
  }

  const validatePassword = (password: string) => {
    const minLength = password.length >= 8
    const hasUpperCase = /[A-Z]/.test(password)
    const hasLowerCase = /[a-z]/.test(password)
    const hasNumbers = /\d/.test(password)
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password)
    
    return {
      minLength,
      hasUpperCase,
      hasLowerCase,
      hasNumbers,
      hasSpecialChar,
      isValid: minLength && hasUpperCase && hasLowerCase && hasNumbers && hasSpecialChar
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setMessage('')

    // Validation
    if (formData.newPassword !== formData.confirmPassword) {
      setMessage('New passwords do not match')
      setMessageType('error')
      setIsLoading(false)
      return
    }

    const passwordValidation = validatePassword(formData.newPassword)
    if (!passwordValidation.isValid) {
      setMessage('Password does not meet requirements')
      setMessageType('error')
      setIsLoading(false)
      return
    }

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      setMessage('Password changed successfully!')
      setMessageType('success')
      setFormData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      })
      
      // Redirect after success
      setTimeout(() => {
        window.location.href = '/app?tab=account'
      }, 2000)
    } catch (error) {
      setMessage('Failed to change password. Please try again.')
      setMessageType('error')
    } finally {
      setIsLoading(false)
    }
  }

  const passwordValidation = validatePassword(formData.newPassword)

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
          <Lock className="h-5 w-5 text-blue-400" />
          <h1 className="text-lg font-semibold">Change Password</h1>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 p-4 overflow-y-auto pb-20">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Current Password */}
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <label htmlFor="currentPassword" className="block text-sm font-medium mb-2">
              Current Password
            </label>
            <div className="relative">
              <input
                type={showPasswords.current ? 'text' : 'password'}
                id="currentPassword"
                name="currentPassword"
                value={formData.currentPassword}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-12"
                placeholder="Enter current password"
              />
              <button
                type="button"
                onClick={() => togglePasswordVisibility('current')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
              >
                {showPasswords.current ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          {/* New Password */}
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <label htmlFor="newPassword" className="block text-sm font-medium mb-2">
              New Password
            </label>
            <div className="relative">
              <input
                type={showPasswords.new ? 'text' : 'password'}
                id="newPassword"
                name="newPassword"
                value={formData.newPassword}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-12"
                placeholder="Enter new password"
              />
              <button
                type="button"
                onClick={() => togglePasswordVisibility('new')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
              >
                {showPasswords.new ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>

            {/* Password Requirements */}
            {formData.newPassword && (
              <div className="mt-3 space-y-2">
                <p className="text-sm text-gray-400">Password Requirements:</p>
                <div className="space-y-1 text-xs">
                  <div className={`flex items-center space-x-2 ${passwordValidation.minLength ? 'text-green-400' : 'text-gray-400'}`}>
                    <CheckCircle className="h-3 w-3" />
                    <span>At least 8 characters</span>
                  </div>
                  <div className={`flex items-center space-x-2 ${passwordValidation.hasUpperCase ? 'text-green-400' : 'text-gray-400'}`}>
                    <CheckCircle className="h-3 w-3" />
                    <span>One uppercase letter</span>
                  </div>
                  <div className={`flex items-center space-x-2 ${passwordValidation.hasLowerCase ? 'text-green-400' : 'text-gray-400'}`}>
                    <CheckCircle className="h-3 w-3" />
                    <span>One lowercase letter</span>
                  </div>
                  <div className={`flex items-center space-x-2 ${passwordValidation.hasNumbers ? 'text-green-400' : 'text-gray-400'}`}>
                    <CheckCircle className="h-3 w-3" />
                    <span>One number</span>
                  </div>
                  <div className={`flex items-center space-x-2 ${passwordValidation.hasSpecialChar ? 'text-green-400' : 'text-gray-400'}`}>
                    <CheckCircle className="h-3 w-3" />
                    <span>One special character</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Confirm Password */}
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <label htmlFor="confirmPassword" className="block text-sm font-medium mb-2">
              Confirm New Password
            </label>
            <div className="relative">
              <input
                type={showPasswords.confirm ? 'text' : 'password'}
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-12"
                placeholder="Confirm new password"
              />
              <button
                type="button"
                onClick={() => togglePasswordVisibility('confirm')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
              >
                {showPasswords.confirm ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
            {formData.confirmPassword && formData.newPassword !== formData.confirmPassword && (
              <p className="mt-2 text-sm text-red-400">Passwords do not match</p>
            )}
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

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading || !passwordValidation.isValid || formData.newPassword !== formData.confirmPassword}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white py-3 px-4 rounded-lg font-medium transition-colors"
          >
            {isLoading ? 'Changing Password...' : 'Change Password'}
          </button>
        </form>
      </main>
    </div>
  )
}
