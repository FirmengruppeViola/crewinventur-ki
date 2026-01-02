import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '../../lib/utils'

type CardProps = HTMLAttributes<HTMLDivElement> & {
  title?: string
  children: ReactNode
}

export function Card({ title, children, className, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-xl border border-border bg-card text-card-foreground shadow-sm transition-all',
        className,
      )}
      {...props}
    >
      {title ? <h3 className="mb-4 text-lg font-semibold tracking-tight">{title}</h3> : null}
      {children}
    </div>
  )
}
