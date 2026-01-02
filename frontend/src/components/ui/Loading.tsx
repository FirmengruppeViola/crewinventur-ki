import { cn } from '../../lib/utils'

type LoadingProps = {
  size?: 'sm' | 'md' | 'lg'
  fullScreen?: boolean
}

const sizeStyles = {
  sm: 'h-4 w-4 border-2',
  md: 'h-6 w-6 border-2',
  lg: 'h-10 w-10 border-[3px]',
}

export function Loading({ size = 'md', fullScreen = false }: LoadingProps) {
  const spinner = (
    <div
      className={cn(
        'animate-spin rounded-full border-solid border-gray-300 border-t-blue-600',
        sizeStyles[size],
      )}
    />
  )

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80">
        {spinner}
      </div>
    )
  }

  return spinner
}
