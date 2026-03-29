"use client"

import { useMemo } from 'react'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

if (typeof window !== 'undefined') {
  delete (L.Icon.Default.prototype as any)._getIconUrl
  L.Icon.Default.mergeOptions({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png'
  })
}

const DEFAULT_CENTER: [number, number] = [9.082, 8.6753] // Nigeria
const DEFAULT_ZOOM = 6

export interface VehicleMarker {
  id: string
  vehicle_code: string
  make: string
  model: string
  license_plate: string
  location: { lat: number; lng: number }
  is_available?: boolean
}

export interface AgentMarker {
  id: string
  agent_code: string
  profile?: { first_name?: string; last_name?: string }
  location: { lat: number; lng: number }
  availability_status?: string
}

interface SuperAdminMapInternalProps {
  vehicles: VehicleMarker[]
  agents: AgentMarker[]
  height?: string
}

export default function SuperAdminMapInternal({
  vehicles,
  agents,
  height = '500px'
}: SuperAdminMapInternalProps) {
  const bounds = useMemo(() => {
    const points: [number, number][] = []
    vehicles.forEach((v) => {
      if (v.location?.lat != null && v.location?.lng != null) {
        points.push([v.location.lat, v.location.lng])
      }
    })
    agents.forEach((a) => {
      if (a.location?.lat != null && a.location?.lng != null) {
        points.push([a.location.lat, a.location.lng])
      }
    })
    if (points.length === 0) return null
    return L.latLngBounds(points)
  }, [vehicles, agents])

  const center: [number, number] = useMemo(() => {
    if (bounds) {
      const c = bounds.getCenter()
      return [c.lat, c.lng]
    }
    return DEFAULT_CENTER
  }, [bounds])

  return (
    <div className="rounded-xl overflow-hidden border border-white/20" style={{ height }}>
      <MapContainer
        center={center}
        zoom={bounds ? 12 : DEFAULT_ZOOM}
        bounds={bounds ?? undefined}
        className="h-full w-full z-0"
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {vehicles.map(
          (v) =>
            v.location && (
              <Marker key={`v-${v.id}`} position={[v.location.lat, v.location.lng]}>
                <Popup>
                  <div className="text-sm">
                    <p className="font-semibold text-slate-800">Vehicle: {v.vehicle_code}</p>
                    <p>{v.make} {v.model}</p>
                    <p>{v.license_plate}</p>
                    <p className="text-xs text-slate-500">{v.is_available ? 'Available' : 'In use'}</p>
                  </div>
                </Popup>
              </Marker>
            )
        )}
        {agents.map(
          (a) =>
            a.location && (
              <Marker key={`a-${a.id}`} position={[a.location.lat, a.location.lng]}>
                <Popup>
                  <div className="text-sm">
                    <p className="font-semibold text-slate-800">
                      Agent: {a.profile?.first_name} {a.profile?.last_name}
                    </p>
                    <p>{a.agent_code}</p>
                    <p className="text-xs text-slate-500">{a.availability_status || '—'}</p>
                  </div>
                </Popup>
              </Marker>
            )
        )}
      </MapContainer>
    </div>
  )
}
