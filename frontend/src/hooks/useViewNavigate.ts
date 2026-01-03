import { useCallback } from 'react'
import { useNavigate, type NavigateOptions, type To } from 'react-router-dom'

export function useViewNavigate() {
  const navigate = useNavigate()

  return useCallback(
    (to: To | number, options?: NavigateOptions) => {
      if (typeof to === 'number') {
        navigate(to)
        return
      }
      navigate(to, { viewTransition: true, ...options })
    },
    [navigate],
  )
}
