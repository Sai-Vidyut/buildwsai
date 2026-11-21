import { useEffect, useState, type ReactNode } from 'react'
import { animate, motion, useMotionValue, useMotionValueEvent, useReducedMotion, type Variants } from 'motion/react'

import { EASE_OUT } from './motion-tokens'

const revealVariants: Variants = {
  hidden: { opacity: 0, y: 22 },
  shown: { opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE_OUT } },
}

type RevealProps = {
  children: ReactNode
  className?: string
  delay?: number
  as?: 'div' | 'section' | 'li' | 'p'
  id?: string
  'aria-labelledby'?: string
}

export function Reveal({ children, className, delay = 0, as = 'div', ...rest }: RevealProps) {
  const Tag = motion[as]
  return (
    <Tag
      {...rest}
      className={className}
      variants={revealVariants}
      initial="hidden"
      whileInView="shown"
      viewport={{ once: true, margin: '0px 0px -12% 0px' }}
      transition={{ delay }}
    >
      {children}
    </Tag>
  )
}

const groupVariants: Variants = {
  hidden: {},
  shown: { transition: { staggerChildren: 0.075, delayChildren: 0.05 } },
}

export function RevealGroup({
  children,
  className,
  as = 'div',
  ...rest
}: {
  children: ReactNode
  className?: string
  as?: 'div' | 'ol' | 'ul'
} & Record<`aria-${string}`, string>) {
  const Tag = motion[as]
  return (
    <Tag
      className={className}
      variants={groupVariants}
      initial="hidden"
      whileInView="shown"
      viewport={{ once: true, margin: '0px 0px -10% 0px' }}
      {...rest}
    >
      {children}
    </Tag>
  )
}

export function RevealItem({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.li className={className} variants={revealVariants}>
      {children}
    </motion.li>
  )
}

export function CountUp({ value, format }: { value: number; format: (n: number) => string }) {
  const reduce = useReducedMotion()
  const motionValue = useMotionValue(value)
  const [display, setDisplay] = useState(value)

  useMotionValueEvent(motionValue, 'change', (latest) => setDisplay(latest))

  useEffect(() => {
    if (reduce) {
      motionValue.set(value)
      return
    }
    const controls = animate(motionValue, value, { duration: 0.6, ease: EASE_OUT })
    return () => controls.stop()
  }, [value, reduce, motionValue])

  return <>{format(Math.round(display * 100) / 100)}</>
}
