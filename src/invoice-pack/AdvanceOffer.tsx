import { useMemo, useState } from 'react'
import { ADVANCE_CHECKOUT, DEMO_RECEIPT, buildReceipt, type ReceiptInput } from './logic'
import { Errors, Warnings } from './Sheets'
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
      <p className="ip-label">Separate offer</p>
      <h2 id="advance-heading">Advance Receipt — ₹399</h2>
      <p className="ip-lede ip-lede-narrow">
        For work where you have already received an advance, create a receipt showing the amount received and the
        remaining balance. One short message to send with it. No GST calculation. Not part of the ₹499 invoice pack.
      </p>

      {receipt ? (
        <article className="ip-sheet" data-testid="advance-demo">
          <p className="ip-demo-flag">DEMO</p>
          <p className="ip-kicker">Advance receipt</p>
          <h3 className="ip-who">{receipt.seller}</h3>
          <p>{receipt.place}</p>
          <div className="ip-block">
            <p>Receipt date {receipt.receiptDateLabel}</p>
            <p>Job date {receipt.jobDateLabel}</p>
          </div>
          <div className="ip-block">
            <p className="ip-kicker">Received from</p>
            <p className="ip-who">{receipt.client}</p>
          </div>
          <div className="ip-block">
            <p className="ip-kicker">Job</p>
            <p>{receipt.job}</p>
          </div>
          <div className="ip-block">
            <p className="ip-kicker">Advance received</p>
            <p className="ip-who">{receipt.advanceLabel}</p>
          </div>
          <table className="ip-money-table">
            <tbody>
              <tr>
                <th>Total agreed</th>
                <td className="ip-num">{receipt.totalLabel}</td>
              </tr>
              <tr>
                <th>Advance received</th>
                <td className="ip-num">{receipt.advanceLabel}</td>
              </tr>
              <tr className="ip-due">
                <th>Balance</th>
                <td className="ip-num">{receipt.balanceLabel}</td>
              </tr>
            </tbody>
          </table>
          <div className="ip-block">
            <p className="ip-kicker">Included</p>
            <p>{receipt.included}</p>
            <p className="ip-kicker">Not included</p>
            <p>{receipt.excluded}</p>
            <p className="ip-upi">{receipt.upi}</p>
          </div>
          <p className="ip-fine">
            DEMO. Example Decor and Sample Client are not real. This receipt does not calculate GST. Not a
            contract and not a tax invoice.
          </p>
          <h3>Message to send with the receipt</h3>
          <pre className="ip-msg">{demo.message}</pre>
        </article>
      ) : null}

      <form
        className="no-print"
        autoComplete="off"
        onSubmit={(event) => {
          event.preventDefault()
          setResult(buildReceipt(form))
        }}
      >
        <h3>Prepare your receipt</h3>
        <div className="ip-actions">
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
        <div className="ip-row">
          <div className="ip-field">
            <label htmlFor="ar-seller">Your name</label>
            <input id="ar-seller" maxLength={120} value={form.seller ?? ''} onChange={(e) => patch({ seller: e.target.value })} />
          </div>
          <div className="ip-field">
            <label htmlFor="ar-place">Your city or area</label>
            <input id="ar-place" maxLength={120} value={form.place ?? ''} onChange={(e) => patch({ place: e.target.value })} />
          </div>
        </div>
        <div className="ip-field">
          <label htmlFor="ar-upi">Your UPI id, for the balance</label>
          <input id="ar-upi" maxLength={50} spellCheck={false} autoComplete="off" value={form.upi ?? ''} onChange={(e) => patch({ upi: e.target.value })} />
        </div>
        <div className="ip-row">
          <div className="ip-field">
            <label htmlFor="ar-client">Client name</label>
            <input id="ar-client" maxLength={160} value={form.client ?? ''} onChange={(e) => patch({ client: e.target.value })} />
          </div>
          <div className="ip-field">
            <label htmlFor="ar-job">What the job is</label>
            <input id="ar-job" maxLength={180} value={form.job ?? ''} onChange={(e) => patch({ job: e.target.value })} />
          </div>
        </div>
        <div className="ip-row">
          <div className="ip-field">
            <label htmlFor="ar-job-date">Job date</label>
            <input id="ar-job-date" type="date" value={form.jobDate ?? ''} onChange={(e) => patch({ jobDate: e.target.value })} />
          </div>
          <div className="ip-field">
            <label htmlFor="ar-receipt-date">Date you received the advance</label>
            <input id="ar-receipt-date" type="date" value={form.receiptDate ?? ''} onChange={(e) => patch({ receiptDate: e.target.value })} />
          </div>
        </div>
        <div className="ip-row">
          <div className="ip-field">
            <label htmlFor="ar-total">Total agreed, in rupees</label>
            <input id="ar-total" inputMode="decimal" maxLength={12} value={form.total ?? ''} onChange={(e) => patch({ total: e.target.value })} />
          </div>
          <div className="ip-field">
            <label htmlFor="ar-advance">Advance received, in rupees</label>
            <input id="ar-advance" inputMode="decimal" maxLength={12} value={form.advance ?? ''} onChange={(e) => patch({ advance: e.target.value })} />
          </div>
        </div>
        <div className="ip-field">
          <label htmlFor="ar-included">Included, in your words</label>
          <textarea id="ar-included" maxLength={240} value={form.included ?? ''} onChange={(e) => patch({ included: e.target.value })} />
        </div>
        <div className="ip-field">
          <label htmlFor="ar-excluded">Not included, in your words</label>
          <textarea id="ar-excluded" maxLength={240} value={form.excluded ?? ''} onChange={(e) => patch({ excluded: e.target.value })} />
        </div>
        <p className="ip-muted">Nothing you type is uploaded. This form does not ask about GST.</p>
        <div className="ip-actions">
          <button type="submit">Prepare the receipt</button>
        </div>
        {result && !result.ok ? <Errors errors={result.errors} /> : null}
      </form>
      {result?.ok && result.receipt ? (
        <article className="ip-sheet">
          {result.receipt.seller === 'Example Decor' ? <p className="ip-demo-flag">DEMO</p> : null}
          <Warnings warnings={result.warnings} />
          <p className="ip-kicker">Advance receipt</p>
          <h3 className="ip-who">{result.receipt.seller}</h3>
          {result.receipt.place ? <p>{result.receipt.place}</p> : null}
          <p>Received from {result.receipt.client}</p>
          <p>{result.receipt.job}</p>
          <p>Advance received {result.receipt.advanceLabel}</p>
          <p>Total agreed {result.receipt.totalLabel}</p>
          <p>Balance {result.receipt.balanceLabel}</p>
          {result.receipt.included ? <p>Included: {result.receipt.included}</p> : null}
          {result.receipt.excluded ? <p>Not included: {result.receipt.excluded}</p> : null}
          {result.receipt.upi ? <p className="ip-upi">{result.receipt.upi}</p> : null}
          <p className="ip-fine">A receipt for the advance entered above. Not a contract, not a tax invoice, and not legal or tax advice.</p>
          <pre className="ip-msg">{result.message}</pre>
          <div className="ip-actions no-print">
            <button type="button" onClick={() => window.print()}>
              Print or save as PDF
            </button>
          </div>
        </article>
      ) : null}

      <div className="no-print" id="pay-399">
        <PayBox checkout={ADVANCE_CHECKOUT} />
      </div>
    </section>
  )
}
