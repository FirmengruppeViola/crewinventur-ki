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
    <header className="sticky top-0 z-40 w-full border-b border-white/5 bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-14 w-full max-w-md items-center justify-between px-4 sm:max-w-2xl md:max-w-4xl">
        <Link 
          to="/dashboard" 
          className="bg-gradient-to-r from-primary to-indigo-400 bg-clip-text text-lg font-bold tracking-tight text-transparent"
        >
          CrewChecker
        </Link>
        <Avatar name={displayName} size="sm" />
      </div>
    </header>
  )
}
