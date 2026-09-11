import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { cn } from '../../lib/cn'
import { scrollToTop } from '../../lib/scroll'
import { useIsMobile } from '../../hooks/useIsMobile'
import { useNavTone } from '../../hooks/useNavTone'
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion'
import { mobileSpring } from '../../lib/mobileMotion'

export function BackToTop() {
  const [visible, setVisible] = useState(false)
  const reduced = usePrefersReducedMotion()
  const mobile = useIsMobile()
  const tone = useNavTone()

  useEffect(() => {
    const hero = document.getElementById('hero')
    if (!hero) return

    const observer = new IntersectionObserver(
      ([entry]) => setVisible(!entry.isIntersecting),
      { threshold: 0 },
    )

    observer.observe(hero)
    return () => observer.disconnect()
  }, [])

  const inverted = tone === 'dark'

  const buttonClass = cn(
    'fixed bottom-[calc(1.25rem+env(safe-area-inset-bottom,0px))] right-[calc(1rem+env(safe-area-inset-right,0px))] sm:bottom-8 sm:right-8 z-40 print:hidden',
    'label-brand min-h-11 px-4 py-3',
    'border backdrop-blur-md',
    'hover:-translate-y-1 active:translate-y-0',
    inverted
      ? 'bg-[var(--color-black)]/85 border-white/15 text-white/70 hover:text-white'
      : 'bg-[var(--color-white)]/85 border-[var(--color-line)] text-[var(--color-muted)] hover:text-[var(--color-black)]',
  )

  if (mobile && !reduced) {
    return (
      <AnimatePresence>
        {visible && (
          <motion.button
            type="button"
            onClick={() => scrollToTop(reduced)}
            aria-label="Back to top"
            className={buttonClass}
            initial={{ opacity: 0, y: 16, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.96 }}
            transition={mobileSpring}
            whileTap={{ scale: 0.96 }}
          >
            Top ↑
          </motion.button>
        )}
      </AnimatePresence>
    )
  }

  return (
    <button
      type="button"
      onClick={() => scrollToTop(reduced)}
      aria-label="Back to top"
      className={cn(
        buttonClass,
        'transition-all duration-500 ease-out',
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3 pointer-events-none',
      )}
    >
      Top ↑
    </button>
  )
}
