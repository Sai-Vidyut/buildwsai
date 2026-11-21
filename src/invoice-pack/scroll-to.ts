export function scrollToSection(id: string): boolean {
  const target = document.getElementById(id)
  if (!target) return false
  const headerHeight = document.querySelector('.ip-top-inner')?.getBoundingClientRect().height ?? 64
  const top = id === 'product' ? 0 : target.getBoundingClientRect().top + window.scrollY - headerHeight
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  window.scrollTo({ top, behavior: reduce ? 'auto' : 'smooth' })
  window.history.pushState(null, '', `#${id}`)
  return true
}
