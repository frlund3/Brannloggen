'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'

interface AuthContextType {
  user: User | null
  rolle: string | null
  loading: boolean
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  rolle: null,
  loading: true,
})

export function useAuth() {
  return useContext(AuthContext)
}

const ROLLE_KEY = 'brannloggen_user_rolle'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Read cached rolle synchronously on first render
  const [user, setUser] = useState<User | null>(null)
  const [rolle, setRolle] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(ROLLE_KEY)
    }
    return null
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()

    // Read cached rolle immediately
    const cached = localStorage.getItem(ROLLE_KEY)
    if (cached) {
      setRolle(cached)
    }

    // Try getSession with a 3 second timeout
    const timeout = setTimeout(() => {
      // If getSession hangs, just mark as done with whatever we have
      setLoading(false)
    }, 3000)

    supabase.auth.getSession().then(({ data: { session } }) => {
      clearTimeout(timeout)
      setUser(session?.user ?? null)
      if (!session) {
        // Not logged in - clear cached rolle
        localStorage.removeItem(ROLLE_KEY)
        setRolle(null)
      }
      setLoading(false)
    }).catch(() => {
      clearTimeout(timeout)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null)
        if (!session) {
          localStorage.removeItem(ROLLE_KEY)
          setRolle(null)
        }
        setLoading(false)
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  return (
    <AuthContext.Provider value={{ user, rolle, loading }}>
      {children}
    </AuthContext.Provider>
  )
}
