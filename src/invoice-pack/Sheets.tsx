import { useState } from 'react'
import type { Invoice, Receipt, Reminder } from './logic'
import { inr } from './logic'
import { copyText } from './copy'

export function Warnings({ warnings }: { warnings: string[] }) {
  if (!warnings.length) return null
  return (
    <div>
      {warnings.map((warning) => (
        <p key={warning} className="ip-warn">
          {warning}
        </p>
      ))}
    </div>
  )
}

export function Errors({ errors }: { errors: string[] }) {
  if (!errors.length) return null
  return (
    <div role="alert">
      {errors.map((error) => (
        <p key={error} className="ip-err">
          {error}
        </p>
      ))}
    </div>
  )
}

function MetaLine({ label, value }: { label: string; value: string }) {
  return (
    <p>
      <span>{label}</span> {value || '—'}
    </p>
  )
}

function DraftMark() {
  return (
    <p className="ip-draft-mark">
      <span>Draft preview · not for sending</span>
    </p>
  )
}

export function Masked({ width = 5 }: { width?: number }) {
  return (
    <span className="ip-masked" style={{ width: `${width}ch` }}>
      <span className="ip-sr">Shown after payment</span>
    </span>
  )
}

function LockMark() {
  return (
    <p className="ip-lock-mark">
      <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true">
        <rect x="3" y="7" width="10" height="7" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" fill="none" stroke="currentColor" strokeWidth="1.6" />
      </svg>
      <span>Locked preview · amounts, GSTINs and payment details appear in the final export</span>
    </p>
  )
}

// `locked` renders a partial sheet: the hidden values are never put in the DOM.
export function InvoiceSheet({
  invoice,
  demo,
  draft,
  locked,
  testId,
}: {
  invoice: Invoice
  demo?: boolean
  draft?: boolean
  locked?: boolean
  testId?: string
}) {
  const payBits = [invoice.accountName, invoice.bankName, invoice.accountNumber, invoice.ifsc].filter(Boolean)
  const money = (amount: number) => (locked ? <Masked width={9} /> : inr(amount))
  const gstin = (value: string) => (locked && value ? <Masked width={15} /> : value || '—')
  const classes = ['ip-sheet', draft ? 'ip-sheet--draft' : '', locked ? 'ip-sheet--locked' : ''].filter(Boolean).join(' ')
  return (
    <article className={classes} data-testid={testId ?? (demo ? 'demo-sheet' : 'pack-sheet')}>
      {demo ? <p className="ip-demo-flag">DEMO</p> : null}
      {locked ? <LockMark /> : draft ? <DraftMark /> : null}
      <div className="ip-sheet-top">
        <div>
          <p className="ip-kicker">{invoice.title}</p>
          <h3 className="ip-who">{invoice.supplierName}</h3>
          {invoice.supplierAddress ? <p>{invoice.supplierAddress}</p> : null}
          {invoice.supplierStateLabel ? <p>{invoice.supplierStateLabel}</p> : null}
          <p>GSTIN {gstin(invoice.supplierGstin)}</p>
        </div>
        <div className="ip-meta">
          <MetaLine label="Number" value={invoice.invoiceNumber} />
          <MetaLine label="Date" value={invoice.invoiceDateLabel} />
          <MetaLine label="Due" value={invoice.dueDateLabel} />
          <MetaLine label="SAC" value={invoice.sac} />
          <MetaLine label="Place of supply" value={invoice.placeOfSupply} />
          <MetaLine label="Reverse charge" value={invoice.reverseCharge ? 'Yes' : 'No'} />
        </div>
      </div>
      <div className="ip-block">
        <p className="ip-kicker">Bill to</p>
        <p className="ip-who">{invoice.clientName}</p>
        {invoice.clientAddress ? <p>{invoice.clientAddress}</p> : null}
        {invoice.clientStateLabel ? <p>{invoice.clientStateLabel}</p> : null}
        <p>GSTIN {gstin(invoice.clientGstin)}</p>
      </div>
      <table className="ip-lines">
        <thead>
          <tr>
            <th>Description</th>
            <th className="ip-num">Amount</th>
          </tr>
        </thead>
        <tbody>
          {invoice.lines.map((line, index) => (
            <tr key={line.description + ':' + String(index)}>
              <td>{line.description}</td>
              <td className="ip-num">{money(line.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <table className="ip-money-table ip-money-table--doc">
        <tbody>
          <tr>
            <th>Taxable value</th>
            <td className="ip-num">{money(invoice.taxable)}</td>
          </tr>
          {invoice.taxLines.map((tax) => (
            <tr key={tax.name}>
              <th>
                {tax.name} {tax.rate}%
              </th>
              <td className="ip-num">{money(tax.amount)}</td>
            </tr>
          ))}
          {invoice.already > 0 ? (
            <tr>
              <th>Already received</th>
              <td className="ip-num">{money(invoice.already)}</td>
            </tr>
          ) : null}
          <tr className="ip-due">
            <th>Balance due</th>
            <td className="ip-num">{money(invoice.balance)}</td>
          </tr>
        </tbody>
      </table>
      {invoice.upi || payBits.length ? (
        <div className="ip-block">
          <p className="ip-kicker">Pay the supplier</p>
          {invoice.upi ? <p className="ip-upi">{locked ? <Masked width={16} /> : invoice.upi}</p> : null}
          {payBits.length ? <p>{locked ? <Masked width={24} /> : payBits.join(' · ')}</p> : null}
          {demo ? (
            <p className="ip-fine">Example Studio’s UPI on this draft. It is not the Invoice Pack checkout.</p>
          ) : null}
        </div>
      ) : null}
      <div className="ip-sign">
        <div className="ip-sign-rule" />
        <p>{invoice.supplierName}</p>
        <p className="ip-kicker">Authorised signatory</p>
        {invoice.remarks && !locked ? <p>{invoice.remarks}</p> : null}
        <p className="ip-fine">
          A draft for you to check. Not filed on the GST portal, and not tax advice.
          {demo ? ' DEMO figures. Example Studio and Sample Client Pvt Ltd are not real.' : ''}
        </p>
      </div>
    </article>
  )
}

export function ReceiptSheet({
  receipt,
  message,
  demo,
  draft,
  testId,
}: {
  receipt: Receipt
  message: string
  demo?: boolean
  draft?: boolean
  testId?: string
}) {
  return (
    <article
      className={draft ? 'ip-sheet ip-receipt-doc ip-sheet--draft' : 'ip-sheet ip-receipt-doc'}
      data-testid={testId ?? (demo ? 'advance-demo' : 'advance-sheet')}
    >
      {demo ? <p className="ip-demo-flag">DEMO</p> : null}
      {draft ? <DraftMark /> : null}
      <p className="ip-kicker">Advance receipt</p>
      <h3 className="ip-who">{receipt.seller}</h3>
      {receipt.place ? <p className="ip-doc-line">{receipt.place}</p> : null}
      <div className="ip-doc-meta">
        <p className="ip-doc-line">
          <span className="ip-doc-label">Receipt date</span> {receipt.receiptDateLabel}
        </p>
        <p className="ip-doc-line">
          <span className="ip-doc-label">Job date</span> {receipt.jobDateLabel}
        </p>
      </div>
      <div className="ip-block">
        <p className="ip-kicker">Received from</p>
        <p className="ip-doc-who">{receipt.client}</p>
      </div>
      <div className="ip-block">
        <p className="ip-kicker">Job</p>
        <p className="ip-doc-line">{receipt.job}</p>
      </div>
      <table className="ip-money-table ip-money-table--doc">
        <tbody>
          <tr>
            <th scope="row">Total agreed</th>
            <td className="ip-num">{receipt.totalLabel}</td>
          </tr>
          <tr>
            <th scope="row">Advance received</th>
            <td className="ip-num">{receipt.advanceLabel}</td>
          </tr>
          <tr className="ip-due">
            <th scope="row">Balance</th>
            <td className="ip-num">{receipt.balanceLabel}</td>
          </tr>
        </tbody>
      </table>
      {receipt.included || receipt.excluded || receipt.upi ? (
        <div className="ip-block">
          {receipt.included ? (
            <>
              <p className="ip-kicker">Included</p>
              <p className="ip-doc-line">{receipt.included}</p>
            </>
          ) : null}
          {receipt.excluded ? (
            <>
              <p className="ip-kicker">Not included</p>
              <p className="ip-doc-line">{receipt.excluded}</p>
            </>
          ) : null}
          {receipt.upi ? <p className="ip-upi">{receipt.upi}</p> : null}
        </div>
      ) : null}
      <p className="ip-fine">
        {demo
          ? 'DEMO. Example Decor and Sample Client are not real. This receipt does not calculate GST. Not a contract and not a tax invoice.'
          : 'A receipt for the advance entered above. Not a contract, not a tax invoice, and not legal or tax advice.'}
      </p>
      <section className="ip-receipt-message" aria-labelledby="receipt-message-heading">
        <h3 id="receipt-message-heading">Message to send with the receipt</h3>
        <pre className="ip-msg">{message}</pre>
      </section>
    </article>
  )
}

export function Reminders({ reminders, demo }: { reminders: Reminder[]; demo?: boolean }) {
  return (
    <div data-testid={demo ? 'demo-reminders' : 'pack-reminders'}>
      {reminders.map((reminder) => (
        <ReminderBlock key={reminder.label} reminder={reminder} />
      ))}
    </div>
  )
}

function ReminderBlock({ reminder }: { reminder: Reminder }) {
  const [label, setLabel] = useState('Copy message')
  return (
    <section className="ip-reminder">
      <h3>{reminder.label}</h3>
      <pre className="ip-msg">{reminder.text}</pre>
      <div className="ip-actions no-print">
        <button
          type="button"
          className="secondary"
          onClick={() => {
            void copyText(reminder.text).then((ok) => {
              setLabel(ok ? 'Copied' : 'Select the message and copy it')
            })
          }}
        >
          {label}
        </button>
      </div>
    </section>
  )
}
