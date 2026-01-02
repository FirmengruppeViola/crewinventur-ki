import type { ButtonHTMLAttributes } from 'react'
import { cn } from '../../lib/utils'
import { Loading } from './Loading'

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
type ButtonSize = 'sm' | 'md' | 'lg' | 'icon'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    'bg-primary text-primary-foreground shadow hover:bg-primary/90',
  secondary:
    'bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80',
  outline:
    'border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground',
  ghost: 
    'hover:bg-accent hover:text-accent-foreground',
  danger:
    'bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90',
}

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'h-8 rounded-lg px-3 text-xs',
  md: 'h-10 rounded-xl px-4 py-2',
  lg: 'h-12 rounded-xl px-8',
  icon: 'h-10 w-10 rounded-xl',
}

export function Button({
  className,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center whitespace-nowrap font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50',
        variantStyles[variant],
        sizeStyles[size],
        className,
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <Loading size="sm" /> : null}
      {/* If loading and no children, just show spinner. If loading and children, show both? Usually just spinner or spinner + text. 
          For now keeping it simple: spinner pushes text slightly if flex gap exists, or we wrap children. */}
      <span className={cn("inline-flex items-center gap-2", loading && "opacity-0 absolute")}>
        {children}
      </span>
      {loading && <span className="sr-only">Loading...</span>}
    </button>
  )
}
