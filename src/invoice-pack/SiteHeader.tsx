import { useEffect, useState } from 'react'
import { AnimatePresence, motion, useScroll, useSpring } from 'motion/react'
import { EASE_OUT } from './motion-tokens'
import { scrollToSection } from './scroll-to'

const LINKS = [
  { id: 'how-it-works', label: 'How it works' },
  { id: 'example', label: 'Example' },
  { id: 'pricing', label: 'Pricing' },
  { id: 'about', label: 'About' },
] as const

const SPY_IDS = ['product', 'how-it-works', 'example', 'create', 'receive', 'pricing', 'about', 'legal']

function sectionToLink(id: string | null): string | null {
  if (id === 'receive') return 'pricing'
  if (id === 'legal') return 'about'
  return id
}

function useScrolled(threshold = 12) {
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const sync = () => setScrolled(window.scrollY > threshold)
    sync()
    window.addEventListener('scroll', sync, { passive: true })
    return () => window.removeEventListener('scroll', sync)
  }, [threshold])
  return scrolled
}

function useActiveSection(ids: string[]) {
  const [active, setActive] = useState<string | null>(null)
  useEffect(() => {
    let frame = 0
    const sync = () => {
      frame = 0
      const line = Math.min(window.innerHeight * 0.3, 240)
      let current: string | null = null
      for (const id of ids) {
        const el = document.getElementById(id)
        if (el && el.getBoundingClientRect().top <= line) current = id
      }
      const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4
      setActive(atBottom ? ids[ids.length - 1] : current)
    }
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(sync)
    }
    sync()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      if (frame) window.cancelAnimationFrame(frame)
    }
  }, [ids])
  return active
}

export function SiteHeader() {
  const scrolled = useScrolled()
  const active = sectionToLink(useActiveSection(SPY_IDS))
  const [menuOpen, setMenuOpen] = useState(false)
  const { scrollYProgress } = useScroll()
  const progress = useSpring(scrollYProgress, { stiffness: 220, damping: 40, restDelta: 0.001 })

  useEffect(() => {
    if (!menuOpen) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false)
    }
    const onResize = () => {
      if (window.innerWidth > 900) setMenuOpen(false)
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('resize', onResize)
    }
  }, [menuOpen])

  return (
    <header className={`ip-top${scrolled ? ' is-scrolled' : ''}${menuOpen ? ' is-open' : ''}`}>
      <div className="ip-top-inner">
        <a className="ip-brand" href="#product" onClick={() => setMenuOpen(false)}>
          <span className="ip-brand-mark" aria-hidden="true">
            <span />
          </span>
          Invoice Pack
        </a>
        <nav className="ip-nav" aria-label="Invoice Pack">
          {LINKS.map((link) => (
            <a
              key={link.id}
              href={`#${link.id}`}
              className={active === link.id ? 'is-active' : undefined}
              aria-current={active === link.id ? 'location' : undefined}
            >
              {active === link.id ? (
                <motion.span className="ip-nav-pill" layoutId="ip-nav-pill" transition={{ type: 'spring', stiffness: 420, damping: 36 }} />
              ) : null}
              <span className="ip-nav-label">{link.label}</span>
            </a>
          ))}
        </nav>
        <div className="ip-top-actions">
          <a className="ip-btn ip-btn--sm" href="#create" onClick={() => setMenuOpen(false)}>
            Create invoice
            <span className="ip-btn-arrow" aria-hidden="true">
              →
            </span>
          </a>
          <button
            type="button"
            className="ip-plain ip-menu-btn"
            aria-expanded={menuOpen}
            aria-controls="ip-mobile-nav"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span className="ip-menu-icon" aria-hidden="true">
              <span />
              <span />
            </span>
          </button>
        </div>
      </div>
      <motion.div className="ip-top-progress" style={{ scaleX: progress }} aria-hidden="true" />
      <AnimatePresence>
        {menuOpen ? (
          <motion.nav
            id="ip-mobile-nav"
            className="ip-mobile-nav"
            aria-label="Invoice Pack menu"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.35, ease: EASE_OUT }}
          >
            <motion.ul
              initial="hidden"
              animate="shown"
              variants={{ hidden: {}, shown: { transition: { staggerChildren: 0.04, delayChildren: 0.06 } } }}
            >
              {[{ id: 'create', label: 'Create your invoice' }, ...LINKS].map((link) => (
                <motion.li
                  key={link.id}
                  variants={{ hidden: { opacity: 0, y: 10 }, shown: { opacity: 1, y: 0 } }}
                  transition={{ duration: 0.4, ease: EASE_OUT }}
                >
                  <a
                    href={`#${link.id}`}
                    className={active === link.id ? 'is-active' : undefined}
                    onClick={(event) => {
                      event.preventDefault()
                      setMenuOpen(false)
                      window.requestAnimationFrame(() => scrollToSection(link.id))
                    }}
                  >
                    {link.label}
                    <span aria-hidden="true">→</span>
                  </a>
                </motion.li>
              ))}
            </motion.ul>
          </motion.nav>
        ) : null}
      </AnimatePresence>
    </header>
  )
}
