// Super Admin API – call /api/super-admin/* with session token
const getBase = () => (typeof window !== 'undefined' ? '' : process.env.NEXT_PUBLIC_APP_URL || '') + '/api/super-admin'

async function getHeaders(): Promise<HeadersInit> {
  if (typeof window === 'undefined') {
    return { 'Content-Type': 'application/json' }
  }
  const { createClient } = await import('@/lib/supabase/client')
  const supabase = createClient()
  const {
    data: { session }
  } = await supabase.auth.getSession()
  return {
    'Content-Type': 'application/json',
    Authorization: session?.access_token ? `Bearer ${session.access_token}` : ''
  }
}

export interface SuperAdminStats {
  total_users: number
  total_vehicles: number
  total_trips: number
  active_trips: number
  revenue_30d: number
  emergency_alerts: number
}

export interface PaginatedResponse<T> {
  data: T[]
  count: number
  page: number
  limit: number
  total_pages: number
}

export interface TrackingResponse {
  vehicles: Array<{
    id: string
    vehicle_code: string
    make: string
    model: string
    license_plate: string
    is_available: boolean
    updated_at: string
    location: { lat: number; lng: number } | null
  }>
  agents: Array<{
    id: string
    agent_code: string
    availability_status: string
    last_seen: string
    profile: any
    location: { lat: number; lng: number } | null
  }>
  tracking: Array<{
    id: string
    booking_id: string
    agent_id: string
    vehicle_id: string | null
    location: { lat: number; lng: number } | null
    heading?: number
    speed?: number
    timestamp: string
  }>
}

export const SuperAdminAPI = {
  async getStats(): Promise<{ data: SuperAdminStats | null; error?: string }> {
    try {
      const res = await fetch(`${getBase()}/stats`, { headers: await getHeaders() })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        return { data: null, error: err.error || res.statusText }
      }
      const data = await res.json()
      return { data }
    } catch (e: any) {
      return { data: null, error: e?.message || 'Failed to fetch stats' }
    }
  },

  async getUsers(params?: { role?: string; page?: number; limit?: number }) {
    const u = new URLSearchParams()
    if (params?.role) u.set('role', params.role)
    if (params?.page) u.set('page', String(params.page))
    if (params?.limit) u.set('limit', String(params.limit))
    const res = await fetch(`${getBase()}/users?${u}`, { headers: await getHeaders() })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error || res.statusText)
    }
    return res.json() as Promise<PaginatedResponse<any>>
  },

  async createUser(body: {
    email: string
    password: string
    first_name: string
    last_name: string
    phone?: string
    role?: string
  }) {
    const res = await fetch(`${getBase()}/users`, {
      method: 'POST',
      headers: await getHeaders(),
      body: JSON.stringify(body)
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error || res.statusText)
    }
    return res.json()
  },

  async updateUser(body: { user_id: string; role?: string; password?: string }) {
    const res = await fetch(`${getBase()}/users`, {
      method: 'PATCH',
      headers: await getHeaders(),
      body: JSON.stringify(body)
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error || res.statusText)
    }
    return res.json()
  },

  /**
   * Remove user. If superAdminPassword is provided, permanently deletes the user
   * (after verifying the password). Otherwise deactivates (is_active = false).
   */
  async removeUser(userId: string, superAdminPassword?: string) {
    const res = await fetch(`${getBase()}/users?id=${encodeURIComponent(userId)}`, {
      method: 'DELETE',
      headers: await getHeaders(),
      ...(superAdminPassword
        ? { body: JSON.stringify({ password: superAdminPassword }) }
        : {})
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error || res.statusText)
    }
    return res.json()
  },

  async getVehicles(params?: { available?: boolean; page?: number; limit?: number }) {
    const u = new URLSearchParams()
    if (params?.available !== undefined) u.set('available', String(params.available))
    if (params?.page) u.set('page', String(params.page))
    if (params?.limit) u.set('limit', String(params.limit))
    const res = await fetch(`${getBase()}/vehicles?${u}`, { headers: await getHeaders() })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error || res.statusText)
    }
    return res.json() as Promise<PaginatedResponse<any>>
  },

  async createVehicle(body: {
    vehicle_code?: string
    make: string
    model: string
    year: number
    type?: string
    is_armored?: boolean
    capacity?: number
    license_plate: string
    color?: string
    features?: string[]
    image_url?: string
    photo_urls?: string[]
  }) {
    const res = await fetch(`${getBase()}/vehicles`, {
      method: 'POST',
      headers: await getHeaders(),
      body: JSON.stringify(body)
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error || res.statusText)
    }
    return res.json()
  },

  async uploadVehicleImages(files: File[]): Promise<{ urls: string[] }> {
    const form = new FormData()
    files.forEach((f) => form.append('files', f))
    const headers = await getHeaders() as Record<string, string>
    delete headers['Content-Type']
    const res = await fetch(`${getBase()}/vehicles/upload`, {
      method: 'POST',
      headers,
      body: form
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error || res.statusText)
    }
    return res.json()
  },

  async updateVehicle(body: {
    vehicle_id: string
    image_url?: string
    photo_urls?: string[]
    make?: string
    model?: string
    year?: number
    type?: string
    is_armored?: boolean
    capacity?: number
    license_plate?: string
    color?: string
    is_available?: boolean
  }) {
    const res = await fetch(`${getBase()}/vehicles`, {
      method: 'PATCH',
      headers: await getHeaders(),
      body: JSON.stringify(body)
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error || res.statusText)
    }
    return res.json()
  },

  async removeVehicle(vehicleId: string) {
    const res = await fetch(`${getBase()}/vehicles?id=${encodeURIComponent(vehicleId)}`, {
      method: 'DELETE',
      headers: await getHeaders()
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error || res.statusText)
    }
    return res.json()
  },

  async getTracking(bookingId?: string): Promise<TrackingResponse> {
    const u = bookingId ? `?booking_id=${encodeURIComponent(bookingId)}` : ''
    const res = await fetch(`${getBase()}/tracking${u}`, { headers: await getHeaders() })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error || res.statusText)
    }
    return res.json()
  },

  async getTrips(params?: { status?: string; page?: number; limit?: number }) {
    const u = new URLSearchParams()
    if (params?.status) u.set('status', params.status)
    if (params?.page) u.set('page', String(params.page))
    if (params?.limit) u.set('limit', String(params.limit))
    const res = await fetch(`${getBase()}/trips?${u}`, { headers: await getHeaders() })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error || res.statusText)
    }
    return res.json() as Promise<PaginatedResponse<any>>
  },

  async updateTrip(body: { trip_id: string; status?: string }) {
    const res = await fetch(`${getBase()}/trips`, {
      method: 'PATCH',
      headers: await getHeaders(),
      body: JSON.stringify(body)
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error || res.statusText)
    }
    return res.json()
  }
}
