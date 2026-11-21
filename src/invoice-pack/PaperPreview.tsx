import type { Invoice } from './logic'
import { inr } from './logic'
import { Masked } from './Sheets'

function paperAmount(amount: number): string {
  return inr(amount).replace(/\.00$/, '')
}

function shortDate(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  if (!match) return iso
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])))
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date)
}

export function PaperPreview({ invoice, demo = false, locked = false }: { invoice: Invoice; demo?: boolean; locked?: boolean }) {
  const gstLabel = invoice.taxLines.length
    ? invoice.taxLines.map((tax) => `${tax.name} (${tax.rate}%)`).join(' + ')
    : 'GST'
  const gstAmount = invoice.taxLines.length ? paperAmount(invoice.taxTotal) : '—'
  const money = (value: string) => (locked ? <Masked width={6} /> : value)

  return (
    <article className={locked ? 'ip-paper ip-paper--locked' : 'ip-paper'} aria-label={demo ? 'Demo invoice' : 'Invoice preview'}>
      <header className="ip-paper-head">
        <div>
          <p className="ip-paper-who">{invoice.supplierName}</p>
          {invoice.supplierAddress ? <p className="ip-paper-sub">{invoice.supplierAddress}</p> : null}
        </div>
        <div className="ip-paper-id">
          {demo ? <p className="ip-paper-demo">Demo</p> : null}
          <p className="ip-paper-title">Invoice</p>
          <p className="ip-paper-num">{invoice.invoiceNumber}</p>
        </div>
      </header>
      <div className="ip-paper-meta">
        <div>
          <p className="ip-paper-k">Bill to</p>
          <p className="ip-paper-client">{invoice.clientName}</p>
        </div>
        <div className="ip-paper-dates">
          <p>
            <span>Date</span> {shortDate(invoice.invoiceDate)}
          </p>
          <p>
            <span>Due</span> {shortDate(invoice.dueDate)}
          </p>
        </div>
      </div>
      <table className="ip-paper-lines">
        <thead>
          <tr>
            <th>Description</th>
            <th>Qty</th>
            <th>Amount</th>
          </tr>
        </thead>
        <tbody>
          {invoice.lines.map((line, index) => (
            <tr key={line.description + ':' + String(index)}>
              <td>{line.description}</td>
              <td>1</td>
              <td>{money(paperAmount(line.amount))}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="ip-paper-totals">
        <p>
          <span>Subtotal</span>
          <strong>{money(paperAmount(invoice.taxable))}</strong>
        </p>
        <p>
          <span>{gstLabel}</span>
          <strong>{money(gstAmount)}</strong>
        </p>
        {invoice.already > 0 ? (
          <p>
            <span>Already received</span>
            <strong>{money(paperAmount(invoice.already))}</strong>
          </p>
        ) : null}
        <p className="ip-paper-total">
          <span>Total</span>
          <strong>{paperAmount(invoice.balance)}</strong>
        </p>
      </div>
      {locked ? (
        <p className="ip-paper-lock">
          <svg viewBox="0 0 16 16" width="11" height="11" aria-hidden="true">
            <rect x="3" y="7" width="10" height="7" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
            <path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" fill="none" stroke="currentColor" strokeWidth="1.6" />
          </svg>
          Full invoice unlocks after payment
        </p>
      ) : null}
    </article>
  )
}
