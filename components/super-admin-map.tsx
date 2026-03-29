"use client"

import dynamic from 'next/dynamic'
import type { VehicleMarker, AgentMarker } from './super-admin-map-internal'
import LoadingLogo from '@/components/loading-logo'

const SuperAdminMapInternal = dynamic(
  () => import('./super-admin-map-internal'),
  {
    ssr: false,
    loading: () => (
      <div
        className="rounded-xl border border-white/20 bg-slate-800/50 flex items-center justify-center"
        style={{ minHeight: 400 }}
      >
        <LoadingLogo fullscreen={false} label="Loading map..." />
      </div>
    )
  }
)

interface SuperAdminMapProps {
  vehicles: VehicleMarker[]
  agents: AgentMarker[]
  height?: string
}

export default function SuperAdminMap(props: SuperAdminMapProps) {
  return <SuperAdminMapInternal {...props} />
}
