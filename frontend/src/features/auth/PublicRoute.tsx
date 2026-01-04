import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { Loading } from '../../components/ui/Loading'
import { useAuth } from './useAuth'

type PublicRouteProps = {
  children: ReactNode
  redirectTo?: string
}

export function PublicRoute({ children, redirectTo = '/dashboard' }: PublicRouteProps) {
  const { user, loading } = useAuth()

  if (loading) {
    return <Loading fullScreen />
  }

  if (user) {
    return <Navigate to={redirectTo} replace />
  }

  return <>{children}</>
}
