import { useState, useCallback } from 'react'

/**
 * Hook zur Verwaltung von Onboarding-Status
 * Speichert in localStorage ob User das Onboarding bereits gesehen hat
 */
export function useOnboarding(id: string) {
  const key = `onboarding_seen_${id}`

  const [hasSeen, setHasSeen] = useState(() => {
    return localStorage.getItem(key) === 'true'
  })

  const markAsSeen = useCallback((permanent: boolean = true) => {
    if (permanent) {
      localStorage.setItem(key, 'true')
    }
    setHasSeen(true)
  }, [key])

  const reset = useCallback(() => {
    localStorage.removeItem(key)
    setHasSeen(false)
  }, [key])

  return {
    hasSeen,
    markAsSeen,
    reset,
    shouldShow: !hasSeen
  }
}
