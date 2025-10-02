"use client"

import { Wifi, WifiOff, RefreshCw, AlertCircle, Check, CheckCheck, Clock, XCircle } from "lucide-react"
import { Button } from "./button"

interface ConnectionStatusProps {
  status: 'connected' | 'disconnected' | 'reconnecting'
  pendingCount?: number
  onRetry?: () => void
}

export function ConnectionStatus({ status, pendingCount = 0, onRetry }: ConnectionStatusProps) {
  const getStatusConfig = () => {
    switch (status) {
      case 'connected':
        return {
          icon: <Wifi className="h-4 w-4" />,
          text: 'Connected',
          color: 'text-green-400',
          bg: 'bg-green-500/20',
          border: 'border-green-500/50'
        }
      case 'disconnected':
        return {
          icon: <WifiOff className="h-4 w-4" />,
          text: 'Disconnected',
          color: 'text-red-400',
          bg: 'bg-red-500/20',
          border: 'border-red-500/50'
        }
      case 'reconnecting':
        return {
          icon: <RefreshCw className="h-4 w-4 animate-spin" />,
          text: 'Reconnecting...',
          color: 'text-yellow-400',
          bg: 'bg-yellow-500/20',
          border: 'border-yellow-500/50'
        }
    }
  }

  const config = getStatusConfig()

  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${config.bg} ${config.border}`}>
      <div className={config.color}>
        {config.icon}
      </div>
      <span className={`text-sm ${config.color}`}>
        {config.text}
      </span>
      
      {pendingCount > 0 && (
        <span className="text-xs text-orange-300">
          ({pendingCount} pending)
        </span>
      )}
      
      {status === 'disconnected' && onRetry && (
        <Button
          size="sm"
          variant="outline"
          onClick={onRetry}
          className="ml-2 h-6 text-xs"
        >
          Retry
        </Button>
      )}
    </div>
  )
}

interface MessageDeliveryIndicatorProps {
  status: 'sending' | 'sent' | 'delivered' | 'failed'
  retryCount?: number
  onRetry?: () => void
}

export function MessageDeliveryIndicator({ 
  status, 
  retryCount = 0, 
  onRetry 
}: MessageDeliveryIndicatorProps) {
  const getIndicator = () => {
    switch (status) {
      case 'sending':
        return {
          icon: <Clock className="h-3 w-3 animate-pulse" />,
          color: 'text-gray-400',
          tooltip: 'Sending...'
        }
      case 'sent':
        return {
          icon: <Check className="h-3 w-3" />,
          color: 'text-gray-400',
          tooltip: 'Sent'
        }
      case 'delivered':
        return {
          icon: <CheckCheck className="h-3 w-3" />,
          color: 'text-blue-400',
          tooltip: 'Delivered'
        }
      case 'failed':
        return {
          icon: <XCircle className="h-3 w-3" />,
          color: 'text-red-400',
          tooltip: retryCount > 0 ? `Failed (${retryCount} retries)` : 'Failed'
        }
    }
  }

  const indicator = getIndicator()

  return (
    <div className="flex items-center gap-1">
      <span className={`${indicator.color} flex items-center`} title={indicator.tooltip}>
        {indicator.icon}
      </span>
      {status === 'failed' && onRetry && (
        <button
          onClick={onRetry}
          className="text-xs text-blue-400 hover:text-blue-300 underline ml-1"
        >
          Retry
        </button>
      )}
    </div>
  )
}

interface ChatOfflineBannerProps {
  onRetry: () => void
}

export function ChatOfflineBanner({ onRetry }: ChatOfflineBannerProps) {
  return (
    <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3 mb-4 animate-in slide-in-from-top-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-red-400" />
          <div>
            <p className="text-sm font-medium text-red-300">
              Connection Lost
            </p>
            <p className="text-xs text-red-400">
              Messages may not be delivered. Please check your internet connection.
            </p>
          </div>
        </div>
        <Button
          size="sm"
          onClick={onRetry}
          className="bg-red-600 hover:bg-red-700 text-white"
        >
          Reconnect
        </Button>
      </div>
    </div>
  )
}

interface PendingMessagesBannerProps {
  count: number
  onRetry: () => void
}

export function PendingMessagesBanner({ count, onRetry }: PendingMessagesBannerProps) {
  if (count === 0) return null

  return (
    <div className="bg-yellow-500/20 border border-yellow-500/50 rounded-lg p-3 mb-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <RefreshCw className="h-5 w-5 text-yellow-400 animate-spin" />
          <div>
            <p className="text-sm font-medium text-yellow-300">
              {count} {count === 1 ? 'Message' : 'Messages'} Pending
            </p>
            <p className="text-xs text-yellow-400">
              Retrying delivery...
            </p>
          </div>
        </div>
        <Button
          size="sm"
          onClick={onRetry}
          className="bg-yellow-600 hover:bg-yellow-700 text-white"
        >
          Retry Now
        </Button>
      </div>
    </div>
  )
}

