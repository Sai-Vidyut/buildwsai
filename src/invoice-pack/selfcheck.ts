import { stateMatchesQuery } from './state-search.ts'
import { makeQr } from './qr.ts'
import {
  ADVANCE_CHECKOUT,
  DEMO_RECEIPT,
  INVOICE_CHECKOUT,
  INVOICE_TITLE,
  WHATSAPP_URL,
  buildPack,
  buildReceipt,
  demoInput,
  newOrderRef,
  upiPayUri,
} from './logic.ts'

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

function params(uri: string): Record<string, string> {
  const query = uri.split('?')[1] || ''
  const map: Record<string, string> = {}
  query.split('&').forEach((part) => {
    const at = part.indexOf('=')
    map[decodeURIComponent(part.slice(0, at))] = decodeURIComponent(part.slice(at + 1))
  })
  return map
}

const gstOn = buildPack(demoInput({ gst: true, foreign: false, sameState: false }))
assert(gstOn.ok && gstOn.invoice, 'demo with GST should build')
assert(gstOn.invoice.taxLines.length === 1 && gstOn.invoice.taxLines[0].name === 'IGST', 'different states use IGST')
assert(gstOn.invoice.taxLines[0].amount === 8640, 'IGST 18% of 48000 is 8640')
assert(gstOn.invoice.balance === 56640, 'GST-on balance')
assert(gstOn.invoice.title === 'Tax invoice (draft)', 'registered India client is a tax invoice draft')
assert(gstOn.reminders.length === 3, 'three reminders')
assert(
  gstOn.reminders[0].text.includes(
    'Invoice EX-1 from Example Studio is ready. The balance due is ' +
      new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2 }).format(56640),
  ),
  'reminder 1 amount line',
)
assert(gstOn.reminders[0].text.startsWith('Hello,\n\nInvoice EX-1 from Example Studio is ready.'), 'reminder 1 opening')
assert(
  gstOn.reminders[0].text.includes('If any line is wrong, tell me which one and I will send a corrected invoice.'),
  'reminder 1 correction line',
)
assert(gstOn.reminders[0].label === 'Send with the invoice', 'reminder 1 label')
assert(
  gstOn.reminders[1].text.includes('Checking on invoice EX-1') &&
    gstOn.reminders[1].text.includes('If it is already in process, a payment date is enough.'),
  'reminder 2',
)
assert(gstOn.reminders[1].label === 'About 7 days after you send it', 'reminder 2 label')
assert(
  gstOn.reminders[2].text.includes('and is still open on my side. Please pay it, or write back today with the date you will pay.'),
  'reminder 3',
)
assert(gstOn.reminders[2].label === 'About 14 days after you send it', 'reminder 3 label')
assert(gstOn.invoice.dueDateLabel === '4 December 2026', 'due date')
assert(!gstOn.invoice.clientName.includes('Sahil'), 'demo client is fictional')

const gstOff = buildPack(demoInput({ gst: false, foreign: false, sameState: false }))
assert(gstOff.ok && gstOff.invoice, 'GST off builds')
assert(gstOff.invoice.taxLines.length === 0 && gstOff.invoice.balance === 48000, 'no GST when not registered')
assert(
  gstOff.warnings.some((w) => w.includes('not GST-registered')),
  'unregistered warning',
)
assert(gstOff.invoice.title === 'Invoice (draft)', 'unregistered title')

const foreign = buildPack(demoInput({ gst: true, foreign: true, sameState: false }))
assert(foreign.ok && foreign.invoice && foreign.invoice.taxLines.length === 0, 'no GST outside India')
assert(
  foreign.warnings.some((w) =>
    w.includes('Confirm export treatment with a chartered accountant'),
  ),
  'export note',
)

const same = buildPack(demoInput({ gst: true, foreign: false, sameState: true }))
assert(same.ok && same.invoice, 'same state builds')
assert(
  same.invoice.taxLines.map((t) => t.name).join(',') === 'CGST,SGST',
  'same state splits CGST and SGST',
)
assert(same.invoice.taxLines[0].amount === 4320 && same.invoice.taxLines[1].amount === 4320, 'split amounts')

const reverse = buildPack({
  ...demoInput({ gst: true, foreign: false, sameState: false }),
  reverseCharge: true,
})
assert(reverse.ok && reverse.invoice, 'reverse charge builds')
assert(reverse.invoice.reverseCharge && reverse.invoice.balance === 48000, 'reverse charge is not added to the balance')
assert(reverse.invoice.taxLines[0].name === 'IGST', 'reverse charge still notes GST')

const bad = buildPack({ ...demoInput({ gst: false, foreign: false, sameState: false }), invoiceNumber: '<script>' })
assert(!bad.ok, 'invoice number is validated')

const markup = buildPack({
  ...demoInput({ gst: false, foreign: false, sameState: false }),
  lines: [{ description: '<img src=x onerror=alert(1)>', amount: '10' }],
})
assert(markup.ok && markup.invoice?.lines[0].description === '<img src=x onerror=alert(1)>', 'description stays text')

const ref = 'IP261121120000ABCD'
const uri = upiPayUri(INVOICE_CHECKOUT, ref)
const got = params(uri)
assert(got.pa === 'saividyut2@okicici', 'invoice VPA')
assert(got.pn === 'Invoice Pack', 'invoice payee name')
assert(got.am === '499', 'invoice amount')
assert(got.tn === ref && got.tr === ref, 'same order ref in tn and tr')

const arRef = 'AR261121120000WXYZ'
const arUri = upiPayUri(ADVANCE_CHECKOUT, arRef)
const ar = params(arUri)
assert(ar.pa === 'saividyut2@okicici' && ar.am === '399' && ar.pn === 'Advance Receipt', 'advance checkout')
assert(ar.tn === arRef && ar.tr === arRef, 'advance tn and tr match')

const made = newOrderRef('IP')
assert(/^IP[0-9]{12}[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{4}$/.test(made), 'order ref shape')

const receipt = buildReceipt(DEMO_RECEIPT)
assert(receipt.ok && receipt.receipt, 'advance demo builds')
assert(receipt.receipt.advanceLabel === '₹20,000.00', 'advance amount')
assert(receipt.receipt.balanceLabel === '₹60,000.00', 'advance balance')
assert(receipt.message.includes('Advance of ₹20,000.00 is received from Sample Client.'), 'advance message')
assert(!receipt.message.includes('GST') && !receipt.message.includes('IGST'), 'advance receipt has no GST math')
assert(!('taxLines' in (receipt.receipt as object)), 'receipt has no tax lines')

const grid = makeQr(uri)
assert(grid.count >= 21, 'QR draws the UPI URI')
assert(typeof grid.dark(0, 0) === 'boolean', 'QR modules are booleans')

assert(stateMatchesQuery(['29', 'Karnataka'], 'ka'), 'state search by abbreviation')
assert(stateMatchesQuery(['27', 'Maharashtra'], 'mh'), 'state search MH')
assert(stateMatchesQuery(['07', 'Delhi'], '07'), 'state search by GST code')
assert(!stateMatchesQuery(['29', 'Karnataka'], 'xyznone'), 'state search empty miss')

const sameStatePack = buildPack({
  ...demoInput({ gst: true, foreign: false, sameState: true }),
  supplierState: '29',
  clientState: '29',
})
assert(
  sameStatePack.ok && sameStatePack.invoice?.taxLines.some((t) => t.name === 'CGST'),
  'state codes drive CGST when supplier and client match',
)

const whatsapp = new URL(WHATSAPP_URL)
assert(whatsapp.origin === 'https://wa.me' && /^\/\d{11,15}$/.test(whatsapp.pathname), 'WhatsApp link is wa.me/<country code + number>')
assert(whatsapp.searchParams.get('text') === "Hi, I'm interested in the Invoice Pack.", 'WhatsApp message is prefilled')
assert(INVOICE_TITLE === 'Invoice Pack for Freelancers | BuildWSai', 'Invoice Pack page title')

console.log('invoice pack checks ok')
