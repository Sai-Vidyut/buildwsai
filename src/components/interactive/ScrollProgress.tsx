import { useEffect, useRef } from 'react'
import { gsap } from '../../lib/gsap'
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion'

export function ScrollProgress() {
  const bar = useRef<HTMLDivElement>(null)
  const reduced = usePrefersReducedMotion()

  useEffect(() => {
    if (reduced || !bar.current) return

    const ctx = gsap.context(() => {
      gsap.fromTo(
        bar.current,
        { scaleX: 0 },
        {
          scaleX: 1,
          ease: 'none',
          scrollTrigger: {
            trigger: document.documentElement,
            start: 'top top',
            end: 'bottom bottom',
            scrub: 0.15,
          },
        },
      )
    })

    return () => ctx.revert()
  }, [reduced])

  return (
    <div
      className="fixed top-0 left-0 right-0 h-[2px] z-[60] pointer-events-none origin-left scale-x-0 bg-[var(--color-black)] print:hidden"
      ref={bar}
      aria-hidden
    />
  )
}
