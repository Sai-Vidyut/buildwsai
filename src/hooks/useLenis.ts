import { useEffect } from 'react'
import Lenis from 'lenis'
import { gsap } from '../lib/gsap'
import { ScrollTrigger } from '../lib/gsap'
import { setLenis } from '../lib/scroll'
import { usePrefersReducedMotion } from './usePrefersReducedMotion'

export function useLenis() {
  const reduced = usePrefersReducedMotion()

  useEffect(() => {
    const mobileMq = window.matchMedia('(max-width: 767px)')
    if (reduced || mobileMq.matches) return

    const lenis = new Lenis({
      duration: 1.15,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      touchMultiplier: 1.5,
    })

    lenis.on('scroll', ScrollTrigger.update)
    setLenis(lenis)

    const tick = (time: number) => {
      lenis.raf(time * 1000)
    }
    gsap.ticker.add(tick)
    gsap.ticker.lagSmoothing(0)

    const onRefresh = () => lenis.resize()
    ScrollTrigger.addEventListener('refresh', onRefresh)
    window.addEventListener('resize', onRefresh)

    return () => {
      gsap.ticker.remove(tick)
      ScrollTrigger.removeEventListener('refresh', onRefresh)
      window.removeEventListener('resize', onRefresh)
      setLenis(null)
      lenis.destroy()
    }
  }, [reduced])
}
