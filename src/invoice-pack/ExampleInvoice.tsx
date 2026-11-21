import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { buildPack, demoInput } from './logic'
import { Reveal } from './motion-kit'
import { EASE_OUT } from './motion-tokens'
import { InvoiceSheet, Reminders, Warnings } from './Sheets'

type Scenario = 'igst' | 'same-state' | 'no-gst' | 'export'

function scenarioInput(kind: Scenario) {
  if (kind === 'same-state') return demoInput({ gst: true, foreign: false, sameState: true })
  if (kind === 'no-gst') return demoInput({ gst: false, foreign: false, sameState: false })
  if (kind === 'export') return demoInput({ gst: true, foreign: true, sameState: false })
  return demoInput({ gst: true, foreign: false, sameState: false })
}

const SCENARIOS: Array<{ id: Scenario; label: string; hint: string; testId?: string }> = [
  { id: 'igst', label: 'IGST', hint: 'You and your client are in different states.' },
  { id: 'same-state', label: 'CGST + SGST', hint: 'You and your client are in the same state.', testId: 'same-state-toggle' },
  { id: 'no-gst', label: 'No GST', hint: 'You are not GST-registered on this draft.', testId: 'gst-toggle' },
  { id: 'export', label: 'Outside India', hint: 'Client outside India. No GST on the draft.', testId: 'foreign-toggle' },
]

export function ExampleInvoice() {
  const [scenario, setScenario] = useState<Scenario>('igst')
  const pack = useMemo(() => buildPack(scenarioInput(scenario)), [scenario])
  const hint = SCENARIOS.find((item) => item.id === scenario)?.hint

  return (
    <section id="example" className="ip-section ip-split-layout ip-example" aria-labelledby="example-heading">
      <Reveal className="ip-split-aside ip-sticky">
        <p className="ip-label">See an example</p>
        <h2 id="example-heading">What you will receive</h2>
        <p className="ip-lede">
          A finished example for a fictional freelancer and client. It is for reading only. Your pack will use your
          details.
        </p>
        <div className="ip-example-meta no-print">
          <p className="ip-fine">
            <strong>DEMO.</strong> Example Studio, Sample Client Pvt Ltd, and invoice EX-1 are not real.
          </p>
          <div className="ip-seg" role="tablist" aria-label="Example GST scenarios">
            {SCENARIOS.map((item) => {
              const selected = scenario === item.id
              return (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  aria-controls="example-panel"
                  className={selected ? 'ip-plain ip-seg-btn is-active' : 'ip-plain ip-seg-btn'}
                  data-testid={item.testId}
                  onClick={() => setScenario(item.id)}
                >
                  {selected ? (
                    <motion.span
                      className="ip-seg-pill"
                      layoutId="ip-seg-pill"
                      transition={{ type: 'spring', stiffness: 460, damping: 36 }}
                    />
                  ) : null}
                  <span className="ip-seg-label">{item.label}</span>
                </button>
              )
            })}
          </div>
          <AnimatePresence mode="wait" initial={false}>
            <motion.p
              key={scenario}
              className="ip-hint"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2 }}
            >
              {hint}
            </motion.p>
          </AnimatePresence>
        </div>
        <div className="ip-actions no-print">
          <a className="ip-btn" href="#create">
            Create your invoice
            <span className="ip-btn-arrow" aria-hidden="true">
              →
            </span>
          </a>
        </div>
      </Reveal>

      <Reveal className="ip-example-output" delay={0.1}>
        <div id="example-panel" role="tabpanel" aria-labelledby="example-heading">
          <AnimatePresence mode="wait" initial={false}>
            {pack.invoice ? (
              <motion.div
                key={scenario}
                initial={{ opacity: 0, y: 14, filter: 'blur(4px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, y: -10, filter: 'blur(4px)' }}
                transition={{ duration: 0.35, ease: EASE_OUT }}
              >
                <div className="ip-doc-preview">
                  <Warnings warnings={pack.warnings} />
                  <InvoiceSheet invoice={pack.invoice} demo />
                </div>
                <section className="ip-reminders-block" aria-labelledby="example-reminders-heading">
                  <h3 id="example-reminders-heading">Three payment reminders</h3>
                  <p className="ip-fine">Copy and send with the invoice, about 7 days later, and about 14 days later.</p>
                  <Reminders reminders={pack.reminders} demo />
                </section>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </Reveal>
    </section>
  )
}
