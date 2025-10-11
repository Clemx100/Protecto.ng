import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { amount, email, bookingId, customerName, currency = 'NGN' } = await request.json()

    // Validate input
    if (!amount || !email || !bookingId || !customerName) {
      return NextResponse.json(
        { error: 'Missing required fields: amount, email, bookingId, customerName' },
        { status: 400 }
      )
    }

    // Convert amount to kobo (Paystack uses kobo for NGN)
    const amountInKobo = Math.round(amount * 100)

    // Paystack API configuration
    const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY
    if (!paystackSecretKey) {
      return NextResponse.json(
        { error: 'Paystack secret key not configured' },
        { status: 500 }
      )
    }

    // Create Paystack transaction
    const paystackResponse = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${paystackSecretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: amountInKobo,
        email: email,
        currency: currency,
        reference: `protector_${bookingId}_${Date.now()}`,
        metadata: {
          booking_id: bookingId,
          customer_name: customerName,
          service_type: 'Executive Protection Service',
        },
        callback_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://protecto-3a9ekli58-iwewezinem-stephen-s-projects.vercel.app'}/payment/callback?booking=${bookingId}`,
        channels: ['card', 'bank', 'ussd', 'qr', 'mobile_money', 'bank_transfer'],
      }),
    })

    if (!paystackResponse.ok) {
      const errorData = await paystackResponse.json()
      console.error('Paystack API error:', errorData)
      return NextResponse.json(
        { error: 'Failed to initialize payment with Paystack' },
        { status: 500 }
      )
    }

    const paystackData = await paystackResponse.json()

    if (!paystackData.status) {
      return NextResponse.json(
        { error: paystackData.message || 'Payment initialization failed' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      authorization_url: paystackData.data.authorization_url,
      access_code: paystackData.data.access_code,
      reference: paystackData.data.reference,
      amount: amount,
      currency: currency,
    })

  } catch (error) {
    console.error('Error creating Paystack payment:', error)
    return NextResponse.json(
      { error: 'Failed to create payment' },
      { status: 500 }
    )
  }
}
