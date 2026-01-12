import { cn } from '../../lib/utils'

type AvatarProps = {
  name?: string | null
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger'
  ring?: boolean
  dot?: boolean
  dotColor?: 'online' | 'away' | 'busy' | 'offline'
}

const sizeStyles = {
  xs: 'h-6 w-6 text-[10px]',
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
  xl: 'h-16 w-16 text-lg',
}

const variantStyles = {
  default: 'bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-200',
  primary: 'bg-primary/10 text-primary',
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/10 text-warning',
  danger: 'bg-destructive/10 text-destructive',
}

const dotColorStyles = {
  online: 'bg-emerald-500',
  away: 'bg-amber-500',
  busy: 'bg-red-500',
  offline: 'bg-stone-400',
}

function getInitials(name?: string | null) {
  if (!name) return 'U'
  const parts = name.trim().split(' ').filter(Boolean)
  if (parts.length === 0) return 'U'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
}

export function Avatar({ 
  name, 
  size = 'md',
  variant = 'primary',
  ring = false,
  dot = false,
  dotColor = 'online',
}: AvatarProps) {
  return (
    <div className="relative inline-flex">
      {ring && (
        <div className="absolute -inset-0.5 rounded-full bg-gradient-to-br from-primary to-emerald-500 animate-pulse-slow" />
      )}
      <div
        className={cn(
          'relative flex items-center justify-center rounded-full font-semibold',
          sizeStyles[size],
          variantStyles[variant],
          ring && 'bg-background',
        )}
        aria-label={name ?? 'User'}
      >
        {getInitials(name)}
      </div>
      {dot && (
        <div className={cn(
          'absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-background',
          size === 'xl' && 'h-4 w-4',
          dotColorStyles[dotColor],
        )} />
      )}
    </div>
  )
}
