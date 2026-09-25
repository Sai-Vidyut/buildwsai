import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import { images, peffleImages } from '../../../data/assets'
import { ResponsivePicture } from '../../editorial/ResponsivePicture'
import { cn } from '../../../lib/cn'
import { mobileSpring } from '../../../lib/mobileMotion'
import { useIsMobile } from '../../../hooks/useIsMobile'

type Props = {
  progressRef?: RefObject<{ value: number }>
  static?: boolean
  mobile?: boolean
  className?: string
}

type Phase = 'idle' | 'allow' | 'block'

function phaseFromProgress(p: number): Phase {
  if (p < 0.2) return 'idle'
  if (p < 0.58) return 'allow'
  return 'block'
}

export function PeffleGuardDemo({
  progressRef,
  static: isStatic = false,
  mobile: mobileProp = false,
  className = '',
}: Props) {
  const reduced = useReducedMotion()
  const mobileHook = useIsMobile()
  const mobile = mobileProp || mobileHook
  const [tick, setTick] = useState(0)
  const frame = useRef(0)
  const [autoPhase, setAutoPhase] = useState<Phase>('allow')

  useEffect(() => {
    if (!isStatic && !mobile && progressRef) return

    if (reduced) {
      setAutoPhase('block')
      return
    }

    const sequence: Phase[] = ['idle', 'allow', 'block', 'allow']
    let i = 0
    const id = window.setInterval(() => {
      i = (i + 1) % sequence.length
      setAutoPhase(sequence[i])
    }, 2200)

    return () => window.clearInterval(id)
  }, [isStatic, mobile, progressRef, reduced])

  useEffect(() => {
    if (isStatic || mobile || reduced || !progressRef) return

    const loop = () => {
      setTick((n) => n + 1)
      frame.current = requestAnimationFrame(loop)
    }
    frame.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(frame.current)
  }, [isStatic, mobile, progressRef, reduced])

  void tick

  const p = isStatic || mobile || reduced ? -1 : (progressRef?.current?.value ?? 0)
  const phase = p >= 0 ? phaseFromProgress(p) : autoPhase

  const spent = useMemo(() => {
    if (phase === 'idle') return 0
    if (phase === 'allow') return 8
    return 13
  }, [phase])

  const statusLabel = phase === 'block' ? 'BLOCKED' : phase === 'allow' ? 'ALLOWED' : 'READY'
  const statusTone =
    phase === 'block'
      ? 'text-[var(--peffle-deny)] border-[var(--peffle-deny)]/40 bg-[var(--peffle-deny)]/10'
      : phase === 'allow'
        ? 'text-[var(--peffle-allow)] border-[var(--peffle-allow)]/40 bg-[var(--peffle-allow)]/10'
        : 'text-[var(--peffle-muted)] border-[var(--peffle-line)] bg-[var(--peffle-panel)]'

  return (
    <div
      className={cn(
        'relative w-full mx-auto border border-[var(--peffle-line)] bg-[var(--peffle-bg)] overflow-hidden mobile-visual-frame',
        className,
      )}
      style={{
        maxWidth: peffleImages.width,
        aspectRatio: `${peffleImages.width} / ${peffleImages.height}`,
      }}
      aria-label="Peffle spend guard demonstration"
    >
      <ResponsivePicture
        src={images.peffle}
        alt="Peffle blocks an agent charge when the daily spend cap would be exceeded"
        width={peffleImages.width}
        height={peffleImages.height}
        className="absolute inset-0 h-full w-full object-cover object-center"
      />

      <motion.img
        src={images.peffleMascot}
        alt=""
        aria-hidden
        className="absolute bottom-[8%] right-[6%] w-[min(18%,120px)] drop-shadow-lg pointer-events-none"
        animate={reduced ? undefined : { y: [0, -8, 0] }}
        transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
      />

      <div className="absolute inset-0 bg-gradient-to-t from-[var(--peffle-bg)]/85 via-[var(--peffle-bg)]/20 to-transparent" />

      <div className="absolute inset-x-4 bottom-4 md:inset-x-6 md:bottom-6 flex flex-col gap-3">
        <motion.div
          className="flex flex-wrap items-center gap-2"
          initial={false}
          animate={{ opacity: 1, y: 0 }}
        >
          {['Request', 'Peffle guard', 'Ledger'].map((step, i) => {
            const active =
              (phase === 'idle' && i === 0) ||
              (phase === 'allow' && i <= 1) ||
              (phase === 'block' && i <= 2)
            return (
              <motion.span
                key={step}
                layout
                className={cn(
                  'label-brand border px-2 py-1',
                  active
                    ? 'text-[var(--peffle-text)] border-[var(--peffle-info)]/45'
                    : 'text-[var(--peffle-muted)] border-[var(--peffle-line)]',
                )}
                transition={mobileSpring}
              >
                {step}
              </motion.span>
            )
          })}
        </motion.div>

        <motion.div
          layout
          className="border border-[var(--peffle-line)] bg-[var(--peffle-panel)]/95 backdrop-blur-sm p-3 md:p-4 font-mono text-xs md:text-sm"
          transition={mobileSpring}
        >
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <p className="label-brand text-[var(--peffle-muted)]">charge_card</p>
            <motion.span
              key={statusLabel}
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={mobileSpring}
              className={cn('label-brand border px-2 py-0.5', statusTone)}
            >
              {statusLabel}
            </motion.span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-[var(--peffle-text)] tabular-nums mb-3">
            <div>
              <p className="text-[var(--peffle-muted)] text-[0.65rem] uppercase tracking-wide">Limit</p>
              <p>$10</p>
            </div>
            <div>
              <p className="text-[var(--peffle-muted)] text-[0.65rem] uppercase tracking-wide">Spent</p>
              <motion.p
                key={spent}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={mobileSpring}
              >
                ${spent}
              </motion.p>
            </div>
            <div>
              <p className="text-[var(--peffle-muted)] text-[0.65rem] uppercase tracking-wide">Remaining</p>
              <p>${Math.max(0, 10 - spent)}</p>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {phase === 'block' ? (
              <motion.p
                key="block-msg"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={mobileSpring}
                className="text-[var(--peffle-deny)] leading-snug"
              >
                Budget exceeded: spent 13 would exceed limit 10
              </motion.p>
            ) : phase === 'allow' ? (
              <motion.p
                key="allow-msg"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-[var(--peffle-allow)] leading-snug"
              >
                CHARGED $8 — policy and cap OK
              </motion.p>
            ) : (
              <motion.p
                key="idle-msg"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-[var(--peffle-muted)] leading-snug"
              >
                peffle.guard(request, handler)
              </motion.p>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  )
}
