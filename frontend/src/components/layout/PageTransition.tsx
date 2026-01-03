import type { ReactNode } from 'react'

type PageTransitionProps = {
  children: ReactNode
}

/**
 * Wrapper kept for app structure. Page transitions are handled
 * by the View Transitions API via router navigation.
 */
export function PageTransition({ children }: PageTransitionProps) {
  return <>{children}</>
}
