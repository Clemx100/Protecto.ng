import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { requestData } = await request.json()
    
    // Send to operator dashboard
    const operatorUrl = process.env.OPERATOR_DASHBOARD_URL || 'https://protector-ng-lxtd.vercel.app'
    
    const response = await fetch(`${operatorUrl}/api/realtime/requests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestData)
    })

    if (!response.ok) {
      throw new Error('Failed to send request to operator dashboard')
    }

    const result = await response.json()
    
    return NextResponse.json({ 
      success: true, 
      message: 'Request sent to operator dashboard',
      data: result
    })
  } catch (error) {
    console.error('Error sending request to operator:', error)
    return NextResponse.json({ 
      error: 'Failed to send request to operator dashboard' 
    }, { status: 500 })
  }
}
