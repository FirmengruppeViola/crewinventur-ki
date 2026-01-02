import { create } from 'zustand'
import type { Session, User } from '@supabase/supabase-js'

export type UserType = 'owner' | 'manager'

type AuthState = {
  session: Session | null
  user: User | null
  isAuthenticated: boolean
  // Team/Role context
  userType: UserType
  ownerId: string | null  // null for owner, owner's ID for manager
  allowedLocationIds: string[]  // all for owner, assigned for manager
  // Actions
  setAuth: (session: Session) => void
  setUserContext: (userType: UserType, ownerId: string | null, locationIds: string[]) => void
  clearAuth: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  user: null,
  isAuthenticated: false,
  userType: 'owner',
  ownerId: null,
  allowedLocationIds: [],

  setAuth: (session) =>
    set({
      session,
      user: session.user,
      isAuthenticated: true,
    }),

  setUserContext: (userType, ownerId, locationIds) =>
    set({
      userType,
      ownerId,
      allowedLocationIds: locationIds,
    }),

  clearAuth: () =>
    set({
      session: null,
      user: null,
      isAuthenticated: false,
      userType: 'owner',
      ownerId: null,
      allowedLocationIds: [],
    }),
}))
