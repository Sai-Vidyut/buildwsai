import { useState } from 'react'
import type { Invoice, Reminder } from './logic'
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

export function InvoiceSheet({
  invoice,
  demo,
  testId,
}: {
  invoice: Invoice
  demo?: boolean
  testId?: string
}) {
  const payBits = [invoice.accountName, invoice.bankName, invoice.accountNumber, invoice.ifsc].filter(Boolean)
  return (
    <article className="ip-sheet" data-testid={testId ?? (demo ? 'demo-sheet' : 'pack-sheet')}>
      {demo ? <p className="ip-demo-flag">DEMO</p> : null}
      <div className="ip-sheet-top">
        <div>
          <p className="ip-kicker">{invoice.title}</p>
          <h3 className="ip-who">{invoice.supplierName}</h3>
          {invoice.supplierAddress ? <p>{invoice.supplierAddress}</p> : null}
          {invoice.supplierStateLabel ? <p>{invoice.supplierStateLabel}</p> : null}
          <p>GSTIN {invoice.supplierGstin || '—'}</p>
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
        <p>GSTIN {invoice.clientGstin || '—'}</p>
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
              <td className="ip-num">{inr(line.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <table className="ip-money-table">
        <tbody>
          <tr>
            <th>Taxable value</th>
            <td className="ip-num">{inr(invoice.taxable)}</td>
          </tr>
          {invoice.taxLines.map((tax) => (
            <tr key={tax.name}>
              <th>
                {tax.name} {tax.rate}%
              </th>
              <td className="ip-num">{inr(tax.amount)}</td>
            </tr>
          ))}
          {invoice.already > 0 ? (
            <tr>
              <th>Already received</th>
              <td className="ip-num">{inr(invoice.already)}</td>
            </tr>
          ) : null}
          <tr className="ip-due">
            <th>Balance due</th>
            <td className="ip-num">{inr(invoice.balance)}</td>
          </tr>
        </tbody>
      </table>
      {invoice.upi || payBits.length ? (
        <div className="ip-block">
          <p className="ip-kicker">Pay the supplier</p>
          {invoice.upi ? <p className="ip-upi">{invoice.upi}</p> : null}
          {payBits.length ? <p>{payBits.join(' · ')}</p> : null}
          {demo ? (
            <p className="ip-fine">Example Studio’s UPI on this draft. It is not the Invoice Pack checkout.</p>
          ) : null}
        </div>
      ) : null}
      <div className="ip-sign">
        <div className="ip-sign-rule" />
        <p>{invoice.supplierName}</p>
        <p className="ip-kicker">Authorised signatory</p>
        {invoice.remarks ? <p>{invoice.remarks}</p> : null}
        <p className="ip-fine">
          A draft for you to check. Not filed on the GST portal, and not tax advice.
          {demo ? ' DEMO figures. Example Studio and Sample Client Pvt Ltd are not real.' : ''}
        </p>
      </div>
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
