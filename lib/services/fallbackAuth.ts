/**
 * Fallback Authentication Service for Protector.Ng
 * Provides authentication when Supabase is unavailable
 */

import { mockDatabase, MockUser } from './mockDatabase';

export interface AuthResult {
  user: MockUser | null;
  error: string | null;
}

export class FallbackAuthService {
  private static instance: FallbackAuthService;
  private currentUser: MockUser | null = null;

  static getInstance(): FallbackAuthService {
    if (!FallbackAuthService.instance) {
      FallbackAuthService.instance = new FallbackAuthService();
    }
    return FallbackAuthService.instance;
  }

  async signInWithPassword(email: string, password: string): Promise<AuthResult> {
    try {
      console.log('🔐 Fallback auth: Attempting login for', email);
      
      const result = await mockDatabase.authenticateUser(email, password);
      
      if (result.user) {
        this.currentUser = result.user;
        console.log('✅ Fallback auth: Login successful for', email);
      }
      
      return result;
    } catch (error) {
      console.error('❌ Fallback auth error:', error);
      return { user: null, error: 'Authentication failed' };
    }
  }

  async getCurrentUser(): Promise<MockUser | null> {
    return this.currentUser;
  }

  async signOut(): Promise<void> {
    this.currentUser = null;
    console.log('👋 Fallback auth: User signed out');
  }

  async getUserProfile(userId: string): Promise<MockUser | null> {
    return await mockDatabase.getUserById(userId);
  }

  async updateUserProfile(userId: string, updates: Partial<MockUser>): Promise<MockUser | null> {
    const updatedUser = await mockDatabase.updateUserProfile(userId, updates);
    if (updatedUser && this.currentUser?.id === userId) {
      this.currentUser = updatedUser;
    }
    return updatedUser;
  }

  // Check if user has required role
  hasRole(user: MockUser | null, requiredRoles: string[]): boolean {
    if (!user) return false;
    return requiredRoles.includes(user.role);
  }

  // Get user's bookings
  async getUserBookings(userId: string) {
    return await mockDatabase.getBookingsByClientId(userId);
  }

  // Get all bookings (for operators)
  async getAllBookings() {
    return await mockDatabase.getAllBookings();
  }

  // Get messages for a booking
  async getBookingMessages(bookingId: string) {
    return await mockDatabase.getMessagesByBookingId(bookingId);
  }

  // Send a message
  async sendMessage(message: {
    sender_id: string;
    sender_type: 'client' | 'operator' | 'system';
    message: string;
    booking_id?: string;
  }) {
    return await mockDatabase.createMessage(message);
  }
}

// Export singleton instance
export const fallbackAuth = FallbackAuthService.getInstance();
