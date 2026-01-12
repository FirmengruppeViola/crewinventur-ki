import { forwardRef } from 'react'
import type { TextareaHTMLAttributes } from 'react'
import { cn } from '../../lib/utils'

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string
  error?: string
  hint?: string
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, hint, className, id, ...props }, ref) => {
    const textareaId = id ?? props.name
    return (
      <div className="space-y-2">
        {label ? (
          <label htmlFor={textareaId} className="text-sm font-medium text-foreground">
            {label}
          </label>
        ) : null}
        <textarea
          ref={ref}
          id={textareaId}
          className={cn(
            'flex min-h-[120px] w-full rounded-xl border-2 border-input bg-background px-4 py-3 text-sm text-foreground transition-all duration-200 placeholder:text-muted-foreground focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:cursor-not-allowed disabled:opacity-50',
            error && 'border-destructive focus:border-destructive focus:ring-destructive/10',
            className,
          )}
          {...props}
        />
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

Textarea.displayName = 'Textarea'
