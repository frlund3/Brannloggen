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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [rolle, setRolle] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()

    // Get initial session
    const getInitialSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      const currentUser = session?.user ?? null
      setUser(currentUser)

      if (currentUser) {
        const { data: profile } = await supabase
          .from('brukerprofiler')
          .select('rolle')
          .eq('user_id', currentUser.id)
          .maybeSingle()
        setRolle(profile?.rolle ?? null)
      }
      setLoading(false)
    }

    getInitialSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        const currentUser = session?.user ?? null
        setUser(currentUser)

        if (currentUser) {
          const { data: profile } = await supabase
            .from('brukerprofiler')
            .select('rolle')
            .eq('user_id', currentUser.id)
            .maybeSingle()
          setRolle(profile?.rolle ?? null)
        } else {
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
