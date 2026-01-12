import { cn } from '../../lib/utils'

type SkeletonProps = {
  className?: string
  animate?: boolean
}

export function Skeleton({ className, animate = true }: SkeletonProps) {
  return (
    <div
      className={cn(
        'rounded-xl bg-muted',
        animate && 'animate-shimmer overflow-hidden',
        className,
      )}
      style={animate ? { backgroundImage: 'linear-gradient(to right, transparent 0%, hsl(var(--muted)) 50%, transparent 100%)', backgroundSize: '1000px 100%' } : undefined}
    />
  )
}

export function SkeletonText({ className, lines = 1 }: { className?: string; lines?: number }) {
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn(
            'h-4',
            i === lines - 1 && lines > 1 ? 'w-3/4' : 'w-full'
          )}
        />
      ))}
    </div>
  )
}

export function SkeletonCircle({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' | 'xl' }) {
  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-12 w-12',
    xl: 'h-16 w-16',
  }
  return <Skeleton className={cn('rounded-full', sizeClasses[size])} />
}

export function SkeletonButton({ className }: { className?: string }) {
  return <Skeleton className={cn('h-11 w-24 rounded-xl', className)} />
}

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center gap-4 rounded-2xl border border-border bg-card p-4', className)}>
      <Skeleton className="h-12 w-12 shrink-0 rounded-2xl" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-48" />
      </div>
      <Skeleton className="h-5 w-5 rounded-md" />
    </div>
  )
}

export function SkeletonCardList({ count = 3, className }: { count?: number; className?: string }) {
  return (
    <div className={cn('grid gap-4', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  )
}

export function SkeletonStats({ className }: { className?: string }) {
  return (
    <div className={cn('grid grid-cols-2 gap-3', className)}>
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="rounded-2xl border border-border bg-card p-4">
          <Skeleton className="mb-2 h-8 w-16" />
          <Skeleton className="h-3 w-20" />
        </div>
      ))}
    </div>
  )
}

export function SkeletonHeader({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center justify-between px-1', className)}>
      <div className="space-y-2">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-56" />
      </div>
      <Skeleton className="h-12 w-12 rounded-full" />
    </div>
  )
}

export function SkeletonForm({ fields = 3 }: { fields?: number }) {
  return (
    <div className="space-y-6">
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-12 w-full rounded-xl" />
        </div>
      ))}
      <Skeleton className="h-12 w-full rounded-xl" />
    </div>
  )
}

export function PageSkeleton() {
  return (
    <div className="space-y-8 p-4 pb-40">
      <SkeletonHeader />
      <SkeletonCardList count={4} />
    </div>
  )
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-8 p-4 pb-40">
      <SkeletonHeader />
      <SkeletonStats />
      <div className="space-y-4">
        <Skeleton className="h-6 w-32" />
        <SkeletonCardList count={3} />
      </div>
    </div>
  )
}

export function ListPageSkeleton() {
  return (
    <div className="space-y-8 p-4 pb-40">
      <SkeletonHeader />
      <SkeletonCardList count={5} />
    </div>
  )
}

export function DetailPageSkeleton() {
  return (
    <div className="space-y-8 p-4 pb-40">
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
      <SkeletonStats />
      <SkeletonCardList count={2} />
    </div>
  )
}

export function FormPageSkeleton() {
  return (
    <div className="space-y-8 p-4 pb-40">
      <div className="space-y-2">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-56" />
      </div>
      <SkeletonForm fields={4} />
    </div>
  )
}

export function SessionSkeleton() {
  return (
    <div className="space-y-6 p-4 pb-40">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-24" />
        </div>
        <Skeleton className="h-11 w-24 rounded-xl" />
      </div>
      <div className="grid grid-cols-3 gap-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-2xl border border-border bg-card p-3 text-center">
            <Skeleton className="mx-auto mb-1 h-6 w-12" />
            <Skeleton className="mx-auto h-3 w-16" />
          </div>
        ))}
      </div>
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center gap-3 rounded-2xl border border-border p-3">
            <Skeleton className="h-12 w-12 rounded-xl" />
            <div className="flex-1 space-y-1">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="h-8 w-16 rounded-xl" />
          </div>
        ))}
      </div>
    </div>
  )
}
