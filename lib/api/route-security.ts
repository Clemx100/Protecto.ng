import { NextResponse } from 'next/server'

/**
 * Test/demo utilities should never be exposed in production.
 * Returning 404 keeps these routes undiscoverable.
 */
export function blockInProduction() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  return null
}

