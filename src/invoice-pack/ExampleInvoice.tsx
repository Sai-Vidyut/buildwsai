import { useMemo, useState } from 'react'
import { buildPack, demoInput } from './logic'
import { InvoiceSheet, Reminders, Warnings } from './Sheets'

type Scenario = 'igst' | 'same-state' | 'no-gst' | 'export'

function scenarioInput(kind: Scenario) {
  if (kind === 'same-state') return demoInput({ gst: true, foreign: false, sameState: true })
  if (kind === 'no-gst') return demoInput({ gst: false, foreign: false, sameState: false })
  if (kind === 'export') return demoInput({ gst: true, foreign: true, sameState: false })
  return demoInput({ gst: true, foreign: false, sameState: false })
}

const SCENARIOS: Array<{ id: Scenario; label: string; hint: string }> = [
  { id: 'igst', label: 'IGST', hint: 'You and your client are in different states.' },
  { id: 'same-state', label: 'CGST + SGST', hint: 'You and your client are in the same state.' },
  { id: 'no-gst', label: 'No GST', hint: 'You are not GST-registered on this draft.' },
  { id: 'export', label: 'Outside India', hint: 'Client outside India. No GST on the draft.' },
]

export function ExampleInvoice() {
  const [scenario, setScenario] = useState<Scenario>('igst')
  const pack = useMemo(() => buildPack(scenarioInput(scenario)), [scenario])

  return (
    <section id="example" className="ip-section" aria-labelledby="example-heading">
      <p className="ip-label">See an example</p>
      <h2 id="example-heading">What you will receive</h2>
      <p className="ip-lede ip-lede-narrow">
        A finished example for a fictional freelancer and client. It is for reading only. Your pack will use your
        details.
      </p>
      <div className="ip-example-meta no-print">
        <p className="ip-fine">
          <strong>DEMO.</strong> Example Studio, Sample Client Pvt Ltd, and invoice EX-1 are not real.
        </p>
        <div className="ip-scenario" role="tablist" aria-label="Example GST scenarios">
          {SCENARIOS.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={scenario === item.id}
              className={scenario === item.id ? 'ip-scenario-btn active' : 'ip-scenario-btn'}
              data-testid={
                item.id === 'no-gst'
                  ? 'gst-toggle'
                  : item.id === 'export'
                    ? 'foreign-toggle'
                    : item.id === 'same-state'
                      ? 'same-state-toggle'
                      : undefined
              }
              onClick={() => setScenario(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
        <p className="ip-hint">{SCENARIOS.find((item) => item.id === scenario)?.hint}</p>
      </div>
      {pack.invoice ? (
        <div className="ip-example-output">
          <Warnings warnings={pack.warnings} />
          <InvoiceSheet invoice={pack.invoice} demo />
          <h3>Three payment reminders</h3>
          <p className="ip-fine">Copy and send with the invoice, about 7 days later, and about 14 days later.</p>
          <Reminders reminders={pack.reminders} demo />
        </div>
      ) : null}
      <div className="ip-actions no-print">
        <a className="ip-btn" href="#create">
          Create your invoice →
        </a>
      </div>
    </section>
  )
}