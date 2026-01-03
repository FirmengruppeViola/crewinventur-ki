import { createContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '../../lib/supabase'
import { useAuthStore, type UserType } from '../../stores/authStore'

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
  userType: UserType
  isOwner: boolean
  isManager: boolean
  signIn: (input: SignInInput) => Promise<AuthResult>
  signUp: (input: SignUpInput) => Promise<AuthResult>
  signOut: () => Promise<AuthResult>
  resetPassword: (email: string) => Promise<AuthResult>
  acceptInvitation: (code: string) => Promise<AuthResult>
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

async function loadUserContext(
  userId: string,
  setUserContext: (userType: UserType, ownerId: string | null, locationIds: string[]) => void
) {
  try {
    // Load profile to get user_type and owner_id
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('user_type, owner_id')
      .eq('id', userId)
      .maybeSingle()

    if (profileError) {
      console.error('Error loading profile:', profileError)
    }

    const userType = (profile?.user_type as UserType) || 'owner'
    const ownerId = profile?.owner_id || null

    // Load allowed locations
    let locationIds: string[] = []

    if (userType === 'owner' || !ownerId) {
      // Owner sees all their locations
      const { data: locations, error: locError } = await supabase
        .from('locations')
        .select('id')
        .eq('user_id', userId)

      if (locError) {
        console.error('Error loading locations:', locError)
      }
      locationIds = locations?.map((l) => l.id) || []
    } else {
      // Manager sees only assigned locations via team_member_locations
      const { data: teamMember, error: tmError } = await supabase
        .from('team_members')
        .select('id')
        .eq('user_id', userId)
        .eq('is_active', true)
        .maybeSingle()

      if (tmError) {
        console.error('Error loading team member:', tmError)
      }

      if (teamMember) {
        const { data: assignments, error: assignError } = await supabase
          .from('team_member_locations')
          .select('location_id')
          .eq('team_member_id', teamMember.id)

        if (assignError) {
          console.error('Error loading assignments:', assignError)
        }
        locationIds = assignments?.map((a) => a.location_id) || []
      }
    }

    setUserContext(userType, ownerId, locationIds)
  } catch (err) {
    console.error('Error in loadUserContext:', err)
    // Set defaults so login doesn't hang
    setUserContext('owner', null, [])
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const setAuth = useAuthStore((state) => state.setAuth)
  const setUserContext = useAuthStore((state) => state.setUserContext)
  const clearAuth = useAuthStore((state) => state.clearAuth)
  const userType = useAuthStore((state) => state.userType)

  useEffect(() => {
    let active = true

    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return
      const nextSession = data.session ?? null
      setSession(nextSession)
      if (nextSession) {
        setAuth(nextSession)
        await ensureProfile(nextSession.user)
        await loadUserContext(nextSession.user.id, setUserContext)
      } else {
        clearAuth()
      }
      setLoading(false)
    })

    const { data } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      setSession(nextSession)
      if (nextSession) {
        setAuth(nextSession)
        await ensureProfile(nextSession.user)
        await loadUserContext(nextSession.user.id, setUserContext)
      } else {
        clearAuth()
      }
    })

    return () => {
      active = false
      data.subscription.unsubscribe()
    }
  }, [clearAuth, setAuth, setUserContext])

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      loading,
      userType,
      isOwner: userType === 'owner',
      isManager: userType === 'manager',
      signIn: async ({ email, password }) => {
        console.log('AuthContext signIn starting...')
        try {
          const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
          })
          console.log('signInWithPassword completed:', { data: !!data, error: error?.message })
          return { error: error?.message ?? null }
        } catch (err) {
          console.error('signInWithPassword threw:', err)
          return { error: 'Verbindungsfehler' }
        }
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
      acceptInvitation: async (code: string) => {
        // This calls the backend API to accept the invitation
        // User must already be logged in via Supabase
        const token = session?.access_token
        if (!token) {
          return { error: 'Nicht eingeloggt' }
        }

        try {
          const response = await fetch(
            `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}/api/v1/team/accept-invitation`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({ invitation_code: code }),
            }
          )

          if (!response.ok) {
            const data = await response.json()
            return { error: data.detail || 'Einladung fehlgeschlagen' }
          }

          // Reload user context after accepting invitation
          if (session?.user) {
            await loadUserContext(session.user.id, setUserContext)
          }

          return { error: null }
        } catch {
          return { error: 'Netzwerkfehler' }
        }
      },
    }),
    [loading, session, userType, setUserContext],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
