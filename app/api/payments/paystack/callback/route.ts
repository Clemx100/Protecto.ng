import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const reference = searchParams.get('reference')
    const bookingId = searchParams.get('booking')

    console.log('💳 Payment callback received:', { reference, bookingId })

    if (!reference) {
      console.error('❌ No payment reference provided')
      return NextResponse.redirect(new URL('/?payment=failed', request.url))
    }

    // Verify payment with Paystack
    const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY
    if (!paystackSecretKey) {
      console.error('❌ Paystack secret key not configured')
      return NextResponse.redirect(new URL('/?payment=error', request.url))
    }

    console.log('🔍 Verifying payment with Paystack...')
    const verifyResponse = await fetch(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${paystackSecretKey}`,
        },
      }
    )

    if (!verifyResponse.ok) {
      const errorData = await verifyResponse.json()
      console.error('❌ Paystack verification failed:', errorData)
      return NextResponse.redirect(new URL('/?payment=failed', request.url))
    }

    const verificationData = await verifyResponse.json()
    console.log('📥 Paystack verification response:', JSON.stringify(verificationData, null, 2))

    if (!verificationData.status || verificationData.data.status !== 'success') {
      console.error('❌ Payment not successful:', verificationData.data.status)
      return NextResponse.redirect(new URL('/?payment=failed', request.url))
    }

    // Payment is successful - update booking status
    console.log('✅ Payment verified successfully!')
    
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // Extract booking ID from metadata or URL parameter
    const bookingIdToUpdate = verificationData.data.metadata?.booking_id || bookingId

    if (!bookingIdToUpdate) {
      console.error('❌ No booking ID found in payment data')
      return NextResponse.redirect(new URL('/?payment=success', request.url))
    }

    console.log('💾 Updating booking status to paid:', bookingIdToUpdate)

    // Update booking status to 'paid'
    const { data: updatedBooking, error: updateError } = await supabase
      .from('bookings')
      .update({ 
        status: 'paid',
        updated_at: new Date().toISOString()
      })
      .eq('id', bookingIdToUpdate)
      .select()
      .single()

    if (updateError) {
      console.error('❌ Failed to update booking status:', updateError)
      // Still redirect to success since payment was successful
    } else {
      console.log('✅ Booking status updated to PAID:', updatedBooking)
    }

    // Create a payment record (optional - for tracking)
    const { error: paymentError } = await supabase
      .from('payments')
      .insert({
        booking_id: bookingIdToUpdate,
        amount: verificationData.data.amount / 100, // Convert from kobo to naira
        currency: verificationData.data.currency,
        reference: reference,
        status: 'success',
        payment_method: 'paystack',
        paid_at: verificationData.data.paid_at,
        customer_email: verificationData.data.customer.email,
        metadata: verificationData.data.metadata
      })

    if (paymentError) {
      console.warn('⚠️ Failed to create payment record (non-critical):', paymentError)
    }

    // Send success message to chat
    try {
      const { data: messages } = await supabase
        .from('messages')
        .insert({
          booking_id: bookingIdToUpdate,
          sender_type: 'system',
          sender_id: 'system',
          message: `✅ Payment received! Amount: ₦${(verificationData.data.amount / 100).toLocaleString()}\n\nReference: ${reference}\n\nYour protection service request is being processed.`,
          created_at: new Date().toISOString(),
          is_system_message: true
        })
        .select()

      console.log('✅ Payment confirmation message sent')
    } catch (msgError) {
      console.warn('⚠️ Failed to send payment message:', msgError)
    }

    // Redirect to app with success message
    return NextResponse.redirect(new URL(`/?payment=success&booking=${bookingIdToUpdate}`, request.url))

  } catch (error) {
    console.error('❌ Payment callback error:', error)
    return NextResponse.redirect(new URL('/?payment=error', request.url))
  }
}

