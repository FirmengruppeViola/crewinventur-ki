import { forwardRef } from 'react'
import type { SelectHTMLAttributes } from 'react'
import { cn } from '../../lib/utils'

type Option = {
  label: string
  value: string
}

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string
  error?: string
  options: Option[]
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, className, id, options, ...props }, ref) => {
    const selectId = id ?? props.name
    return (
      <div className="space-y-1.5">
        {label ? (
          <label
            htmlFor={selectId}
            className="text-sm font-medium text-foreground"
          >
            {label}
          </label>
        ) : null}
        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            className={cn(
              'flex h-10 w-full appearance-none rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
              error ? 'border-destructive focus-visible:ring-destructive' : '',
              className,
            )}
            {...props}
          >
            {options.map((option) => (
              <option key={option.value} value={option.value} className="bg-card text-foreground">
                {option.label}
              </option>
            ))}
          </select>
          {/* Custom Chevron for better styling control across browsers */}
          <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-muted-foreground">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
          </div>
        </div>
        {error ? <p className="text-xs text-destructive">{error}</p> : null}
      </div>
    )
  },
)

Select.displayName = 'Select'
