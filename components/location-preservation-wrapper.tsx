"use client"

import { useLocationPreservation } from "@/hooks/useLocationPreservation"

interface LocationPreservationWrapperProps {
  children: React.ReactNode
}

export default function LocationPreservationWrapper({ children }: LocationPreservationWrapperProps) {
  // This hook will automatically preserve the current location
  useLocationPreservation()
  
  return <>{children}</>
}

