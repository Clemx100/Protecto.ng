"use client"

import { Suspense } from "react"
import { useLocationPreservation } from "@/hooks/useLocationPreservation"

interface LocationPreservationWrapperProps {
  children: React.ReactNode
}

function LocationPreservation() {
  // This hook will automatically preserve the current location
  useLocationPreservation()
  return null
}

export default function LocationPreservationWrapper({ children }: LocationPreservationWrapperProps) {
  return (
    <>
      <Suspense fallback={null}>
        <LocationPreservation />
      </Suspense>
      {children}
    </>
  )
}

