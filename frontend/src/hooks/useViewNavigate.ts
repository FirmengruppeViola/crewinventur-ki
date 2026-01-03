import { useCallback } from 'react'
import { useNavigate, type NavigateOptions, type To } from 'react-router-dom'
import { supportsViewTransitions } from '../lib/viewTransitions'

export function useViewNavigate() {
  const navigate = useNavigate()

  return useCallback(
    (to: To | number, options?: NavigateOptions) => {
      if (typeof to === 'number') {
        navigate(to)
        return
      }
      navigate(to, { viewTransition: supportsViewTransitions, ...options })
    },
    [navigate],
  )
}
