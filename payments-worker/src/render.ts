import { inr, type Invoice, type Receipt } from '../../src/invoice-pack/logic.ts'

const ENTITIES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }

export function esc(value: unknown): string {
  return String(value ?? '').replace(/[&<>"']/g, (ch) => ENTITIES[ch])
}

const STYLES = `
*{box-sizing:border-box}
html{background:#f4f1ea}
body{margin:0;padding:32px 16px;color:#191816;font:14px/1.55 Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
.sheet{max-width:780px;margin:0 auto;padding:44px 48px;background:#fffdf9;border:1px solid #e2ddd4;border-radius:6px}
.kicker{margin:0 0 4px;color:#67625b;font-size:11px;font-weight:600;letter-spacing:.08em;text-transform:uppercase}
.who{margin:0 0 4px;font-family:Newsreader,Georgia,"Times New Roman",serif;font-size:26px;font-weight:500;letter-spacing:-.01em}
p{margin:0 0 2px}
.top{display:flex;justify-content:space-between;gap:32px;padding-bottom:20px;border-bottom:1px solid #e2ddd4}
.meta p{display:flex;justify-content:space-between;gap:16px;min-width:220px}
.meta span,.label{color:#67625b}
.block{padding:16px 0;border-bottom:1px solid #e2ddd4}
table{width:100%;border-collapse:collapse}
.lines th{padding:10px 0;border-bottom:1px solid #d2ccc1;color:#67625b;font-size:11px;font-weight:600;letter-spacing:.06em;text-align:left;text-transform:uppercase}
.lines td{padding:10px 0;border-bottom:1px solid #eee9e0;vertical-align:top}
.lines th.num{text-align:right}
.num{text-align:right;white-space:nowrap;font-variant-numeric:tabular-nums}
.money{max-width:340px;margin:16px 0 0 auto}
.money th{padding:6px 0;font-weight:400;color:#34312d;text-align:left}
.money td{padding:6px 0}
.money .due th,.money .due td{padding-top:12px;border-top:1.5px solid #191816;font-weight:600;font-size:16px}
.upi{font-family:"IBM Plex Mono",ui-monospace,monospace}
.sign{margin-top:36px}
.rule{width:180px;margin-bottom:8px;border-top:1px solid #191816}
.fine{margin-top:16px;color:#67625b;font-size:12px}
.msg{margin:8px 0 0;padding:14px 16px;border:1px solid #e2ddd4;border-radius:6px;background:#faf8f3;font:13px/1.6 inherit;white-space:pre-wrap}
.ref{max-width:780px;margin:12px auto 0;color:#67625b;font-size:11px;text-align:right}
@media (max-width:640px){.sheet{padding:24px 20px}.top{flex-direction:column;gap:16px}.meta p{min-width:0}}
@media print{html,body{background:#fff}body{padding:0}.sheet{max-width:none;padding:0;border:0}.ref{display:none}@page{margin:16mm}}
`

function page(title: string, body: string, orderRef: string): string {
  return `<!doctype html>
<html lang="en-IN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex">
<title>${esc(title)}</title>
<style>${STYLES}</style>
</head>
<body>
${body}
<p class="ref">Exported with Invoice Pack · order ${esc(orderRef)}</p>
</body>
</html>`
}

function metaLine(label: string, value: string): string {
  return `<p><span>${esc(label)}</span> ${esc(value || '—')}</p>`
}

export function finalTitle(title: string): string {
  return title.replace(/\s*\(\s*draft\s*\)\s*$/i, '').trim() || title
}

export function renderInvoice(invoice: Invoice, orderRef: string): string {
  const payBits = [invoice.accountName, invoice.bankName, invoice.accountNumber, invoice.ifsc].filter(Boolean)
  const lines = invoice.lines
    .map((line) => `<tr><td>${esc(line.description)}</td><td class="num">${esc(inr(line.amount))}</td></tr>`)
    .join('')
  const taxes = invoice.taxLines
    .map((tax) => `<tr><th>${esc(tax.name)} ${esc(tax.rate)}%</th><td class="num">${esc(inr(tax.amount))}</td></tr>`)
    .join('')
  const body = `<article class="sheet">
<div class="top">
  <div>
    <p class="kicker">${esc(finalTitle(invoice.title))}</p>
    <h1 class="who">${esc(invoice.supplierName)}</h1>
    ${invoice.supplierAddress ? `<p>${esc(invoice.supplierAddress)}</p>` : ''}
    ${invoice.supplierStateLabel ? `<p>${esc(invoice.supplierStateLabel)}</p>` : ''}
    <p>GSTIN ${esc(invoice.supplierGstin || '—')}</p>
  </div>
  <div class="meta">
    ${metaLine('Number', invoice.invoiceNumber)}
    ${metaLine('Date', invoice.invoiceDateLabel)}
    ${metaLine('Due', invoice.dueDateLabel)}
    ${metaLine('SAC', invoice.sac)}
    ${metaLine('Place of supply', invoice.placeOfSupply)}
    ${metaLine('Reverse charge', invoice.reverseCharge ? 'Yes' : 'No')}
  </div>
</div>
<div class="block">
  <p class="kicker">Bill to</p>
  <p class="who">${esc(invoice.clientName)}</p>
  ${invoice.clientAddress ? `<p>${esc(invoice.clientAddress)}</p>` : ''}
  ${invoice.clientStateLabel ? `<p>${esc(invoice.clientStateLabel)}</p>` : ''}
  <p>GSTIN ${esc(invoice.clientGstin || '—')}</p>
</div>
<table class="lines"><thead><tr><th>Description</th><th class="num">Amount</th></tr></thead><tbody>${lines}</tbody></table>
<table class="money"><tbody>
  <tr><th>Taxable value</th><td class="num">${esc(inr(invoice.taxable))}</td></tr>
  ${taxes}
  ${invoice.already > 0 ? `<tr><th>Already received</th><td class="num">${esc(inr(invoice.already))}</td></tr>` : ''}
  <tr class="due"><th>Balance due</th><td class="num">${esc(inr(invoice.balance))}</td></tr>
</tbody></table>
${
  invoice.upi || payBits.length
    ? `<div class="block"><p class="kicker">Pay the supplier</p>${invoice.upi ? `<p class="upi">${esc(invoice.upi)}</p>` : ''}${
        payBits.length ? `<p>${esc(payBits.join(' · '))}</p>` : ''
      }</div>`
    : ''
}
<div class="sign">
  <div class="rule"></div>
  <p>${esc(invoice.supplierName)}</p>
  <p class="kicker">Authorised signatory</p>
  ${invoice.remarks ? `<p>${esc(invoice.remarks)}</p>` : ''}
  <p class="fine">Not filed on the GST portal, and not tax advice.</p>
</div>
</article>`
  return page(`Invoice ${invoice.invoiceNumber} — ${invoice.supplierName}`, body, orderRef)
}

export function renderReceipt(receipt: Receipt, message: string, orderRef: string): string {
  const extras =
    receipt.included || receipt.excluded || receipt.upi
      ? `<div class="block">${receipt.included ? `<p class="kicker">Included</p><p>${esc(receipt.included)}</p>` : ''}${
          receipt.excluded ? `<p class="kicker">Not included</p><p>${esc(receipt.excluded)}</p>` : ''
        }${receipt.upi ? `<p class="upi">${esc(receipt.upi)}</p>` : ''}</div>`
      : ''
  const body = `<article class="sheet">
<div class="top">
  <div>
    <p class="kicker">Advance receipt</p>
    <h1 class="who">${esc(receipt.seller)}</h1>
    ${receipt.place ? `<p>${esc(receipt.place)}</p>` : ''}
  </div>
  <div class="meta">
    ${metaLine('Receipt date', receipt.receiptDateLabel)}
    ${metaLine('Job date', receipt.jobDateLabel)}
  </div>
</div>
<div class="block"><p class="kicker">Received from</p><p class="who">${esc(receipt.client)}</p></div>
<div class="block"><p class="kicker">Job</p><p>${esc(receipt.job)}</p></div>
<table class="money"><tbody>
  <tr><th>Total agreed</th><td class="num">${esc(receipt.totalLabel)}</td></tr>
  <tr><th>Advance received</th><td class="num">${esc(receipt.advanceLabel)}</td></tr>
  <tr class="due"><th>Balance</th><td class="num">${esc(receipt.balanceLabel)}</td></tr>
</tbody></table>
${extras}
<p class="fine">A receipt for the advance stated above. Not a contract, not a tax invoice, and not legal or tax advice.</p>
<p class="kicker" style="margin-top:24px">Message to send with the receipt</p>
<pre class="msg">${esc(message)}</pre>
</article>`
  return page(`Advance receipt — ${receipt.client}`, body, orderRef)
}
