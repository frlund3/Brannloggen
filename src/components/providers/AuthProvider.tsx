'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'

interface AuthContextType {
  user: User | null
  rolle: string | null
  sentralIds: string[]
  loading: boolean
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  rolle: null,
  sentralIds: [],
  loading: true,
})

export function useAuth() {
  return useContext(AuthContext)
}

const ROLLE_KEY = 'brannloggen_user_rolle'
const SENTRAL_IDS_KEY = 'brannloggen_user_sentral_ids'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Read cached rolle synchronously on first render
  const [user, setUser] = useState<User | null>(null)
  const [rolle, setRolle] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(ROLLE_KEY)
    }
    return null
  })
  const [sentralIds, setSentralIds] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(SENTRAL_IDS_KEY)
        if (saved) return JSON.parse(saved)
      } catch {}
    }
    return []
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()

    // Read cached rolle immediately
    const cached = localStorage.getItem(ROLLE_KEY)
    if (cached) {
      setRolle(cached)
    }
    try {
      const cachedSentrals = localStorage.getItem(SENTRAL_IDS_KEY)
      if (cachedSentrals) setSentralIds(JSON.parse(cachedSentrals))
    } catch {}

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
        localStorage.removeItem(SENTRAL_IDS_KEY)
        setRolle(null)
        setSentralIds([])
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
          localStorage.removeItem(SENTRAL_IDS_KEY)
          setRolle(null)
          setSentralIds([])
        }
        setLoading(false)
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  return (
    <AuthContext.Provider value={{ user, rolle, sentralIds, loading }}>
      {children}
    </AuthContext.Provider>
  )
}
