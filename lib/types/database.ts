// Database types for Protector.Ng
// Generated from Supabase schema

export type UserRole = 'client' | 'agent' | 'admin';
export type BookingStatus = 'pending' | 'accepted' | 'en_route' | 'arrived' | 'in_service' | 'completed' | 'cancelled';
export type ServiceType = 'armed_protection' | 'unarmed_protection' | 'armored_vehicle' | 'convoy' | 'event_security';
export type VehicleType = 'sedan' | 'suv' | 'van' | 'motorcade';
export type DressCode = 'business_formal' | 'business_casual' | 'tactical_casual' | 'tactical_gear' | 'plainclothes';
export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded';
export type EmergencyStatus = 'active' | 'resolved' | 'false_alarm';

export interface Profile {
  id: string;
  email: string;
  phone?: string;
  first_name: string;
  last_name: string;
  role: UserRole;
  avatar_url?: string;
  address?: string;
  emergency_contact?: string;
  emergency_phone?: string;
  is_verified: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Agent {
  id: string;
  agent_code: string;
  license_number?: string;
  qualifications: string[];
  experience_years: number;
  rating: number;
  total_jobs: number;
  is_armed: boolean;
  weapon_license?: string;
  background_check_status: string;
  availability_status: string;
  current_location?: {
    x: number;
    y: number;
  };
  last_seen: string;
  created_at: string;
  updated_at: string;
}

export interface Vehicle {
  id: string;
  vehicle_code: string;
  make: string;
  model: string;
  year: number;
  type: VehicleType;
  is_armored: boolean;
  capacity: number;
  license_plate: string;
  color?: string;
  features: string[];
  is_available: boolean;
  current_location?: {
    x: number;
    y: number;
  };
  last_maintenance?: string;
  created_at: string;
  updated_at: string;
}

export interface Service {
  id: string;
  name: string;
  type: ServiceType;
  description?: string;
  base_price: number;
  price_per_hour?: number;
  minimum_duration: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Location {
  id: string;
  name: string;
  address: string;
  coordinates: {
    x: number;
    y: number;
  };
  city: string;
  state: string;
  country: string;
  is_high_risk: boolean;
  surge_multiplier: number;
  created_at: string;
  updated_at: string;
}

export interface Booking {
  id: string;
  booking_code: string;
  client_id: string;
  service_id: string;
  status: BookingStatus;
  service_type: ServiceType;
  protector_count: number;
  protectee_count: number;
  dress_code?: DressCode;
  duration_hours: number;
  pickup_location_id?: string;
  pickup_address: string;
  pickup_coordinates: {
    x: number;
    y: number;
  };
  destination_address?: string;
  destination_coordinates?: {
    x: number;
    y: number;
  };
  scheduled_date: string;
  scheduled_time: string;
  actual_start_time?: string;
  actual_end_time?: string;
  base_price: number;
  surge_multiplier: number;
  total_price: number;
  assigned_agent_id?: string;
  assigned_vehicle_id?: string;
  special_instructions?: string;
  emergency_contact?: string;
  emergency_phone?: string;
  created_at: string;
  updated_at: string;
}

export interface BookingVehicle {
  id: string;
  booking_id: string;
  vehicle_id: string;
  driver_id?: string;
  created_at: string;
}

export interface Payment {
  id: string;
  booking_id: string;
  client_id: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  payment_method: string;
  payment_reference?: string;
  gateway_response?: any;
  processed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface EmergencyAlert {
  id: string;
  client_id: string;
  booking_id?: string;
  alert_type: string;
  status: EmergencyStatus;
  location: {
    x: number;
    y: number;
  };
  address?: string;
  description?: string;
  responded_by?: string;
  response_time?: number;
  resolved_at?: string;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  booking_id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  message_type: string;
  is_encrypted: boolean;
  read_at?: string;
  created_at: string;
}

export interface LocationTracking {
  id: string;
  booking_id: string;
  agent_id: string;
  vehicle_id?: string;
  location: {
    x: number;
    y: number;
  };
  heading?: number;
  speed?: number;
  accuracy?: number;
  timestamp: string;
}

export interface RatingReview {
  id: string;
  booking_id: string;
  client_id: string;
  agent_id: string;
  rating: number;
  review?: string;
  created_at: string;
}

export interface PromoCode {
  id: string;
  code: string;
  description?: string;
  discount_type: string;
  discount_value: number;
  max_uses?: number;
  used_count: number;
  is_active: boolean;
  valid_from: string;
  valid_until?: string;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  data?: any;
  is_read: boolean;
  created_at: string;
}

// Extended types with relationships
export interface BookingWithDetails extends Booking {
  client: Profile;
  service: Service;
  assigned_agent?: Agent;
  assigned_vehicle?: Vehicle;
  pickup_location?: Location;
  payments: Payment[];
  messages: Message[];
}

export interface AgentWithProfile extends Agent {
  profile: Profile;
}

export interface VehicleWithDriver extends Vehicle {
  current_driver?: Agent;
}

// API Response types
export interface ApiResponse<T> {
  data: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  count: number;
  page: number;
  limit: number;
  total_pages: number;
}

// Request types
export interface CreateBookingRequest {
  service_id: string;
  service_type: ServiceType;
  protector_count: number;
  protectee_count: number;
  dress_code?: DressCode;
  duration_hours: number;
  pickup_address: string;
  pickup_coordinates: {
    x: number;
    y: number;
  };
  destination_address?: string;
  destination_coordinates?: {
    x: number;
    y: number;
  };
  scheduled_date: string;
  scheduled_time: string;
  special_instructions?: string;
  emergency_contact?: string;
  emergency_phone?: string;
}

export interface UpdateBookingRequest {
  status?: BookingStatus;
  assigned_agent_id?: string;
  assigned_vehicle_id?: string;
  special_instructions?: string;
}

export interface CreatePaymentRequest {
  booking_id: string;
  amount: number;
  payment_method: string;
  payment_reference?: string;
}

export interface SendMessageRequest {
  booking_id: string;
  recipient_id: string;
  content: string;
  message_type?: string;
}

export interface CreateEmergencyAlertRequest {
  booking_id?: string;
  alert_type: string;
  location: {
    x: number;
    y: number;
  };
  address?: string;
  description?: string;
}

export interface UpdateLocationRequest {
  booking_id: string;
  location: {
    x: number;
    y: number;
  };
  heading?: number;
  speed?: number;
  accuracy?: number;
}

export interface CreateRatingRequest {
  booking_id: string;
  agent_id: string;
  rating: number;
  review?: string;
}

