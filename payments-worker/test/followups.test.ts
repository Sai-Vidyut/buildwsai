import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { examplePack, type PackInput } from '../../src/invoice-pack/logic.ts'
import { DEFAULT_TEMPLATES, renderTemplate, reminderSchedule } from '../../src/invoice-pack/reminders.ts'
import type { EmailMessage, EmailProvider, SendResult } from '../src/email.ts'
import { MAX_SEND_ATTEMPTS, runDueReminders } from '../src/followups.ts'
import { setup } from './helpers.ts'

// examplePack(): invoice EX-1 dated 19 Nov 2026, due in 15 days.
const BEFORE_INVOICE = new Date('2026-11-18T00:00:00Z')

class FakeEmail implements EmailProvider {
  readonly name = 'fake'
  attempts: EmailMessage[] = []
  delivered: EmailMessage[] = []
  queue: SendResult[] = []
  // Runs while the provider call is in flight, to simulate a freelancer action racing the send.
  during: (() => Promise<unknown>) | null = null

  async send(message: EmailMessage): Promise<SendResult> {
    this.attempts.push(message)
    await new Promise((resolve) => setTimeout(resolve, 1))
    if (this.during) {
      const action = this.during
      this.during = null
      await action()
    }
    const result = this.queue.shift() ?? { ok: true as const, id: `em_${this.attempts.length}` }
    if (result.ok) this.delivered.push(message)
    return result
  }
}

function harness(options: { email?: FakeEmail | null; now?: Date } = {}) {
  const clock = { now: options.now ?? BEFORE_INVOICE }
  const email = options.email === undefined ? new FakeEmail() : options.email
  const t = setup({ emailProvider: email, now: () => clock.now })
  const at = (iso: string) => {
    clock.now = new Date(iso)
  }
  const cron = (iso?: string) => {
    if (iso) at(iso)
    return runDueReminders(t.env, email, clock.now)
  }

  async function create(overrides: Record<string, unknown> = {}, order?: { orderRef: string; accessToken: string }) {
    const paid = order ?? (await t.paidOrder())
    const body = {
      orderRef: paid.orderRef,
      accessToken: paid.accessToken,
      input: examplePack(),
      contact: { clientEmail: 'accounts@client.example', clientPhone: '+91 98765 43210' },
      schedule: { enabled: true, secondDelayDays: 7, thirdDelayDays: 14 },
      consent: true,
      ...overrides,
    }
    const res = await t.call('POST', '/api/payments/followups', { body })
    return { res, order: paid, id: res.json?.followup?.id as string, token: res.json?.manageToken as string }
  }

  const manage = (id: string, token: string, action: string, extra: Record<string, unknown> = {}) =>
    t.call('POST', '/api/payments/followups/manage', { body: { id, token, action, ...extra } })

  const reminders = (id: string) =>
    t.sqlite.prepare('SELECT * FROM client_reminders WHERE invoice_id = ? ORDER BY stage').all(id) as Array<Record<string, unknown>>

  return { t, email: email as FakeEmail, clock, at, cron, create, manage, reminders }
}

describe('follow-up setup', () => {
  it('schedules day 0, 7, and 14 at 10:00 India time, stored in UTC', async () => {
    const h = harness()
    const { res } = await h.create()
    assert.equal(res.status, 201)
    const { followup } = res.json
    assert.deepEqual(
      followup.reminders.map((r: { dueAt: string }) => r.dueAt),
      ['2026-11-19T04:30:00.000Z', '2026-11-26T04:30:00.000Z', '2026-12-03T04:30:00.000Z'],
    )
    assert.deepEqual(followup.reminders.map((r: { status: string }) => r.status), ['scheduled', 'scheduled', 'scheduled'])
    assert.equal(followup.timezone, 'Asia/Kolkata')
    assert.equal(followup.delivery, 'email')
    assert.equal(followup.dueDate, '2026-12-04')
  })

  it('respects a custom schedule per invoice', async () => {
    const h = harness()
    const { res } = await h.create({ schedule: { enabled: true, secondDelayDays: 5, thirdDelayDays: 12 } })
    assert.equal(res.status, 201)
    assert.deepEqual(
      res.json.followup.reminders.map((r: { dueAt: string }) => r.dueAt),
      ['2026-11-19T04:30:00.000Z', '2026-11-24T04:30:00.000Z', '2026-12-01T04:30:00.000Z'],
    )
  })

  it('rejects intervals that are not sensible and sequential', async () => {
    const h = harness()
    const order = await h.t.paidOrder()
    for (const [second, third] of [[0, 14], [7, 7], [10, 5], [7.5, 14], [61, 70], [7, 91], ['a', 14], [null, 14]]) {
      const { res } = await h.create({ schedule: { enabled: true, secondDelayDays: second, thirdDelayDays: third } }, order)
      assert.equal(res.status, 422, `${second}/${third}`)
      assert.equal(res.json.error.code, 'invalid_followup')
      assert.ok(res.json.error.details.length > 0)
    }
    assert.equal(h.t.count('client_invoices'), 0)
  })

  it('requires a paid Invoice Pack order, its secret, and consent', async () => {
    const h = harness()
    const unpaid = await h.t.createOrder('invoice-pack')
    assert.equal((await h.create({}, unpaid)).res.status, 402)

    const paid = await h.t.paidOrder()
    const wrong = await h.create({ accessToken: 'x'.repeat(43) }, paid)
    assert.equal(wrong.res.status, 403)
    const receipt = await h.t.paidOrder('advance-receipt')
    assert.equal((await h.create({}, receipt)).res.status, 403)
    const noConsent = await h.create({ consent: false }, paid)
    assert.equal(noConsent.res.status, 400)
    assert.equal(noConsent.res.json.error.code, 'consent_required')
    const asserted = await h.create({ paid: true }, paid)
    assert.equal(asserted.res.status, 400)
    assert.equal(h.t.count('client_invoices'), 0)
  })

  it('refuses automatic reminders without a valid client email', async () => {
    const h = harness()
    const order = await h.t.paidOrder()
    for (const contact of [{}, { clientEmail: 'not-an-email' }, { clientEmail: 'a@b.example', clientPhone: 'call me' }]) {
      const { res } = await h.create({ contact }, order)
      assert.equal(res.status, 422, JSON.stringify(contact))
    }
    const draftsOnly = await h.create({ contact: {}, schedule: { enabled: false, secondDelayDays: 7, thirdDelayDays: 14 } }, order)
    assert.equal(draftsOnly.res.status, 201)
    assert.deepEqual(draftsOnly.res.json.followup.reminders.map((r: { status: string }) => r.status), ['paused', 'paused', 'paused'])
    const resume = await h.manage(draftsOnly.id, draftsOnly.token, 'resume')
    assert.equal(resume.status, 422)
    await h.cron('2026-12-10T00:00:00Z')
    assert.equal(h.email.attempts.length, 0)
  })

  it('allows one follow-up per order, for the invoice the order covers', async () => {
    const h = harness()
    const first = await h.create()
    assert.equal(first.res.status, 201)
    const again = await h.create({}, first.order)
    assert.equal(again.res.status, 409)
    assert.equal(again.res.json.error.code, 'followup_exists')

    const exported = await h.t.paidOrder()
    await h.t.call('POST', '/api/payments/exports/invoice', {
      body: { orderRef: exported.orderRef, accessToken: exported.accessToken, input: { ...examplePack(), invoiceNumber: 'OTHER-9' } },
    })
    const mismatch = await h.create({}, exported)
    assert.equal(mismatch.res.status, 409)
    assert.equal(mismatch.res.json.error.code, 'document_mismatch')
  })

  it('keeps the client invoice unpaid: buying Invoice Pack is not the client paying', async () => {
    const h = harness()
    const { res, order } = await h.create()
    assert.equal(h.t.orderRow(order.orderRef)?.status, 'paid')
    assert.equal(res.json.followup.paymentStatus, 'unpaid')
    assert.equal(res.json.followup.paidSource, null)
  })

  it('stores only a hash of the management secret and computes the amount on the server', async () => {
    const h = harness()
    const input: PackInput = { ...examplePack(), lines: [{ description: 'Design', amount: '10000' }], gstRegistered: false }
    const order = await h.t.paidOrder()
    const ok = await h.create({ input }, order)
    assert.equal(ok.res.status, 201)
    assert.equal(ok.res.json.followup.amount, 1_000_000)
    const row = h.t.sqlite.prepare('SELECT * FROM client_invoices WHERE id = ?').get(ok.id) as Record<string, unknown>
    assert.match(String(row.manage_token_hash), /^[0-9a-f]{64}$/)
    assert.ok(!JSON.stringify(row).includes(ok.token))
  })

  it('cancels all but the latest reminder when the schedule is already overdue', async () => {
    const h = harness({ now: new Date('2026-12-09T06:00:00Z') })
    const { res } = await h.create()
    const statuses = res.json.followup.reminders.map((r: { status: string }) => r.status)
    assert.deepEqual(statuses, ['cancelled', 'cancelled', 'scheduled'])
    await h.cron()
    assert.equal(h.email.delivered.length, 1)
    assert.match(h.email.delivered[0].subject, /^Final payment reminder — Invoice EX-1$/)
  })
})

describe('follow-up management', () => {
  it('requires the follow-up’s own secret, not the purchase secret or another follow-up’s', async () => {
    const h = harness()
    const a = await h.create()
    const b = await h.create()
    for (const [id, token] of [
      [a.id, a.order.accessToken],
      [a.id, b.token],
      [a.id, 'x'.repeat(43)],
      [a.id, ''],
      ['FU-AAAAAAAAAAAAAAAAAAAA', a.token],
    ]) {
      const res = await h.manage(id, token, 'mark_paid')
      assert.equal(res.status, 403, `${id} ${token}`)
      assert.equal(res.json.error.code, 'not_authorized')
    }
    assert.equal((await h.manage(a.id, a.token, 'view')).json.followup.paymentStatus, 'unpaid')
    assert.equal((await h.manage(a.id, a.token, 'view', { paymentStatus: 'paid' })).status, 400)
  })

  it('reschedules open reminders and rejects invalid changes', async () => {
    const h = harness()
    const { id, token } = await h.create()
    const bad = await h.manage(id, token, 'reschedule', { secondDelayDays: 9, thirdDelayDays: 9 })
    assert.equal(bad.status, 422)
    const res = await h.manage(id, token, 'reschedule', { secondDelayDays: 3, thirdDelayDays: 10 })
    assert.equal(res.status, 200)
    assert.deepEqual(
      res.json.followup.reminders.map((r: { dueAt: string }) => r.dueAt),
      ['2026-11-19T04:30:00.000Z', '2026-11-22T04:30:00.000Z', '2026-11-29T04:30:00.000Z'],
    )
  })

  it('lets the freelancer edit a reminder until it is sent', async () => {
    const h = harness()
    const { id, token } = await h.create()
    const edited = await h.manage(id, token, 'update_template', { stage: 2, subject: 'Checking in on {invoice_number}', body: 'Hi {client_name}' })
    assert.equal(edited.status, 200)
    assert.equal(edited.json.followup.reminders[1].rendered.subject, 'Checking in on EX-1')
    const injected = await h.manage(id, token, 'update_template', { stage: 2, subject: 'Hi\r\nBcc: x@evil.example', body: 'x' })
    assert.equal(injected.status, 422)
    await h.cron('2026-11-19T04:30:00Z')
    const locked = await h.manage(id, token, 'update_template', { stage: 1, subject: 'Late', body: 'Late' })
    assert.equal(locked.status, 409)
  })
})

describe('reminder delivery', () => {
  it('sends nothing before the scheduled time and sends at 10:00 India time', async () => {
    const h = harness()
    await h.create()
    await h.cron('2026-11-19T04:29:59Z')
    assert.equal(h.email.attempts.length, 0)
    await h.cron('2026-11-19T04:30:00Z')
    assert.equal(h.email.delivered.length, 1)
    const [message] = h.email.delivered
    assert.equal(message.to, 'accounts@client.example')
    assert.equal(message.subject, 'Invoice EX-1 — Payment due 4 December 2026')
    assert.ok(message.text.includes('Dear Sample Client Pvt Ltd,'))
    assert.ok(!message.text.includes('{'))
    assert.ok(!message.text.includes('View the invoice'), 'line with an empty invoice link is dropped')
    assert.equal(message.idempotencyKey.endsWith('-1'), true)
  })

  it('does not duplicate sends when the cron runs twice or concurrently', async () => {
    const h = harness()
    const { id } = await h.create()
    h.at('2026-11-19T05:00:00Z')
    await Promise.all([h.cron(), h.cron(), h.cron()])
    await h.cron()
    assert.equal(h.email.attempts.length, 1)
    assert.equal(h.reminders(id)[0].status, 'sent')
    assert.equal(h.reminders(id)[0].attempts, 1)
  })

  it('sends each stage once over the whole schedule, in order', async () => {
    const h = harness()
    const { id, token } = await h.create()
    for (const iso of ['2026-11-19T05:00:00Z', '2026-11-20T05:00:00Z', '2026-11-26T05:00:00Z', '2026-11-26T05:15:00Z', '2026-12-03T05:00:00Z', '2026-12-20T00:00:00Z']) {
      await h.cron(iso)
    }
    assert.deepEqual(h.email.delivered.map((m) => m.subject), [
      'Invoice EX-1 — Payment due 4 December 2026',
      'Friendly reminder — Invoice EX-1',
      'Final payment reminder — Invoice EX-1',
    ])
    const view = (await h.manage(id, token, 'view')).json.followup
    assert.deepEqual(view.reminders.map((r: { status: string }) => r.status), ['sent', 'sent', 'sent'])
    assert.deepEqual(view.reminders.map((r: { sentAt: string }) => r.sentAt), ['2026-11-19T05:00:00.000Z', '2026-11-26T05:00:00.000Z', '2026-12-03T05:00:00.000Z'])
    assert.deepEqual(view.reminders.map((r: { sentVia: string }) => r.sentVia), ['provider', 'provider', 'provider'])
    const events = view.history.map((e: { event: string; stage: number | null }) => `${e.event}:${e.stage ?? '-'}`).reverse()
    assert.deepEqual(events, ['created:-', 'sent:1', 'sent:2', 'sent:3'])
  })

  it('cancels pending reminders when the freelancer marks the invoice paid', async () => {
    const h = harness()
    const { id, token } = await h.create()
    await h.cron('2026-11-19T05:00:00Z')
    const res = await h.manage(id, token, 'mark_paid')
    assert.equal(res.json.followup.paymentStatus, 'paid')
    assert.equal(res.json.followup.paidSource, 'freelancer_confirmed')
    assert.deepEqual(res.json.followup.reminders.map((r: { status: string }) => r.status), ['sent', 'cancelled', 'cancelled'])
    await h.cron('2026-12-20T00:00:00Z')
    assert.equal(h.email.attempts.length, 1)
    assert.equal((await h.manage(id, token, 'resume')).status, 409)
  })

  it('does not send a reminder claimed just before the invoice was marked paid', async () => {
    const h = harness()
    const { id } = await h.create()
    // Simulates the freelancer marking the invoice paid between the claim and the send.
    h.t.sqlite.exec(`CREATE TEMP TRIGGER mark_on_claim AFTER UPDATE OF status ON client_reminders WHEN NEW.status = 'sending'
      BEGIN UPDATE client_invoices SET payment_status = 'paid', paid_source = 'freelancer_confirmed', paid_at = '2026-11-19T05:00:00Z' WHERE id = NEW.invoice_id; END`)
    await h.cron('2026-11-19T05:00:00Z')
    assert.equal(h.email.attempts.length, 0)
    assert.equal(h.reminders(id)[0].status, 'cancelled')
  })

  it('does not send paused reminders, and resumes on request', async () => {
    const h = harness()
    const { id, token } = await h.create()
    await h.manage(id, token, 'pause')
    await h.cron('2026-11-19T05:00:00Z')
    assert.equal(h.email.attempts.length, 0)
    assert.equal(h.reminders(id)[0].status, 'paused')
    const resumed = await h.manage(id, token, 'resume', { sendMissed: true })
    assert.equal(resumed.json.followup.remindersEnabled, true)
    await h.cron()
    assert.equal(h.email.delivered.length, 1)
  })

  it('retries temporary failures with backoff and stops after the limit', async () => {
    const h = harness()
    const { id, token } = await h.create()
    const temporary = { ok: false as const, retryable: true, reason: 'The email provider could not be reached.' }
    h.email.queue.push(temporary, temporary)
    await h.cron('2026-11-19T05:00:00Z')
    let row = h.reminders(id)[0]
    assert.equal(row.status, 'scheduled')
    assert.equal(row.next_attempt_at, '2026-11-19T05:15:00.000Z')
    await h.cron('2026-11-19T05:10:00Z')
    assert.equal(h.email.attempts.length, 1, 'not retried before the backoff')
    await h.cron('2026-11-19T05:15:00Z')
    row = h.reminders(id)[0]
    assert.equal(row.next_attempt_at, '2026-11-19T05:45:00.000Z')
    await h.cron('2026-11-19T05:45:00Z')
    assert.equal(h.email.delivered.length, 1)
    assert.equal(h.reminders(id)[0].status, 'sent')

    const second = await h.create()
    h.email.queue.push(...Array.from({ length: MAX_SEND_ATTEMPTS }, () => temporary))
    for (const iso of ['2026-11-20T00:00:00Z', '2026-11-20T01:00:00Z', '2026-11-20T03:00:00Z', '2026-11-20T08:00:00Z']) await h.cron(iso)
    const failed = h.reminders(second.id)[0]
    assert.equal(failed.status, 'failed')
    assert.equal(failed.attempts, MAX_SEND_ATTEMPTS)

    const retry = await h.manage(second.id, second.token, 'retry', { stage: 1 })
    assert.equal(retry.json.followup.reminders[0].status, 'scheduled')
    await h.cron('2026-11-20T08:00:00Z')
    assert.equal(h.reminders(second.id)[0].status, 'sent')
    void token
  })

  it('marks permanent provider errors failed without retrying', async () => {
    const h = harness()
    const { id } = await h.create()
    h.email.queue.push({ ok: false, retryable: false, reason: 'The email provider refused the message (HTTP 422).' })
    await h.cron('2026-11-19T05:00:00Z')
    await h.cron('2026-11-19T08:00:00Z')
    const row = h.reminders(id)[0]
    assert.equal(row.status, 'failed')
    assert.equal(row.error_reason, 'The email provider refused the message (HTTP 422).')
    assert.equal(h.email.attempts.length, 1)
  })

  it('never resends a delivery that was interrupted mid-send', async () => {
    const h = harness()
    const { id } = await h.create()
    h.t.sqlite
      .prepare(`UPDATE client_reminders SET status = 'sending', claim_id = 'crashed', claimed_at = '2026-11-19T05:00:00.000Z' WHERE id = ?`)
      .run(`${id}-1`)
    await h.cron('2026-11-19T05:05:00Z')
    assert.equal(h.reminders(id)[0].status, 'sending')
    await h.cron('2026-11-19T05:11:00Z')
    assert.equal(h.reminders(id)[0].status, 'failed')
    assert.equal(h.email.attempts.length, 0)
  })

  it('skips invoices whose contact details were removed', async () => {
    const h = harness()
    const { id } = await h.create()
    h.t.sqlite.prepare('UPDATE client_invoices SET client_email = NULL WHERE id = ?').run(id)
    await h.cron('2026-11-19T05:00:00Z')
    assert.equal(h.email.attempts.length, 0)
  })

  it('creates drafts only when no email provider is configured', async () => {
    const h = harness({ email: null })
    const { res, id, token } = await h.create()
    assert.equal(res.json.followup.delivery, 'manual')
    await h.cron('2026-11-19T05:00:00Z')
    assert.equal(h.reminders(id)[0].status, 'scheduled')
    const sent = await h.manage(id, token, 'mark_sent', { stage: 1 })
    assert.equal(sent.json.followup.reminders[0].status, 'sent')
    assert.equal(sent.json.followup.reminders[0].sentVia, 'manual')
  })

  it('does not send test-mode reminders once live keys are configured', async () => {
    const h = harness()
    const { id, token } = await h.create()
    h.t.env.RAZORPAY_KEY_ID = 'rzp_live_LIVEKEY123456'
    await h.cron('2026-11-19T05:00:00Z')
    assert.equal(h.email.attempts.length, 0)
    assert.equal((await h.manage(id, token, 'view')).status, 403)
  })

  it('removes client contact details 90 days after the last reminder', async () => {
    const h = harness()
    const { id, token } = await h.create()
    await h.manage(id, token, 'mark_paid')
    await h.cron('2027-01-10T00:00:00Z')
    let row = h.t.sqlite.prepare('SELECT client_email, contact_purged_at FROM client_invoices WHERE id = ?').get(id) as Record<string, unknown>
    assert.equal(row.client_email, 'accounts@client.example')
    await h.cron('2027-03-01T00:00:00Z')
    row = h.t.sqlite.prepare('SELECT client_email, contact_purged_at FROM client_invoices WHERE id = ?').get(id) as Record<string, unknown>
    assert.equal(row.client_email, null)
    assert.ok(row.contact_purged_at)
  })
})

const statuses = (h: ReturnType<typeof harness>, id: string) => h.reminders(id).map((r) => r.status)

describe('freelancer actions racing the scheduler', () => {
  it('does not send when reminders are paused between the claim and the send', async () => {
    const h = harness()
    const { id, token } = await h.create()
    h.t.sqlite.exec(`CREATE TEMP TRIGGER pause_on_claim AFTER UPDATE OF status ON client_reminders WHEN NEW.status = 'sending'
      BEGIN UPDATE client_invoices SET reminders_enabled = 0 WHERE id = NEW.invoice_id; END`)
    await h.cron('2026-11-19T05:00:00Z')
    h.t.sqlite.exec('DROP TRIGGER pause_on_claim')
    assert.equal(h.email.attempts.length, 0)
    assert.equal(h.reminders(id)[0].status, 'paused')
    assert.equal(h.reminders(id)[0].attempts, 0)
    await h.manage(id, token, 'resume', { sendMissed: true })
    await h.cron()
    assert.equal(h.email.delivered.length, 1)
  })

  it('records an email the provider accepted during mark-paid as sent, and cancels the rest', async () => {
    const h = harness()
    const { id, token } = await h.create()
    h.email.during = () => h.manage(id, token, 'mark_paid')
    await h.cron('2026-11-19T05:00:00Z')
    assert.equal(h.email.delivered.length, 1)
    assert.deepEqual(statuses(h, id), ['sent', 'cancelled', 'cancelled'])
    const view = (await h.manage(id, token, 'view')).json.followup
    const sent = view.history.find((e: { event: string }) => e.event === 'sent')
    assert.match(sent.detail, /marked the invoice paid while it was being sent/)
    await h.cron('2026-12-20T00:00:00Z')
    assert.equal(h.email.attempts.length, 1)
  })

  it('cancels instead of rescheduling when a send fails while the invoice is marked paid', async () => {
    const h = harness()
    const { id, token } = await h.create()
    h.email.queue.push({ ok: false, retryable: true, reason: 'The email provider could not be reached.' })
    h.email.during = () => h.manage(id, token, 'mark_paid')
    await h.cron('2026-11-19T05:00:00Z')
    const [first] = h.reminders(id)
    assert.equal(first.status, 'cancelled')
    assert.equal(first.error_reason, 'Cancelled because you marked the invoice paid.')
    assert.deepEqual(statuses(h, id), ['cancelled', 'cancelled', 'cancelled'])
    await h.cron('2026-12-20T00:00:00Z')
    assert.equal(h.email.attempts.length, 1)
  })

  it('cancels instead of failing when a permanent error coincides with mark-paid', async () => {
    const h = harness()
    const { id, token } = await h.create()
    h.email.queue.push({ ok: false, retryable: false, reason: 'The email provider refused the message (HTTP 422).' })
    h.email.during = () => h.manage(id, token, 'mark_paid')
    await h.cron('2026-11-19T05:00:00Z')
    assert.deepEqual(statuses(h, id), ['cancelled', 'cancelled', 'cancelled'])
  })

  it('keeps a reminder paused when a send fails while reminders are paused', async () => {
    const h = harness()
    const { id, token } = await h.create()
    h.email.queue.push({ ok: false, retryable: true, reason: 'The email provider could not be reached.' })
    h.email.during = () => h.manage(id, token, 'pause')
    await h.cron('2026-11-19T05:00:00Z')
    assert.deepEqual(statuses(h, id), ['paused', 'paused', 'paused'])
    await h.cron('2026-11-19T06:00:00Z')
    assert.equal(h.email.attempts.length, 1, 'a paused reminder is not retried')
  })

  it('never leaves a reminder scheduled or sending after concurrent pause or mark-paid', async () => {
    const h = harness()
    const followups = []
    for (let i = 0; i < 6; i += 1) followups.push(await h.create())
    h.at('2026-11-19T05:00:00Z')
    await Promise.all([
      h.cron(),
      ...followups.map((f, i) => h.manage(f.id, f.token, i % 2 ? 'pause' : 'mark_paid')),
      h.cron(),
    ])
    for (const [i, f] of followups.entries()) {
      const rows = h.reminders(f.id)
      assert.ok(!rows.some((r) => r.status === 'sending' || r.status === 'scheduled'), `${i}: ${rows.map((r) => r.status)}`)
      const expectedOpen = i % 2 ? 'paused' : 'cancelled'
      assert.ok(rows.slice(1).every((r) => r.status === expectedOpen))
      assert.ok(rows[0].status === 'sent' || rows[0].status === expectedOpen)
    }
    const deliveredBefore = h.email.delivered.length
    await h.cron('2026-12-20T00:00:00Z')
    assert.equal(h.email.delivered.length, deliveredBefore)
  })
})

describe('resuming a paused schedule', () => {
  async function pausedFollowup() {
    const h = harness()
    const f = await h.create()
    await h.manage(f.id, f.token, 'pause')
    return { h, ...f }
  }

  it('skips a reminder whose date passed while paused and keeps the later ones', async () => {
    const { h, id, token } = await pausedFollowup()
    h.at('2026-11-20T09:00:00Z')
    const res = await h.manage(id, token, 'resume')
    assert.deepEqual(res.json.followup.reminders.map((r: { status: string }) => r.status), ['cancelled', 'scheduled', 'scheduled'])
    assert.equal(res.json.followup.reminders[0].errorReason, 'Skipped because its date passed while reminders were paused.')
    await h.cron()
    assert.equal(h.email.attempts.length, 0, 'nothing is sent straight after resuming')
    await h.cron('2026-11-26T05:00:00Z')
    assert.deepEqual(h.email.delivered.map((m) => m.subject), ['Friendly reminder — Invoice EX-1'])
  })

  it('skips every missed reminder when two dates have passed', async () => {
    const { h, id, token } = await pausedFollowup()
    h.at('2026-11-27T00:00:00Z')
    await h.manage(id, token, 'resume')
    assert.deepEqual(statuses(h, id), ['cancelled', 'cancelled', 'scheduled'])
    await h.cron()
    assert.equal(h.email.attempts.length, 0)
    await h.cron('2026-12-03T05:00:00Z')
    assert.deepEqual(h.email.delivered.map((m) => m.subject), ['Final payment reminder — Invoice EX-1'])
  })

  it('sends nothing when every date has passed, unless asked', async () => {
    const { h, id, token } = await pausedFollowup()
    h.at('2026-12-10T00:00:00Z')
    await h.manage(id, token, 'resume')
    assert.deepEqual(statuses(h, id), ['cancelled', 'cancelled', 'cancelled'])
    await h.cron()
    assert.equal(h.email.attempts.length, 0)
  })

  it('sends only the latest missed reminder when asked, then continues in order', async () => {
    const { h, id, token } = await pausedFollowup()
    h.at('2026-11-27T00:00:00Z')
    const res = await h.manage(id, token, 'resume', { sendMissed: true })
    assert.deepEqual(res.json.followup.reminders.map((r: { status: string }) => r.status), ['cancelled', 'scheduled', 'scheduled'])
    await Promise.all([h.cron(), h.cron()])
    await h.cron()
    await h.cron('2026-12-03T05:00:00Z')
    assert.deepEqual(h.email.delivered.map((m) => m.subject), [
      'Friendly reminder — Invoice EX-1',
      'Final payment reminder — Invoice EX-1',
    ])
  })

  it('rejects a sendMissed value that is not true or false', async () => {
    const { h, id, token } = await pausedFollowup()
    assert.equal((await h.manage(id, token, 'resume', { sendMissed: 'yes' })).status, 400)
    assert.deepEqual(statuses(h, id), ['paused', 'paused', 'paused'])
  })
})

describe('contact retention', () => {
  const contact = (h: ReturnType<typeof harness>, id: string) =>
    h.t.sqlite.prepare('SELECT client_email, client_phone, reply_to, contact_purged_at FROM client_invoices WHERE id = ?').get(id) as Record<string, unknown>

  it('removes contact details from a follow-up left paused for 90 days and closes its reminders', async () => {
    const h = harness()
    const { id, token } = await h.create()
    await h.manage(id, token, 'pause')
    await h.cron('2027-02-15T23:59:00Z')
    assert.equal(contact(h, id).client_email, 'accounts@client.example')
    await h.cron('2027-02-16T00:01:00Z')
    const row = contact(h, id)
    assert.equal(row.client_email, null)
    assert.equal(row.client_phone, null)
    assert.ok(row.contact_purged_at)
    assert.deepEqual(statuses(h, id), ['cancelled', 'cancelled', 'cancelled'])
    assert.equal((await h.manage(id, token, 'resume')).status, 422)
    const history = (await h.manage(id, token, 'view')).json.followup.history
    assert.equal(history[0].event, 'contact_removed')
  })

  it('removes contact details from a follow-up whose reminders all failed', async () => {
    const h = harness()
    const { id } = await h.create()
    const refused = { ok: false as const, retryable: false, reason: 'The email provider refused the message (HTTP 422).' }
    h.email.queue.push(refused, refused, refused)
    for (const iso of ['2026-11-19T05:00:00Z', '2026-11-26T05:00:00Z', '2026-12-03T05:00:00Z']) await h.cron(iso)
    assert.deepEqual(statuses(h, id), ['failed', 'failed', 'failed'])
    await h.cron('2027-03-03T04:59:00Z')
    assert.equal(contact(h, id).client_email, 'accounts@client.example')
    await h.cron('2027-03-03T05:01:00Z')
    assert.equal(contact(h, id).client_email, null)
    assert.deepEqual(statuses(h, id), ['failed', 'failed', 'failed'])
  })

  it('keeps contact details for 90 days after the last reminder is sent, not 90 days after setup', async () => {
    const h = harness()
    const { id } = await h.create({ schedule: { enabled: true, secondDelayDays: 7, thirdDelayDays: 90 } })
    for (const iso of ['2026-11-19T05:00:00Z', '2026-11-26T05:00:00Z', '2027-02-17T05:00:00Z']) await h.cron(iso)
    assert.deepEqual(statuses(h, id), ['sent', 'sent', 'sent'])
    assert.equal(contact(h, id).client_email, 'accounts@client.example')
    await h.cron('2027-05-18T04:59:00Z')
    assert.equal(contact(h, id).client_email, 'accounts@client.example')
    await h.cron('2027-05-18T05:01:00Z')
    assert.equal(contact(h, id).client_email, null)
  })

  it('keeps contact details while a reminder is scheduled and can still be sent', async () => {
    const h = harness({ email: null })
    const { id } = await h.create()
    h.t.sqlite.exec(`UPDATE client_invoices SET updated_at = '2026-01-01T00:00:00.000Z'; UPDATE client_reminders SET updated_at = '2026-01-01T00:00:00.000Z'`)
    await h.cron('2027-06-01T00:00:00Z')
    assert.equal(contact(h, id).client_email, 'accounts@client.example')
  })

  it('does not treat reminders that can never be sent as a reason to keep contact details', async () => {
    const h = harness()
    const { id } = await h.create()
    h.t.sqlite.exec(`UPDATE client_invoices SET updated_at = '2026-01-01T00:00:00.000Z'; UPDATE client_reminders SET updated_at = '2026-01-01T00:00:00.000Z'`)
    h.t.env.RAZORPAY_KEY_ID = 'rzp_live_LIVEKEY123456'
    await h.cron('2027-06-01T00:00:00Z')
    assert.equal(contact(h, id).client_email, null)
    assert.deepEqual(statuses(h, id), ['cancelled', 'cancelled', 'cancelled'])
  })

  it('purges nothing when the key mode is unknown', async () => {
    const h = harness()
    const { id, token } = await h.create()
    await h.manage(id, token, 'pause')
    h.t.env.RAZORPAY_KEY_ID = ''
    await h.cron('2027-06-01T00:00:00Z')
    assert.equal(contact(h, id).client_email, 'accounts@client.example')
  })

  it('never removes contact details while an email is being sent', async () => {
    const h = harness()
    const { id } = await h.create()
    let during: Record<string, unknown> | null = null
    h.email.during = async () => {
      h.t.sqlite.exec(`UPDATE client_invoices SET updated_at = '2026-01-01T00:00:00.000Z';
        UPDATE client_reminders SET updated_at = '2026-01-01T00:00:00.000Z';
        UPDATE client_reminders SET status = 'cancelled' WHERE stage > 1`)
      await runDueReminders(h.t.env, null, new Date('2027-06-01T00:00:00Z'))
      during = contact(h, id)
    }
    await h.cron('2026-11-19T05:00:00Z')
    assert.equal(during!.client_email, 'accounts@client.example')
    assert.equal(h.email.delivered.length, 1)
  })
})

describe('reminder templates', () => {
  it('fills placeholders and drops lines whose value is empty', () => {
    const values = {
      business_name: 'Asha Rao',
      client_name: 'Acme',
      invoice_number: 'INV-7',
      amount: '₹1,000.00',
      due_date: '4 December 2026',
      payment_instructions: '',
      invoice_link: 'https://drive.example/inv-7',
    }
    const text = renderTemplate(DEFAULT_TEMPLATES[3].body, values)
    assert.ok(text.startsWith('Dear Acme,'))
    assert.ok(text.includes('View the invoice: https://drive.example/inv-7'))
    assert.ok(!text.includes('Payment details'))
    assert.ok(!/\n{3,}/.test(text))
  })

  it('schedules from the India calendar date regardless of server time zone', () => {
    const times = reminderSchedule('2026-03-31', 7, 14)
    assert.deepEqual(times, { 1: '2026-03-31T04:30:00.000Z', 2: '2026-04-07T04:30:00.000Z', 3: '2026-04-14T04:30:00.000Z' })
  })
})
