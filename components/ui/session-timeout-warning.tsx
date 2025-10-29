"use client"

import { AlertTriangle, Clock } from 'lucide-react'
import { Button } from './button'

interface SessionTimeoutWarningProps {
  timeRemaining: number
  onContinue: () => void
  onLogout: () => void
}

export function SessionTimeoutWarning({
  timeRemaining,
  onContinue,
  onLogout
}: SessionTimeoutWarningProps) {
  // Format time remaining
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl p-6 mx-4 max-w-md w-full border-2 border-yellow-400 animate-pulse-slow">
        {/* Icon */}
        <div className="flex justify-center mb-4">
          <div className="bg-yellow-100 p-4 rounded-full">
            <AlertTriangle className="h-8 w-8 text-yellow-600" />
          </div>
        </div>

        {/* Title */}
        <h3 className="text-xl font-bold text-center text-gray-900 mb-2">
          Session Expiring Soon
        </h3>

        {/* Message */}
        <p className="text-center text-gray-600 mb-6">
          Your session will expire due to inactivity
        </p>

        {/* Countdown */}
        <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl p-4 mb-6">
          <div className="flex items-center justify-center gap-3">
            <Clock className="h-6 w-6 text-orange-600" />
            <div className="text-center">
              <div className="text-3xl font-bold text-orange-600">
                {formatTime(timeRemaining)}
              </div>
              <div className="text-xs text-gray-600 mt-1">
                remaining
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Button
            onClick={onLogout}
            variant="outline"
            className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            Logout
          </Button>
          <Button
            onClick={onContinue}
            className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white"
          >
            Continue Session
          </Button>
        </div>

        {/* Info */}
        <p className="text-center text-xs text-gray-500 mt-4">
          Click "Continue Session" to keep working
        </p>
      </div>
    </div>
  )
}

