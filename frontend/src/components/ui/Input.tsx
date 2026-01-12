import { forwardRef, useState } from 'react'
import type { InputHTMLAttributes } from 'react'
import { cn } from '../../lib/utils'
import type { LucideIcon } from 'lucide-react'

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string
  error?: string
  hint?: string
  leftIcon?: LucideIcon
  rightIcon?: LucideIcon
  onRightIconClick?: () => void
  variant?: 'default' | 'floating'
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ 
    label, 
    error, 
    hint, 
    leftIcon: LeftIcon, 
    rightIcon: RightIcon, 
    onRightIconClick,
    variant = 'default',
    className, 
    id, 
    value,
    onFocus,
    onBlur,
    ...props 
  }, ref) => {
    const inputId = id ?? props.name
    const [isFocused, setIsFocused] = useState(false)
    const hasValue = value !== undefined && value !== ''
    
    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(true)
      onFocus?.(e)
    }
    
    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(false)
      onBlur?.(e)
    }

    if (variant === 'floating') {
      return (
        <div className="relative">
          {LeftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              <LeftIcon className="h-5 w-5" />
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            value={value}
            onFocus={handleFocus}
            onBlur={handleBlur}
            className={cn(
              'peer h-12 w-full rounded-xl border-2 border-input bg-background px-4 text-foreground transition-all duration-200 focus:border-primary focus:ring-4 focus:ring-primary/10',
              error && 'border-destructive focus:border-destructive focus:ring-destructive/10',
              LeftIcon && 'pl-11',
              RightIcon && 'pr-11',
              className,
            )}
            placeholder=" "
            {...props}
          />
          <label
            htmlFor={inputId}
            className={cn(
              'absolute left-4 top-1/2 -translate-y-1/2 origin-[0] -translate-y-6 scale-75 bg-background px-1 text-sm duration-200',
              'peer-placeholder-shown:translate-y-0 peer-placeholder-shown:scale-100 peer-placeholder-shown:text-muted-foreground peer-focus:-translate-y-6 peer-focus:scale-75 peer-focus:text-primary',
              isFocused || hasValue ? '-translate-y-6 scale-75 text-primary' : 'text-muted-foreground',
              LeftIcon && 'left-11',
            )}
          >
            {label}
          </label>
          {RightIcon && (
            <button
              type="button"
              onClick={onRightIconClick}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <RightIcon className="h-5 w-5" />
            </button>
          )}
          {error && (
            <p className="mt-1 text-xs text-destructive animate-fade-in-up">
              {error}
            </p>
          )}
        </div>
      )
    }

    return (
      <div className="space-y-2">
        {label ? (
          <label htmlFor={inputId} className="text-sm font-medium text-foreground">
            {label}
          </label>
        ) : null}
        <div className="relative">
          {LeftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              <LeftIcon className="h-5 w-5" />
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            value={value}
            onFocus={handleFocus}
            onBlur={handleBlur}
            className={cn(
              'flex h-11 w-full rounded-xl border-2 border-input bg-background px-4 text-sm text-foreground transition-all duration-200 placeholder:text-muted-foreground focus:border-primary focus:ring-4 focus:ring-primary/10',
              error && 'border-destructive focus:border-destructive focus:ring-destructive/10',
              LeftIcon && 'pl-11',
              RightIcon && 'pr-11',
              className,
            )}
            {...props}
          />
          {RightIcon && (
            <button
              type="button"
              onClick={onRightIconClick}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <RightIcon className="h-5 w-5" />
            </button>
          )}
        </div>
        {hint && !error && (
          <p className="text-xs text-muted-foreground">{hint}</p>
        )}
        {error && (
          <p className="text-xs text-destructive animate-fade-in-up">
            {error}
          </p>
        )}
      </div>
    )
  },
)

Input.displayName = 'Input'
