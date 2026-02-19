/**
 * Profile Synchronization Utility
 * 
 * Ensures user profile data stays synchronized between:
 * - Supabase Auth user_metadata
 * - profiles table in database
 * - localStorage cache
 */

import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'

export interface ProfileData {
  id: string
  email: string
  first_name: string
  last_name: string
  phone?: string
  address?: string
  emergency_contact?: string
  emergency_phone?: string
  role?: 'client' | 'operator' | 'admin'
}

/**
 * Syncs user profile from auth metadata to profiles table
 * Creates profile if it doesn't exist, updates if it does
 */
export async function syncUserProfile(user: User): Promise<ProfileData | null> {
  try {
    const supabase = createClient()

    console.log('🔄 [Profile Sync] Starting sync for user:', user.id)
    console.log('📊 [Profile Sync] User metadata:', user.user_metadata)

    // Extract profile data from user metadata with multiple fallback keys
    const firstName = user.user_metadata?.first_name || 
                     user.user_metadata?.firstName || 
                     user.user_metadata?.fname || ''
    
    const lastName = user.user_metadata?.last_name || 
                    user.user_metadata?.lastName || 
                    user.user_metadata?.lname || ''
    
    const phone = user.user_metadata?.phone || 
                 user.user_metadata?.phoneNumber || 
                 user.user_metadata?.phone_number || ''

    const address = user.user_metadata?.address || ''
    const emergencyContact = user.user_metadata?.emergency_contact || 
                            user.user_metadata?.emergencyContact || ''
    const emergencyPhone = user.user_metadata?.emergency_phone || 
                          user.user_metadata?.emergencyPhone || ''
    const role = user.user_metadata?.role || 'client'

    // Check if profile exists
    const { data: existingProfile, error: fetchError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle()

    if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 is "no rows returned"
      console.error('❌ [Profile Sync] Error fetching profile:', fetchError)
      return null
    }

    const profileData: any = {
      id: user.id,
      email: user.email!,
      first_name: firstName || existingProfile?.first_name || 'User',
      last_name: lastName || existingProfile?.last_name || '',
      phone: phone || existingProfile?.phone || '',
      address: address || existingProfile?.address || '',
      emergency_contact: emergencyContact || existingProfile?.emergency_contact || '',
      emergency_phone: emergencyPhone || existingProfile?.emergency_phone || '',
      role: role || existingProfile?.role || 'client',
      is_verified: user.email_confirmed_at ? true : false,
      is_active: true,
      updated_at: new Date().toISOString()
    }

    if (existingProfile) {
      // Update existing profile - only update if we have better data
      const updates: any = {
        updated_at: new Date().toISOString()
      }

      // Only update fields if new data is not empty
      if (firstName && firstName !== 'User') updates.first_name = firstName
      if (lastName) updates.last_name = lastName
      if (phone) updates.phone = phone
      if (address) updates.address = address
      if (emergencyContact) updates.emergency_contact = emergencyContact
      if (emergencyPhone) updates.emergency_phone = emergencyPhone
      if (user.email) updates.email = user.email

      console.log('🔄 [Profile Sync] Updating existing profile with:', updates)

      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id)
        .select()
        .single()

      if (error) {
        console.error('❌ [Profile Sync] Error updating profile:', error)
        return existingProfile as ProfileData
      }

      console.log('✅ [Profile Sync] Profile updated successfully')
      return data as ProfileData
    } else {
      // Create new profile
      profileData.created_at = new Date().toISOString()

      console.log('➕ [Profile Sync] Creating new profile:', profileData)

      const { data, error } = await supabase
        .from('profiles')
        .insert(profileData)
        .select()
        .single()

      if (error) {
        console.error('❌ [Profile Sync] Error creating profile:', error)
        
        // If insert fails due to unique constraint, try to fetch again
        const { data: retryData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()
        
        if (retryData) {
          console.log('✅ [Profile Sync] Profile exists after retry')
          return retryData as ProfileData
        }
        
        return null
      }

      console.log('✅ [Profile Sync] Profile created successfully')
      return data as ProfileData
    }
  } catch (error) {
    console.error('❌ [Profile Sync] Unexpected error:', error)
    return null
  }
}

/**
 * Loads user profile with caching and fallback logic
 */
export async function loadUserProfile(userId: string): Promise<ProfileData | null> {
  try {
    const supabase = createClient()

    console.log('📥 [Profile Load] Loading profile for user:', userId)

    // Try to load from database
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (error) {
      console.error('❌ [Profile Load] Error loading profile:', error)
      
      // Try to get user data and sync
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        console.log('🔄 [Profile Load] Profile not found, attempting sync')
        return await syncUserProfile(user)
      }
      
      return null
    }

    console.log('✅ [Profile Load] Profile loaded successfully')
    
    // Cache in localStorage (only if user is still logged in)
    try {
      if (typeof window !== 'undefined') {
        // Verify user session exists before caching
        const supabaseSession = localStorage.getItem('supabase.auth.token')
        if (supabaseSession) {
          localStorage.setItem(`profile_${userId}`, JSON.stringify(data))
          localStorage.setItem(`profile_${userId}_timestamp`, Date.now().toString())
        } else {
          console.warn('⚠️ [Profile Load] No active session, skipping cache')
        }
      }
    } catch (e) {
      console.warn('⚠️ [Profile Load] Could not cache profile in localStorage:', e)
    }

    return data as ProfileData
  } catch (error) {
    console.error('❌ [Profile Load] Unexpected error:', error)
    return null
  }
}

/**
 * Gets cached profile from localStorage
 * Returns null if cache is older than 5 minutes
 */
export function getCachedProfile(userId: string): ProfileData | null {
  try {
    const cached = localStorage.getItem(`profile_${userId}`)
    const timestamp = localStorage.getItem(`profile_${userId}_timestamp`)

    if (!cached || !timestamp) {
      return null
    }

    // Check if cache is still valid (5 minutes)
    const age = Date.now() - parseInt(timestamp)
    const MAX_AGE = 5 * 60 * 1000 // 5 minutes

    if (age > MAX_AGE) {
      console.log('⚠️ [Profile Cache] Cache expired, will refresh')
      return null
    }

    console.log('✅ [Profile Cache] Using cached profile')
    return JSON.parse(cached) as ProfileData
  } catch (error) {
    console.warn('⚠️ [Profile Cache] Error reading cache:', error)
    return null
  }
}

/**
 * Clears all cached profile data
 * Adds safeguards to prevent clearing during active user sessions
 * @param force - If true, bypass safeguards and clear cache anyway (use during logout)
 */
export function clearProfileCache(force: boolean = false) {
  try {
    // Safeguard: Only clear if explicitly requested (force flag) or if we're sure user is logged out
    if (!force && typeof window !== 'undefined') {
      // Check if user session still exists in localStorage (Supabase stores it)
      const supabaseSession = localStorage.getItem('supabase.auth.token')
      if (supabaseSession) {
        console.warn('⚠️ [Profile Cache] User session exists, not clearing cache (use force=true to override)')
        return
      }
    }

    // Clear all profile-related localStorage items
    const keys = Object.keys(localStorage)
    let cleared = 0
    
    keys.forEach(key => {
      if (key.startsWith('profile_') || 
          key === 'user' || 
          (key.startsWith('supabase.auth.token') && force)) {
        localStorage.removeItem(key)
        cleared++
      }
    })
    
    console.log(`✅ [Profile Cache] Cache cleared (${cleared} items)`)
  } catch (error) {
    console.warn('⚠️ [Profile Cache] Error clearing cache:', error)
  }
}

/**
 * Updates profile in both database and cache
 */
export async function updateUserProfile(
  userId: string, 
  updates: Partial<ProfileData>
): Promise<ProfileData | null> {
  try {
    const supabase = createClient()

    console.log('📝 [Profile Update] Updating profile:', updates)

    const { data, error } = await supabase
      .from('profiles')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single()

    if (error) {
      console.error('❌ [Profile Update] Error updating profile:', error)
      return null
    }

    // Update cache (only if user is still logged in)
    try {
      if (typeof window !== 'undefined') {
        // Verify user session exists before caching
        const supabaseSession = localStorage.getItem('supabase.auth.token')
        if (supabaseSession) {
          localStorage.setItem(`profile_${userId}`, JSON.stringify(data))
          localStorage.setItem(`profile_${userId}_timestamp`, Date.now().toString())
        } else {
          console.warn('⚠️ [Profile Update] No active session, skipping cache update')
        }
      }
    } catch (e) {
      console.warn('⚠️ [Profile Update] Could not update cache:', e)
    }

    // Also update user metadata in auth
    if (updates.first_name || updates.last_name || updates.phone) {
      await supabase.auth.updateUser({
        data: {
          first_name: updates.first_name,
          last_name: updates.last_name,
          phone: updates.phone
        }
      })
    }

    console.log('✅ [Profile Update] Profile updated successfully')
    return data as ProfileData
  } catch (error) {
    console.error('❌ [Profile Update] Unexpected error:', error)
    return null
  }
}

/**
 * Ensures profile exists and is synced for current user
 * Call this on app initialization
 */
export async function ensureProfileExists(): Promise<ProfileData | null> {
  try {
    const supabase = createClient()
    
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) {
      console.log('⚠️ [Profile Ensure] No authenticated user')
      return null
    }

    console.log('🔍 [Profile Ensure] Checking profile for user:', user.id)

    // Try to get cached profile first
    const cached = getCachedProfile(user.id)
    if (cached) {
      // Verify it still exists in database in background
      loadUserProfile(user.id).catch(e => console.error('Background profile verification failed:', e))
      return cached
    }

    // Load or sync profile
    let profile = await loadUserProfile(user.id)
    
    if (!profile) {
      console.log('🔄 [Profile Ensure] Profile not found, syncing from auth')
      profile = await syncUserProfile(user)
    }

    return profile
  } catch (error) {
    console.error('❌ [Profile Ensure] Unexpected error:', error)
    return null
  }
}




