/**
 * Enhanced Real-time Chat Utilities
 * Provides better real-time handling with polling backup
 */

import { createClient } from '@/lib/supabase/client'

interface RealtimeChatOptions {
  bookingId: string
  onMessage: (message: any) => void
  onConnectionChange?: (status: 'connected' | 'connecting' | 'disconnected') => void
  pollingInterval?: number // Backup polling in milliseconds
}

export class RealtimeChatManager {
  private supabase = createClient()
  private subscription: any = null
  private pollingTimer: NodeJS.Timeout | null = null
  private lastMessageId: string | null = null
  private isActive = false

  constructor(private options: RealtimeChatOptions) {}

  /**
   * Start real-time subscription with polling backup
   */
  async start() {
    if (this.isActive) {
      console.log('⚠️ Chat already active, skipping start')
      return
    }

    this.isActive = true
    console.log('🚀 Starting enhanced real-time chat for:', this.options.bookingId)

    // Set up Supabase real-time subscription
    this.setupRealtimeSubscription()

    // Set up polling backup (default 3 seconds)
    if (this.options.pollingInterval !== 0) {
      this.startPolling(this.options.pollingInterval || 3000)
    }
  }

  /**
   * Set up Supabase real-time subscription
   */
  private setupRealtimeSubscription() {
    const { bookingId, onMessage, onConnectionChange } = this.options

    console.log('🔗 Setting up Supabase real-time subscription')
    
    if (onConnectionChange) {
      onConnectionChange('connecting')
    }

    this.subscription = this.supabase
      .channel(`enhanced-chat-${bookingId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `booking_id=eq.${bookingId}`
        },
        (payload) => {
          console.log('📨 Real-time message received:', payload.new)
          const message = payload.new
          
          // Track last message to avoid duplicates in polling
          this.lastMessageId = message.id
          
          onMessage(message)
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `booking_id=eq.${bookingId}`
        },
        (payload) => {
          console.log('✏️ Message updated:', payload.new)
          onMessage({ ...payload.new, _isUpdate: true })
        }
      )
      .subscribe((status) => {
        console.log('📡 Subscription status:', status)
        
        if (status === 'SUBSCRIBED') {
          console.log('✅ Real-time connected!')
          if (onConnectionChange) {
            onConnectionChange('connected')
          }
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Real-time connection error')
          if (onConnectionChange) {
            onConnectionChange('disconnected')
          }
        } else if (status === 'CLOSED') {
          console.warn('⚠️ Real-time connection closed')
          if (onConnectionChange) {
            onConnectionChange('disconnected')
          }
        } else {
          if (onConnectionChange) {
            onConnectionChange('connecting')
          }
        }
      })
  }

  /**
   * Start polling backup for missed messages
   */
  private startPolling(interval: number) {
    console.log(`🔄 Starting polling backup every ${interval}ms`)
    
    this.pollingTimer = setInterval(async () => {
      try {
        const response = await fetch(`/api/messages?bookingId=${this.options.bookingId}&limit=5`)
        if (response.ok) {
          const result = await response.json()
          if (result.success && result.data && result.data.length > 0) {
            // Check for any new messages not received via real-time
            const latestMessage = result.data[result.data.length - 1]
            if (this.lastMessageId && latestMessage.id !== this.lastMessageId) {
              console.log('🔄 Polling found new message:', latestMessage.id)
              this.lastMessageId = latestMessage.id
              this.options.onMessage({ ...latestMessage, _fromPolling: true })
            } else if (!this.lastMessageId) {
              // First poll, set the last message ID
              this.lastMessageId = latestMessage.id
            }
          }
        }
      } catch (error) {
        console.error('Polling error:', error)
      }
    }, interval)
  }

  /**
   * Stop all subscriptions and polling
   */
  stop() {
    console.log('🛑 Stopping real-time chat')
    this.isActive = false

    // Clean up Supabase subscription
    if (this.subscription) {
      this.supabase.removeChannel(this.subscription)
      this.subscription = null
    }

    // Clean up polling
    if (this.pollingTimer) {
      clearInterval(this.pollingTimer)
      this.pollingTimer = null
    }
  }

  /**
   * Check if manager is active
   */
  get active() {
    return this.isActive
  }
}

/**
 * Format timestamp for chat messages
 * Shows relative time for recent messages, full time for older ones
 */
export function formatChatTimestamp(timestamp: string | Date): string {
  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHour = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHour / 24)

  // Just now (< 30 seconds)
  if (diffSec < 30) {
    return 'Just now'
  }

  // Minutes ago (< 1 hour)
  if (diffMin < 60) {
    return `${diffMin}m ago`
  }

  // Hours ago (< 24 hours)
  if (diffHour < 24) {
    return `${diffHour}h ago`
  }

  // Days ago (< 7 days)
  if (diffDay < 7) {
    return `${diffDay}d ago`
  }

  // Full date for older messages
  return date.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

/**
 * Get time in HH:MM format
 */
export function formatMessageTime(timestamp: string | Date): string {
  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp
  return date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit'
  })
}



