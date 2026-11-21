import type { Invoice } from './logic'
import { inr } from './logic'

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

export function PaperPreview({ invoice, demo = false }: { invoice: Invoice; demo?: boolean }) {
  const gstLabel = invoice.taxLines.length
    ? invoice.taxLines.map((tax) => `${tax.name} (${tax.rate}%)`).join(' + ')
    : 'GST'
  const gstAmount = invoice.taxLines.length ? paperAmount(invoice.taxTotal) : '—'

  return (
    <article className="ip-paper" aria-label={demo ? 'Demo invoice' : 'Invoice preview'}>
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
              <td>{paperAmount(line.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="ip-paper-totals">
        <p>
          <span>Subtotal</span>
          <strong>{paperAmount(invoice.taxable)}</strong>
        </p>
        <p>
          <span>{gstLabel}</span>
          <strong>{gstAmount}</strong>
        </p>
        {invoice.already > 0 ? (
          <p>
            <span>Already received</span>
            <strong>{paperAmount(invoice.already)}</strong>
          </p>
        ) : null}
        <p className="ip-paper-total">
          <span>Total</span>
          <strong>{paperAmount(invoice.balance)}</strong>
        </p>
      </div>
    </article>
  )
}
