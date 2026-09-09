import { useEffect, useRef, useState } from 'react'
import { cn } from '../../lib/cn'
import { useActiveNav } from '../../hooks/useActiveNav'
import { useNavTone } from '../../hooks/useNavTone'

const links = [
  { href: '#work', label: 'Work' },
  { href: '#experience', label: 'Experience' },
  { href: '#resume', label: 'Resume' },
  { href: '#lab', label: 'Lab' },
  { href: '#contact', label: 'Contact' },
]

export function Nav() {
  const [scrolled, setScrolled] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const lastY = useRef(0)
  const ticking = useRef(false)
  const tone = useNavTone()
  const activeHref = useActiveNav()
  const inverted = tone === 'dark'
  const showBar = scrolled || inverted

  useEffect(() => {
    lastY.current = window.scrollY

    const update = () => {
      const y = window.scrollY
      const delta = y - lastY.current

      setScrolled(y > 20)

      if (y < 64) {
        setCollapsed(false)
      } else if (delta > 6) {
        setCollapsed(true)
      } else if (delta < -6) {
        setCollapsed(false)
      }

      lastY.current = y
      ticking.current = false
    }

    const onScroll = () => {
      if (!ticking.current) {
        ticking.current = true
        requestAnimationFrame(update)
      }
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    update()
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header
      className={cn(
        'fixed top-0 inset-x-0 z-50 safe-top safe-x transition-[transform,background-color,border-color] duration-500 ease-out will-change-transform print:hidden',
        collapsed ? '-translate-y-full' : 'translate-y-0',
        showBar
          ? inverted
            ? 'bg-[var(--color-black)]/92 backdrop-blur-lg border-b border-[var(--color-line-inverse)]'
            : 'bg-[var(--color-white)]/95 backdrop-blur-lg border-b border-[var(--color-line)]'
          : 'bg-transparent border-b border-transparent',
      )}
    >
      <nav
        aria-label="Primary"
        className="editorial-container flex items-center justify-between h-14 md:h-[4.5rem] gap-3 md:gap-4"
      >
        <a
          href="#"
          className={cn(
            'font-display text-[0.8125rem] font-semibold tracking-tight shrink-0 min-h-11 flex items-center',
            inverted ? 'text-white' : 'text-[var(--color-black)]',
          )}
        >
          BuildWSai
        </a>

        <ul className="flex items-center gap-3 sm:gap-6 md:gap-10 overflow-x-auto no-scrollbar -mr-1 pr-1 scroll-pl-1">
          {links.map((link) => {
            const isActive = activeHref === link.href
            return (
              <li key={link.href} className="shrink-0">
                <a
                  href={link.href}
                  aria-current={isActive ? 'page' : undefined}
                  className={cn(
                    'label-brand transition-colors duration-300 whitespace-nowrap min-h-11 inline-flex items-center px-0.5',
                    inverted
                      ? isActive
                        ? 'text-white'
                        : 'text-white/45 hover:text-white/80'
                      : isActive
                        ? 'text-[var(--color-black)]'
                        : 'text-[var(--color-muted)] hover:text-[var(--color-black)]',
                  )}
                >
                  {link.label}
                </a>
              </li>
            )
          })}
        </ul>
      </nav>
    </header>
  )
}
