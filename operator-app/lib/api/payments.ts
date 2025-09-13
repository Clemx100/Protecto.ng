// Payment API functions for Protector.Ng
import { createClient } from '@/lib/supabase/client'
import { ApiResponse } from '@/lib/types/database'

const supabase = createClient()

export class PaymentsAPI {
  // Create payment intent
  static async createPaymentIntent(
    amount: number,
    currency: 'NGN' | 'USD',
    bookingId: string,
    customerEmail: string
  ): Promise<ApiResponse<{ clientSecret: string; paymentIntentId: string }>> {
    try {
      const response = await fetch('/api/payments/create-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount,
          currency,
          bookingId,
          customerEmail
        })
      })

      const data = await response.json()

      if (!response.ok) {
        return { data: null, error: data.error || 'Failed to create payment intent' }
      }

      return { data: data, message: 'Payment intent created successfully' }
    } catch (error) {
      return { data: null, error: 'Failed to create payment intent' }
    }
  }

  // Confirm payment
  static async confirmPayment(
    paymentIntentId: string,
    bookingId: string
  ): Promise<ApiResponse<any>> {
    try {
      const response = await fetch('/api/payments/confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paymentIntentId,
          bookingId
        })
      })

      const data = await response.json()

      if (!response.ok) {
        return { data: null, error: data.error || 'Failed to confirm payment' }
      }

      return { data: data, message: 'Payment confirmed successfully' }
    } catch (error) {
      return { data: null, error: 'Failed to confirm payment' }
    }
  }

  // Create invoice
  static async createInvoice(
    bookingId: string,
    invoiceData: {
      basePrice: number;
      hourlyRate: number;
      vehicleFee: number;
      personnelFee: number;
      duration: number;
      totalAmount: number;
      currency: 'NGN' | 'USD';
    }
  ): Promise<ApiResponse<any>> {
    try {
      const { data, error } = await supabase
        .from('invoices')
        .insert({
          booking_id: bookingId,
          amount_ngn: invoiceData.currency === 'NGN' ? invoiceData.totalAmount : invoiceData.totalAmount * 1500,
          amount_usd: invoiceData.currency === 'USD' ? invoiceData.totalAmount : invoiceData.totalAmount / 1500,
          currency: invoiceData.currency,
          status: 'pending',
          breakdown: {
            basePrice: invoiceData.basePrice,
            hourlyRate: invoiceData.hourlyRate,
            vehicleFee: invoiceData.vehicleFee,
            personnelFee: invoiceData.personnelFee,
            duration: invoiceData.duration,
            totalAmount: invoiceData.totalAmount
          }
        })
        .select()
        .single()

      if (error) {
        return { data: null, error: error.message }
      }

      return { data, message: 'Invoice created successfully' }
    } catch (error) {
      return { data: null, error: 'Failed to create invoice' }
    }
  }

  // Get invoice by booking ID
  static async getInvoiceByBooking(bookingId: string): Promise<ApiResponse<any>> {
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('booking_id', bookingId)
        .single()

      if (error) {
        return { data: null, error: error.message }
      }

      return { data, message: 'Invoice retrieved successfully' }
    } catch (error) {
      return { data: null, error: 'Failed to get invoice' }
    }
  }

  // Update invoice status
  static async updateInvoiceStatus(
    invoiceId: string,
    status: 'pending' | 'paid' | 'failed' | 'refunded'
  ): Promise<ApiResponse<any>> {
    try {
      const { data, error } = await supabase
        .from('invoices')
        .update({ status })
        .eq('id', invoiceId)
        .select()
        .single()

      if (error) {
        return { data: null, error: error.message }
      }

      return { data, message: 'Invoice status updated successfully' }
    } catch (error) {
      return { data: null, error: 'Failed to update invoice status' }
    }
  }

  // Get payment history
  static async getPaymentHistory(userId: string): Promise<ApiResponse<any[]>> {
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          *,
          bookings (
            id,
            service_type,
            pickup_address,
            created_at
          )
        `)
        .eq('bookings.client_id', userId)
        .order('created_at', { ascending: false })

      if (error) {
        return { data: null, error: error.message }
      }

      return { data, message: 'Payment history retrieved successfully' }
    } catch (error) {
      return { data: null, error: 'Failed to get payment history' }
    }
  }

  // Process refund
  static async processRefund(
    paymentIntentId: string,
    amount?: number
  ): Promise<ApiResponse<any>> {
    try {
      const response = await fetch('/api/payments/refund', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paymentIntentId,
          amount
        })
      })

      const data = await response.json()

      if (!response.ok) {
        return { data: null, error: data.error || 'Failed to process refund' }
      }

      return { data: data, message: 'Refund processed successfully' }
    } catch (error) {
      return { data: null, error: 'Failed to process refund' }
    }
  }

  // Get payment statistics
  static async getPaymentStats(): Promise<ApiResponse<{
    totalRevenue: number;
    totalTransactions: number;
    successRate: number;
    averageTransaction: number;
  }>> {
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select('amount_ngn, amount_usd, status, created_at')

      if (error) {
        return { data: null, error: error.message }
      }

      const paidInvoices = data.filter(invoice => invoice.status === 'paid')
      const totalRevenue = paidInvoices.reduce((sum, invoice) => sum + (invoice.amount_ngn || 0), 0)
      const totalTransactions = paidInvoices.length
      const successRate = data.length > 0 ? (paidInvoices.length / data.length) * 100 : 0
      const averageTransaction = totalTransactions > 0 ? totalRevenue / totalTransactions : 0

      return {
        data: {
          totalRevenue,
          totalTransactions,
          successRate,
          averageTransaction
        },
        message: 'Payment statistics retrieved successfully'
      }
    } catch (error) {
      return { data: null, error: 'Failed to get payment statistics' }
    }
  }
}