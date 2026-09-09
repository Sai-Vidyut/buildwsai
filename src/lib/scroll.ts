import type Lenis from 'lenis'

let lenisInstance: Lenis | null = null

export function setLenis(instance: Lenis | null) {
  lenisInstance = instance
}

export function getLenis() {
  return lenisInstance
}

export function scrollToTop(reducedMotion = false) {
  if (lenisInstance && !reducedMotion) {
    lenisInstance.scrollTo(0, { duration: 1.15 })
    return
  }

  window.scrollTo({ top: 0, behavior: reducedMotion ? 'auto' : 'smooth' })
}

export function scrollToElement(element: HTMLElement, reducedMotion = false) {
  if (lenisInstance && !reducedMotion) {
    lenisInstance.scrollTo(element, { offset: -72, duration: 1.15 })
  } else {
    element.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' })
  }

  element.focus({ preventScroll: true })
}
