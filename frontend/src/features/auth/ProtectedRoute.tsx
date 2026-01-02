import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from './useAuth'
import { Loading } from '../../components/ui/Loading'

export function ProtectedRoute() {
  const { user, loading } = useAuth()

  if (loading) {
    return <Loading fullScreen />
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}
