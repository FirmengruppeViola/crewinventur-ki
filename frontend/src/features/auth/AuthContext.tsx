import { createContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/authStore'

type SignInInput = {
  email: string
  password: string
}

type SignUpInput = {
  email: string
  password: string
  displayName?: string | null
}

type AuthResult = {
  error: string | null
}

type AuthContextValue = {
  session: Session | null
  user: User | null
  loading: boolean
  signIn: (input: SignInInput) => Promise<AuthResult>
  signUp: (input: SignUpInput) => Promise<AuthResult>
  signOut: () => Promise<AuthResult>
  resetPassword: (email: string) => Promise<AuthResult>
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined)

async function ensureProfile(user: User) {
  if (!user?.id) return

  const { data: existing } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', user.id)
    .maybeSingle()

  if (existing?.id) return

  const displayName =
    typeof user.user_metadata?.display_name === 'string'
      ? user.user_metadata.display_name
      : null

  await supabase.from('profiles').insert({
    id: user.id,
    email: user.email ?? '',
    display_name: displayName,
  })
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const setAuth = useAuthStore((state) => state.setAuth)
  const clearAuth = useAuthStore((state) => state.clearAuth)

  useEffect(() => {
    let active = true

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return
      const nextSession = data.session ?? null
      setSession(nextSession)
      if (nextSession) {
        setAuth(nextSession)
        ensureProfile(nextSession.user)
      } else {
        clearAuth()
      }
      setLoading(false)
    })

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      if (nextSession) {
        setAuth(nextSession)
        ensureProfile(nextSession.user)
      } else {
        clearAuth()
      }
    })

    return () => {
      active = false
      data.subscription.unsubscribe()
    }
  }, [clearAuth, setAuth])

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      loading,
      signIn: async ({ email, password }) => {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        return { error: error?.message ?? null }
      },
      signUp: async ({ email, password, displayName }) => {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              display_name: displayName ?? undefined,
            },
          },
        })

        if (data.session?.user) {
          await ensureProfile(data.session.user)
        }

        return { error: error?.message ?? null }
      },
      signOut: async () => {
        const { error } = await supabase.auth.signOut()
        return { error: error?.message ?? null }
      },
      resetPassword: async (email) => {
        const redirectTo = `${window.location.origin}/login`
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo,
        })
        return { error: error?.message ?? null }
      },
    }),
    [loading, session],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
