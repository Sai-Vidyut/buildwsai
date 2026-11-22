import { useRef } from 'react'
import { motion, useScroll, useTransform } from 'motion/react'
import { site } from '../../data/site'
import { easeOut } from '../../lib/motion'
import { useReducedMotion } from '../../hooks/useReducedMotion'

export function Hero() {
  const reduced = useReducedMotion()
  const ref = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start start', 'end start'],
  })
  const titleY = useTransform(scrollYProgress, [0, 1], [0, reduced ? 0 : -48])

  return (
    <section
      id="top"
      ref={ref}
      aria-label="Introduction"
      className="relative flex min-h-[100svh] flex-col justify-center pb-16 pt-28 md:pb-20 md:pt-32"
    >
      <div className="shell relative z-10">
        <motion.p
          className="label mb-5 text-[var(--color-signal)] md:mb-7"
          initial={reduced ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: easeOut }}
        >
          {site.shortName} · {site.availability}
        </motion.p>

        <motion.h1 className="display-hero text-[var(--color-ink)]" style={{ y: titleY }}>
          <span className="block overflow-hidden pb-[0.04em]">
            <motion.span
              className="block"
              initial={reduced ? false : { y: '105%' }}
              animate={{ y: '0%' }}
              transition={{ duration: 0.9, ease: easeOut, delay: 0.05 }}
            >
              {site.brand}
              <span className="text-[var(--color-signal)]">.</span>
            </motion.span>
          </span>
        </motion.h1>

        <motion.p
          className="display mt-5 max-w-3xl text-[clamp(1.6rem,4.2vw,2.75rem)] leading-[1.05] tracking-[-0.03em] text-[var(--color-ink-soft)]"
          initial={reduced ? false : { opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, delay: 0.28, ease: easeOut }}
        >
          Build with intent.
          <span className="mt-2 block font-[family-name:var(--font-serif)] text-[clamp(1.05rem,2vw,1.25rem)] font-normal tracking-normal text-[var(--color-mute)]">
            {site.tagline}
          </span>
        </motion.p>

        <motion.div
          className="mt-9 flex flex-wrap gap-3"
          initial={reduced ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.42, ease: easeOut }}
        >
          <a href="#work" className="btn-signal">
            Selected work
          </a>
          <a href="#contact" className="btn-ghost">
            Start a conversation
          </a>
          <a href="/invoice-pack" className="btn-ghost">
            Invoice Pack
          </a>
        </motion.div>

        <motion.div
          className="mt-12 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-[var(--color-line)] pt-5 label text-[var(--color-mute)] md:mt-16"
          initial={reduced ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.58 }}
        >
          <span>{site.philosophy}</span>
          <span className="hidden sm:inline" aria-hidden>
            /
          </span>
          <a
            href={site.github}
            target="_blank"
            rel="noreferrer"
            className="text-[var(--color-mute)] no-underline transition-colors hover:text-[var(--color-ink)]"
          >
            GitHub
          </a>
          <a
            href={site.linkedin}
            target="_blank"
            rel="noreferrer"
            className="text-[var(--color-mute)] no-underline transition-colors hover:text-[var(--color-ink)]"
          >
            LinkedIn
          </a>
        </motion.div>
      </div>
    </section>
  )
}
