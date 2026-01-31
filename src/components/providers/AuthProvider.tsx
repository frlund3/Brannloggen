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
  const [user, setUser] = useState<User | null>(null)
  const [rolle, setRolle] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()

    const fetchRolle = async (userId: string): Promise<string | null> => {
      // First try localStorage (cached at login)
      const cached = localStorage.getItem(ROLLE_KEY)
      if (cached) return cached

      // Fallback: query DB (may fail due to RLS)
      const { data: profile } = await supabase
        .from('brukerprofiler')
        .select('rolle')
        .eq('user_id', userId)
        .maybeSingle()
      const r = (profile as { rolle?: string } | null)?.rolle ?? null
      if (r) localStorage.setItem(ROLLE_KEY, r)
      return r
    }

    const getInitialSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      const currentUser = session?.user ?? null
      setUser(currentUser)

      if (currentUser) {
        setRolle(await fetchRolle(currentUser.id))
      }
      setLoading(false)
    }

    getInitialSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        const currentUser = session?.user ?? null
        setUser(currentUser)

        if (currentUser) {
          setRolle(await fetchRolle(currentUser.id))
        } else {
          // Signed out - clear cached role
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
