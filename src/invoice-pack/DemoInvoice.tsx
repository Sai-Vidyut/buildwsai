import { useMemo, useState } from 'react'
import { DEMO_LINES, buildPack, demoInput, type DemoLine } from './logic'
import { PaperPreview } from './PaperPreview'
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
      <div className="ip-demo">
        <div className="ip-demo-copy">
          <p className="ip-label">Try it yourself</p>
          <h2 id="demo-heading">Invoice Demo</h2>
          <p>
            Generate a sample invoice and see the three reminder messages in action.
          </p>
          <p className="ip-fine">
            Example Studio, Sample Client Pvt Ltd, and EX-1 are fictional. The draft stays in this browser.
          </p>
          <a className="ip-btn" href="#demo-workspace">
            Open the Interactive Demo →
          </a>
        </div>
        <div className="ip-workspace" id="demo-workspace">
          <div className="ip-workspace-form no-print">
            <h3>Invoice Details</h3>
            <div className="ip-field">
              <label htmlFor="demo-client">Client name</label>
              <input id="demo-client" value="Sample Client Pvt Ltd" readOnly />
            </div>
            {lines.map((line, index) => (
              <div className="ip-line-edit" key={line.description}>
                <div className="ip-field">
                  <label htmlFor={`demo-desc-${index}`}>{index === 0 ? 'Service / item' : `Line ${index + 1}`}</label>
                  <input id={`demo-desc-${index}`} value={line.description} readOnly />
                </div>
                <div className="ip-field">
                  <label htmlFor={`demo-amt-${index}`}>Amount</label>
                  <input
                    id={`demo-amt-${index}`}
                    className="ip-amount"
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
            <label className="ip-switch">
              <span>GST (18%)</span>
              <input
                type="checkbox"
                checked={gst}
                data-testid="gst-toggle"
                aria-label="I am GST-registered and this draft should show GST"
                onChange={(event) => setGst(event.target.checked)}
              />
            </label>
            <label className="ip-switch">
              <span>Client outside India</span>
              <input
                type="checkbox"
                checked={foreign}
                data-testid="foreign-toggle"
                onChange={(event) => setForeign(event.target.checked)}
              />
            </label>
            <label className="ip-switch">
              <span>Same state, CGST and SGST</span>
              <input
                type="checkbox"
                checked={sameState}
                disabled={foreign}
                data-testid="same-state-toggle"
                onChange={(event) => setSameState(event.target.checked)}
              />
            </label>
            <Errors errors={pack.errors} />
          </div>
          <div className="ip-workspace-preview">
            {pack.invoice ? (
              <div className="no-print">
                <PaperPreview invoice={pack.invoice} demo />
              </div>
            ) : (
              <p className="ip-fine">Enter a valid amount to see the draft.</p>
            )}
          </div>
        </div>
      </div>
      {pack.invoice ? (
        <div className="ip-demo-output">
          <Warnings warnings={pack.warnings} />
          <div className="ip-demo-output-head">
            <h3>The draft and three reminders</h3>
            <div className="ip-actions no-print">
              <button type="button" onClick={() => window.print()}>
                Print or save as PDF
              </button>
            </div>
          </div>
          <InvoiceSheet invoice={pack.invoice} demo />
          <Reminders reminders={pack.reminders} demo />
        </div>
      ) : null}
    </section>
  )
}
