import { useEffect, useRef, useState } from 'react'
import { gsap } from '../../../lib/gsap'
import { cn } from '../../../lib/cn'
import { useIsMobile } from '../../../hooks/useIsMobile'
import { usePrefersReducedMotion } from '../../../hooks/usePrefersReducedMotion'

const steps = [
  { id: 'intent', label: 'Intent' },
  { id: 'discovery', label: 'Discovery' },
  { id: 'recommendation', label: 'Recommendation' },
  { id: 'guardrails', label: 'Guardrails' },
  { id: 'transaction', label: 'Transaction' },
]

type Props = {
  scrollRoot?: React.RefObject<HTMLElement | null>
  className?: string
  static?: boolean
}

export function RazorFlowPipeline({ scrollRoot, className = '', static: isStatic = false }: Props) {
  const [scrubActive, setScrubActive] = useState(0)
  const progress = useRef({ value: 0 })
  const reduced = usePrefersReducedMotion()
  const mobile = useIsMobile()
  const active = isStatic || mobile || reduced ? steps.length - 1 : scrubActive

  useEffect(() => {
    if (isStatic || mobile || reduced) return

    const target = scrollRoot?.current
    if (!target) return

    const ctx = gsap.context(() => {
      gsap.to(progress.current, {
        value: steps.length - 1,
        ease: 'none',
        scrollTrigger: {
          trigger: target,
          start: 'top top',
          end: 'bottom bottom',
          scrub: 0.4,
        },
        onUpdate: () => setScrubActive(Math.round(progress.current.value)),
      })
    })

    return () => ctx.revert()
  }, [isStatic, mobile, reduced, scrollRoot])

  return (
    <div
      className={cn('flex flex-wrap items-center gap-x-2 gap-y-3', className)}
      role="list"
      aria-label="RazorFlow commerce pipeline"
    >
      {steps.map((step, i) => (
        <div key={step.id} className="flex items-center gap-2" role="listitem">
          <span
            className={cn(
              'label-brand transition-all duration-500 px-2 py-1 border',
              i <= active
                ? 'text-[var(--razorflow-green)] border-[var(--razorflow-green)]/50 bg-[var(--razorflow-green)]/8'
                : 'text-[var(--razorflow-green-faint)] border-[var(--razorflow-line)]',
            )}
          >
            {step.label}
          </span>
          {i < steps.length - 1 && (
            <span className="text-[var(--razorflow-green-faint)] label-brand" aria-hidden>→</span>
          )}
        </div>
      ))}
    </div>
  )
}
