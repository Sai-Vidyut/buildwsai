import { useEffect, useRef } from 'react'
import { gsap } from '../lib/gsap'
import { usePrefersReducedMotion } from './usePrefersReducedMotion'

export function useHeroIntro() {
  const root = useRef<HTMLElement>(null)
  const reduced = usePrefersReducedMotion()

  useEffect(() => {
    if (reduced || !root.current) return

    const mobile = window.matchMedia('(max-width: 767px)').matches
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })
      tl.from('.hero-line', {
        y: '110%',
        duration: mobile ? 0.9 : 1.1,
        stagger: mobile ? 0.1 : 0.12,
      })
      tl.from(
        '.hero-fade',
        { opacity: 0, y: mobile ? 18 : 24, duration: mobile ? 0.65 : 0.8, stagger: 0.08 },
        '-=0.5',
      )
    }, root)

    return () => ctx.revert()
  }, [reduced])

  return root
}
