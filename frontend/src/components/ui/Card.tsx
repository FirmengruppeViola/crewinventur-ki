import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '../../lib/utils'
import type { LucideIcon } from 'lucide-react'

type CardProps = HTMLAttributes<HTMLDivElement> & {
  title?: string
  subtitle?: string
  icon?: LucideIcon
  children: ReactNode
  variant?: 'default' | 'glass' | 'elevated' | 'borderless'
  hoverable?: boolean
  iconBgColor?: string
  iconColor?: string
}

export function Card({ 
  title, 
  subtitle, 
  icon: Icon,
  variant = 'default',
  hoverable = false,
  iconBgColor = 'bg-primary/10',
  iconColor = 'text-primary',
  children, 
  className, 
  ...props 
}: CardProps) {
  const variantStyles: Record<string, string> = {
    default: 'bg-card border border-border shadow-sm',
    glass: 'glass-card',
    elevated: 'bg-card border-0 shadow-lg',
    borderless: 'bg-card border-0 shadow-none',
  }

  return (
    <div
      className={cn(
        'rounded-2xl transition-all duration-300',
        variantStyles[variant],
        hoverable && 'hover:-translate-y-1 hover:shadow-md cursor-pointer',
        className,
      )}
      {...props}
    >
      {(title || Icon) && (
        <div className={cn('flex items-start gap-3', children && 'mb-4')}>
          {Icon && (
            <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', iconBgColor, iconColor)}>
              <Icon className="h-5 w-5" />
            </div>
          )}
          {(title || subtitle) && (
            <div className="flex-1 min-w-0">
              {title && (
                <h3 className="text-lg font-semibold text-foreground leading-tight">
                  {title}
                </h3>
              )}
              {subtitle && (
                <p className="text-sm text-muted-foreground mt-0.5">
                  {subtitle}
                </p>
              )}
            </div>
          )}
        </div>
      )}
      {children}
    </div>
  )
}
