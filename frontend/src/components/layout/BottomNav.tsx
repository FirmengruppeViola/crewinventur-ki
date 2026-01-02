import { Link, useLocation } from 'react-router-dom'
import { Home, MapPin, Package, Settings } from 'lucide-react'
import { cn } from '../../lib/utils'

const navItems = [
  { label: 'Dashboard', to: '/dashboard', icon: Home },
  { label: 'Locations', to: '/locations', icon: MapPin },
  { label: 'Products', to: '/products', icon: Package },
  { label: 'Settings', to: '/settings', icon: Settings },
]

export function BottomNav() {
  const location = useLocation()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-gray-200 bg-white">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-around px-2 py-2">
        {navItems.map((item) => {
          const isActive =
            location.pathname === item.to ||
            location.pathname.startsWith(`${item.to}/`)

          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                'flex flex-col items-center gap-1 rounded-lg px-3 py-2 text-xs font-medium',
                isActive ? 'text-blue-600' : 'text-gray-500',
              )}
            >
              <item.icon className="h-5 w-5" />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
