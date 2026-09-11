import { motion } from 'motion/react'
import type { ReactNode } from 'react'
import { useIsMobile } from '../../hooks/useIsMobile'
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion'
import { fadeUp, mobileEase, mobileViewport, staggerContainer } from '../../lib/mobileMotion'

type StaggerProps = {
  children: ReactNode
  className?: string
  stagger?: number
  disabled?: boolean
}

export function MobileStagger({
  children,
  className,
  stagger = 0.1,
  disabled = false,
}: StaggerProps) {
  const mobile = useIsMobile()
  const reduced = usePrefersReducedMotion()

  if (!mobile || reduced || disabled) {
    return <div className={className}>{children}</div>
  }

  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={mobileViewport}
      variants={staggerContainer(stagger)}
    >
      {children}
    </motion.div>
  )
}

type ItemProps = {
  children: ReactNode
  className?: string
  disabled?: boolean
}

export function MobileStaggerItem({ children, className, disabled = false }: ItemProps) {
  const mobile = useIsMobile()
  const reduced = usePrefersReducedMotion()

  if (!mobile || reduced || disabled) {
    return <div className={className}>{children}</div>
  }

  return (
    <motion.div
      className={className}
      variants={fadeUp}
      transition={{ duration: 0.65, ease: mobileEase }}
    >
      {children}
    </motion.div>
  )
}
