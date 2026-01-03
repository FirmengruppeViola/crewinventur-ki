import { motion, AnimatePresence } from 'framer-motion'
import { useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'

type PageTransitionProps = {
  children: ReactNode
}

/**
 * Wraps page content with smooth enter/exit animations.
 * Optimized for mobile: fast, subtle, GPU-accelerated.
 */
export function PageTransition({ children }: PageTransitionProps) {
  const location = useLocation()

  return (
    <motion.div
      key={location.pathname}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.12, ease: 'easeOut' }}
      style={{ willChange: 'opacity' }}
    >
      {children}
    </motion.div>
  )
}

/**
 * Simpler fade transition for modals/sheets
 */
export function FadeTransition({ children, show }: { children: ReactNode; show: boolean }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/**
 * Slide up transition for bottom sheets
 */
export function SlideUpTransition({ children, show }: { children: ReactNode; show: boolean }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: '100%' }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: '100%' }}
          transition={{
            type: 'spring',
            damping: 30,
            stiffness: 300,
          }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
