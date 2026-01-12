import { createContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { authStorage } from '../../lib/authStorage'
import { supabase, supabaseStorageKey } from '../../lib/supabase'
import { useAuthStore, type UserType } from '../../stores/authStore'
import { apiRequest } from '../../lib/api'
import { warmCache } from '../../lib/queryClient'
import { preloadCriticalRoutes } from '../../lib/prefetch'

/**
 * Check if token expires within the next N minutes.
 * Returns true if token is still valid and doesn't need refresh.
 */
function isTokenValid(session: Session | null, bufferMinutes = 5): boolean {
  if (!session?.expires_at) return false
  const expiresAt = session.expires_at * 1000 // Convert to ms
  const bufferMs = bufferMinutes * 60 * 1000
  return Date.now() < expiresAt - bufferMs
}

/**
 * Compare two sessions - returns true if they're functionally the same.
 */
function sessionsEqual(a: Session | null, b: Session | null): boolean {
  if (a === b) return true
  if (!a || !b) return false
  return a.access_token === b.access_token && a.user?.id === b.user?.id
}

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
  userContextReady: boolean
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

async function restoreSessionFromStorage(): Promise<Session | null> {
  try {
    const raw = await authStorage.getItem(supabaseStorageKey)
    if (!raw) return null
    const stored = JSON.parse(raw) as Partial<Session>
    if (!stored?.access_token || !stored?.refresh_token) return null
    const { data, error } = await supabase.auth.setSession({
      access_token: stored.access_token,
      refresh_token: stored.refresh_token,
    })
    if (error) return null
    return data.session ?? null
  } catch {
    return null
  }
}

async function readStoredSession(): Promise<Session | null> {
  try {
    const raw = await authStorage.getItem(supabaseStorageKey)
    if (!raw) return null
    const stored = JSON.parse(raw) as Partial<Session>
    if (!stored?.access_token || !stored?.refresh_token) return null
    return stored as Session
  } catch {
    return null
  }
}

const refreshTokenKey = 'crewinventur-refresh-token'
const accessTokenKey = 'crewinventur-access-token'

async function persistTokens(session: Session) {
  await authStorage.setItem(refreshTokenKey, session.refresh_token)
  await authStorage.setItem(accessTokenKey, session.access_token)
}

async function clearTokens() {
  await authStorage.removeItem(refreshTokenKey)
  await authStorage.removeItem(accessTokenKey)
}

async function refreshSessionFromToken(): Promise<Session | null> {
  try {
    const refreshToken = await authStorage.getItem(refreshTokenKey)
    if (!refreshToken) return null
    const { data, error } = await supabase.auth.refreshSession({
      refresh_token: refreshToken,
    })
    if (error) return null
    return data.session ?? null
  } catch {
    return null
  }
}

async function restoreSessionWithRetry(
  attempts = 3,
  delayMs = 250,
): Promise<Session | null> {
  let session: Session | null = null
  for (let i = 0; i < attempts; i += 1) {
    session = await restoreSessionFromStorage()
    if (session) return session
    if (i < attempts - 1) {
      await new Promise((resolve) => setTimeout(resolve, delayMs))
    }
  }
  return session
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [userContextReady, setUserContextReady] = useState(false)
  const [isBootstrapping, setIsBootstrapping] = useState(true)
  const [hasCacheWarmed, setHasCacheWarmed] = useState(false)
  const setAuth = useAuthStore((state) => state.setAuth)
  const setUserContext = useAuthStore((state) => state.setUserContext)
  const clearAuth = useAuthStore((state) => state.clearAuth)
  const userType = useAuthStore((state) => state.userType)

  useEffect(() => {
    let active = true

    const loadContextWithTimeout = async (userId: string) => {
      setUserContextReady(false)
      try {
        await Promise.race([
          (async () => {
            await ensureProfile({ id: userId } as User)
            await loadUserContext(userId, setUserContext)
          })(),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Auth context timeout')), 5000)
          ),
        ])
       } catch (e) {
        console.error('Auth context load failed:', e)
        // Show error toast on timeout
        if (e instanceof Error && e.message === 'Auth context timeout') {
          alert('Ladezeit überschritten. Bitte erneut versuchen.')
        }
        // Set defaults so app doesn't hang
        setUserContext('owner', null, [])
      } finally {
        if (active) {
          setUserContextReady(true)
        }
      }
    }

    const applySession = (nextSession: Session | null, options: { force?: boolean; skipWarmup?: boolean } = {}) => {
      if (!active) return
      
      // Skip update if session hasn't changed (prevents double render)
      if (!options.force && sessionsEqual(session, nextSession)) {
        return
      }
      
      setSession(nextSession)
      if (nextSession) {
        setAuth(nextSession)
        setLoading(false)
        void authStorage.setItem(
          supabaseStorageKey,
          JSON.stringify(nextSession),
        )
        void persistTokens(nextSession)
        void loadContextWithTimeout(nextSession.user.id)
        
        // Only warm cache once per app session
        if (!hasCacheWarmed && !options.skipWarmup) {
          setHasCacheWarmed(true)
          preloadCriticalRoutes()
          void warmCache(nextSession.access_token)
        }
      } else {
        setUserContextReady(false)
        setLoading(false)
        void clearTokens()
        clearAuth()
      }
    }

    const bootstrapSession = async () => {
      setIsBootstrapping(true)
      const storedSession = await readStoredSession()
      if (!active) return

      if (storedSession) {
        // Apply stored session immediately for instant UI
        applySession(storedSession, { force: true })
        
        // Only refresh if token is expiring soon
        if (!isTokenValid(storedSession)) {
          const refreshed =
            (await restoreSessionWithRetry()) ?? (await refreshSessionFromToken())
          if (!active) return
          if (refreshed) {
            // Only apply if different (sessionsEqual check inside)
            applySession(refreshed, { skipWarmup: true })
          } else {
            applySession(null)
          }
        }
        
        setIsBootstrapping(false)
        return
      }

      const { data } = await supabase.auth.getSession()
      if (!active) return
      let nextSession = data.session ?? null
      if (!nextSession) {
        nextSession = await restoreSessionWithRetry()
      }
      if (!nextSession) {
        nextSession = await refreshSessionFromToken()
      }
      if (!active) return
      applySession(nextSession, { force: true })
      setIsBootstrapping(false)
    }

    void bootstrapSession()

    const { data } = supabase.auth.onAuthStateChange(async (event, nextSession) => {
      if (!active) return
      
      // Ignore events during bootstrap to prevent double updates
      if (isBootstrapping && event !== 'SIGNED_OUT') {
        return
      }
      
      // For sign out, always clear
      if (event === 'SIGNED_OUT') {
        setSession(null)
        setUserContextReady(false)
        void authStorage.removeItem(supabaseStorageKey)
        void clearTokens()
        clearAuth()
        return
      }
      
      // For other events, use smart apply
      if (nextSession) {
        applySession(nextSession)
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
      userContextReady,
      userType,
      isOwner: userContextReady && userType === 'owner',
      isManager: userContextReady && userType === 'manager',
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
      acceptInvitation: async (code: string) => {
        // This calls the backend API to accept the invitation
        // User must already be logged in via Supabase
        const token = session?.access_token
        if (!token) {
          return { error: 'Nicht eingeloggt' }
        }

        try {
          await apiRequest(
            '/api/v1/team/accept-invitation',
            {
              method: 'POST',
              body: JSON.stringify({ invitation_code: code }),
            },
            token,
          )

          // Reload user context after accepting invitation
          if (session?.user) {
            await loadUserContext(session.user.id, setUserContext)
          }

          return { error: null }
        } catch (error) {
          return {
            error: error instanceof Error ? error.message : 'Netzwerkfehler',
          }
        }
      },
    }),
    [loading, session, userType, setUserContext],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
