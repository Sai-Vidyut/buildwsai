import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ADVANCE_CHECKOUT, DEMO_RECEIPT, buildReceipt, type ReceiptInput } from './logic'
import { Reveal } from './motion-kit'
import { EASE_OUT } from './motion-tokens'
import { Errors, ReceiptSheet, Warnings } from './Sheets'
import { PayBox } from './PayBox'

const emptyReceipt: ReceiptInput = {
  seller: '',
  place: '',
  upi: '',
  client: '',
  job: '',
  jobDate: '',
  receiptDate: '',
  total: '',
  advance: '',
  included: '',
  excluded: '',
}

export function AdvanceOffer() {
  const demo = useMemo(() => buildReceipt(DEMO_RECEIPT), [])
  const [form, setForm] = useState<ReceiptInput>(emptyReceipt)
  const [result, setResult] = useState<ReturnType<typeof buildReceipt> | null>(null)

  function patch(partial: ReceiptInput) {
    setForm((current) => ({ ...current, ...partial }))
  }

  const receipt = demo.receipt

  return (
    <section id="advance" className="ip-section ip-advance" aria-labelledby="advance-heading">
      <Reveal className="ip-section-head">
        <p className="ip-label">Separate offer</p>
        <h2 id="advance-heading">Advance Receipt — ₹399</h2>
        <p className="ip-lede">
          For work where you have already received an advance, create a receipt showing the amount received and the
          remaining balance. One short message to send with it. No GST calculation. Not part of the ₹499 invoice pack.
        </p>
      </Reveal>

      <div className="ip-advance-grid">
      <Reveal className="ip-advance-form-col">
      <form
        className="ip-receipt-form no-print"
        autoComplete="off"
        onSubmit={(event) => {
          event.preventDefault()
          setResult(buildReceipt(form))
        }}
      >
        <div className="ip-form-head">
          <h3>Prepare your receipt</h3>
          <button
            type="button"
            className="secondary"
            onClick={() => {
              setForm(DEMO_RECEIPT)
              setResult(buildReceipt(DEMO_RECEIPT))
            }}
          >
            Fill an example
          </button>
        </div>
        <div className="ip-form-grid">
          <div className="ip-field">
            <label htmlFor="ar-seller">Your name</label>
            <input
              id="ar-seller"
              maxLength={120}
              value={form.seller ?? ''}
              onChange={(e) => patch({ seller: e.target.value })}
            />
          </div>
          <div className="ip-field">
            <label htmlFor="ar-place">Your city or area</label>
            <input id="ar-place" maxLength={120} value={form.place ?? ''} onChange={(e) => patch({ place: e.target.value })} />
          </div>
          <div className="ip-field ip-field--full">
            <label htmlFor="ar-upi">Your UPI id, for the balance</label>
            <input
              id="ar-upi"
              maxLength={50}
              spellCheck={false}
              autoComplete="off"
              value={form.upi ?? ''}
              onChange={(e) => patch({ upi: e.target.value })}
            />
          </div>
          <div className="ip-field">
            <label htmlFor="ar-client">Client name</label>
            <input id="ar-client" maxLength={160} value={form.client ?? ''} onChange={(e) => patch({ client: e.target.value })} />
          </div>
          <div className="ip-field">
            <label htmlFor="ar-job">What the job is</label>
            <input id="ar-job" maxLength={180} value={form.job ?? ''} onChange={(e) => patch({ job: e.target.value })} />
          </div>
          <div className="ip-field">
            <label htmlFor="ar-job-date">Job date</label>
            <input id="ar-job-date" type="date" value={form.jobDate ?? ''} onChange={(e) => patch({ jobDate: e.target.value })} />
          </div>
          <div className="ip-field">
            <label htmlFor="ar-receipt-date">Date you received the advance</label>
            <input
              id="ar-receipt-date"
              type="date"
              value={form.receiptDate ?? ''}
              onChange={(e) => patch({ receiptDate: e.target.value })}
            />
          </div>
          <div className="ip-field">
            <label htmlFor="ar-total">Total agreed, in rupees</label>
            <input
              id="ar-total"
              inputMode="decimal"
              maxLength={12}
              value={form.total ?? ''}
              onChange={(e) => patch({ total: e.target.value })}
            />
          </div>
          <div className="ip-field">
            <label htmlFor="ar-advance">Advance received, in rupees</label>
            <input
              id="ar-advance"
              inputMode="decimal"
              maxLength={12}
              value={form.advance ?? ''}
              onChange={(e) => patch({ advance: e.target.value })}
            />
          </div>
          <div className="ip-field ip-field--full">
            <label htmlFor="ar-included">Included, in your words</label>
            <textarea id="ar-included" maxLength={240} value={form.included ?? ''} onChange={(e) => patch({ included: e.target.value })} />
          </div>
          <div className="ip-field ip-field--full">
            <label htmlFor="ar-excluded">Not included, in your words</label>
            <textarea id="ar-excluded" maxLength={240} value={form.excluded ?? ''} onChange={(e) => patch({ excluded: e.target.value })} />
          </div>
        </div>
        <p className="ip-muted">Nothing you type is uploaded. This form does not ask about GST.</p>
        <div className="ip-actions">
          <button type="submit">Prepare the receipt</button>
        </div>
        {result && !result.ok ? <Errors errors={result.errors} /> : null}
      </form>
      </Reveal>
      <Reveal className="ip-advance-preview-col" delay={0.1}>
        <AnimatePresence mode="wait" initial={false}>
          {result?.ok && result.receipt ? (
            <motion.div
              key="result"
              className="ip-doc-preview"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.4, ease: EASE_OUT }}
            >
              <p className="ip-preview-label">Your receipt</p>
              <Warnings warnings={result.warnings} />
              <ReceiptSheet
                receipt={result.receipt}
                message={result.message}
                demo={result.receipt.seller === 'Example Decor'}
              />
              <div className="ip-actions no-print">
                <button type="button" onClick={() => window.print()}>
                  Print or save as PDF
                </button>
              </div>
            </motion.div>
          ) : receipt ? (
            <motion.div
              key="demo"
              className="ip-doc-preview"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.4, ease: EASE_OUT }}
            >
              <p className="ip-preview-label">Example</p>
              <ReceiptSheet receipt={receipt} message={demo.message} demo testId="advance-demo" />
            </motion.div>
          ) : null}
        </AnimatePresence>
      </Reveal>
      </div>

      <div className="no-print ip-advance-pay" id="pay-399">
        <PayBox checkout={ADVANCE_CHECKOUT} />
      </div>
    </section>
  )
}