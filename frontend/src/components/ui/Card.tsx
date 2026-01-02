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
        'rounded-lg bg-white p-4 shadow-sm ring-1 ring-gray-100',
        className,
      )}
      {...props}
    >
      {title ? <h3 className="mb-3 text-lg font-semibold">{title}</h3> : null}
      {children}
    </div>
  )
}
