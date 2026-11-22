import { useEffect, useRef } from 'react'
import { motion, useMotionValue, useScroll, useSpring, useTransform, type MotionValue } from 'motion/react'
import { site } from '../../data/site'
import { easeOut } from '../../lib/motion'
import { useReducedMotion } from '../../hooks/useReducedMotion'

type WindowSpec = {
  id: string
  name: string
  tag: string
  src: string
  alt: string
  left: string
  top: string
  width: string
  depth: number
  delay: string
  z: number
}

/** Real interface crops. Positions are inside the hero field, not the page. */
const field: WindowSpec[] = [
  {
    id: 'slyvr',
    name: 'Slyvr',
    tag: 'Library',
    src: '/images/slyvr-library.webp',
    alt: 'Slyvr media library',
    left: '0%',
    top: '6%',
    width: '52%',
    depth: 0.35,
    delay: '-3.2s',
    z: 1,
  },
  {
    id: 'satquery',
    name: 'SatQuery',
    tag: 'Evidence',
    src: '/images/satquery-site.webp',
    alt: 'SatQuery site, earth observation workstation',
    left: '46%',
    top: '0%',
    width: '50%',
    depth: 0.55,
    delay: '-1.4s',
    z: 2,
  },
  {
    id: 'invoice-pack',
    name: 'Invoice Pack',
    tag: 'Shipped',
    src: '/images/invoice-pack-site.webp',
    alt: 'Invoice Pack site, sample invoice and payment reminder',
    left: '8%',
    top: '46%',
    width: '58%',
    depth: 0.75,
    delay: '-5s',
    z: 3,
  },
  {
    id: 'peffle',
    name: 'Peffle',
    tag: 'Guard',
    src: '/images/peffle-site.webp',
    alt: 'Peffle site, local policy enforcement for agent tool calls',
    left: '48%',
    top: '38%',
    width: '50%',
    depth: 1,
    delay: '0s',
    z: 4,
  },
]

const mobile = [
  ...field,
  {
    id: 'docna',
    name: 'DocNA',
    tag: 'Write-back',
    src: '/images/docna-site.webp',
    alt: 'DocNA running locally, reviewing a document and writing answers to a copy',
  },
]

function ProjectWindow({
  item,
  sx,
  sy,
  reduced,
  index,
}: {
  item: WindowSpec
  sx: MotionValue<number>
  sy: MotionValue<number>
  reduced: boolean
  index: number
}) {
  const x = useTransform(sx, (v) => v * item.depth * 28)
  const y = useTransform(sy, (v) => v * item.depth * 18)

  return (
    <motion.a
      href={`#${item.id}`}
      className="absolute block bg-[var(--color-void)] shadow-[0_22px_50px_rgba(18,20,16,0.16)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-signal)]"
      style={{ left: item.left, top: item.top, width: item.width, zIndex: item.z, x, y }}
      initial={reduced ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.7, delay: 0.12 + index * 0.08, ease: easeOut }}
    >
      <div className={reduced ? undefined : 'hero-drift'} style={{ animationDelay: item.delay }}>
        <span className="flex items-center justify-between gap-2 px-2.5 py-1.5 label text-[0.58rem] text-[var(--color-void-mute)]">
          <span className="text-[var(--color-paper)]">{item.name}</span>
          <span>{item.tag}</span>
        </span>
        <img
          src={item.src}
          alt={item.alt}
          width={996}
          height={504}
          className="aspect-[996/504] w-full object-cover object-top"
          draggable={false}
        />
      </div>
    </motion.a>
  )
}

export function Hero() {
  const reduced = useReducedMotion()
  const ref = useRef<HTMLElement>(null)
  const mx = useMotionValue(0)
  const my = useMotionValue(0)
  const sx = useSpring(mx, { stiffness: 70, damping: 22, mass: 0.6 })
  const sy = useSpring(my, { stiffness: 70, damping: 22, mass: 0.6 })
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start start', 'end start'],
  })
  const fieldY = useTransform(scrollYProgress, [0, 1], [0, reduced ? 0 : -72])

  useEffect(() => {
    if (reduced) return
    const fine = window.matchMedia('(hover: hover) and (pointer: fine)')
    if (!fine.matches) return
    const el = ref.current
    if (!el) return

    const onMove = (event: PointerEvent) => {
      const box = el.getBoundingClientRect()
      mx.set((event.clientX - box.left) / box.width - 0.5)
      my.set((event.clientY - box.top) / box.height - 0.5)
    }
    const onLeave = () => {
      mx.set(0)
      my.set(0)
    }

    el.addEventListener('pointermove', onMove)
    el.addEventListener('pointerleave', onLeave)
    return () => {
      el.removeEventListener('pointermove', onMove)
      el.removeEventListener('pointerleave', onLeave)
    }
  }, [reduced, mx, my])

  return (
    <section
      id="top"
      ref={ref}
      aria-label="Introduction"
      className="relative overflow-hidden"
    >
      <div className="shell grid min-h-[100svh] items-end gap-8 pb-10 pt-28 lg:grid-cols-[minmax(0,0.78fr)_minmax(0,1.22fr)] lg:items-center lg:pb-14 lg:pt-24">
        <div className="relative z-10 max-w-xl">
          <motion.p
            className="label text-[var(--color-signal)]"
            initial={reduced ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: easeOut }}
          >
            {site.shortName}
            <span className="text-[var(--color-mute)]"> · {site.availability}</span>
          </motion.p>

          <h1 className="display mt-4 text-[clamp(2.7rem,6.4vw,5.4rem)] leading-[0.9] tracking-[-0.045em] text-[var(--color-ink)]">
            <span className="block overflow-hidden pb-[0.06em]">
              <motion.span
                className="block"
                initial={reduced ? false : { y: '110%' }}
                animate={{ y: '0%' }}
                transition={{ duration: 0.8, ease: easeOut, delay: 0.05 }}
              >
                Ideas become
              </motion.span>
            </span>
            <span className="block overflow-hidden pb-[0.06em]">
              <motion.span
                className="block text-[var(--color-signal)]"
                initial={reduced ? false : { y: '110%' }}
                animate={{ y: '0%' }}
                transition={{ duration: 0.8, ease: easeOut, delay: 0.14 }}
              >
                systems.
              </motion.span>
            </span>
          </h1>

          <motion.p
            className="copy mt-5 max-w-md"
            initial={reduced ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.28, ease: easeOut }}
          >
            I build products from the constraint through the interface. The model proposes. The system decides what ships.
          </motion.p>

          <motion.div
            className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-3"
            initial={reduced ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4, ease: easeOut }}
          >
            <a href="#work" className="btn-signal">
              Selected work
            </a>
            <a href="#contact" className="text-link">
              Contact
            </a>
          </motion.div>
        </div>

        <motion.div style={{ y: fieldY }} className="relative hidden h-[min(72vh,680px)] lg:block">
          <p className="label absolute -top-6 left-0 text-[var(--color-mute)]">Shipped interfaces</p>
          {field.map((item, index) => (
            <ProjectWindow key={item.id} item={item} index={index} sx={sx} sy={sy} reduced={reduced} />
          ))}
        </motion.div>

        <div className="-mx-[clamp(1.25rem,4.5vw,3.5rem)] flex snap-x snap-mandatory gap-3 overflow-x-auto px-[clamp(1.25rem,4.5vw,3.5rem)] pb-2 no-scrollbar lg:hidden">
          {mobile.map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              className="w-[calc(100%-0.25rem)] max-w-none shrink-0 snap-center bg-[var(--color-void)]"
            >
              <span className="flex items-center justify-between gap-2 px-2.5 py-2 label text-[0.58rem] text-[var(--color-void-mute)]">
                <span className="text-[var(--color-paper)]">{item.name}</span>
                <span>{item.tag}</span>
              </span>
              <img
                src={item.src}
                alt={item.alt}
                width={996}
                height={504}
                className="block h-auto w-full"
                draggable={false}
              />
            </a>
          ))}
        </div>
      </div>
    </section>
  )
}
