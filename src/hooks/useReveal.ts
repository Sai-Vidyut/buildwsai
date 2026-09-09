import { useEffect, useRef } from 'react'
import { gsap } from '../lib/gsap'
import { usePrefersReducedMotion } from './usePrefersReducedMotion'

type RevealOptions = {
  y?: number
  delay?: number
  stagger?: number
  children?: string
}

export function useReveal<T extends HTMLElement>(options: RevealOptions = {}) {
  const ref = useRef<T>(null)
  const reduced = usePrefersReducedMotion()
  const { y = 48, delay = 0, stagger = 0, children } = options

  useEffect(() => {
    if (!ref.current) return

    const el = ref.current

    if (reduced) return

    const targets = children ? el.querySelectorAll(children) : [el]

    const ctx = gsap.context(() => {
      gsap.fromTo(
        targets,
        { y, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 1,
          delay,
          stagger,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: el,
            start: 'top 88%',
            toggleActions: 'play none none none',
            once: true,
          },
        },
      )
    }, el)

    return () => ctx.revert()
  }, [reduced, y, delay, stagger, children])

  return ref
}
