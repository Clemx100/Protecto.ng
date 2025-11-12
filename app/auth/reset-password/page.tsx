'use client'

import { useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Lock, Eye, EyeOff, CheckCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

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

export default function ResetPasswordPage() {
  const supabase = createClient()
  const router = useRouter()

  const [formData, setFormData] = useState({
    newPassword: '',
    confirmPassword: ''
  })

  const [showPasswords, setShowPasswords] = useState({
    new: false,
    confirm: false
  })

  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState<'success' | 'error' | ''>('')

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const togglePasswordVisibility = (field: 'new' | 'confirm') => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field]
    }))
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setMessage('')
    setMessageType('')

    if (formData.newPassword !== formData.confirmPassword) {
      setMessage('Passwords do not match')
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
      const { error } = await supabase.auth.updateUser({
        password: formData.newPassword
      })

      if (error) {
        if (error.message.toLowerCase().includes('session') || error.message.toLowerCase().includes('token')) {
          throw new Error('This reset link has expired or was already used. Please request a new password reset email.')
        }
        throw error
      }

      const { data: { user } } = await supabase.auth.getUser()
      const email = user?.email

      await supabase.auth.signOut()

      setMessage('Password updated successfully! Redirecting to login...')
      setMessageType('success')
      setFormData({
        newPassword: '',
        confirmPassword: ''
      })

      setTimeout(() => {
        const redirectUrl = email ? `/app?reset=success&email=${encodeURIComponent(email)}` : '/app?reset=success'
        window.location.href = redirectUrl
      }, 1500)
    } catch (error: any) {
      setMessage(error.message ?? 'Failed to update password. Please try again.')
      setMessageType('error')
    } finally {
      setIsLoading(false)
    }
  }

  const passwordValidation = validatePassword(formData.newPassword)

  return (
    <div className="w-full max-w-md mx-auto bg-black min-h-screen flex flex-col text-white page-transition">
      <div className="bg-black border-b border-gray-800 p-4">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => router.push('/app')}
            className="p-2 hover:bg-gray-800 rounded-lg transition-all duration-200 active:scale-95"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <Lock className="h-5 w-5 text-blue-400" />
          <h1 className="text-lg font-semibold">Reset Password</h1>
        </div>
      </div>

      <main className="flex-1 p-4 overflow-y-auto pb-20">
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 mb-6 text-sm text-blue-200">
          Enter a new password for your Protector.Ng account. You will be asked to sign in again once the password is updated.
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
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

          {message && (
            <div className={`p-4 rounded-lg ${
              messageType === 'success'
                ? 'bg-green-900/50 border border-green-500 text-green-400'
                : 'bg-red-900/50 border border-red-500 text-red-400'
            }`}>
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={
              isLoading ||
              !passwordValidation.isValid ||
              formData.newPassword !== formData.confirmPassword
            }
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white py-3 px-4 rounded-lg font-medium transition-colors"
          >
            {isLoading ? 'Updating Password...' : 'Update Password'}
          </button>
        </form>

        <div className="mt-8 text-center text-sm text-gray-400">
          Didn&apos;t request this reset?{" "}
          <Link href="/app" className="text-blue-400 hover:text-blue-300 transition-colors duration-200 underline">
            Return to login
          </Link>
        </div>
      </main>
    </div>
  )
}

