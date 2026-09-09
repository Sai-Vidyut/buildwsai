import { useEffect, useRef } from 'react'
import { gsap } from '../lib/gsap'
import { usePrefersReducedMotion } from './usePrefersReducedMotion'

export function useHeroIntro() {
  const root = useRef<HTMLElement>(null)
  const reduced = usePrefersReducedMotion()

  useEffect(() => {
    if (reduced || !root.current) return

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })
      tl.from('.hero-line', { y: '110%', duration: 1.1, stagger: 0.12 })
      tl.from('.hero-fade', { opacity: 0, y: 24, duration: 0.8, stagger: 0.08 }, '-=0.5')
    }, root)

    return () => ctx.revert()
  }, [reduced])

  return root
}
