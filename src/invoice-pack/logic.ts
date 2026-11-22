export const STATES: ReadonlyArray<readonly [string, string]> = [
  ['01', 'Jammu and Kashmir'],
  ['02', 'Himachal Pradesh'],
  ['03', 'Punjab'],
  ['04', 'Chandigarh'],
  ['05', 'Uttarakhand'],
  ['06', 'Haryana'],
  ['07', 'Delhi'],
  ['08', 'Rajasthan'],
  ['09', 'Uttar Pradesh'],
  ['10', 'Bihar'],
  ['11', 'Sikkim'],
  ['12', 'Arunachal Pradesh'],
  ['13', 'Nagaland'],
  ['14', 'Manipur'],
  ['15', 'Mizoram'],
  ['16', 'Tripura'],
  ['17', 'Meghalaya'],
  ['18', 'Assam'],
  ['19', 'West Bengal'],
  ['20', 'Jharkhand'],
  ['21', 'Odisha'],
  ['22', 'Chhattisgarh'],
  ['23', 'Madhya Pradesh'],
  ['24', 'Gujarat'],
  ['26', 'Dadra and Nagar Haveli and Daman and Diu'],
  ['27', 'Maharashtra'],
  ['29', 'Karnataka'],
  ['30', 'Goa'],
  ['31', 'Lakshadweep'],
  ['32', 'Kerala'],
  ['33', 'Tamil Nadu'],
  ['34', 'Puducherry'],
  ['35', 'Andaman and Nicobar Islands'],
  ['36', 'Telangana'],
  ['37', 'Andhra Pradesh'],
  ['38', 'Ladakh'],
]

const STATE_NAME: Record<string, string> = Object.fromEntries(STATES)

export const INVOICE_TITLE = 'Invoice Pack for Freelancers | BuildWSai'
export const INVOICE_DESCRIPTION =
  'Create a print-ready invoice for a finished freelance job, with GST when it applies, and three payment reminders. ₹499 one-time, for freelancers in India.'

export const INVOICE_OG_IMAGE = 'https://buildwsai.online/og-invoice-pack.png'
export const INVOICE_OG_IMAGE_ALT =
  'A sample Invoice Pack tax invoice from Example Studio to Sample Client Pvt Ltd, with IGST and a balance due of ₹56,640.'

export const CONTACT_EMAIL = 'saividyut2@gmail.com'
// The number already published on the portfolio, with India's country code, as wa.me requires.
export const WHATSAPP_NUMBER = '918072350391'
export const WHATSAPP_MESSAGE = "Hi, I'm interested in the Invoice Pack."
export const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`

export type Checkout = {
  pa: 'saividyut2@okicici'
  pn: string
  am: '499' | '399'
  cu: 'INR'
  prefix: 'IP' | 'AR'
}

export const INVOICE_CHECKOUT: Checkout = {
  pa: 'saividyut2@okicici',
  pn: 'Invoice Pack',
  am: '499',
  cu: 'INR',
  prefix: 'IP',
}

export const ADVANCE_CHECKOUT: Checkout = {
  pa: 'saividyut2@okicici',
  pn: 'Advance Receipt',
  am: '399',
  cu: 'INR',
  prefix: 'AR',
}

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100
}

export function inr(n: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n)
}

export function formatLong(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(dt)
}

export function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  dt.setUTCDate(dt.getUTCDate() + days)
  return dt.toISOString().slice(0, 10)
}

export function clean(value: unknown): string {
  return String(value == null ? '' : value).trim()
}

export function todayKolkata(now = new Date()): string {
  return now.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
}

function encodePay(value: string): string {
  return encodeURIComponent(value).replace(/%40/g, '@')
}

export function upiPayUri(checkout: Checkout, orderRef: string): string {
  const pairs: Array<[string, string]> = [
    ['pa', checkout.pa],
    ['pn', checkout.pn],
    ['am', checkout.am],
    ['cu', checkout.cu],
    ['tn', orderRef],
    ['tr', orderRef],
  ]
  return (
    'upi://pay?' +
    pairs
      .map((pair) => encodePay(pair[0]) + '=' + encodePay(pair[1]))
      .join('&')
  )
}

export function newOrderRef(prefix: 'IP' | 'AR', now = new Date()): string {
  const fmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    year: '2-digit',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  })
  const map: Record<string, string> = {}
  fmt.formatToParts(now).forEach((part) => {
    if (part.type !== 'literal') map[part.type] = part.value
  })
  const stamp = map.year + map.month + map.day + map.hour + map.minute + map.second
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const bytes = new Uint8Array(4)
  crypto.getRandomValues(bytes)
  let rand = ''
  for (let i = 0; i < bytes.length; i += 1) rand += alphabet[bytes[i] % alphabet.length]
  return prefix + stamp + rand
}

export type LineInput = {
  description?: string
  amount?: string | number
}

export type PackInput = {
  supplierName?: string
  supplierAddress?: string
  supplierState?: string
  supplierGstin?: string
  clientName?: string
  clientAddress?: string
  clientState?: string
  clientGstin?: string
  foreignClient?: boolean
  gstRegistered?: boolean
  reverseCharge?: boolean
  invoiceNumber?: string
  invoiceDate?: string
  dueDays?: number | string
  sac?: string
  gstRate?: number | string
  alreadyReceived?: number | string
  lines?: LineInput[]
  upi?: string
  bankName?: string
  accountName?: string
  accountNumber?: string
  ifsc?: string
  remarks?: string
}

export type TaxLine = { name: string; rate: number; amount: number }
export type InvoiceLine = { description: string; amount: number }

export type Invoice = {
  title: string
  supplierName: string
  supplierAddress: string
  supplierStateLabel: string
  supplierGstin: string
  clientName: string
  clientAddress: string
  clientStateLabel: string
  clientGstin: string
  invoiceNumber: string
  invoiceDate: string
  invoiceDateLabel: string
  dueDate: string
  dueDateLabel: string
  sac: string
  placeOfSupply: string
  sameState: boolean
  gstRegistered: boolean
  foreignClient: boolean
  reverseCharge: boolean
  gstRate: number
  lines: InvoiceLine[]
  taxable: number
  taxLines: TaxLine[]
  taxTotal: number
  already: number
  gross: number
  balance: number
  upi: string
  bankName: string
  accountName: string
  accountNumber: string
  ifsc: string
  remarks: string
}

export type Reminder = { label: string; text: string }

export type PackResult = {
  ok: boolean
  errors: string[]
  warnings: string[]
  invoice: Invoice | null
  reminders: Reminder[]
}

export function buildPack(input: PackInput | null | undefined): PackResult {
  const errors: string[] = []
  const warnings: string[] = []
  const src = input || {}

  const supplierName = clean(src.supplierName)
  const supplierAddress = clean(src.supplierAddress)
  const supplierState = clean(src.supplierState)
  const supplierGstin = clean(src.supplierGstin).toUpperCase()
  const clientName = clean(src.clientName)
  const clientAddress = clean(src.clientAddress)
  const clientState = clean(src.clientState)
  const clientGstin = clean(src.clientGstin).toUpperCase()
  const invoiceNumber = clean(src.invoiceNumber)
  const invoiceDate = clean(src.invoiceDate)
  const sac = clean(src.sac) || '9983'
  const upi = clean(src.upi)
  const accountName = clean(src.accountName)
  const accountNumber = clean(src.accountNumber)
  const ifsc = clean(src.ifsc).toUpperCase()
  const bankName = clean(src.bankName)
  const remarks = clean(src.remarks)
  const gstRegistered = Boolean(src.gstRegistered)
  const foreignClient = Boolean(src.foreignClient)
  const reverseCharge = Boolean(src.reverseCharge) && gstRegistered && !foreignClient

  if (!supplierName) errors.push('Enter the name you trade under.')
  if (supplierName.length > 120) errors.push('Your name is too long.')
  if (!clientName) errors.push('Enter the client name.')
  if (clientName.length > 160) errors.push('Client name is too long.')
  if (!/^[A-Za-z0-9\-/]{1,16}$/.test(invoiceNumber)) {
    errors.push('Invoice number must be 1–16 characters: letters, digits, hyphen, or slash.')
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(invoiceDate)) {
    errors.push('Enter an invoice date.')
  }
  const dueDays = Number(src.dueDays)
  if (!Number.isInteger(dueDays) || dueDays < 0 || dueDays > 180) {
    errors.push('Due days must be a whole number from 0 to 180.')
  }
  if (sac.length > 12 || !/^[0-9A-Za-z.]+$/.test(sac)) {
    errors.push('SAC looks invalid. Use a short code such as 9983.')
  }

  const gstinPattern = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][A-Z0-9]Z[A-Z0-9]$/
  if (supplierGstin && !gstinPattern.test(supplierGstin)) {
    errors.push('Supplier GSTIN must be 15 characters in the usual GSTIN pattern, or leave it blank.')
  }
  if (clientGstin && !gstinPattern.test(clientGstin)) {
    errors.push('Client GSTIN must be 15 characters in the usual GSTIN pattern, or leave it blank.')
  }
  if (gstRegistered && !supplierGstin) {
    warnings.push('You marked yourself GST-registered, but GSTIN is blank. A tax invoice needs it.')
  }
  if (gstRegistered && supplierGstin && supplierState && supplierGstin.slice(0, 2) !== supplierState) {
    warnings.push('The first two digits of the GSTIN do not match the supplier state selected.')
  }
  if (upi && !/^[\w.-]{2,}@[\w.-]{2,}$/.test(upi)) {
    errors.push('UPI id should look like name@bank, or leave it blank.')
  }
  if (upi.length > 50) errors.push('UPI id is too long.')
  if (ifsc && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc)) {
    errors.push('IFSC must be 11 characters, or leave it blank.')
  }
  if (accountNumber && !/^[0-9]{6,18}$/.test(accountNumber)) {
    errors.push('Account number should be 6–18 digits, or leave it blank.')
  }
  if (remarks.length > 300) errors.push('Remarks are limited to 300 characters.')

  let gstRate = Number(src.gstRate)
  if (!Number.isFinite(gstRate)) gstRate = 18
  if (gstRegistered && !foreignClient && (gstRate < 0 || gstRate > 28)) {
    errors.push('GST rate must be between 0 and 28.')
  }

  const rawLines = Array.isArray(src.lines) ? src.lines : []
  const lines: InvoiceLine[] = []
  rawLines.forEach((row, index) => {
    const description = clean(row && row.description)
    const amountRaw = clean(row && row.amount)
    if (!description && !amountRaw) return
    if (!description) errors.push('Line ' + (index + 1) + ' needs a description.')
    if (description.length > 180) errors.push('Line ' + (index + 1) + ' description is too long.')
    const amount = Number(amountRaw)
    if (!Number.isFinite(amount) || amount < 0 || amount > 100000000) {
      errors.push('Line ' + (index + 1) + ' amount must be zero or a positive number.')
      return
    }
    lines.push({ description, amount: round2(amount) })
  })
  if (lines.length === 0) errors.push('Add at least one line with an amount.')
  if (lines.length > 8) errors.push('Use at most 8 lines.')

  if (gstRegistered && !foreignClient) {
    if (!STATE_NAME[supplierState]) errors.push('Select your state.')
    if (!STATE_NAME[clientState]) errors.push('Select the client state, or mark the client as outside India.')
    if (!supplierAddress) warnings.push('Supplier address is empty. A tax invoice needs an address.')
    if (!clientAddress) warnings.push('Client address is empty. A tax invoice needs the recipient address.')
  } else if (!supplierAddress || !clientAddress) {
    warnings.push('An address is empty. Add it before you send this to a client.')
  }

  if (!upi && !accountNumber) {
    warnings.push('Add a UPI id or a bank account. Otherwise the client has to ask how to pay.')
  }

  const taxable = round2(lines.reduce((sum, line) => sum + line.amount, 0))
  const chargeGst = gstRegistered && !foreignClient && errors.length === 0
  const sameState = chargeGst && supplierState === clientState
  const taxTotal = chargeGst ? round2(taxable * (gstRate / 100)) : 0
  const taxLines: TaxLine[] = []
  if (chargeGst && taxTotal > 0) {
    if (sameState) {
      const half = round2(gstRate / 2)
      const cgst = round2(taxTotal / 2)
      const sgst = round2(taxTotal - cgst)
      taxLines.push({ name: 'CGST', rate: half, amount: cgst })
      taxLines.push({ name: 'SGST', rate: half, amount: sgst })
    } else {
      taxLines.push({ name: 'IGST', rate: gstRate, amount: taxTotal })
    }
  }

  const gross = reverseCharge ? taxable : round2(taxable + taxTotal)
  let already = Number(src.alreadyReceived)
  if (!Number.isFinite(already) || clean(src.alreadyReceived) === '') already = 0
  if (already < 0 || already > 100000000) {
    errors.push('Amount already received is not valid.')
    already = 0
  }
  already = round2(already)
  if (already - gross > 0.001) {
    errors.push('Amount already received is higher than the total.')
  }
  const balance = round2(Math.max(0, gross - already))
  if (balance === 0 && taxable > 0) {
    warnings.push('Balance due is zero. You may not need the chase messages.')
  }
  if (foreignClient) {
    warnings.push(
      'Client is marked outside India. This draft charges no GST. Confirm export treatment with a chartered accountant before you send it.',
    )
  }
  if (!gstRegistered) {
    warnings.push(
      'You are marked as not GST-registered. This draft does not add GST. Do not add it by hand unless you are registered.',
    )
  }
  warnings.push(
    'This is a draft for you to check. It is not filed on the GST portal, it has no IRN or QR code, and it is not tax or legal advice.',
  )

  if (errors.length) {
    return { ok: false, errors, warnings, invoice: null, reminders: [] }
  }

  const dueDate = addDays(invoiceDate, dueDays)
  const place = foreignClient
    ? 'Outside India (as entered)'
    : STATE_NAME[clientState]
      ? STATE_NAME[clientState] + ' (' + clientState + ')'
      : 'Not entered'

  const invoice: Invoice = {
    title: gstRegistered && !foreignClient ? 'Tax invoice (draft)' : 'Invoice (draft)',
    supplierName,
    supplierAddress,
    supplierStateLabel: STATE_NAME[supplierState]
      ? STATE_NAME[supplierState] + ' (' + supplierState + ')'
      : '',
    clientName,
    clientAddress,
    clientStateLabel: foreignClient
      ? 'Outside India'
      : STATE_NAME[clientState]
        ? STATE_NAME[clientState] + ' (' + clientState + ')'
        : '',
    supplierGstin,
    clientGstin,
    invoiceNumber,
    invoiceDate,
    invoiceDateLabel: formatLong(invoiceDate),
    dueDate,
    dueDateLabel: formatLong(dueDate),
    sac,
    placeOfSupply: place,
    sameState: Boolean(sameState),
    gstRegistered,
    foreignClient,
    reverseCharge,
    gstRate: chargeGst ? gstRate : 0,
    lines,
    taxable,
    taxLines,
    taxTotal,
    already,
    gross,
    balance,
    upi,
    bankName,
    accountName,
    accountNumber,
    ifsc,
    remarks,
  }

  const payBits: string[] = []
  if (upi) payBits.push('UPI: ' + upi)
  if (accountName || accountNumber || ifsc || bankName) {
    payBits.push(
      'Bank: ' +
        [bankName, accountName, accountNumber ? 'A/c ' + accountNumber : '', ifsc ? 'IFSC ' + ifsc : '']
          .filter(Boolean)
          .join(', '),
    )
  }
  const payLine = payBits.length ? payBits.join('\n') : 'Payment details are on the invoice.'
  const money = inr(balance)
  const dueLabel = invoice.dueDateLabel

  const reminders: Reminder[] = [
    {
      label: 'Send with the invoice',
      text:
        'Hello,\n\nInvoice ' +
        invoiceNumber +
        ' from ' +
        supplierName +
        ' is ready. The balance due is ' +
        money +
        ', due on ' +
        dueLabel +
        '.\n\n' +
        payLine +
        '\n\nIf any line is wrong, tell me which one and I will send a corrected invoice.\n\nThank you,\n' +
        supplierName,
    },
    {
      label: 'About 7 days after you send it',
      text:
        'Hello,\n\nChecking on invoice ' +
        invoiceNumber +
        ' for ' +
        money +
        ', due on ' +
        dueLabel +
        '. If it is already in process, a payment date is enough. If a detail is blocking it, tell me which line and I will correct the invoice.\n\nThank you,\n' +
        supplierName,
    },
    {
      label: 'About 14 days after you send it',
      text:
        'Hello,\n\nInvoice ' +
        invoiceNumber +
        ' for ' +
        money +
        ' was due on ' +
        dueLabel +
        ' and is still open on my side. Please pay it, or write back today with the date you will pay.\n\n' +
        payLine +
        '\n\nThank you,\n' +
        supplierName,
    },
  ]

  return { ok: true, errors: [], warnings, invoice, reminders }
}

export type DemoLine = { description: string; amount: string }

export const DEMO_LINES: DemoLine[] = [
  { description: 'Homepage and four inner pages', amount: '40000' },
  { description: 'Developer handoff notes', amount: '8000' },
]

export function demoInput(opts: {
  gst: boolean
  foreign: boolean
  sameState: boolean
  lines?: DemoLine[]
}): PackInput {
  return {
    supplierName: 'Example Studio',
    supplierAddress: '12 Residency Road, Bengaluru',
    supplierState: '29',
    supplierGstin: '',
    gstRegistered: opts.gst,
    clientName: 'Sample Client Pvt Ltd',
    clientAddress: '1 Sample Street, Mumbai',
    clientState: opts.sameState ? '29' : '27',
    clientGstin: '',
    foreignClient: opts.foreign,
    invoiceNumber: 'EX-1',
    invoiceDate: '2026-11-19',
    dueDays: 15,
    sac: '9983',
    gstRate: 18,
    alreadyReceived: '0',
    reverseCharge: false,
    lines: opts.lines ?? DEMO_LINES,
    upi: 'yourname@upi',
    remarks: '',
  }
}

const MAX_RUPEES = 5000000

export function parseRupees(raw: unknown): number | null {
  const s = clean(raw).replace(/,/g, '').replace(/^₹/, '')
  if (!/^\d{1,7}(\.\d{1,2})?$/.test(s)) return null
  const parts = s.split('.')
  const whole = Number(parts[0])
  const frac = ((parts[1] || '') + '00').slice(0, 2)
  const paise = whole * 100 + Number(frac)
  if (!Number.isSafeInteger(paise)) return null
  return paise
}

export function formatInr(paise: number): string {
  const negative = paise < 0
  const n = Math.abs(paise)
  const rupees = Math.floor(n / 100)
  const frac = String(n % 100).padStart(2, '0')
  const body = rupees.toLocaleString('en-IN') + '.' + frac
  return (negative ? '-₹' : '₹') + body
}

function formatReceiptDate(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '')
  if (!match) return ''
  const y = Number(match[1])
  const m = Number(match[2])
  const d = Number(match[3])
  if (y < 2000 || y > 2100) return ''
  const dt = new Date(Date.UTC(y, m - 1, d))
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return ''
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(dt)
}

export type ReceiptInput = {
  seller?: string
  place?: string
  upi?: string
  client?: string
  job?: string
  jobDate?: string
  receiptDate?: string
  total?: string
  advance?: string
  included?: string
  excluded?: string
}

export type Receipt = {
  seller: string
  place: string
  client: string
  job: string
  jobDateLabel: string
  receiptDateLabel: string
  totalLabel: string
  advanceLabel: string
  balanceLabel: string
  upi: string
  included: string
  excluded: string
  paidInFull: boolean
}

export type ReceiptResult = {
  ok: boolean
  errors: string[]
  warnings: string[]
  receipt: Receipt | null
  message: string
}

function collapse(value: unknown): string {
  return String(value == null ? '' : value).replace(/\s+/g, ' ').trim()
}

export function buildReceipt(input: ReceiptInput | null | undefined): ReceiptResult {
  const src = input || {}
  const errors: string[] = []
  const warnings: string[] = []
  const seller = collapse(src.seller)
  const place = collapse(src.place)
  const client = collapse(src.client)
  const job = collapse(src.job)
  const upi = collapse(src.upi)
  const included = collapse(src.included)
  const excluded = collapse(src.excluded)
  const jobDate = collapse(src.jobDate)
  const receiptDate = collapse(src.receiptDate)
  const jobDateLabel = formatReceiptDate(jobDate)
  const receiptDateLabel = formatReceiptDate(receiptDate)

  if (!seller) errors.push('Enter your name.')
  if (seller.length > 120) errors.push('Your name is too long.')
  if (place.length > 120) errors.push('City or area is too long.')
  if (!client) errors.push('Enter the client name.')
  if (client.length > 160) errors.push('Client name is too long.')
  if (!job) errors.push('Enter what the job is.')
  if (job.length > 180) errors.push('The job description is too long.')
  if (!jobDateLabel) errors.push('Enter a real job date.')
  if (!receiptDateLabel) errors.push('Enter the date you received the advance.')
  if (upi && !/^[\w.-]{2,}@[\w.-]{2,}$/.test(upi)) {
    errors.push('UPI id should look like name@bank, or leave it blank.')
  }
  if (upi.length > 50) errors.push('UPI id is too long.')
  if (included.length > 240) errors.push('Included is too long.')
  if (excluded.length > 240) errors.push('Not included is too long.')

  const total = parseRupees(src.total)
  const advance = parseRupees(src.advance)
  if (total == null) errors.push('Enter the total in rupees, such as 80000 or 80,000.50.')
  if (advance == null) errors.push('Enter the advance in rupees, such as 20000 or 0.50.')
  if (total != null && total <= 0) errors.push('The total has to be more than zero.')
  if (total != null && total > MAX_RUPEES * 100) {
    errors.push('This page is for one job up to ₹50,00,000.')
  }
  if (advance != null && advance <= 0) {
    errors.push('Enter the advance you have received. This page writes a receipt for money received.')
  }
  if (total != null && advance != null && advance > total) {
    errors.push('The advance is more than the total. Check both amounts.')
  }

  if (errors.length) return { ok: false, errors, warnings, receipt: null, message: '' }

  const balance = (total as number) - (advance as number)
  if (!upi && balance > 0) {
    warnings.push('Add your UPI id if the client should pay the balance to you.')
  }
  if (!included && !excluded) {
    warnings.push('Included and not included are blank. Add them if the client should see what the price covers.')
  }
  if (jobDate < receiptDate) {
    warnings.push('The job date is before the date you received the advance. Check both.')
  }
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
  if (receiptDate > today) warnings.push('The receipt date is after today. Check it.')

  const receipt: Receipt = {
    seller,
    place,
    client,
    job,
    jobDateLabel,
    receiptDateLabel,
    totalLabel: formatInr(total as number),
    advanceLabel: formatInr(advance as number),
    balanceLabel: formatInr(balance),
    upi,
    included,
    excluded,
    paidInFull: balance === 0,
  }

  const lines = ['Hello,', '']
  lines.push('Advance of ' + receipt.advanceLabel + ' is received from ' + client + '.')
  lines.push('')
  lines.push('Job: ' + job)
  lines.push('Job date: ' + jobDateLabel)
  lines.push('Receipt date: ' + receiptDateLabel)
  lines.push('Total agreed: ' + receipt.totalLabel)
  lines.push('Balance: ' + receipt.balanceLabel)
  if (balance === 0) lines.push('The agreed total is received.')
  if (included) lines.push('Included: ' + included)
  if (excluded) lines.push('Not included: ' + excluded)
  if (upi) lines.push('UPI: ' + upi)
  lines.push('')
  lines.push('Thank you,')
  lines.push(seller)

  return { ok: true, errors: [], warnings, receipt, message: lines.join('\n') }
}

export const DEMO_RECEIPT: ReceiptInput = {
  seller: 'Example Decor',
  place: 'Pune',
  upi: 'example.decor@upi',
  client: 'Sample Client',
  job: 'Stage decor for a wedding',
  jobDate: '2026-12-12',
  receiptDate: '2026-11-20',
  total: '80000',
  advance: '20000',
  included: 'Stage backdrop and entrance decor',
  excluded: 'Flowers and seating',
}

export function emptyPack(today: string): PackInput {
  return {
    supplierName: '',
    supplierAddress: '',
    supplierState: '',
    supplierGstin: '',
    gstRegistered: false,
    clientName: '',
    clientAddress: '',
    clientState: '',
    clientGstin: '',
    foreignClient: false,
    invoiceNumber: '',
    invoiceDate: today,
    dueDays: 15,
    sac: '9983',
    gstRate: 18,
    alreadyReceived: '0',
    reverseCharge: false,
    lines: [
      { description: '', amount: '' },
      { description: '', amount: '' },
      { description: '', amount: '' },
      { description: '', amount: '' },
    ],
    upi: '',
    bankName: '',
    accountName: '',
    accountNumber: '',
    ifsc: '',
    remarks: '',
  }
}

export function examplePack(): PackInput {
  return {
    ...demoInput({ gst: true, foreign: false, sameState: false }),
    invoiceDate: '2026-11-19',
    lines: [
      ...DEMO_LINES,
      { description: '', amount: '' },
      { description: '', amount: '' },
    ],
  }
}
