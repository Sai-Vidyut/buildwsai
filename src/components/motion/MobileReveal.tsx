import { motion, type HTMLMotionProps } from 'motion/react'
import type { ReactNode } from 'react'
import { useIsMobile } from '../../hooks/useIsMobile'
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion'
import { mobileEase, mobileViewport } from '../../lib/mobileMotion'

type Props = Omit<HTMLMotionProps<'div'>, 'children'> & {
  children: ReactNode
  delay?: number
  y?: number
  disabled?: boolean
}

export function MobileReveal({
  children,
  className,
  delay = 0,
  y = 24,
  disabled = false,
  ...props
}: Props) {
  const mobile = useIsMobile()
  const reduced = usePrefersReducedMotion()

  if (!mobile || reduced || disabled) {
    return <div className={className}>{children}</div>
  }

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={mobileViewport}
      transition={{ duration: 0.7, delay, ease: mobileEase }}
      {...props}
    >
      {children}
    </motion.div>
  )
}
