import { motion } from 'motion/react'
import { easeOut } from '../../lib/motion'
import { useReducedMotion } from '../../hooks/useReducedMotion'
import { cn } from '../../lib/cn'

const steps = [
  { id: 'idea', label: 'Idea' },
  { id: 'judgment', label: 'Judgment' },
  { id: 'model', label: 'Model' },
  { id: 'schema', label: 'Schema' },
  { id: 'ship', label: 'Ship' },
] as const

type Props = {
  compact?: boolean
  className?: string
}

export function BuildLoop({ compact = false, className }: Props) {
  const reduced = useReducedMotion()

  return (
    <div className={cn(className)}>
      <p className="label mb-3 text-[var(--color-mute)]">
        One loop — the model is a step, not the system
      </p>
      <div className="relative">
        <div className="absolute top-[0.45rem] right-3 left-3 h-px bg-[var(--color-line)]" aria-hidden />
        <motion.div
          className="absolute top-[0.45rem] right-3 left-3 h-px origin-left bg-[var(--color-signal)]"
          aria-hidden
          initial={reduced ? { scaleX: 1 } : { scaleX: 0 }}
          whileInView={{ scaleX: 1 }}
          viewport={{ once: true, margin: '-10% 0px' }}
          transition={{ duration: 1.1, ease: easeOut }}
        />
        <ol className="relative grid grid-cols-5 gap-1">
          {steps.map((step, i) => (
            <motion.li
              key={step.id}
              className="list-none"
              initial={reduced ? false : { opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-10% 0px' }}
              transition={{ duration: 0.45, delay: 0.15 + i * 0.08, ease: easeOut }}
            >
              <span
                className={cn(
                  'mx-auto block h-2.5 w-2.5 border border-[var(--color-ink)] bg-[var(--color-paper)]',
                  step.id === 'model' && 'border-[var(--color-signal)] bg-[var(--color-signal)]',
                )}
                aria-hidden
              />
              <span
                className={cn(
                  'label mt-3 block text-center',
                  compact ? 'text-[0.58rem] tracking-[0.12em]' : '',
                  step.id === 'model' ? 'text-[var(--color-signal)]' : 'text-[var(--color-ink)]',
                )}
              >
                {step.label}
              </span>
            </motion.li>
          ))}
        </ol>
      </div>
    </div>
  )
}
