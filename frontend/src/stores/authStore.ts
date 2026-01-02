import { create } from 'zustand'
import type { Session, User } from '@supabase/supabase-js'

type AuthState = {
  session: Session | null
  user: User | null
  isAuthenticated: boolean
  setAuth: (session: Session) => void
  clearAuth: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  user: null,
  isAuthenticated: false,
  setAuth: (session) =>
    set({
      session,
      user: session.user,
      isAuthenticated: true,
    }),
  clearAuth: () =>
    set({
      session: null,
      user: null,
      isAuthenticated: false,
    }),
}))
