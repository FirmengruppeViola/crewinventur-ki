import { useEffect, useState } from 'react'

export function useDelayedFlag(value: boolean, delayMs = 150) {
  const [delayed, setDelayed] = useState(false)

  useEffect(() => {
    if (!value) {
      setDelayed(false)
      return
    }
    const timer = window.setTimeout(() => setDelayed(true), delayMs)
    return () => clearTimeout(timer)
  }, [delayMs, value])

  return delayed
}
