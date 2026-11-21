// Pure helpers shared by the page and the payments Worker. No imports, so both can load it.

export const REMINDER_TIMEZONE = 'Asia/Kolkata'
// India has no daylight saving, so the offset is fixed.
const IST_OFFSET_MINUTES = 330
export const SEND_HOUR_IST = 10

export const DEFAULT_SECOND_DELAY = 7
export const DEFAULT_THIRD_DELAY = 14
export const MAX_SECOND_DELAY = 60
export const MAX_THIRD_DELAY = 90

export const SUBJECT_MAX = 150
export const BODY_MAX = 4000

export type ReminderStage = 1 | 2 | 3
export const STAGES: readonly ReminderStage[] = [1, 2, 3]

export type ReminderTemplate = { subject: string; body: string }

export const PLACEHOLDERS = [
  { key: 'business_name', label: 'Your business name' },
  { key: 'client_name', label: 'Client name' },
  { key: 'invoice_number', label: 'Invoice number' },
  { key: 'amount', label: 'Amount due' },
  { key: 'due_date', label: 'Due date' },
  { key: 'payment_instructions', label: 'Payment instructions' },
  { key: 'invoice_link', label: 'Invoice link' },
] as const

export type PlaceholderKey = (typeof PLACEHOLDERS)[number]['key']
export type TemplateValues = Record<PlaceholderKey, string>

export const STAGE_LABELS: Record<ReminderStage, string> = {
  1: 'Invoice sent',
  2: 'Follow-up',
  3: 'Final follow-up',
}

export const DEFAULT_TEMPLATES: Record<ReminderStage, ReminderTemplate> = {
  1: {
    subject: 'Invoice {invoice_number} — Payment due {due_date}',
    body: [
      'Dear {client_name},',
      '',
      'Please find invoice {invoice_number} from {business_name} for {amount}. Payment is due on {due_date}.',
      '',
      '{payment_instructions}',
      'View the invoice: {invoice_link}',
      '',
      'If anything on the invoice needs correcting, reply to this email and I will send a revised copy.',
      '',
      'Thank you for your business.',
      '',
      'Regards,',
      '{business_name}',
    ].join('\n'),
  },
  2: {
    subject: 'Friendly reminder — Invoice {invoice_number}',
    body: [
      'Dear {client_name},',
      '',
      'I hope you are well. This is a friendly reminder that invoice {invoice_number} for {amount}, due on {due_date}, is still unpaid on my side.',
      '',
      'Could you let me know when I can expect the payment? If you have already paid, please share the payment reference so I can match it.',
      '',
      '{payment_instructions}',
      'View the invoice: {invoice_link}',
      '',
      'Thank you,',
      '{business_name}',
    ].join('\n'),
  },
  3: {
    subject: 'Final payment reminder — Invoice {invoice_number}',
    body: [
      'Dear {client_name},',
      '',
      'Invoice {invoice_number} for {amount}, with payment due on {due_date}, remains outstanding.',
      '',
      'Please arrange payment of {amount} as soon as possible, or reply with the date on which it will be made. If there is a problem with the invoice, let me know so it can be resolved.',
      '',
      '{payment_instructions}',
      'View the invoice: {invoice_link}',
      '',
      'Regards,',
      '{business_name}',
    ].join('\n'),
  },
}

const PLACEHOLDER = /\{([a-z_]+)\}/g
const KNOWN = new Set<string>(PLACEHOLDERS.map((item) => item.key))

// Lines that use an empty placeholder are dropped, so an unset invoice link leaves no dangling label.
export function renderTemplate(template: string, values: TemplateValues): string {
  const lines: string[] = []
  for (const line of template.replace(/\r\n?/g, '\n').split('\n')) {
    let usesEmpty = false
    const rendered = line.replace(PLACEHOLDER, (token, key: string) => {
      if (!KNOWN.has(key)) return token
      const value = values[key as PlaceholderKey] ?? ''
      if (!value.trim()) usesEmpty = true
      return value
    })
    if (!usesEmpty) lines.push(rendered)
  }
  return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim()
}

export function renderSubject(template: string, values: TemplateValues): string {
  return renderTemplate(template, values).replace(/[\r\n]+/g, ' ').slice(0, SUBJECT_MAX * 2).trim()
}

export function templateErrors(template: { subject?: unknown; body?: unknown }): string[] {
  const errors: string[] = []
  const { subject, body } = template
  if (typeof subject !== 'string' || !subject.trim()) errors.push('Each reminder needs a subject.')
  else if (subject.length > SUBJECT_MAX) errors.push(`Keep each subject under ${SUBJECT_MAX} characters.`)
  else if (/[\r\n]/.test(subject)) errors.push('A subject must be a single line.')
  if (typeof body !== 'string' || !body.trim()) errors.push('Each reminder needs a message.')
  else if (body.length > BODY_MAX) errors.push(`Keep each message under ${BODY_MAX} characters.`)
  return errors
}

export function delayErrors(second: unknown, third: unknown): string[] {
  const errors: string[] = []
  const s = Number(second)
  const t = Number(third)
  if (!Number.isInteger(s) || s < 1 || s > MAX_SECOND_DELAY) {
    errors.push(`Reminder 2 must be a whole number of days from 1 to ${MAX_SECOND_DELAY}.`)
  }
  if (!Number.isInteger(t) || t < 2 || t > MAX_THIRD_DELAY) {
    errors.push(`Reminder 3 must be a whole number of days from 2 to ${MAX_THIRD_DELAY}.`)
  }
  if (!errors.length && t <= s) errors.push('Reminder 3 must come after reminder 2.')
  return errors
}

export function isIsoDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const [y, m, d] = value.split('-').map(Number)
  const date = new Date(Date.UTC(y, m - 1, d))
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d
}

// Calendar date in India plus `days`, at `hour` India time, returned as a UTC ISO timestamp.
export function istDateTimeToUtc(isoDate: string, days: number, hour = SEND_HOUR_IST): string {
  const [y, m, d] = isoDate.split('-').map(Number)
  const utcMs = Date.UTC(y, m - 1, d + days, hour, 0, 0) - IST_OFFSET_MINUTES * 60_000
  return new Date(utcMs).toISOString()
}

export function reminderSchedule(invoiceDate: string, second: number, third: number): Record<ReminderStage, string> {
  return {
    1: istDateTimeToUtc(invoiceDate, 0),
    2: istDateTimeToUtc(invoiceDate, second),
    3: istDateTimeToUtc(invoiceDate, third),
  }
}

export function formatIst(iso: string): string {
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: REMINDER_TIMEZONE,
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(iso))
}

export function paymentInstructions(details: {
  upi?: string
  bankName?: string
  accountName?: string
  accountNumber?: string
  ifsc?: string
}): string {
  const lines: string[] = []
  const upi = (details.upi ?? '').trim()
  if (upi) lines.push(`UPI: ${upi}`)
  const bank = [
    (details.bankName ?? '').trim(),
    (details.accountName ?? '').trim(),
    details.accountNumber?.trim() ? `A/c ${details.accountNumber.trim()}` : '',
    details.ifsc?.trim() ? `IFSC ${details.ifsc.trim()}` : '',
  ].filter(Boolean)
  if (bank.length) lines.push(`Bank: ${bank.join(', ')}`)
  return lines.length ? `Payment details:\n${lines.join('\n')}` : ''
}

const EMAIL = /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]{1,64}@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$/

export function isEmail(value: unknown): value is string {
  return typeof value === 'string' && value.length <= 254 && EMAIL.test(value)
}

export function normalizePhone(value: unknown): string | null {
  if (typeof value !== 'string' || !/^\+?[0-9 ()-]{7,20}$/.test(value.trim())) return null
  const digits = value.replace(/[^0-9]/g, '')
  if (digits.length < 7 || digits.length > 15) return null
  return (value.trim().startsWith('+') ? '+' : '') + digits
}

export function isHttpsUrl(value: unknown): value is string {
  if (typeof value !== 'string' || value.length > 300) return false
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && !url.username && !url.password
  } catch {
    return false
  }
}
