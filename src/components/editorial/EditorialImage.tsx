import { useEffect, useRef, useState } from 'react'
import { gsap } from '../../lib/gsap'
import { cn } from '../../lib/cn'
import { webpSrc } from '../../lib/media'
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion'

type EditorialImageProps = {
  src: string
  alt: string
  width: number
  height: number
  className?: string
  priority?: boolean
  parallax?: boolean
  interactive?: boolean
  invert?: boolean
  colorReveal?: boolean
  onExpand?: () => void
}

export function EditorialImage({
  src,
  alt,
  width,
  height,
  className = '',
  priority = false,
  parallax = true,
  interactive = false,
  invert = false,
  colorReveal = false,
  onExpand,
}: EditorialImageProps) {
  const root = useRef<HTMLDivElement>(null)
  const inner = useRef<HTMLDivElement>(null)
  const reduced = usePrefersReducedMotion()
  const [loaded, setLoaded] = useState(false)
  const [revealed, setRevealed] = useState(!colorReveal || reduced)

  useEffect(() => {
    if (!colorReveal || reduced || !root.current) return

    const el = root.current
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && entry.intersectionRatio > 0.4) setRevealed(true)
      },
      { threshold: [0.4, 0.6] },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [colorReveal, reduced])

  useEffect(() => {
    if (reduced || !root.current || !inner.current) return

    const el = root.current
    const layer = inner.current
    let px = 0
    let py = 0
    let tx = 0
    let ty = 0
    let raf = 0

    const lerp = (a: number, b: number, t: number) => a + (b - a) * t

    const tick = () => {
      px = lerp(px, tx, 0.08)
      py = lerp(py, ty, 0.08)
      const depth = parallax ? 1 : 0.55
      layer.style.transform = `translate3d(${px * depth}px, ${py * depth}px, 0)`
      raf = requestAnimationFrame(tick)
    }

    const onMove = (e: PointerEvent) => {
      if (!interactive) return
      const rect = el.getBoundingClientRect()
      const x = (e.clientX - rect.left) / rect.width - 0.5
      const y = (e.clientY - rect.top) / rect.height - 0.5
      tx = x * 14
      ty = y * 9
    }
    const onLeave = () => {
      tx = 0
      ty = 0
    }

    if (interactive) {
      raf = requestAnimationFrame(tick)
      el.addEventListener('pointermove', onMove, { passive: true })
      el.addEventListener('pointerleave', onLeave)
    }

    const ctx = gsap.context(() => {
      if (parallax) {
        gsap.fromTo(
          layer,
          { y: 32 },
          {
            y: -16,
            ease: 'none',
            scrollTrigger: {
              trigger: el,
              start: 'top bottom',
              end: 'bottom top',
              scrub: 0.65,
            },
          },
        )
      }
    }, el)

    return () => {
      cancelAnimationFrame(raf)
      el.removeEventListener('pointermove', onMove)
      el.removeEventListener('pointerleave', onLeave)
      ctx.revert()
    }
  }, [interactive, parallax, reduced])

  const webp = webpSrc(src)

  return (
    <div
      ref={root}
      className={cn(
        'overflow-hidden relative group',
        invert ? 'bg-[#141414]' : 'bg-[#f0f0f0]',
        className,
      )}
      aria-busy={!loaded}
    >
      <div ref={inner} className="will-transform">
        <picture>
          <source srcSet={webp} type="image/webp" />
          <img
            src={src}
            alt={alt}
            width={width}
            height={height}
            loading={priority ? 'eager' : 'lazy'}
            decoding="async"
            fetchPriority={priority ? 'high' : 'auto'}
            onLoad={() => setLoaded(true)}
            className={cn(
              'w-full h-auto max-w-full mx-auto block',
              !reduced && 'transition-[opacity,filter] duration-[1.2s] ease-out',
              loaded ? 'opacity-100' : 'opacity-0',
              colorReveal && !revealed && 'grayscale contrast-[1.05] brightness-[0.92]',
            )}
            style={{ maxWidth: width }}
          />
        </picture>
      </div>
      {onExpand && loaded && (
        <button
          type="button"
          onClick={onExpand}
          className="absolute bottom-4 right-4 label-brand opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-300 bg-black/70 text-white px-3 py-2 min-h-11 backdrop-blur-sm"
          aria-label={`View full size: ${alt}`}
        >
          Expand
        </button>
      )}
    </div>
  )
}
