import { useRef, type PointerEvent } from 'react'
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from 'motion/react'
import type { Invoice, Reminder } from './logic'
import { EASE_OUT } from './motion-tokens'
import { PaperPreview } from './PaperPreview'

function excerpt(text: string, max = 96): string {
  const line = text.replace(/\s+/g, ' ').trim()
  return line.length > max ? line.slice(0, max).replace(/\s+\S*$/, '') + '…' : line
}

export function HeroVisual({ invoice, reminders }: { invoice: Invoice; reminders: Reminder[] }) {
  const reduce = useReducedMotion()
  const ref = useRef<HTMLDivElement>(null)
  const px = useMotionValue(0)
  const py = useMotionValue(0)
  const spring = { stiffness: 140, damping: 18, mass: 0.6 }
  const rotateY = useSpring(useTransform(px, [-0.5, 0.5], [-7, 7]), spring)
  const rotateX = useSpring(useTransform(py, [-0.5, 0.5], [5, -5]), spring)
  const chipX = useSpring(useTransform(px, [-0.5, 0.5], [-10, 10]), spring)
  const chipY = useSpring(useTransform(py, [-0.5, 0.5], [-8, 8]), spring)

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    if (reduce || event.pointerType !== 'mouse' || !ref.current) return
    const rect = ref.current.getBoundingClientRect()
    px.set((event.clientX - rect.left) / rect.width - 0.5)
    py.set((event.clientY - rect.top) / rect.height - 0.5)
  }

  function onPointerLeave() {
    px.set(0)
    py.set(0)
  }

  const tax = invoice.taxLines[0]
  const reminder = reminders[1] ?? reminders[0]
  const float = (delay: number) =>
    reduce ? undefined : { y: [0, -7, 0], transition: { duration: 6, repeat: Infinity, ease: 'easeInOut' as const, delay } }

  return (
    <div className="ip-hv" ref={ref} onPointerMove={onPointerMove} onPointerLeave={onPointerLeave}>
      <div className="ip-hv-glow" aria-hidden="true" />
      <motion.div className="ip-hv-stage" style={{ rotateX, rotateY }}>
        <motion.div
          className="ip-hv-back"
          aria-hidden="true"
          initial={{ opacity: 0, rotate: 0, y: 40 }}
          animate={{ opacity: 1, rotate: -5, y: 0 }}
          transition={{ duration: 1, ease: EASE_OUT, delay: 0.25 }}
        />
        <motion.div
          className="ip-hv-front"
          initial={{ opacity: 0, rotate: 0, y: 56, scale: 0.97 }}
          animate={{ opacity: 1, rotate: 1.25, y: 0, scale: 1 }}
          transition={{ duration: 1.05, ease: EASE_OUT, delay: 0.15 }}
        >
          <PaperPreview invoice={invoice} demo />
        </motion.div>
      </motion.div>

      {tax ? (
        <motion.div className="ip-hv-chip ip-hv-chip--tax" style={{ x: chipX, y: chipY }} aria-hidden="true">
          <motion.div
            className="ip-hv-chip-body"
            initial={{ opacity: 0, scale: 0.9, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.7, ease: EASE_OUT, delay: 0.9 }}
          >
            <motion.div animate={float(0)}>
              <span className="ip-hv-dot" />
              <span>
                <strong>
                  {tax.name} {tax.rate}%
                </strong>{' '}
                worked out for you
              </span>
            </motion.div>
          </motion.div>
        </motion.div>
      ) : null}

      {reminder ? (
        <motion.div className="ip-hv-chip ip-hv-chip--msg" style={{ x: chipX, y: chipY }} aria-hidden="true">
          <motion.div
            className="ip-hv-chip-body"
            initial={{ opacity: 0, scale: 0.92, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.75, ease: EASE_OUT, delay: 1.15 }}
          >
            <motion.div animate={float(1.4)}>
              <p className="ip-hv-msg-label">{reminder.label}</p>
              <p className="ip-hv-msg-text">{excerpt(reminder.text)}</p>
            </motion.div>
          </motion.div>
        </motion.div>
      ) : null}
    </div>
  )
}
