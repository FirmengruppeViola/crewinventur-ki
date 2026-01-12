import { useEffect, useState } from 'react'
import { cn } from '../../lib/utils'

type LoadingProps = {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  fullScreen?: boolean
  delayMs?: number
  variant?: 'primary' | 'white' | 'muted'
}

const sizeStyles = {
  sm: 'h-4 w-4 border-2',
  md: 'h-6 w-6 border-2',
  lg: 'h-10 w-10 border-[3px]',
  xl: 'h-12 w-12 border-[4px]',
}

const variantStyles = {
  primary: 'border-primary/30 border-t-primary shadow-glow',
  white: 'border-white/30 border-t-white',
  muted: 'border-muted/30 border-t-muted',
}

export function Loading({
  size = 'md',
  fullScreen = false,
  delayMs = 120,
  variant = 'primary',
}: LoadingProps) {
  const [isVisible, setIsVisible] = useState(!fullScreen || delayMs === 0)

  useEffect(() => {
    if (!fullScreen) return
    if (delayMs === 0) {
      setIsVisible(true)
      return
    }
    setIsVisible(false)
    const timer = setTimeout(() => setIsVisible(true), delayMs)
    return () => clearTimeout(timer)
  }, [delayMs, fullScreen])

  if (fullScreen && !isVisible) {
    return null
  }

  const spinner = (
    <div
      className={cn(
        'animate-spin rounded-full border-solid',
        sizeStyles[size],
        variantStyles[variant],
      )}
    />
  )

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 backdrop-blur-sm">
        <div className="flex flex-col items-center gap-4">
          {spinner}
          <p className="text-sm text-muted-foreground animate-pulse">Laden...</p>
        </div>
      </div>
    )
  }

  return spinner
}
