'use client'

import { Suspense } from 'react'
import LoadingLogo from "@/components/loading-logo"

interface SuspenseWrapperProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

export default function SuspenseWrapper({ 
  children, 
  fallback = <LoadingLogo />
}: SuspenseWrapperProps) {
  return (
    <Suspense fallback={fallback}>
      {children}
    </Suspense>
  )
}
