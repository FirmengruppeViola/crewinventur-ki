import { useEffect, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

const OVERLAY_ROOT_ID = 'overlay-root'

type OverlayPortalProps = {
  children: ReactNode
}

export function OverlayPortal({ children }: OverlayPortalProps) {
  const [root, setRoot] = useState<HTMLElement | null>(null)

  useEffect(() => {
    if (typeof document === 'undefined') return

    let target = document.getElementById(OVERLAY_ROOT_ID) as HTMLElement | null
    if (!target) {
      target = document.createElement('div')
      target.id = OVERLAY_ROOT_ID
      document.body.appendChild(target)
    }

    setRoot(target)
  }, [])

  if (!root) return null

  return createPortal(children, root)
}
