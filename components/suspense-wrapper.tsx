'use client'

import { Suspense } from 'react'

interface SuspenseWrapperProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

export default function SuspenseWrapper({ 
  children, 
  fallback = (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading...</p>
      </div>
    </div>
  )
}: SuspenseWrapperProps) {
  return (
    <Suspense fallback={fallback}>
      {children}
    </Suspense>
  )
}
