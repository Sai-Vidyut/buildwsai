import { useMemo, useState } from 'react'
import { DEMO_LINES, buildPack, demoInput, type DemoLine } from './logic'
import { Errors, InvoiceSheet, Reminders, Warnings } from './Sheets'

export function DemoInvoice() {
  const [gst, setGst] = useState(true)
  const [foreign, setForeign] = useState(false)
  const [sameState, setSameState] = useState(false)
  const [lines, setLines] = useState<DemoLine[]>(DEMO_LINES)

  const pack = useMemo(
    () => buildPack(demoInput({ gst, foreign, sameState, lines })),
    [gst, foreign, sameState, lines],
  )

  return (
    <section id="demo" className="ip-section" aria-labelledby="demo-heading">
      <p className="ip-kicker">Demo</p>
      <h2 id="demo-heading">A fictional invoice</h2>
      <p>
        Example Studio in Karnataka bills Sample Client Pvt Ltd in Mumbai. Neither is a real customer. The
        number is EX-1. The lines and amounts below are the example. Change GST, the client’s country, or the
        state, and the draft and the three reminders recalculate in this browser. Nothing is uploaded.
      </p>
      <div className="no-print">
        <label className="ip-check">
          <input
            type="checkbox"
            checked={gst}
            data-testid="gst-toggle"
            onChange={(event) => setGst(event.target.checked)}
          />
          I am GST-registered and this draft should show GST
        </label>
        <label className="ip-check">
          <input
            type="checkbox"
            checked={foreign}
            data-testid="foreign-toggle"
            onChange={(event) => setForeign(event.target.checked)}
          />
          Client is outside India
        </label>
        <label className="ip-check">
          <input
            type="checkbox"
            checked={sameState}
            disabled={foreign}
            data-testid="same-state-toggle"
            onChange={(event) => setSameState(event.target.checked)}
          />
          Client is in Karnataka too (CGST and SGST)
        </label>
        {lines.map((line, index) => (
          <div className="ip-row" key={line.description}>
            <div className="ip-field">
              <label htmlFor={`demo-desc-${index}`}>Line {index + 1}</label>
              <input id={`demo-desc-${index}`} value={line.description} readOnly />
            </div>
            <div className="ip-field">
              <label htmlFor={`demo-amt-${index}`}>Amount in rupees</label>
              <input
                id={`demo-amt-${index}`}
                inputMode="decimal"
                value={line.amount}
                data-testid={`demo-amt-${index}`}
                onChange={(event) => {
                  const next = lines.map((item, itemIndex) =>
                    itemIndex === index ? { ...item, amount: event.target.value } : item,
                  )
                  setLines(next)
                }}
              />
            </div>
          </div>
        ))}
      </div>
      <Errors errors={pack.errors} />
      {pack.invoice ? (
        <>
          <Warnings warnings={pack.warnings} />
          <InvoiceSheet invoice={pack.invoice} demo />
          <h3>Three reminders</h3>
          <p className="ip-muted">
            The words are the pack’s reminders: one to send with the invoice, one about 7 days later, one about
            14 days later.
          </p>
          <Reminders reminders={pack.reminders} demo />
        </>
      ) : null}
    </section>
  )
}
