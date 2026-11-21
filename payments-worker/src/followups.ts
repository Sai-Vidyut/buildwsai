import { buildPack, formatLong, inr } from '../../src/invoice-pack/logic.ts'
import {
  delayErrors,
  DEFAULT_TEMPLATES,
  isEmail,
  isHttpsUrl,
  normalizePhone,
  paymentInstructions,
  reminderSchedule,
  renderSubject,
  renderTemplate,
  STAGES,
  templateErrors,
  type ReminderStage,
  type ReminderTemplate,
  type TemplateValues,
} from '../../src/invoice-pack/reminders.ts'
import { ACCESS_TOKEN_PATTERN, FOLLOWUP_ID_PATTERN, newAccessToken, newClaimId, newFollowupId, sha256Hex, timingSafeEqualHex } from './crypto.ts'
import type { EmailProvider } from './email.ts'
import { keyMode } from './env.ts'
import { authorizePaidOrder, documentMismatch, invoiceDocumentKey, sanitizePackInput } from './exports.ts'
import { HttpError, json, readJsonObject, rejectUnknownFields } from './http.ts'
import type { Deps } from './payments.ts'

export type ReminderStatus = 'scheduled' | 'sending' | 'sent' | 'failed' | 'cancelled' | 'paused'

export type ClientInvoiceRow = {
  id: string
  order_id: string
  manage_token_hash: string
  mode: 'test' | 'live'
  business_name: string
  client_name: string
  client_email: string | null
  client_phone: string | null
  reply_to: string | null
  invoice_number: string
  amount_paise: number
  currency: string
  invoice_date: string
  due_date: string
  payment_instructions: string | null
  invoice_link: string | null
  timezone: string
  second_delay_days: number
  third_delay_days: number
  reminders_enabled: number
  payment_status: 'unpaid' | 'paid'
  paid_source: string | null
  paid_at: string | null
  consent_at: string
  contact_purged_at: string | null
  created_at: string
  updated_at: string
}

export type ReminderRow = {
  id: string
  invoice_id: string
  stage: ReminderStage
  channel: 'email'
  subject: string
  body: string
  status: ReminderStatus
  due_at: string
  next_attempt_at: string
  attempts: number
  claim_id: string | null
  claimed_at: string | null
  sent_at: string | null
  sent_via: 'provider' | 'manual' | null
  provider_message_id: string | null
  error_reason: string | null
  updated_at: string
}

type EventRow = { stage: number | null; event: string; detail: string | null; at: string }

export const MAX_SEND_ATTEMPTS = 4
const RETRY_BASE_MS = 15 * 60_000
const STALE_SENDING_MS = 10 * 60_000
const CONTACT_RETENTION_MS = 90 * 24 * 60 * 60_000
const CLAIM_BATCH = 25
const MAX_CREATE_BODY = 32 * 1024
const MAX_MANAGE_BODY = 16 * 1024
const OPEN: ReminderStatus[] = ['scheduled', 'paused']

const notAuthorized = () => new HttpError(403, 'not_authorized', 'This browser cannot manage these reminders.')
const invoicePaid = () => new HttpError(409, 'invoice_paid', 'You marked this invoice paid, so its reminders are closed.')

function validationError(details: string[]): HttpError {
  return new HttpError(422, 'invalid_followup', 'Fix the follow-up details below.', details)
}

function record(value: unknown, message = 'Some follow-up details are missing.'): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new HttpError(400, 'invalid_followup', message)
  return value as Record<string, unknown>
}

function stageOf(value: unknown): ReminderStage {
  if (value !== 1 && value !== 2 && value !== 3) throw new HttpError(400, 'invalid_stage', 'Choose reminder 1, 2, or 3.')
  return value
}

type Contact = { clientEmail: string | null; clientPhone: string | null; replyTo: string | null }

function parseContact(raw: unknown, requireEmail: boolean): Contact {
  const src = record(raw ?? {})
  rejectUnknownFields(src, ['clientEmail', 'clientPhone', 'replyTo'])
  const errors: string[] = []
  const email = typeof src.clientEmail === 'string' ? src.clientEmail.trim() : ''
  if (email && !isEmail(email)) errors.push('Enter a valid client email address.')
  if (!email && requireEmail) errors.push('Automatic reminders need the client’s email address.')
  const phoneRaw = typeof src.clientPhone === 'string' ? src.clientPhone.trim() : ''
  const phone = phoneRaw ? normalizePhone(phoneRaw) : null
  if (phoneRaw && !phone) errors.push('Enter the client phone number with digits only, for example +91 98765 43210.')
  const replyTo = typeof src.replyTo === 'string' ? src.replyTo.trim() : ''
  if (replyTo && !isEmail(replyTo)) errors.push('Enter a valid email address for client replies.')
  if (errors.length) throw validationError(errors)
  return { clientEmail: email || null, clientPhone: phone, replyTo: replyTo || null }
}

function parseDelays(second: unknown, third: unknown): { second: number; third: number } {
  const errors = delayErrors(second, third)
  if (errors.length) throw validationError(errors)
  return { second: Number(second), third: Number(third) }
}

function parseTemplates(raw: unknown): Record<ReminderStage, ReminderTemplate> {
  if (raw === undefined) return DEFAULT_TEMPLATES
  if (!Array.isArray(raw) || raw.length !== 3) throw new HttpError(400, 'invalid_followup', 'Send three reminder templates.')
  const errors: string[] = []
  const out = {} as Record<ReminderStage, ReminderTemplate>
  raw.forEach((item, index) => {
    const template = record(item)
    rejectUnknownFields(template, ['subject', 'body'])
    const problems = templateErrors(template)
    if (problems.length) errors.push(...problems.map((problem) => `Reminder ${index + 1}: ${problem}`))
    else out[(index + 1) as ReminderStage] = { subject: String(template.subject).trim(), body: String(template.body).replace(/\r\n?/g, '\n') }
  })
  if (errors.length) throw validationError(errors)
  return out
}

function parseLink(raw: unknown): string | null {
  if (raw === undefined || raw === null || raw === '') return null
  if (!isHttpsUrl(raw)) throw validationError(['The invoice link must be an https:// address.'])
  return raw
}

export function templateValues(row: ClientInvoiceRow): TemplateValues {
  return {
    business_name: row.business_name,
    client_name: row.client_name,
    invoice_number: row.invoice_number,
    amount: inr(row.amount_paise / 100),
    due_date: formatLong(row.due_date),
    payment_instructions: row.payment_instructions ?? '',
    invoice_link: row.invoice_link ?? '',
  }
}

async function logEvent(db: D1Database, invoiceId: string, stage: ReminderStage | null, event: string, detail: string | null, at: string) {
  await db
    .prepare('INSERT INTO client_reminder_events (invoice_id, stage, event, detail, at) VALUES (?, ?, ?, ?, ?)')
    .bind(invoiceId, stage, event, detail, at)
    .run()
}

function getInvoice(db: D1Database, id: string) {
  return db.prepare('SELECT * FROM client_invoices WHERE id = ?').bind(id).first<ClientInvoiceRow>()
}

async function getReminders(db: D1Database, invoiceId: string): Promise<ReminderRow[]> {
  const { results } = await db.prepare('SELECT * FROM client_reminders WHERE invoice_id = ? ORDER BY stage').bind(invoiceId).all<ReminderRow>()
  return results
}

// When several open reminders are already overdue, only the latest is kept, so a client never
// receives a burst of reminders after reminders are set up late or resumed.
async function skipSupersededOverdue(db: D1Database, invoiceId: string, nowIso: string): Promise<void> {
  const overdue = (await getReminders(db, invoiceId)).filter((r) => OPEN.includes(r.status) && r.due_at <= nowIso)
  if (overdue.length < 2) return
  const latest = Math.max(...overdue.map((r) => r.stage))
  for (const reminder of overdue) {
    if (reminder.stage === latest) continue
    const changed = await db
      .prepare(
        `UPDATE client_reminders SET status = 'cancelled', error_reason = ?, updated_at = ?
         WHERE id = ? AND status IN ('scheduled', 'paused')`,
      )
      .bind('Skipped because a later reminder was already due.', nowIso, reminder.id)
      .run()
    if (changed.meta.changes) await logEvent(db, invoiceId, reminder.stage, 'skipped', 'A later reminder was already due', nowIso)
  }
}

async function view(db: D1Database, row: ClientInvoiceRow, provider: EmailProvider | null) {
  const reminders = await getReminders(db, row.id)
  const { results: history } = await db
    .prepare('SELECT stage, event, detail, at FROM client_reminder_events WHERE invoice_id = ? ORDER BY id DESC LIMIT 50')
    .bind(row.id)
    .all<EventRow>()
  const values = templateValues(row)
  return {
    id: row.id,
    businessName: row.business_name,
    clientName: row.client_name,
    invoiceNumber: row.invoice_number,
    amount: row.amount_paise,
    currency: row.currency,
    invoiceDate: row.invoice_date,
    dueDate: row.due_date,
    timezone: row.timezone,
    contact: { clientEmail: row.client_email, clientPhone: row.client_phone, replyTo: row.reply_to },
    contactPurged: Boolean(row.contact_purged_at),
    invoiceLink: row.invoice_link,
    paymentInstructions: row.payment_instructions,
    remindersEnabled: row.reminders_enabled === 1,
    paymentStatus: row.payment_status,
    paidSource: row.paid_source,
    paidAt: row.paid_at,
    secondDelayDays: row.second_delay_days,
    thirdDelayDays: row.third_delay_days,
    delivery: provider ? 'email' : 'manual',
    reminders: reminders.map((r) => ({
      stage: r.stage,
      status: r.status,
      subject: r.subject,
      body: r.body,
      rendered: { subject: renderSubject(r.subject, values), body: renderTemplate(r.body, values) },
      dueAt: r.due_at,
      nextAttemptAt: r.next_attempt_at,
      sentAt: r.sent_at,
      sentVia: r.sent_via,
      attempts: r.attempts,
      errorReason: r.error_reason,
    })),
    history,
  }
}

export async function createFollowup(request: Request, deps: Deps, provider: EmailProvider | null): Promise<Response> {
  const db = deps.env.DB
  const body = await readJsonObject(request, MAX_CREATE_BODY)
  rejectUnknownFields(body, ['orderRef', 'accessToken', 'input', 'contact', 'schedule', 'templates', 'invoiceLink', 'consent'])
  // Follow-ups can send email, so only a paid Invoice Pack order can create one, for its own invoice.
  const order = await authorizePaidOrder(body.orderRef, body.accessToken, 'invoice', deps)
  if (body.consent !== true) {
    throw new HttpError(400, 'consent_required', 'Confirm that your client expects to hear from you about this invoice.')
  }

  const pack = buildPack(sanitizePackInput(body.input))
  if (!pack.ok || !pack.invoice) throw validationError(pack.errors.slice(0, 10))
  const invoice = pack.invoice

  const schedule = record(body.schedule)
  rejectUnknownFields(schedule, ['enabled', 'secondDelayDays', 'thirdDelayDays'])
  if (typeof schedule.enabled !== 'boolean') throw new HttpError(400, 'invalid_followup', 'Choose whether reminders are on.')
  const delays = parseDelays(schedule.secondDelayDays, schedule.thirdDelayDays)
  const contact = parseContact(body.contact, schedule.enabled)
  const templates = parseTemplates(body.templates)
  const link = parseLink(body.invoiceLink)

  const nowIso = deps.now().toISOString()
  const documentKey = await invoiceDocumentKey(invoice.invoiceNumber)
  const bound = await db
    .prepare(
      `UPDATE orders SET document_key = COALESCE(document_key, ?), updated_at = ?
       WHERE id = ? AND status = 'paid' AND (document_key IS NULL OR document_key = ?)`,
    )
    .bind(documentKey, nowIso, order.id, documentKey)
    .run()
  if (bound.meta.changes === 0) throw documentMismatch()

  const id = newFollowupId()
  const manageToken = newAccessToken()
  const times = reminderSchedule(invoice.invoiceDate, delays.second, delays.third)
  const status: ReminderStatus = schedule.enabled ? 'scheduled' : 'paused'
  const statements = [
    db
      .prepare(
        `INSERT INTO client_invoices (id, order_id, manage_token_hash, mode, business_name, client_name, client_email, client_phone, reply_to,
           invoice_number, amount_paise, currency, invoice_date, due_date, payment_instructions, invoice_link,
           second_delay_days, third_delay_days, reminders_enabled, consent_at, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'INR', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        id,
        order.id,
        await sha256Hex(manageToken),
        order.mode,
        invoice.supplierName,
        invoice.clientName,
        contact.clientEmail,
        contact.clientPhone,
        contact.replyTo,
        invoice.invoiceNumber,
        Math.round(invoice.balance * 100),
        invoice.invoiceDate,
        invoice.dueDate,
        paymentInstructions(invoice) || null,
        link,
        delays.second,
        delays.third,
        schedule.enabled ? 1 : 0,
        nowIso,
        nowIso,
        nowIso,
      ),
    ...STAGES.map((stage) =>
      db
        .prepare(
          `INSERT INTO client_reminders (id, invoice_id, stage, subject, body, status, due_at, next_attempt_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(`${id}-${stage}`, id, stage, templates[stage].subject, templates[stage].body, status, times[stage], times[stage], nowIso),
    ),
    db
      .prepare('INSERT INTO client_reminder_events (invoice_id, stage, event, detail, at) VALUES (?, NULL, ?, ?, ?)')
      .bind(id, 'created', schedule.enabled ? 'Reminders on' : 'Reminders off', nowIso),
  ]
  try {
    await db.batch(statements)
  } catch {
    const existing = await db.prepare('SELECT id FROM client_invoices WHERE order_id = ?').bind(order.id).first<{ id: string }>()
    if (existing) throw new HttpError(409, 'followup_exists', 'Reminders are already set up for this order.')
    throw new HttpError(500, 'internal_error', 'Something went wrong. Please try again.')
  }
  await skipSupersededOverdue(db, id, nowIso)

  const row = await getInvoice(db, id)
  if (!row) throw new HttpError(500, 'internal_error', 'Something went wrong. Please try again.')
  return json({ followup: await view(db, row, provider), manageToken }, 201, deps.headers)
}

const ACTION_FIELDS: Record<string, readonly string[]> = {
  view: [],
  pause: [],
  resume: [],
  reschedule: ['secondDelayDays', 'thirdDelayDays'],
  update_template: ['stage', 'subject', 'body'],
  update_contact: ['contact', 'invoiceLink'],
  mark_paid: [],
  mark_sent: ['stage'],
  retry: ['stage'],
}

export async function manageFollowup(request: Request, deps: Deps, provider: EmailProvider | null): Promise<Response> {
  const db = deps.env.DB
  const body = await readJsonObject(request, MAX_MANAGE_BODY)
  const action = typeof body.action === 'string' && Object.hasOwn(ACTION_FIELDS, body.action) ? body.action : null
  if (!action) throw new HttpError(400, 'unknown_action', 'Unknown action.')
  rejectUnknownFields(body, ['id', 'token', 'action', ...ACTION_FIELDS[action]])

  const { id, token } = body
  if (typeof id !== 'string' || !FOLLOWUP_ID_PATTERN.test(id) || typeof token !== 'string' || !ACCESS_TOKEN_PATTERN.test(token)) {
    throw notAuthorized()
  }
  const row = await getInvoice(db, id)
  const presented = await sha256Hex(token)
  if (!row || !timingSafeEqualHex(presented, row.manage_token_hash)) throw notAuthorized()
  if (row.mode !== keyMode(deps.env.RAZORPAY_KEY_ID)) throw notAuthorized()

  const nowIso = deps.now().toISOString()
  const requireUnpaid = () => {
    if (row.payment_status === 'paid') throw invoicePaid()
  }

  switch (action) {
    case 'view':
      break

    case 'pause': {
      requireUnpaid()
      await db.prepare('UPDATE client_invoices SET reminders_enabled = 0, updated_at = ? WHERE id = ?').bind(nowIso, id).run()
      await db
        .prepare(`UPDATE client_reminders SET status = 'paused', updated_at = ? WHERE invoice_id = ? AND status = 'scheduled'`)
        .bind(nowIso, id)
        .run()
      await logEvent(db, id, null, 'paused', null, nowIso)
      break
    }

    case 'resume': {
      requireUnpaid()
      if (!row.client_email) throw validationError(['Add the client’s email address before turning reminders on.'])
      await db.prepare('UPDATE client_invoices SET reminders_enabled = 1, updated_at = ? WHERE id = ?').bind(nowIso, id).run()
      await db
        .prepare(`UPDATE client_reminders SET status = 'scheduled', next_attempt_at = due_at, updated_at = ? WHERE invoice_id = ? AND status = 'paused'`)
        .bind(nowIso, id)
        .run()
      await skipSupersededOverdue(db, id, nowIso)
      await logEvent(db, id, null, 'resumed', null, nowIso)
      break
    }

    case 'reschedule': {
      requireUnpaid()
      const delays = parseDelays(body.secondDelayDays, body.thirdDelayDays)
      const times = reminderSchedule(row.invoice_date, delays.second, delays.third)
      await db
        .prepare('UPDATE client_invoices SET second_delay_days = ?, third_delay_days = ?, updated_at = ? WHERE id = ?')
        .bind(delays.second, delays.third, nowIso, id)
        .run()
      for (const stage of [2, 3] as const) {
        await db
          .prepare(
            `UPDATE client_reminders SET due_at = ?, next_attempt_at = ?, updated_at = ?
             WHERE invoice_id = ? AND stage = ? AND status IN ('scheduled', 'paused')`,
          )
          .bind(times[stage], times[stage], nowIso, id, stage)
          .run()
      }
      await skipSupersededOverdue(db, id, nowIso)
      await logEvent(db, id, null, 'rescheduled', `Reminder 2 on day ${delays.second}, reminder 3 on day ${delays.third}`, nowIso)
      break
    }

    case 'update_template': {
      requireUnpaid()
      const stage = stageOf(body.stage)
      const problems = templateErrors(body)
      if (problems.length) throw validationError(problems)
      const changed = await db
        .prepare(
          `UPDATE client_reminders SET subject = ?, body = ?, updated_at = ?
           WHERE invoice_id = ? AND stage = ? AND status IN ('scheduled', 'paused', 'failed')`,
        )
        .bind(String(body.subject).trim(), String(body.body).replace(/\r\n?/g, '\n'), nowIso, id, stage)
        .run()
      if (!changed.meta.changes) throw new HttpError(409, 'reminder_locked', 'This reminder has already been sent or closed.')
      await logEvent(db, id, stage, 'edited', null, nowIso)
      break
    }

    case 'update_contact': {
      const contact = parseContact(body.contact, row.reminders_enabled === 1 && row.payment_status === 'unpaid')
      const link = parseLink(body.invoiceLink)
      await db
        .prepare(
          `UPDATE client_invoices SET client_email = ?, client_phone = ?, reply_to = ?, invoice_link = ?, contact_purged_at = NULL, updated_at = ?
           WHERE id = ?`,
        )
        .bind(contact.clientEmail, contact.clientPhone, contact.replyTo, link, nowIso, id)
        .run()
      await logEvent(db, id, null, 'contact_updated', null, nowIso)
      break
    }

    case 'mark_paid': {
      // The freelancer's own confirmation. An Invoice Pack purchase never sets this.
      const changed = await db
        .prepare(
          `UPDATE client_invoices SET payment_status = 'paid', paid_source = 'freelancer_confirmed', paid_at = ?, reminders_enabled = 0, updated_at = ?
           WHERE id = ? AND payment_status = 'unpaid'`,
        )
        .bind(nowIso, nowIso, id)
        .run()
      if (changed.meta.changes) {
        await db
          .prepare(
            `UPDATE client_reminders SET status = 'cancelled', error_reason = ?, updated_at = ?
             WHERE invoice_id = ? AND status IN ('scheduled', 'paused', 'failed')`,
          )
          .bind('Cancelled because you marked the invoice paid.', nowIso, id)
          .run()
        await logEvent(db, id, null, 'marked_paid', 'Confirmed by the freelancer', nowIso)
      }
      break
    }

    case 'mark_sent': {
      const stage = stageOf(body.stage)
      const changed = await db
        .prepare(
          `UPDATE client_reminders SET status = 'sent', sent_at = ?, sent_via = 'manual', error_reason = NULL, updated_at = ?
           WHERE invoice_id = ? AND stage = ? AND status IN ('scheduled', 'paused', 'failed')`,
        )
        .bind(nowIso, nowIso, id, stage)
        .run()
      if (!changed.meta.changes) throw new HttpError(409, 'reminder_locked', 'This reminder has already been sent or closed.')
      await logEvent(db, id, stage, 'sent_manually', 'Recorded by the freelancer', nowIso)
      break
    }

    case 'retry': {
      requireUnpaid()
      const stage = stageOf(body.stage)
      if (row.reminders_enabled !== 1) throw new HttpError(409, 'reminders_paused', 'Turn reminders on before retrying.')
      if (!row.client_email) throw validationError(['Add the client’s email address before retrying.'])
      const changed = await db
        .prepare(
          `UPDATE client_reminders SET status = 'scheduled', next_attempt_at = ?, attempts = 0, error_reason = NULL, claim_id = NULL, updated_at = ?
           WHERE invoice_id = ? AND stage = ? AND status = 'failed'`,
        )
        .bind(nowIso, nowIso, id, stage)
        .run()
      if (!changed.meta.changes) throw new HttpError(409, 'reminder_locked', 'Only a failed reminder can be retried.')
      await logEvent(db, id, stage, 'retry_requested', null, nowIso)
      break
    }
  }

  const fresh = await getInvoice(db, id)
  if (!fresh) throw notAuthorized()
  return json({ followup: await view(db, fresh, provider) }, 200, deps.headers)
}

export type CronEnv = { DB: D1Database; RAZORPAY_KEY_ID?: string }
export type CronResult = { claimed: number; sent: number; retried: number; failed: number; released: number; recovered: number; purged: number }

type ClaimedRow = ReminderRow & { inv_payment_status: string; inv_enabled: number; inv_email: string | null }

function backoffMs(attempts: number): number {
  return RETRY_BASE_MS * 2 ** Math.max(0, attempts - 1)
}

// Safe to run concurrently or repeatedly: a reminder is claimed by one conditional UPDATE, every
// later write checks the claim id, and an interrupted send is never retried automatically.
export async function runDueReminders(env: CronEnv, provider: EmailProvider | null, now: Date): Promise<CronResult> {
  const db = env.DB
  const nowIso = now.toISOString()
  const result: CronResult = { claimed: 0, sent: 0, retried: 0, failed: 0, released: 0, recovered: 0, purged: 0 }

  const staleBefore = new Date(now.getTime() - STALE_SENDING_MS).toISOString()
  const { results: stale } = await db
    .prepare(`SELECT * FROM client_reminders WHERE status = 'sending' AND claimed_at < ?`)
    .bind(staleBefore)
    .all<ReminderRow>()
  for (const reminder of stale) {
    const changed = await db
      .prepare(
        `UPDATE client_reminders SET status = 'failed', error_reason = ?, claim_id = NULL, updated_at = ?
         WHERE id = ? AND status = 'sending' AND claim_id = ?`,
      )
      .bind('Delivery was interrupted. It may or may not have reached the client; check before retrying.', nowIso, reminder.id, reminder.claim_id)
      .run()
    if (changed.meta.changes) {
      result.recovered += 1
      await logEvent(db, reminder.invoice_id, reminder.stage, 'interrupted', null, nowIso)
    }
  }

  const purgeBefore = new Date(now.getTime() - CONTACT_RETENTION_MS).toISOString()
  const purged = await db
    .prepare(
      `UPDATE client_invoices SET client_email = NULL, client_phone = NULL, reply_to = NULL, payment_instructions = NULL,
         reminders_enabled = 0, contact_purged_at = ?, updated_at = ?
       WHERE contact_purged_at IS NULL AND updated_at < ?
         AND NOT EXISTS (SELECT 1 FROM client_reminders r WHERE r.invoice_id = client_invoices.id AND r.status IN ('scheduled', 'sending'))`,
    )
    .bind(nowIso, nowIso, purgeBefore)
    .run()
  result.purged = purged.meta.changes

  const mode = keyMode(env.RAZORPAY_KEY_ID ?? '')
  if (!provider || !mode) return result

  const claimId = newClaimId()
  await db
    .prepare(
      `UPDATE client_reminders SET status = 'sending', claim_id = ?1, claimed_at = ?2, attempts = attempts + 1, updated_at = ?2
       WHERE status = 'scheduled' AND id IN (
         SELECT r.id FROM client_reminders r JOIN client_invoices i ON i.id = r.invoice_id
         WHERE r.status = 'scheduled' AND r.next_attempt_at <= ?2
           AND i.payment_status = 'unpaid' AND i.reminders_enabled = 1 AND i.client_email IS NOT NULL AND i.mode = ?3
           AND NOT EXISTS (SELECT 1 FROM client_reminders s WHERE s.invoice_id = r.invoice_id AND s.status = 'sending')
           AND NOT EXISTS (
             SELECT 1 FROM client_reminders e
             WHERE e.invoice_id = r.invoice_id AND e.stage < r.stage AND e.status = 'scheduled' AND e.next_attempt_at <= ?2
           )
         ORDER BY r.next_attempt_at
         LIMIT ?4
       )`,
    )
    .bind(claimId, nowIso, mode, CLAIM_BATCH)
    .run()

  const { results: claimed } = await db
    .prepare(
      `SELECT r.*, i.payment_status AS inv_payment_status, i.reminders_enabled AS inv_enabled, i.client_email AS inv_email
       FROM client_reminders r JOIN client_invoices i ON i.id = r.invoice_id
       WHERE r.claim_id = ? AND r.status = 'sending'`,
    )
    .bind(claimId)
    .all<ClaimedRow>()
  result.claimed = claimed.length

  const settle = (reminderId: string, sql: string, ...values: unknown[]) =>
    db.prepare(`${sql} WHERE id = ? AND claim_id = ? AND status = 'sending'`).bind(...values, reminderId, claimId).run()

  for (const reminder of claimed) {
    const invoice = await getInvoice(db, reminder.invoice_id)
    // Re-read just before sending: the freelancer may have marked it paid or paused it since the claim.
    if (!invoice || invoice.payment_status !== 'unpaid' || invoice.reminders_enabled !== 1 || !invoice.client_email) {
      const paid = invoice?.payment_status === 'paid'
      const next: ReminderStatus = paid ? 'cancelled' : invoice?.reminders_enabled === 1 ? 'failed' : 'paused'
      const reason = paid ? 'Cancelled because you marked the invoice paid.' : next === 'failed' ? 'No client email address.' : null
      await settle(
        reminder.id,
        `UPDATE client_reminders SET status = ?, attempts = attempts - 1, error_reason = ?, claim_id = NULL, updated_at = ?`,
        next,
        reason,
        nowIso,
      )
      result.released += 1
      continue
    }

    const values = templateValues(invoice)
    const outcome = await provider.send({
      to: invoice.client_email,
      subject: renderSubject(reminder.subject, values),
      text: renderTemplate(reminder.body, values),
      fromName: invoice.business_name,
      replyTo: invoice.reply_to,
      idempotencyKey: reminder.id,
    })

    if (outcome.ok) {
      await settle(
        reminder.id,
        `UPDATE client_reminders SET status = 'sent', sent_at = ?, sent_via = 'provider', provider_message_id = ?, error_reason = NULL, claim_id = NULL, updated_at = ?`,
        nowIso,
        outcome.id,
        nowIso,
      )
      await logEvent(db, invoice.id, reminder.stage, 'sent', `Email via ${provider.name}`, nowIso)
      result.sent += 1
    } else if (outcome.retryable && reminder.attempts < MAX_SEND_ATTEMPTS) {
      const retryAt = new Date(now.getTime() + backoffMs(reminder.attempts)).toISOString()
      await settle(
        reminder.id,
        `UPDATE client_reminders SET status = 'scheduled', next_attempt_at = ?, error_reason = ?, claim_id = NULL, updated_at = ?`,
        retryAt,
        outcome.reason,
        nowIso,
      )
      await logEvent(db, invoice.id, reminder.stage, 'retry_scheduled', outcome.reason, nowIso)
      result.retried += 1
    } else {
      await settle(
        reminder.id,
        `UPDATE client_reminders SET status = 'failed', error_reason = ?, claim_id = NULL, updated_at = ?`,
        outcome.reason,
        nowIso,
      )
      await logEvent(db, invoice.id, reminder.stage, 'failed', outcome.reason, nowIso)
      result.failed += 1
    }
  }
  return result
}
