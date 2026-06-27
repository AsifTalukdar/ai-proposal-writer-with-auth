import { createContext, useContext, useEffect, useState } from 'react'
import { onAuthStateChange, getCurrentUser, getUserProfile, getUserUsage } from '../services/auth'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [usage, setUsage] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    // Check current session on mount
    const checkAuth = async () => {
      const { user: currentUser } = await getCurrentUser()
      setUser(currentUser)

      if (currentUser) {
        // Fetch profile
        const { profile: userProfile } = await getUserProfile(currentUser.id)
        setProfile(userProfile)

        // Fetch usage
        const { usage: userUsage } = await getUserUsage(currentUser.id)
        setUsage(userUsage)
      }

      setLoading(false)
    }

    checkAuth()

    // Subscribe to auth changes
    const { data: { subscription } } = onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setUser(session.user)
        const { profile: userProfile } = await getUserProfile(session.user.id)
        setProfile(userProfile)
        const { usage: userUsage } = await getUserUsage(session.user.id)
        setUsage(userUsage)
      } else {
        setUser(null)
        setProfile(null)
        setUsage(null)
      }
    })

    return () => subscription?.unsubscribe()
  }, [])

  return (
    <AuthContext.Provider value={{ user, profile, usage, loading, error, setError }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
