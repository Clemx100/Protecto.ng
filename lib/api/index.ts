// Central API exports for Protector.Ng
export { AuthAPI } from './auth'
export { BookingAPI } from './bookings'
export { ServicesAPI } from './services'
export { RealtimeAPI } from './realtime'
export { PaymentAPI } from './payments'
export { AdminAPI } from './admin'
export { AdminAnalyticsAPI } from './admin-analytics'

// Re-export types
export type {
  Profile,
  Agent,
  Vehicle,
  Service,
  Location,
  Booking,
  BookingWithDetails,
  Payment,
  EmergencyAlert,
  Message,
  LocationTracking,
  RatingReview,
  PromoCode,
  Notification,
  UserRole,
  BookingStatus,
  ServiceType,
  VehicleType,
  DressCode,
  PaymentStatus,
  EmergencyStatus,
  ApiResponse,
  PaginatedResponse,
  CreateBookingRequest,
  UpdateBookingRequest,
  CreatePaymentRequest,
  SendMessageRequest,
  CreateEmergencyAlertRequest,
  UpdateLocationRequest,
  CreateRatingRequest
} from '../types/database'
