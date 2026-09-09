import { useEffect, useId, useRef } from 'react'
import { gsap } from '../../lib/gsap'
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion'
import { useIsMobile } from '../../hooks/useIsMobile'

type DisplacementImageProps = {
  src: string
  alt: string
  width: number
  height: number
  className?: string
  priority?: boolean
  invert?: boolean
}

export function DisplacementImage({
  src,
  alt,
  width,
  height,
  className = '',
  priority = false,
  invert = false,
}: DisplacementImageProps) {
  const uid = useId().replace(/:/g, '')
  const root = useRef<HTMLDivElement>(null)
  const disp = useRef<SVGFEDisplacementMapElement>(null)
  const turb = useRef<SVGFETurbulenceElement>(null)
  const reduced = usePrefersReducedMotion()
  const mobile = useIsMobile()

  const interactive = !reduced && !mobile

  useEffect(() => {
    if (!interactive || !root.current || !disp.current) return

    const el = root.current
    let target = 0
    let current = 0
    let raf = 0

    const tick = () => {
      current += (target - current) * 0.12
      disp.current?.setAttribute('scale', String(current))
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)

    const onMove = (e: PointerEvent) => {
      const rect = el.getBoundingClientRect()
      const x = (e.clientX - rect.left) / rect.width - 0.5
      const y = (e.clientY - rect.top) / rect.height - 0.5
      const dist = Math.sqrt(x * x + y * y)
      target = 6 + dist * 28
      turb.current?.setAttribute('baseFrequency', `${0.02 + dist * 0.03}`)
    }
    const onLeave = () => {
      target = 0
    }

    el.addEventListener('pointermove', onMove, { passive: true })
    el.addEventListener('pointerleave', onLeave)

    const ctx = gsap.context(() => {
      gsap.fromTo(
        el,
        { y: 30 },
        {
          y: -15,
          ease: 'none',
          scrollTrigger: {
            trigger: el,
            start: 'top bottom',
            end: 'bottom top',
            scrub: 0.5,
          },
        },
      )
    }, el)

    return () => {
      cancelAnimationFrame(raf)
      el.removeEventListener('pointermove', onMove)
      el.removeEventListener('pointerleave', onLeave)
      ctx.revert()
    }
  }, [interactive])

  const filterId = `disp-${uid}`

  return (
    <div
      ref={root}
      className={`relative overflow-hidden ${invert ? 'bg-[#111]' : 'bg-[#ececec]'} ${className}`}
    >
      {interactive && (
        <svg className="absolute w-0 h-0" aria-hidden>
          <filter id={filterId}>
            <feTurbulence
              ref={turb}
              type="fractalNoise"
              baseFrequency="0.02"
              numOctaves="3"
              seed="2"
              result="noise"
            />
            <feDisplacementMap
              ref={disp}
              in="SourceGraphic"
              in2="noise"
              scale="0"
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
        </svg>
      )}
      <img
        src={src}
        alt={alt}
        width={width}
        height={height}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        fetchPriority={priority ? 'high' : 'auto'}
        className="w-full h-auto mx-auto block will-transform"
        style={{
          maxWidth: width,
          filter: interactive ? `url(#${filterId})` : undefined,
        }}
      />
    </div>
  )
}
