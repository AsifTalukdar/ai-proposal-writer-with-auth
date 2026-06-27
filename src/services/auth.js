import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env.local')
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

/**
 * Sign up with email + password (requires valid invite code)
 */
export async function signupWithEmail(email, password, fullName, inviteCode) {
  try {
    // 1. Validate invite code first
    const validateRes = await fetch('/api/invites?action=validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: inviteCode })
    })
    const validateData = await validateRes.json()

    if (!validateData.valid) {
      throw new Error(validateData.message || 'Invalid or expired invite code')
    }

    // 2. Sign up with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName }
      }
    })

    if (authError) throw new Error(authError.message)
    if (!authData.user) throw new Error('Signup failed')



    // 4. Mark invite as used
    const useRes = await fetch('/api/invites?action=use', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: inviteCode, user_id: authData.user.id })
    })

    if (!useRes.ok) console.warn('Failed to mark invite as used')

    // 5. Initialize usage for current month
    const monthYear = new Date().toISOString().slice(0, 7) // YYYY-MM
    const { error: usageError } = await supabase
      .from('usage')
      .insert({
        user_id: authData.user.id,
        proposal_count: 0,
        month_year: monthYear
      })

    if (usageError && !usageError.message.includes('duplicate')) {
      console.warn('Usage tracking setup failed:', usageError)
    }

    return { user: authData.user, error: null }
  } catch (err) {
    return { user: null, error: err.message }
  }
}

/**
 * Sign in with email + password
 */
export async function signInWithEmail(email, password) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw new Error(error.message)
    return { user: data.user, session: data.session, error: null }
  } catch (err) {
    return { user: null, session: null, error: err.message }
  }
}

/**
 * Sign in with Google OAuth
 */
export async function signInWithGoogle(inviteCode = null) {
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?invite=${inviteCode || ''}`
      }
    })
    if (error) throw new Error(error.message)
    return { error: null }
  } catch (err) {
    return { error: err.message }
  }
}

/**
 * Handle OAuth callback (called from redirect URL)
 */
export async function handleOAuthCallback(inviteCode = null) {
  try {
    const { data: { session }, error } = await supabase.auth.getSession()
    if (error) throw new Error(error.message)
    if (!session) throw new Error('No session found')

    // Check if user profile exists
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', session.user.id)
      .single()

    // If new user, create profile
    if (profileError && profileError.code === 'PGRST116') {
      // Validate invite if provided
      if (inviteCode) {
        const validateRes = await fetch('/api/invites?action=validate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: inviteCode })
        })
        const validateData = await validateRes.json()
        if (!validateData.valid) throw new Error('Invalid invite code')
      }

      const { error: createError } = await supabase
        .from('users')
        .insert({
          id: session.user.id,
          email: session.user.email,
          full_name: session.user.user_metadata?.full_name || ''
        })

      if (createError) throw new Error(createError.message)

      // Mark invite as used
      if (inviteCode) {
        await fetch('/api/invites?action=use', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: inviteCode, user_id: session.user.id })
        })
      }

      // Initialize usage
      const monthYear = new Date().toISOString().slice(0, 7)
      await supabase.from('usage').insert({
        user_id: session.user.id,
        proposal_count: 0,
        month_year: monthYear
      }).catch(() => { }) // ignore duplicates
    }

    return { user: session.user, error: null }
  } catch (err) {
    return { user: null, error: err.message }
  }
}

/**
 * Get current user
 */
export async function getCurrentUser() {
  try {
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error) throw new Error(error.message)
    return { user, error: null }
  } catch (err) {
    return { user: null, error: err.message }
  }
}

/**
 * Get user profile from public.users
 */
export async function getUserProfile(userId) {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()
    if (error) throw new Error(error.message)
    return { profile: data, error: null }
  } catch (err) {
    return { profile: null, error: err.message }
  }
}

/**
 * Get user's current month usage
 */
export async function getUserUsage(userId) {
  try {
    const monthYear = new Date().toISOString().slice(0, 7)
    const { data, error } = await supabase
      .from('usage')
      .select('*')
      .eq('user_id', userId)
      .eq('month_year', monthYear)
      .single()

    if (error && error.code !== 'PGRST116') throw new Error(error.message)

    return { usage: data || { proposal_count: 0, month_year: monthYear }, error: null }
  } catch (err) {
    return { usage: null, error: err.message }
  }
}

/**
 * Sign out
 */
export async function signOut() {
  try {
    const { error } = await supabase.auth.signOut()
    if (error) throw new Error(error.message)
    return { error: null }
  } catch (err) {
    return { error: err.message }
  }
}

/**
 * Subscribe to auth state changes
 */
export function onAuthStateChange(callback) {
  return supabase.auth.onAuthStateChange(callback)
}
