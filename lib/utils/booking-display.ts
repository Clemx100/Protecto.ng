type ParsedInstructions = {
  quick_service_type?: 'itinerary_planning' | 'private_home_security'
  quick_service_label?: string
  description?: string
  address?: string
  selectedProtectorName?: string | null
  protector_listing_id?: string | null
  selectedProtectorPhoto?: string | null
  dressCode?: string | null
  dressCodeId?: string | null
  personnel?: { dressCode?: string | null; protectors?: number | null; protectees?: number | null }
  vehicles?: Record<string, number>
  mode?: string
  with_driver?: boolean
}

const KNOWN_LOCATION_TERMS = [
  "victoria island",
  "port harcourt",
  "obafemi owode",
  "banana island",
  "lekki phase 1",
  "lekki phase 2",
  "ikeja",
  "lekki",
  "yaba",
  "surulere",
  "ajah",
  "magodo",
  "maryland",
  "gbagada",
  "ikoyi",
  "vi",
  "abuja",
  "ibadan",
  "lagos",
  "ogun",
  "kano",
  "enugu",
  "benin",
  "owerri",
  "abeokuta",
  "calabar",
  "uyo",
  "kaduna",
  "jos",
]

export function parseBookingSpecialInstructions(
  specialInstructions: unknown,
): ParsedInstructions | null {
  if (!specialInstructions) return null
  if (typeof specialInstructions === "object") {
    return specialInstructions as ParsedInstructions
  }
  if (typeof specialInstructions !== "string") return null

  try {
    return JSON.parse(specialInstructions) as ParsedInstructions
  } catch {
    return null
  }
}

function slugifyLocation(value: string): string {
  return (
    value
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^\w\s-]/g, " ")
      .trim()
      .replace(/\s+/g, " ")
      .replace(/^-|-$/g, "") || "unknown"
  )
}

export function shortLocationLabel(address?: string | null): string {
  if (!address?.trim()) return "unknown"

  const lower = address.toLowerCase()
  const sortedTerms = [...KNOWN_LOCATION_TERMS].sort((a, b) => b.length - a.length)

  for (const term of sortedTerms) {
    if (lower.includes(term)) {
      return slugifyLocation(term)
    }
  }

  const firstSegment = address.split(",")[0]?.trim() || address.trim()
  const words = firstSegment.split(/\s+/).slice(0, 2).join(" ")
  return slugifyLocation(words || firstSegment)
}

export function isVehicleBooking(input: {
  service_type?: string | null
  type?: string | null
  serviceType?: string | null
  booking_mode?: string | null
  special_instructions?: unknown
  protector_count?: number | null
  dress_code?: string | null
}): boolean {
  const parsed = parseBookingSpecialInstructions(input.special_instructions)
  const mode = (parsed?.mode || input.booking_mode || "").toLowerCase().replace(/-/g, "_")
  const service = `${input.service_type || input.serviceType || input.type || ""}`.toLowerCase()

  if (mode === "vehicle_only") return true

  if (
    service.includes("vehicle") ||
    service.includes("car-only") ||
    service.includes("car_only") ||
    service.includes("car only") ||
    service.includes("armored_vehicle")
  ) {
    return true
  }

  const vehicles = parsed?.vehicles
  if (!vehicles || typeof vehicles !== "object") return false

  const hasFleet = Object.values(vehicles).some((count) => Number(count) > 0)
  if (!hasFleet) return false

  const hasProtectorListing = Boolean(parsed?.protector_listing_id)
  const personnel = parsed?.personnel
  const hasExplicitPersonnel =
    Boolean(personnel) &&
    (personnel?.protectors !== undefined ||
      personnel?.protectees !== undefined ||
      Boolean(personnel?.dressCode))

  const hasProtectorPersonnel = hasExplicitPersonnel
    ? Number(personnel?.protectors ?? 0) > 0 || Number(personnel?.protectees ?? 0) > 0
    : false

  const hasDressCode = Boolean(input.dress_code || parsed?.dressCodeId || personnel?.dressCode)
  const hasProtectorPhoto = Boolean(parsed?.selectedProtectorPhoto || parsed?.selectedProtectorName)

  if (parsed?.with_driver) return true

  if (!hasProtectorListing && !hasDressCode && !hasProtectorPhoto && !hasProtectorPersonnel) {
    return true
  }

  return false
}

export function resolveBookingServiceLabel(input: {
  service_type?: string | null
  type?: string | null
  serviceType?: string | null
  booking_mode?: string | null
  special_instructions?: unknown
  protector_count?: number | null
  dress_code?: string | null
}): "Protector" | "Vehicle" {
  return isVehicleBooking(input) ? "Vehicle" : "Protector"
}

export function resolveBookingRouteLabel(
  pickupAddress?: string | null,
  destinationAddress?: string | null,
): string {
  const pickup = shortLocationLabel(pickupAddress)
  const destination = shortLocationLabel(destinationAddress)

  if (destination === "unknown" || destination === pickup) {
    return pickup
  }

  return `${pickup} => ${destination}`
}

export function resolveBookingDisplayName(input: {
  service_type?: string | null
  type?: string | null
  serviceType?: string | null
  booking_mode?: string | null
  pickup_address?: string | null
  destination_address?: string | null
  pickupLocation?: string | null
  destination?: string | null
  special_instructions?: unknown
  protector_count?: number | null
  dress_code?: string | null
}): string {
  const parsed = parseBookingSpecialInstructions(input.special_instructions)
  if (parsed?.quick_service_type) {
    const label = parsed.quick_service_label || 'Quick Service'
    if (parsed.quick_service_type === 'private_home_security') {
      const location = shortLocationLabel(parsed.address || input.pickup_address || input.pickupLocation)
      return `${label} | ${location}`
    }
    return label
  }

  const service = resolveBookingServiceLabel(input)
  const route = resolveBookingRouteLabel(
    input.pickup_address || input.pickupLocation,
    input.destination_address || input.destination,
  )

  return `${service}| ${route}`
}

/** @deprecated Use resolveBookingDisplayName for UI titles */
export function resolveProtectorDisplayName(booking: {
  service_type?: string | null
  type?: string | null
  booking_mode?: string | null
  pickup_address?: string | null
  destination_address?: string | null
  special_instructions?: unknown
}): string {
  return resolveBookingDisplayName(booking)
}

const VEHICLE_NAME_BY_ID: Record<string, string> = {
  escalade: "Toyota Land Cruiser 300 Armored",
  sedan: "Armored Lexus LX 570",
  suv: "BMW X7",
  van: "Mercedes Sprinter",
  armoredSedan: "Armored Mercedes S-Class",
  armoredSuv: "Armored BMW X7",
}

export const VEHICLE_IMAGE_BY_ID: Record<string, string> = {
  escalade: "/images/PRADO/prado3.jpeg",
  sedan: "/images/PRADO/Lexus1.jpg",
  suv: "/black-bmw-x7-suv.png",
  van: "/black-mercedes-sprinter-van.png",
  armoredSedan: "/armored-black-sedan.png",
  armoredSuv: "/armored-black-suv.png",
}

const DEFAULT_VEHICLE_IMAGE = "/armored-black-suv.png"
const DEFAULT_PROTECTOR_IMAGE = "/images/business-formal-agent.png"

const DRESS_CODE_IMAGE_BY_KEY: Record<string, string> = {
  tactical_casual: "/images/tactical-casual-agent.png",
  business_casual: "/images/business-casual-agent.png",
  business_formal: "/images/business-formal-agent.png",
  tactical_gear: "/images/tactical-operator.png",
  operator: "/images/tactical-operator.png",
  plainclothes: "/images/business-casual-agent.png",
}

function normalizeDressCodeKey(value: string): string {
  return value.toLowerCase().trim().replace(/[\s-]+/g, "_")
}

function resolveDressCodeImage(value?: string | null): string | null {
  if (!value?.trim()) return null
  const key = normalizeDressCodeKey(value)
  return DRESS_CODE_IMAGE_BY_KEY[key] || null
}

export function getPrimaryBookedVehicleId(specialInstructions: unknown): string | null {
  const parsed = parseBookingSpecialInstructions(specialInstructions)
  const vehicles = parsed?.vehicles
  if (!vehicles || typeof vehicles !== "object") return null

  const selected = Object.entries(vehicles)
    .map(([vehicleId, count]) => ({ vehicleId, count: Number(count) }))
    .filter((entry) => Number.isFinite(entry.count) && entry.count > 0)

  return selected[0]?.vehicleId || null
}

export function resolveVehicleImage(vehicleId?: string | null): string {
  if (!vehicleId) return DEFAULT_VEHICLE_IMAGE
  return VEHICLE_IMAGE_BY_ID[vehicleId] || DEFAULT_VEHICLE_IMAGE
}

export function resolveBookingAvatarImage(input: {
  service_type?: string | null
  type?: string | null
  serviceType?: string | null
  booking_mode?: string | null
  dress_code?: string | null
  special_instructions?: unknown
  protector_count?: number | null
  assigned_agent?: {
    profile?: { avatar_url?: string | null }
    profile_image?: string | null
  } | null
  protector_listing?: { photos?: string[] | null } | null
}): string {
  const isVehicle = isVehicleBooking(input)

  if (isVehicle) {
    const vehicleId = getPrimaryBookedVehicleId(input.special_instructions)
    return resolveVehicleImage(vehicleId)
  }

  const listingPhoto = input.protector_listing?.photos?.find(Boolean)
  if (listingPhoto) return listingPhoto

  const parsed = parseBookingSpecialInstructions(input.special_instructions)
  if (parsed?.selectedProtectorPhoto) {
    return parsed.selectedProtectorPhoto
  }

  const dressCodeCandidates = [
    input.dress_code,
    parsed?.dressCodeId,
    parsed?.dressCode,
    parsed?.personnel?.dressCode,
  ]

  for (const candidate of dressCodeCandidates) {
    const image = resolveDressCodeImage(candidate)
    if (image) return image
  }

  const agentAvatar =
    input.assigned_agent?.profile?.avatar_url || input.assigned_agent?.profile_image
  if (agentAvatar) return agentAvatar

  return DEFAULT_PROTECTOR_IMAGE
}

export function resolveVehicleDisplayName(booking: {
  assigned_vehicle?: { make?: string; model?: string } | null
  special_instructions?: unknown
}): string | null {
  const vehicle = booking.assigned_vehicle
  if (vehicle?.make && vehicle?.model) {
    return `${vehicle.make} ${vehicle.model}`.trim()
  }
  if (vehicle?.model) return vehicle.model

  const parsed = parseBookingSpecialInstructions(booking.special_instructions)
  const vehicles = parsed?.vehicles
  if (!vehicles || typeof vehicles !== "object") return null

  const selected = Object.entries(vehicles)
    .map(([vehicleId, count]) => ({
      vehicleId,
      count: Number(count),
    }))
    .filter((entry) => Number.isFinite(entry.count) && entry.count > 0)

  if (selected.length === 0) return null

  return selected
    .map(({ vehicleId, count }) => {
      const name =
        VEHICLE_NAME_BY_ID[vehicleId] ||
        vehicleId
          .replace(/([a-z])([A-Z])/g, "$1 $2")
          .replace(/[_-]+/g, " ")
          .replace(/\b\w/g, (char) => char.toUpperCase())
      return count > 1 ? `${name} x${count}` : name
    })
    .join(", ")
}

export function resolveBookingEtaLabel(
  status: string,
  scheduledTime?: string,
  formatTime?: (time: string) => string,
): string {
  const normalized = (status || "").toLowerCase().replace(/[\s-]+/g, "_")

  const statusMap: Record<string, string> = {
    en_route: "8 mins",
    arrived: "Arrived",
    accepted: "15 mins",
    in_service: "In Service",
    completed: "Completed",
    cancelled: "Cancelled",
  }

  if (statusMap[normalized]) return statusMap[normalized]

  if (scheduledTime && formatTime) {
    return formatTime(scheduledTime)
  }

  return "Awaiting assignment"
}

export const BOOKING_RELATION_SELECT = `
  *,
  assigned_agent:agents(
    id,
    agent_code,
    rating,
    profile:profiles(first_name, last_name, avatar_url)
  ),
  assigned_vehicle:vehicles(id, make, model),
  protector_listing:protector_listings(display_name, photos)
`
