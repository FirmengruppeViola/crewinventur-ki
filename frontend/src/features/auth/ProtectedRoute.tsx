import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from './useAuth'
import { Loading } from '../../components/ui/Loading'

type ProtectedRouteProps = {
  /** If true, only owners can access this route */
  ownerOnly?: boolean
}

export function ProtectedRoute({ ownerOnly = false }: ProtectedRouteProps) {
  const { user, loading, isOwner } = useAuth()

  if (loading) {
    return <Loading fullScreen />
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  // Check owner-only routes
  if (ownerOnly && !isOwner) {
    return <Navigate to="/dashboard" replace />
  }

  return <Outlet />
}
