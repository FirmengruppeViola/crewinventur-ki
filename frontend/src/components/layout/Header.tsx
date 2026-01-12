import { Link } from 'react-router-dom'
import { Avatar } from '../ui/Avatar'
import { useAuth } from '../../features/auth/useAuth'
import { HelpCircle } from 'lucide-react'

export function Header() {
  const { user } = useAuth()
  const displayName =
    typeof user?.user_metadata?.display_name === 'string'
      ? user.user_metadata.display_name
      : user?.email ?? 'User'

  return (
    <header className="sticky top-0 z-40 w-full glass safe-area-top border-b border-border/50">
      <div className="mx-auto flex h-14 w-full max-w-md items-center justify-between px-4 sm:max-w-2xl md:max-w-4xl">
        <Link
          to="/dashboard"
          className="gradient-text text-xl font-bold tracking-tight"
        >
          CrewInventur
        </Link>
        <div className="flex items-center gap-3">
          <Link
            to="/support"
            className="rounded-full ring-2 ring-transparent hover:ring-primary/50 transition-all duration-300 hover:scale-105"
            aria-label="Hilfe & Support"
          >
            <HelpCircle className="h-7 w-7 text-muted-foreground hover:text-primary transition-colors" />
          </Link>
          <Link
            to="/settings"
            className="rounded-full ring-2 ring-transparent hover:ring-primary/50 transition-all duration-300 hover:scale-105"
          >
            <Avatar name={displayName} size="sm" variant="primary" ring dot />
          </Link>
        </div>
      </div>
    </header>
  )
}
