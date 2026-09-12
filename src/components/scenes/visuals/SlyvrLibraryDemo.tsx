import { useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import { cn } from '../../../lib/cn'
import { useIsMobile } from '../../../hooks/useIsMobile'
import { usePrefersReducedMotion } from '../../../hooks/usePrefersReducedMotion'

const QUERY = 'sunset on the balcony'
const STEPS = ['Ingest', 'Index', 'Search', 'Clip'] as const

const clips = [
  { id: 'c1', title: 'Balcony · golden hour', match: true, tone: 0.22 },
  { id: 'c2', title: 'Kitchen prep cutaways', match: false, tone: 0.14 },
  { id: 'c3', title: 'Street night B-roll', match: false, tone: 0.1 },
  { id: 'c4', title: 'Sunset · railing take 2', match: true, tone: 0.28 },
  { id: 'c5', title: 'Interview room A', match: false, tone: 0.16 },
  { id: 'c6', title: 'Balcony · wide lockoff', match: true, tone: 0.2 },
]

type Props = {
  progressRef?: RefObject<{ value: number }>
  static?: boolean
  mobile?: boolean
  className?: string
}

function typedQuery(progress: number) {
  const t = Math.max(0, Math.min(1, (progress - 0.12) / 0.38))
  const n = Math.round(t * QUERY.length)
  return QUERY.slice(0, n)
}

export function SlyvrLibraryDemo({
  progressRef,
  static: isStatic = false,
  mobile: mobileProp = false,
  className = '',
}: Props) {
  const reduced = usePrefersReducedMotion()
  const mobileHook = useIsMobile()
  const mobile = mobileProp || mobileHook
  const [tick, setTick] = useState(0)
  const frame = useRef(0)

  useEffect(() => {
    if (isStatic || mobile || reduced || !progressRef) return

    const loop = () => {
      setTick((n) => n + 1)
      frame.current = requestAnimationFrame(loop)
    }
    frame.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(frame.current)
  }, [isStatic, mobile, progressRef, reduced])

  const p = isStatic || mobile || reduced ? 1 : (progressRef?.current?.value ?? 0)
  void tick

  const query = useMemo(() => typedQuery(p), [p])
  const searching = p >= 0.12
  const ranked = p >= 0.55
  const stepIndex = Math.min(STEPS.length - 1, Math.floor(p * STEPS.length))

  return (
    <div
      className={cn(
        'relative w-full mx-auto border border-[var(--slyvr-line)] bg-[var(--slyvr-surface)] overflow-hidden mobile-visual-frame',
        className,
      )}
      style={{ maxWidth: 1200, aspectRatio: '1200 / 720' }}
      aria-label="Slyvr library search demonstration"
    >
      <div className="absolute inset-0 flex flex-col p-4 sm:p-5 md:p-6">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-2 mb-4 md:mb-5">
          {STEPS.map((step, i) => (
            <div key={step} className="flex items-center gap-2">
              <span
                className={cn(
                  'label-brand border px-2 py-1 transition-colors duration-300',
                  i <= stepIndex
                    ? 'text-[var(--slyvr-text)] border-[var(--slyvr-accent)]/35'
                    : 'text-[var(--slyvr-muted)] border-[var(--slyvr-line)]',
                )}
              >
                {step}
              </span>
              {i < STEPS.length - 1 && (
                <span className="label-brand text-[var(--slyvr-muted)]" aria-hidden>
                  →
                </span>
              )}
            </div>
          ))}
        </div>

        <div className="border border-[var(--slyvr-line)] bg-[var(--slyvr-bg)] px-3 py-2.5 md:px-4 md:py-3 mb-4 md:mb-5">
          <p className="label-brand text-[var(--slyvr-muted)] mb-1.5">Search library</p>
          <p className="font-mono text-sm md:text-base text-[var(--slyvr-text)] min-h-[1.5rem] tracking-tight">
            {searching ? (
              <>
                {query}
                {query.length < QUERY.length && (
                  <span className="inline-block w-[0.55ch] h-[1em] align-[-0.1em] ml-0.5 bg-[var(--slyvr-match)]/80" />
                )}
              </>
            ) : (
              <span className="text-[var(--slyvr-muted)]">Ask for a moment…</span>
            )}
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5 md:gap-3 flex-1 min-h-0 content-start">
          {clips.map((clip, i) => {
            const delay = i * 0.03
            const reveal = Math.max(0, Math.min(1, (p - 0.02 - delay) / 0.2))
            const dimmed = ranked && !clip.match
            const emphasize = ranked && clip.match
            const opacity = dimmed ? 0.22 : Math.max(0.15, reveal)

            return (
              <article
                key={clip.id}
                className={cn(
                  'relative border overflow-hidden',
                  emphasize ? 'border-[var(--slyvr-match)]/55' : 'border-[var(--slyvr-line)]',
                )}
                style={{
                  opacity,
                  transform: `translateY(${(1 - reveal) * 10}px)`,
                }}
              >
                <div
                  className="h-16 md:h-20 w-full"
                  style={{
                    background: `linear-gradient(145deg, rgba(235,233,227,${clip.tone + 0.08}) 0%, rgba(18,19,26,0.95) 70%)`,
                  }}
                />
                <div className="p-2.5 md:p-3">
                  <p className="text-[0.7rem] md:text-xs text-[var(--slyvr-text)] leading-snug">
                    {clip.title}
                  </p>
                  {emphasize && (
                    <p className="label-brand text-[var(--slyvr-match)] mt-1.5">Match</p>
                  )}
                </div>
              </article>
            )
          })}
        </div>
      </div>
    </div>
  )
}
