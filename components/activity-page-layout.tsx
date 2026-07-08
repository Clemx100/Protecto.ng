"use client"

import type { ReactNode } from "react"
import LoadingLogo from "@/components/loading-logo"

type ActivityPageLayoutProps = {
  mapContent: ReactNode
  isLoadingBookings: boolean
  children: ReactNode
}

export default function ActivityPageLayout({
  mapContent,
  isLoadingBookings,
  children,
}: ActivityPageLayoutProps) {
  return (
    <div className="flex min-h-[calc(100vh-4.5rem)] flex-col bg-[#121212]">
      <div className="h-[44vh] min-h-[260px] w-full shrink-0">{mapContent}</div>

      <div className="relative z-10 -mt-8 flex min-h-0 flex-1 flex-col overflow-hidden rounded-t-3xl border-t border-white/10 bg-[#121212] shadow-[0_-12px_40px_rgba(0,0,0,0.45)]">
        <div className="min-h-0 flex-1 overflow-y-auto pt-3">
          {isLoadingBookings ? (
            <div className="p-4">
              <div className="rounded-lg bg-gray-900 p-6">
                <LoadingLogo fullscreen={false} label="Loading bookings..." />
              </div>
            </div>
          ) : (
            children
          )}
        </div>
      </div>
    </div>
  )
}
