import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { navLinks, site } from '../../data/site'
import { cn } from '../../lib/cn'
import { useReducedMotion } from '../../hooks/useReducedMotion'

export function Nav() {
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const reduced = useReducedMotion()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  return (
    <header
      className={cn(
        'fixed inset-x-0 top-0 z-40 safe-top transition-[background,border-color,backdrop-filter] duration-300',
        scrolled || open
          ? 'border-b border-[var(--color-line)] bg-[color-mix(in_oklab,var(--color-paper)_88%,transparent)] backdrop-blur-md'
          : 'border-b border-transparent bg-transparent',
      )}
    >
      <div className="shell flex h-14 items-center justify-between md:h-16">
        <a
          href="#top"
          className="display text-[1.05rem] tracking-[-0.03em] text-[var(--color-ink)] no-underline md:text-[1.15rem]"
          onClick={() => setOpen(false)}
        >
          {site.brand}
          <span className="text-[var(--color-signal)]">.</span>
        </a>

        <nav aria-label="Primary" className="hidden items-center gap-5 xl:gap-7 md:flex">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="label text-[var(--color-mute)] no-underline transition-colors hover:text-[var(--color-ink)]"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <button
          type="button"
          className="label inline-flex min-h-11 min-w-11 items-center justify-center text-[var(--color-ink)] md:hidden"
          aria-expanded={open}
          aria-controls="mobile-nav"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? 'Close' : 'Menu'}
        </button>
      </div>

      <AnimatePresence>
        {open ? (
          <motion.nav
            id="mobile-nav"
            aria-label="Mobile"
            className="border-t border-[var(--color-line)] bg-[var(--color-paper)] md:hidden"
            initial={reduced ? false : { height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={reduced ? undefined : { height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          >
            <ul className="shell flex flex-col gap-1 py-4">
              {navLinks.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    className="display block py-3 text-3xl tracking-[-0.03em] text-[var(--color-ink)] no-underline"
                    onClick={() => setOpen(false)}
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </motion.nav>
        ) : null}
      </AnimatePresence>
    </header>
  )
}
