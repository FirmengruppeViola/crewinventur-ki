import { Link } from 'react-router-dom'
import { Avatar } from '../ui/Avatar'
import { useAuth } from '../../features/auth/useAuth'

export function Header() {
  const { user } = useAuth()
  const displayName =
    typeof user?.user_metadata?.display_name === 'string'
      ? user.user_metadata.display_name
      : user?.email ?? 'User'

  return (
    <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-3">
        <Link to="/dashboard" className="text-base font-semibold text-gray-900">
          CrewInventurKI
        </Link>
        <Avatar name={displayName} size="sm" />
      </div>
    </header>
  )
}
