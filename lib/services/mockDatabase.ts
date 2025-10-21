/**
 * Mock Database Service for Protector.Ng
 * Provides fallback functionality when Supabase is unavailable
 */

interface MockUser {
  id: string;
  email: string;
  role: 'client' | 'operator' | 'admin' | 'agent';
  profile_completed: boolean;
  phone_number?: string;
  address?: string;
  emergency_contact?: string;
  full_name?: string;
}

interface MockBooking {
  id: string;
  client_id: string;
  type: string;
  status: string;
  pickup_location: string;
  destination?: string;
  cost: string;
  created_at: string;
  protector_name?: string;
  vehicle_type?: string;
}

interface MockMessage {
  id: string;
  sender_id: string;
  sender_type: 'client' | 'operator' | 'system';
  message: string;
  booking_id?: string;
  created_at: string;
}

class MockDatabase {
  private users: MockUser[] = [];
  private bookings: MockBooking[] = [];
  private messages: MockMessage[] = [];

  constructor() {
    this.initializeMockData();
  }

  private initializeMockData() {
    // Create mock operator user
    this.users.push({
      id: 'operator-1',
      email: 'iwewezinemstephen@gmail.com',
      role: 'operator',
      profile_completed: true,
      full_name: 'Stephen Iwewezinem',
      phone_number: '+234 123 456 7890',
      address: 'Lagos, Nigeria',
      emergency_contact: '+234 987 654 3210'
    });

    // Create mock client user
    this.users.push({
      id: 'client-1',
      email: 'client@example.com',
      role: 'client',
      profile_completed: false,
      full_name: 'John Doe'
    });

    // Create mock bookings
    this.bookings.push({
      id: 'booking-1',
      client_id: 'client-1',
      type: 'Armed Protection',
      status: 'pending',
      pickup_location: 'Victoria Island, Lagos',
      destination: 'Murtala Muhammed Airport',
      cost: '₦50,000',
      created_at: new Date().toISOString(),
      protector_name: 'Agent Smith',
      vehicle_type: 'Black SUV'
    });

    // Create mock messages
    this.messages.push({
      id: 'msg-1',
      sender_id: 'system',
      sender_type: 'system',
      message: 'Welcome to Protector.Ng! Your security request has been received.',
      booking_id: 'booking-1',
      created_at: new Date().toISOString()
    });
  }

  // User operations
  async getUserByEmail(email: string): Promise<MockUser | null> {
    return this.users.find(user => user.email === email) || null;
  }

  async getUserById(id: string): Promise<MockUser | null> {
    return this.users.find(user => user.id === id) || null;
  }

  async updateUserProfile(id: string, updates: Partial<MockUser>): Promise<MockUser | null> {
    const userIndex = this.users.findIndex(user => user.id === id);
    if (userIndex === -1) return null;

    this.users[userIndex] = { ...this.users[userIndex], ...updates };
    return this.users[userIndex];
  }

  // Booking operations
  async getBookingsByClientId(clientId: string): Promise<MockBooking[]> {
    return this.bookings.filter(booking => booking.client_id === clientId);
  }

  async getAllBookings(): Promise<MockBooking[]> {
    return this.bookings;
  }

  async createBooking(booking: Omit<MockBooking, 'id' | 'created_at'>): Promise<MockBooking> {
    const newBooking: MockBooking = {
      ...booking,
      id: `booking-${Date.now()}`,
      created_at: new Date().toISOString()
    };
    this.bookings.push(newBooking);
    return newBooking;
  }

  // Message operations
  async getMessagesByBookingId(bookingId: string): Promise<MockMessage[]> {
    return this.messages.filter(msg => msg.booking_id === bookingId);
  }

  async createMessage(message: Omit<MockMessage, 'id' | 'created_at'>): Promise<MockMessage> {
    const newMessage: MockMessage = {
      ...message,
      id: `msg-${Date.now()}`,
      created_at: new Date().toISOString()
    };
    this.messages.push(newMessage);
    return newMessage;
  }

  // Store passwords for mock users (in production, these would be hashed)
  private passwords: Map<string, string> = new Map([
    ['operator-1', 'OperatorSecure2024!'],
    ['client-1', 'ClientPass123!']
  ]);

  // Authentication simulation
  async authenticateUser(email: string, password: string): Promise<{ user: MockUser | null; error: string | null }> {
    const user = await this.getUserByEmail(email);
    
    if (!user) {
      console.log('❌ Mock auth: User not found for email:', email);
      return { user: null, error: 'Invalid email or password' };
    }

    // Verify password (in production, this would compare password hashes)
    const storedPassword = this.passwords.get(user.id);
    
    if (!storedPassword) {
      console.log('❌ Mock auth: No password set for user:', user.id);
      return { user: null, error: 'Invalid email or password' };
    }

    if (password !== storedPassword) {
      console.log('❌ Mock auth: Invalid password for user:', email);
      return { user: null, error: 'Invalid email or password' };
    }

    console.log('✅ Mock auth: Password verified for user:', email);
    return { user, error: null };
  }
}

// Export singleton instance
export const mockDatabase = new MockDatabase();

// Export types for use in other files
export type { MockUser, MockBooking, MockMessage };

