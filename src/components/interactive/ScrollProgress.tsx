import { motion, useScroll, useSpring } from 'motion/react'
import { useReducedMotion } from '../../hooks/useReducedMotion'

export function ScrollProgress() {
  const { scrollYProgress } = useScroll()
  const reduced = useReducedMotion()
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 28,
    restDelta: 0.001,
  })

  return (
    <motion.div
      aria-hidden
      className="fixed inset-x-0 top-0 z-50 h-[2px] origin-left bg-[var(--color-signal)]"
      style={{ scaleX: reduced ? scrollYProgress : scaleX }}
    />
  )
}
