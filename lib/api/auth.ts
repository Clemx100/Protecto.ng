// Authentication API functions for Protector.Ng
import { createClient } from '@/lib/supabase/client'
import { Profile, UserRole, ApiResponse } from '@/lib/types/database'
import { withTimeout } from '@/lib/utils/async-timeout'

const supabase = createClient()
const AUTH_TIMEOUT_MS = 15000

function profileFromAuthUser(user: {
  id: string
  email?: string | null
  user_metadata?: Record<string, unknown>
}): Profile {
  return {
    id: user.id,
    email: user.email || '',
    first_name: String(user.user_metadata?.first_name || user.user_metadata?.firstName || 'User'),
    last_name: String(user.user_metadata?.last_name || user.user_metadata?.lastName || ''),
    role: (user.user_metadata?.role as UserRole) || 'client',
    is_verified: true,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
}

export class AuthAPI {
  // Sign up new user
  static async signUp(
    email: string,
    password: string,
    userData: {
      firstName: string;
      lastName: string;
      phone?: string;
      role?: UserRole;
    }
  ): Promise<ApiResponse<Profile>> {
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: userData.firstName,
            last_name: userData.lastName,
            role: userData.role || 'client'
          }
        }
      })

      if (authError) {
        return { data: null as any, error: authError.message }
      }

      if (!authData.user) {
        return { data: null as any, error: 'Failed to create user' }
      }

      // Create profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: authData.user.id,
          email,
          first_name: userData.firstName,
          last_name: userData.lastName,
          phone: userData.phone,
          role: userData.role || 'client'
        })
        .select()
        .single()

      if (profileError) {
        return { data: null as any, error: profileError.message }
      }

      return { data: profile, message: 'User created successfully' }
    } catch (error) {
      return { data: null as any, error: 'Failed to create user' }
    }
  }

  // Sign in user
  static async signIn(email: string, password: string): Promise<ApiResponse<Profile>> {
    try {
      const { data: authData, error: authError } = await withTimeout(
        supabase.auth.signInWithPassword({ email, password }),
        AUTH_TIMEOUT_MS,
        'Sign in timed out. Check your connection and try again.',
      )

      if (authError) {
        return { data: null as any, error: authError.message }
      }

      if (!authData.user) {
        return { data: null as any, error: 'Failed to sign in' }
      }

      try {
        const { data: profile, error: profileError } = await withTimeout(
          Promise.resolve(supabase.from('profiles').select('*').eq('id', authData.user.id).single()),
          AUTH_TIMEOUT_MS,
          'Profile fetch timed out',
        )

        if (profileError) {
          return { data: profileFromAuthUser(authData.user), message: 'Signed in successfully' }
        }

        return { data: profile, message: 'Signed in successfully' }
      } catch {
        return { data: profileFromAuthUser(authData.user), message: 'Signed in successfully' }
      }
    } catch (error) {
      return {
        data: null as any,
        error: error instanceof Error ? error.message : 'Failed to sign in',
      }
    }
  }

  // Sign out user
  static async signOut(): Promise<ApiResponse<null>> {
    try {
      const { error } = await supabase.auth.signOut()
      
      if (error) {
        return { data: null, error: error.message }
      }

      return { data: null, message: 'Signed out successfully' }
    } catch (error) {
      return { data: null, error: 'Failed to sign out' }
    }
  }

  // Get current user profile
  static async getCurrentUser(): Promise<ApiResponse<Profile>> {
    try {
      const {
        data: { user },
      } = await withTimeout(
        supabase.auth.getUser(),
        AUTH_TIMEOUT_MS,
        'Authentication check timed out',
      )

      if (!user) {
        return { data: null as any, error: 'User not authenticated' }
      }

      try {
        const { data: profile, error } = await withTimeout(
          Promise.resolve(supabase.from('profiles').select('*').eq('id', user.id).single()),
          AUTH_TIMEOUT_MS,
          'Profile fetch timed out',
        )

        if (error) {
          return { data: profileFromAuthUser(user), message: 'User profile retrieved successfully' }
        }

        return { data: profile, message: 'User profile retrieved successfully' }
      } catch {
        return { data: profileFromAuthUser(user), message: 'User profile retrieved successfully' }
      }
    } catch (error) {
      return {
        data: null as any,
        error: error instanceof Error ? error.message : 'Failed to get user profile',
      }
    }
  }

  // Update user profile
  static async updateProfile(
    profileId: string,
    updates: Partial<Profile>
  ): Promise<ApiResponse<Profile>> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', profileId)
        .select()
        .single()

      if (error) {
        return { data: null as any, error: error.message }
      }

      return { data, message: 'Profile updated successfully' }
    } catch (error) {
      return { data: null as any, error: 'Failed to update profile' }
    }
  }

  // Register as agent
  static async registerAgent(
    agentData: {
      licenseNumber: string;
      qualifications: string[];
      experienceYears: number;
      isArmed: boolean;
      weaponLicense?: string;
    }
  ): Promise<ApiResponse<any>> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        return { data: null, error: 'User not authenticated' }
      }

      // Update profile role to agent
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ role: 'agent' })
        .eq('id', user.id)

      if (profileError) {
        return { data: null, error: profileError.message }
      }

      // Generate agent code
      const agentCode = `AGT${Date.now().toString().slice(-6)}`

      // Create agent record
      const { data, error } = await supabase
        .from('agents')
        .insert({
          id: user.id,
          agent_code: agentCode,
          license_number: agentData.licenseNumber,
          qualifications: agentData.qualifications,
          experience_years: agentData.experienceYears,
          is_armed: agentData.isArmed,
          weapon_license: agentData.weaponLicense,
          background_check_status: 'pending'
        })
        .select()
        .single()

      if (error) {
        return { data: null, error: error.message }
      }

      return { data, message: 'Agent registration submitted successfully' }
    } catch (error) {
      return { data: null, error: 'Failed to register as agent' }
    }
  }

  // Reset password
  static async resetPassword(email: string): Promise<ApiResponse<null>> {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      })

      if (error) {
        return { data: null, error: error.message }
      }

      return { data: null, message: 'Password reset email sent' }
    } catch (error) {
      return { data: null, error: 'Failed to send password reset email' }
    }
  }

  // Update password
  static async updatePassword(newPassword: string): Promise<ApiResponse<null>> {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      })

      if (error) {
        return { data: null, error: error.message }
      }

      return { data: null, message: 'Password updated successfully' }
    } catch (error) {
      return { data: null, error: 'Failed to update password' }
    }
  }

  // Check if user is authenticated
  static async isAuthenticated(): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      return !!user
    } catch (error) {
      return false
    }
  }

  // Get user role
  static async getUserRole(): Promise<UserRole | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        return null
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      return profile?.role || null
    } catch (error) {
      return null
    }
  }
}

