import { useEffect, useRef } from 'react'
import { gsap } from '../lib/gsap'
import { usePrefersReducedMotion } from './usePrefersReducedMotion'
import { useIsMobile } from './useIsMobile'

export function useMagnetic<T extends HTMLElement>(strength = 0.3) {
  const ref = useRef<T>(null)
  const reduced = usePrefersReducedMotion()
  const mobile = useIsMobile()

  useEffect(() => {
    if (reduced || mobile || !ref.current) return

    const el = ref.current

    const onMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect()
      const x = e.clientX - rect.left - rect.width / 2
      const y = e.clientY - rect.top - rect.height / 2
      gsap.to(el, { x: x * strength, y: y * strength, duration: 0.45, ease: 'power2.out' })
    }
    const onLeave = () => {
      gsap.to(el, { x: 0, y: 0, duration: 0.7, ease: 'power3.out' })
    }

    el.addEventListener('mousemove', onMove)
    el.addEventListener('mouseleave', onLeave)
    return () => {
      el.removeEventListener('mousemove', onMove)
      el.removeEventListener('mouseleave', onLeave)
    }
  }, [strength, reduced, mobile])

  return ref
}
