import { forwardRef } from 'react'
import { ChevronDown } from 'lucide-react'
import type { SelectHTMLAttributes } from 'react'
import { cn } from '../../lib/utils'

type Option = {
  label: string
  value: string
  disabled?: boolean
}

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string
  error?: string
  hint?: string
  options: Option[]
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, hint, className, id, options, ...props }, ref) => {
    const selectId = id ?? props.name
    return (
      <div className="space-y-2">
        {label ? (
          <label
            htmlFor={selectId}
            className="text-sm font-medium text-foreground"
          >
            {label}
          </label>
        ) : null}
        <div className="relative group">
          <select
            ref={ref}
            id={selectId}
            className={cn(
              'flex h-11 w-full appearance-none rounded-xl border-2 border-input bg-background px-4 pr-10 text-sm text-foreground transition-all duration-200 placeholder:text-muted-foreground focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:cursor-not-allowed disabled:opacity-50 group-hover:border-primary/50',
              error && 'border-destructive focus:border-destructive focus:ring-destructive/10',
              className,
            )}
            {...props}
          >
            {options.map((option) => (
              <option 
                key={option.value} 
                value={option.value} 
                disabled={option.disabled}
                className="bg-card text-foreground py-2"
              >
                {option.label}
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-muted-foreground transition-colors group-hover:text-primary">
            <ChevronDown className="h-4 w-4" />
          </div>
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

Select.displayName = 'Select'
