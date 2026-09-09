import { useRef, useState, type RefObject } from 'react'
import { images } from '../../../data/assets'
import { projectPictureSizes, projectSrcSet } from '../../../lib/media'
import { cn } from '../../../lib/cn'

const regions = [
  { id: 'change', x: 18, y: 38, w: 22, h: 18, label: 'Surface change' },
  { id: 'water', x: 58, y: 52, w: 16, h: 14, label: 'Water edge' },
  { id: 'built', x: 34, y: 22, w: 14, h: 12, label: 'Built-up' },
]

type Props = {
  className?: string
  mobile?: boolean
  onExpand?: () => void
  headerCoordsRef?: RefObject<HTMLParagraphElement | null>
}

export function SatQueryMapDemo({
  className = '',
  mobile = false,
  onExpand,
  headerCoordsRef,
}: Props) {
  const [active, setActive] = useState<string | null>(null)
  const [coords, setCoords] = useState('12.9716° N · 77.5946° E')
  const root = useRef<HTMLDivElement>(null)

  const onPointerMove = (e: React.PointerEvent) => {
    if (mobile) return
    const el = root.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const nx = ((e.clientX - rect.left) / rect.width) * 0.12 + 77.58
    const ny = 12.97 - ((e.clientY - rect.top) / rect.height) * 0.08
    setCoords(`${ny.toFixed(4)}° N · ${nx.toFixed(4)}° E`)
  }

  const onRegionTap = (id: string) => {
    setActive((current) => (current === id ? null : id))
    const region = regions.find((r) => r.id === id)
    if (region) {
      setCoords(`${region.label} · 12.9716° N · 77.5946° E`)
    }
  }

  return (
    <div
      ref={root}
      className={cn(
        'relative w-full overflow-hidden border border-[var(--satquery-purple)]/20 bg-[#f0f0f0] group',
        className,
      )}
      style={{ aspectRatio: '1200 / 683' }}
      onPointerMove={onPointerMove}
      onPointerLeave={() => {
        if (!mobile) setCoords('12.9716° N · 77.5946° E · Sentinel-2')
      }}
      role="img"
      aria-label="SatQuery map workstation with selectable evidence regions over satellite imagery"
    >
      <picture>
        <source srcSet={projectSrcSet(images.satquery)} sizes={projectPictureSizes(1200)} type="image/webp" />
        <img
          src={images.satquery}
          alt=""
          aria-hidden
          width={1200}
          height={683}
          className={cn(
            'w-full h-full object-cover object-center contrast-[1.02] transition-[filter] duration-700',
            active ? 'grayscale-0' : 'grayscale-[0.45]',
          )}
          draggable={false}
        />
      </picture>

      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden
      >
        {regions.map((r) => (
          <rect
            key={r.id}
            x={r.x}
            y={r.y}
            width={r.w}
            height={r.h}
            fill={active === r.id ? 'rgba(109,40,217,0.22)' : 'rgba(109,40,217,0.06)'}
            stroke={active === r.id ? 'rgba(109,40,217,0.9)' : 'rgba(109,40,217,0.45)'}
            strokeWidth={active === r.id ? 0.35 : 0.2}
            className="transition-[fill,stroke] duration-300"
          />
        ))}
      </svg>

      <div className="absolute inset-0">
        {regions.map((r) => (
          <button
            key={r.id}
            type="button"
            className="absolute min-h-11 min-w-11"
            style={{
              left: `${r.x}%`,
              top: `${r.y}%`,
              width: `${r.w}%`,
              height: `${r.h}%`,
            }}
            aria-label={`Evidence region: ${r.label}`}
            aria-pressed={active === r.id}
            onClick={() => onRegionTap(r.id)}
            onFocus={() => setActive(r.id)}
            onBlur={() => setActive(null)}
            onPointerEnter={() => {
              if (!mobile) setActive(r.id)
            }}
            onPointerLeave={() => {
              if (!mobile) setActive(null)
            }}
          />
        ))}
      </div>

      {headerCoordsRef && (
        <p
          ref={headerCoordsRef}
          className="absolute top-4 left-4 z-20 max-w-[calc(100%-5.5rem)] label-brand text-[var(--satquery-purple-faint)] pointer-events-none"
        >
          12.9716° N · 77.5946° E · Sentinel-2
        </p>
      )}

      <p className="absolute bottom-0 inset-x-0 label-brand text-[var(--satquery-purple)] bg-[var(--satquery-bg)]/90 px-4 py-3 border-t border-[var(--satquery-purple)]/15">
        {mobile && !active ? 'Tap a region to inspect evidence · ' : ''}
        {active ? `${regions.find((r) => r.id === active)?.label} · ` : ''}
        {coords}
      </p>

      {onExpand && (
        <button
          type="button"
          onClick={onExpand}
          className="absolute top-4 right-4 label-brand touch-visible transition-opacity bg-white/90 text-[var(--satquery-purple)] px-3 py-2 min-h-11"
          aria-label="Expand SatQuery workstation image"
        >
          Expand
        </button>
      )}
    </div>
  )
}
