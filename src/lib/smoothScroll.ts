import Lenis from 'lenis'
import { gsap, ScrollTrigger } from './gsap'
import { setLenis } from './scroll'

let lenisInstance: Lenis | null = null
let tickerFn: ((time: number) => void) | null = null
let onRefresh: (() => void) | null = null
let onLoad: (() => void) | null = null
let onResize: (() => void) | null = null

export function shouldUseSmoothScroll() {
  if (typeof window === 'undefined') return false
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false
  if (window.matchMedia('(max-width: 767px)').matches) return false
  return true
}

export function startSmoothScroll() {
  if (!shouldUseSmoothScroll() || lenisInstance) return

  const lenis = new Lenis({
    duration: 1.15,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
    touchMultiplier: 1.5,
  })

  lenis.on('scroll', ScrollTrigger.update)
  setLenis(lenis)
  lenisInstance = lenis

  tickerFn = (time: number) => {
    lenis.raf(time * 1000)
  }
  gsap.ticker.add(tickerFn)
  gsap.ticker.lagSmoothing(0)

  onRefresh = () => lenis.resize()
  onResize = onRefresh
  ScrollTrigger.addEventListener('refresh', onRefresh)
  window.addEventListener('resize', onResize)

  onLoad = () => {
    lenis.resize()
    ScrollTrigger.refresh()
  }
  window.addEventListener('load', onLoad)
  if (document.readyState === 'complete') onLoad()

  const fontReady = document.fonts?.ready
  if (fontReady) {
    void fontReady.then(() => {
      lenis.resize()
      ScrollTrigger.refresh()
    })
  }

  ScrollTrigger.refresh()
}

export function stopSmoothScroll() {
  if (!lenisInstance) return

  if (onLoad) window.removeEventListener('load', onLoad)
  if (onResize) window.removeEventListener('resize', onResize)
  if (onRefresh) ScrollTrigger.removeEventListener('refresh', onRefresh)
  if (tickerFn) gsap.ticker.remove(tickerFn)

  lenisInstance.destroy()
  lenisInstance = null
  tickerFn = null
  onRefresh = null
  onLoad = null
  onResize = null
  setLenis(null)
}