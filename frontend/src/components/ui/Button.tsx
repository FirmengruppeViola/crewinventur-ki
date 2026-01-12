import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '../../lib/utils'
import { Loading } from './Loading'

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'glass' | 'gradient'
type ButtonSize = 'sm' | 'md' | 'lg' | 'xl' | 'icon'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  leftIcon?: ReactNode
  rightIcon?: ReactNode
  fullWidth?: boolean
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    'gradient-primary text-primary-foreground shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5 active:translate-y-0 active:shadow-md transition-all duration-200',
  secondary:
    'bg-card text-foreground border-2 border-border shadow-sm hover:border-primary/30 hover:bg-secondary hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200',
  outline:
    'bg-transparent border-2 border-border text-foreground hover:border-primary hover:text-primary hover:bg-primary/5 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200',
  ghost:
    'bg-transparent text-foreground hover:bg-secondary hover:text-primary transition-all duration-200',
  danger:
    'bg-destructive text-destructive-foreground shadow-lg shadow-destructive/25 hover:bg-destructive/90 hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 active:shadow-md transition-all duration-200',
  glass:
    'glass-card text-foreground hover:border-primary/50 hover:bg-white hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200',
  gradient:
    'gradient-primary-soft text-primary-foreground shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5 active:translate-y-0 active:shadow-md transition-all duration-200',
}

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'h-9 px-4 rounded-lg text-sm font-medium',
  md: 'h-11 px-5 rounded-xl text-sm font-semibold',
  lg: 'h-12 px-6 rounded-xl text-base font-semibold',
  xl: 'h-14 px-8 rounded-2xl text-base font-semibold',
  icon: 'h-10 w-10 rounded-xl',
}

export function Button({
  className,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  leftIcon,
  rightIcon,
  fullWidth = false,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center whitespace-nowrap transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 disabled:hover:translate-y-0 ripple',
        variantStyles[variant],
        sizeStyles[size],
        fullWidth && 'w-full',
        className,
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <Loading size="sm" />
      ) : (
        <>
          {leftIcon && <span className="mr-2">{leftIcon}</span>}
          {children}
          {rightIcon && <span className="ml-2">{rightIcon}</span>}
        </>
      )}
    </button>
  )
}
