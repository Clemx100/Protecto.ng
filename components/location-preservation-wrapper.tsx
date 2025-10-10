"use client"

import { Suspense } from "react"
import { useLocationPreservation } from "@/hooks/useLocationPreservation"

interface LocationPreservationWrapperProps {
  children: React.ReactNode
}

// Component that uses the hook - needs to be wrapped in Suspense
function LocationPreservationComponent() {
  useLocationPreservation()
  return null
}

export default function LocationPreservationWrapper({ children }: LocationPreservationWrapperProps) {
  return (
    <>
      <Suspense fallback={null}>
        <LocationPreservationComponent />
      </Suspense>
      {children}
    </>
  )
}

