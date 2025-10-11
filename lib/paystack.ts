// Paystack configuration and utilities
export const PAYSTACK_CONFIG = {
  publicKey: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || '',
  secretKey: process.env.PAYSTACK_SECRET_KEY || '',
  baseUrl: 'https://api.paystack.co',
}

// Currency conversion utilities
export const formatAmount = (amount: number, currency: string = 'NGN'): number => {
  if (currency === 'NGN') {
    // Convert to kobo (multiply by 100)
    return Math.round(amount * 100)
  }
  // For other currencies, use cents
  return Math.round(amount * 100)
}

export const formatAmountForDisplay = (amount: number, currency: string = 'NGN'): string => {
  if (currency === 'NGN') {
    return `₦${amount.toLocaleString()}`
  }
  return `${currency} ${amount.toLocaleString()}`
}

// Payment channels available in Nigeria
export const PAYMENT_CHANNELS = [
  'card',
  'bank', 
  'ussd',
  'qr',
  'mobile_money',
  'bank_transfer'
] as const

export type PaymentChannel = typeof PAYMENT_CHANNELS[number]

// Generate unique reference for transactions
export const generatePaymentReference = (bookingId: string): string => {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substr(2, 9)
  return `protector_${bookingId}_${timestamp}_${random}`
}
