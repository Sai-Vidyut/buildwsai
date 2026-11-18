import { useEffect } from 'react'
import { ScrollTrigger } from '../lib/gsap'
import { startSmoothScroll, stopSmoothScroll, shouldUseSmoothScroll } from '../lib/smoothScroll'
import { usePrefersReducedMotion } from './usePrefersReducedMotion'

/** Keeps Lenis in sync when reduced-motion or viewport breakpoint changes after load. */
export function useLenis() {
  const reduced = usePrefersReducedMotion()

  useEffect(() => {
    const sync = () => {
      if (shouldUseSmoothScroll()) {
        startSmoothScroll()
        ScrollTrigger.refresh()
      } else {
        stopSmoothScroll()
        ScrollTrigger.refresh()
      }
    }

    sync()

    const reducedMq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const mobileMq = window.matchMedia('(max-width: 767px)')
    reducedMq.addEventListener('change', sync)
    mobileMq.addEventListener('change', sync)

    return () => {
      reducedMq.removeEventListener('change', sync)
      mobileMq.removeEventListener('change', sync)
    }
  }, [reduced])
}