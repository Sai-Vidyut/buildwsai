import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'
import { DEMO_RECEIPT, examplePack } from '../../src/invoice-pack/logic.ts'
import { canonicalPromoCode, newPromoCode, sha256Hex } from '../src/crypto.ts'
import { expirePromoCodes } from '../src/access.ts'
import { EXPORT_LIMIT } from '../src/exports.ts'
import { ADMIN_KEY, checkoutSignature, setup } from './helpers.ts'

const NOW = new Date('2026-11-22T00:00:00Z')

async function harness(options: { adminEnabled?: boolean } = {}) {
  const clock = { now: NOW }
  const t = setup({ now: () => clock.now, adminKeyHash: options.adminEnabled === false ? undefined : await sha256Hex(ADMIN_KEY) })
  const admin = (body: Record<string, unknown>, key: string | null = ADMIN_KEY) =>
    t.call('POST', '/api/payments/admin', { body, headers: key === null ? {} : { Authorization: `Bearer ${key}` } })
  const createCode = async (extra: Record<string, unknown> = {}) => {
    const res = await admin({ action: 'create_code', ...extra })
    assert.equal(res.status, 201, JSON.stringify(res.json))
    return res.json as { code: string; promoCode: { id: string; status: string } }
  }
  const redeem = (code: string, email?: string) =>
    t.call('POST', '/api/payments/grants/redeem', { body: email === undefined ? { code } : { code, email } })
  const adminPass = async () => {
    const res = await admin({ action: 'create_admin_pass', label: 'Laptop' })
    assert.equal(res.status, 201)
    return res.json as { passId: string; passToken: string }
  }
  const claimAdmin = (passToken: string) => t.call('POST', '/api/payments/grants/admin', { body: { passToken } })
  const exportInvoice = (ref: string, token: string, input: unknown = examplePack()) =>
    t.call('POST', '/api/payments/exports/invoice', { body: { orderRef: ref, accessToken: token, input } })
  const createFollowup = (ref: string, token: string) =>
    t.call('POST', '/api/payments/followups', {
      body: {
        orderRef: ref,
        accessToken: token,
        input: examplePack(),
        contact: { clientEmail: 'accounts@client.example', replyTo: 'hello@freelancer.example' },
        schedule: { enabled: true, secondDelayDays: 7, thirdDelayDays: 14 },
        consent: true,
      },
    })
  const events = (subjectId: string) =>
    (t.sqlite.prepare('SELECT event, actor, detail FROM access_events WHERE subject_id = ? ORDER BY id').all(subjectId) as Array<Record<string, unknown>>).map((e) => e.event)
  const paymentRecords = () => t.count('orders') + t.count('payments') + t.count('webhook_events')
  return { t, clock, admin, createCode, redeem, adminPass, claimAdmin, exportInvoice, createFollowup, events, paymentRecords }
}

describe('admin authentication', () => {
  it('rejects admin calls without the key, with a wrong key, or with the key in the body', async () => {
    const h = await harness()
    for (const key of [null, 'wrong-key-wrong-key-wrong-key-wrong-key-00', ADMIN_KEY.slice(0, -1), '']) {
      for (const body of [{ action: 'create_code' }, { action: 'revoke_code', codeId: 'PC-AAAAAAAAAAAAAAAAAAAA' }, { action: 'create_admin_pass' }, { action: 'overview' }]) {
        const res = await h.admin(body, key)
        assert.equal(res.status, 401, `${key}: ${body.action}`)
        assert.equal(res.json.error.code, 'admin_unauthorized')
      }
    }
    const inBody = await h.t.call('POST', '/api/payments/admin', { body: { action: 'create_code', adminKey: ADMIN_KEY } })
    assert.equal(inBody.status, 401)
    assert.equal(h.t.count('promo_codes') + h.t.count('admin_passes'), 0)
  })

  it('disables every admin endpoint when no admin key hash is configured', async () => {
    const h = await harness({ adminEnabled: false })
    const res = await h.admin({ action: 'overview' })
    assert.equal(res.status, 404)
  })

  it('rate-limits admin attempts per client', async () => {
    let calls = 0
    const limiter = { limit: async () => ({ success: ++calls <= 2 }) }
    const t = setup({ limiter, adminKeyHash: await sha256Hex(ADMIN_KEY) })
    const statuses = []
    for (let i = 0; i < 4; i += 1) statuses.push((await t.call('POST', '/api/payments/admin', { body: { action: 'overview' }, headers: { Authorization: 'Bearer nope-nope-nope-nope-nope-nope-nope-nope' } })).status)
    assert.deepEqual(statuses, [401, 401, 429, 429])
  })

  it('never returns the admin key, code hashes or token hashes', async () => {
    const h = await harness()
    const { code } = await h.createCode()
    await h.adminPass()
    const overview = await h.admin({ action: 'overview' })
    const text = JSON.stringify(overview.json)
    assert.ok(!text.includes(ADMIN_KEY))
    assert.ok(!text.includes(code))
    assert.ok(!/code_hash|token_hash|[0-9a-f]{64}/.test(text))
  })

  it('allows the Authorization header in CORS preflight', async () => {
    const h = await harness()
    const res = await h.t.call('OPTIONS', '/api/payments/admin')
    assert.match(res.headers.get('Access-Control-Allow-Headers') ?? '', /Authorization/)
  })
})

describe('permanent admin access', () => {
  it('lets an admin pass create, export, and follow up on invoices without Razorpay', async () => {
    const h = await harness()
    const pass = await h.adminPass()
    const first = await h.claimAdmin(pass.passToken)
    assert.equal(first.status, 201)
    assert.equal(first.json.source, 'admin_grant')
    assert.match(first.json.grantRef, /^GR-/)
    const exported = await h.exportInvoice(first.json.grantRef, first.json.accessToken)
    assert.equal(exported.status, 200, JSON.stringify(exported.json))
    assert.match(exported.json.html, /EX-1/)
    assert.equal((await h.createFollowup(first.json.grantRef, first.json.accessToken)).status, 201)

    // The pass is permanent: every new invoice gets its own free grant.
    const second = await h.claimAdmin(pass.passToken)
    assert.equal(second.status, 201)
    assert.notEqual(second.json.grantRef, first.json.grantRef)
    assert.equal((await h.exportInvoice(second.json.grantRef, second.json.accessToken, { ...examplePack(), invoiceNumber: 'EX-2' })).status, 200)

    assert.equal(h.paymentRecords(), 0, 'no order, payment, or webhook record is created')
    assert.equal(h.t.sqlite.prepare("SELECT COUNT(*) AS n FROM access_grants WHERE source = 'admin_grant'").get()!.n, 2)
    const overview = await h.admin({ action: 'overview' })
    assert.equal(overview.json.adminPasses[0].status, 'active')
    assert.ok(overview.json.adminPasses[0].lastUsedAt)
    assert.deepEqual(h.events(pass.passId), ['created', 'grant_issued', 'grant_issued'])
  })

  it('keeps the usual per-invoice limits on admin grants', async () => {
    const h = await harness()
    const pass = await h.adminPass()
    const grant = (await h.claimAdmin(pass.passToken)).json
    assert.equal((await h.exportInvoice(grant.grantRef, grant.accessToken)).status, 200)
    const other = await h.exportInvoice(grant.grantRef, grant.accessToken, { ...examplePack(), invoiceNumber: 'EX-9' })
    assert.equal(other.status, 409)
    assert.equal(other.json.error.code, 'document_mismatch')
    h.t.sqlite.prepare('UPDATE access_grants SET export_count = ? WHERE id = ?').run(EXPORT_LIMIT, grant.grantRef)
    assert.equal((await h.exportInvoice(grant.grantRef, grant.accessToken)).status, 429)
  })

  it('refuses a revoked pass, a forged pass, and a pass from the other key mode', async () => {
    const h = await harness()
    const pass = await h.adminPass()
    assert.equal((await h.claimAdmin('A'.repeat(43))).status, 403)
    assert.equal((await h.claimAdmin('not-a-token')).status, 403)
    h.t.env.RAZORPAY_KEY_ID = 'rzp_live_LIVEKEY123456'
    assert.equal((await h.claimAdmin(pass.passToken)).status, 403)
    h.t.env.RAZORPAY_KEY_ID = 'rzp_test_TESTKEY123456'
    const revoked = await h.admin({ action: 'revoke_admin_pass', passId: pass.passId })
    assert.equal(revoked.status, 200)
    assert.equal(revoked.json.adminPasses[0].status, 'revoked')
    const res = await h.claimAdmin(pass.passToken)
    assert.equal(res.status, 403)
    assert.equal(res.json.error.code, 'admin_pass_invalid')
    assert.deepEqual(h.events(pass.passId), ['created', 'revoked'])
  })

  it('does not accept the admin key itself as an export or follow-up credential', async () => {
    const h = await harness()
    assert.equal((await h.claimAdmin(ADMIN_KEY)).status, 403)
    assert.equal((await h.exportInvoice('GR-AAAAAAAAAAAAAAAAAAAA', ADMIN_KEY)).status, 403)
  })
})

describe('promotional codes', () => {
  it('generates unique, high-entropy codes and stores only their hash', async () => {
    const h = await harness()
    const seen = new Set<string>()
    for (let i = 0; i < 200; i += 1) seen.add(newPromoCode())
    assert.equal(seen.size, 200)
    for (const code of seen) assert.match(code, /^IPC-[A-HJ-NP-Z2-9]{5}(-[A-HJ-NP-Z2-9]{5}){3}$/)
    assert.equal(canonicalPromoCode(' ipc abcde-fghjk lmnpq rstuv '), 'IPC-ABCDE-FGHJK-LMNPQ-RSTUV')
    assert.equal(canonicalPromoCode('IPC-ABCDE-FGHJK-LMNPQ-RSTU0'), null)

    const { code, promoCode } = await h.createCode()
    const row = h.t.sqlite.prepare('SELECT * FROM promo_codes WHERE id = ?').get(promoCode.id) as Record<string, unknown>
    assert.ok(!Object.values(row).includes(code), 'the plaintext code is not stored')
    assert.equal(row.code_hash, await sha256Hex(`promo:${code}`))
    assert.equal(row.code_hint, code.slice(-4))
    const listed = await h.admin({ action: 'overview' })
    assert.ok(!JSON.stringify(listed.json).includes(code), 'the code is shown only once')
    assert.deepEqual(h.events(promoCode.id), ['created'])
  })

  it('redeems a valid code once into a full Invoice Pack purchase', async () => {
    const h = await harness()
    const { code, promoCode } = await h.createCode({ note: 'For Priya' })
    const res = await h.redeem(code.toLowerCase().replaceAll('-', ' '), 'Priya@Example.com')
    assert.equal(res.status, 201)
    assert.equal(res.json.source, 'promo_grant')
    const { grantRef, accessToken } = res.json

    const status = await h.t.call('GET', `/api/payments/grants/${grantRef}`)
    assert.equal(status.json.status, 'active')
    assert.equal((await h.exportInvoice(grantRef, accessToken)).status, 200)
    const followup = await h.createFollowup(grantRef, accessToken)
    assert.equal(followup.status, 201)
    const invoiceRow = h.t.sqlite.prepare('SELECT order_id, grant_id FROM client_invoices').get() as Record<string, unknown>
    assert.deepEqual({ ...invoiceRow }, { order_id: null, grant_id: grantRef })
    const manage = await h.t.call('POST', '/api/payments/followups/manage', { body: { id: followup.json.followup.id, token: followup.json.manageToken, action: 'view' } })
    assert.equal(manage.status, 200)

    const overview = await h.admin({ action: 'overview' })
    const listed = overview.json.codes.find((c: { id: string }) => c.id === promoCode.id)
    assert.equal(listed.status, 'redeemed')
    assert.equal(listed.redeemedEmail, 'priya@example.com')
    assert.equal(listed.redeemedAt, NOW.toISOString())
    assert.equal(listed.grantRef, grantRef)
    assert.deepEqual(h.events(promoCode.id), ['created', 'redeemed'])
    assert.equal(h.paymentRecords(), 0)
  })

  it('rejects a second redemption, and the code never works again', async () => {
    const h = await harness()
    const { code, promoCode } = await h.createCode()
    assert.equal((await h.redeem(code)).status, 201)
    for (let i = 0; i < 3; i += 1) {
      const again = await h.redeem(code, 'someone@example.com')
      assert.equal(again.status, 403)
      assert.equal(again.json.error.code, 'code_invalid')
    }
    h.clock.now = new Date('2027-06-01T00:00:00Z')
    assert.equal((await h.redeem(code)).status, 403)
    assert.equal(h.t.count('access_grants'), 1)
    assert.deepEqual(h.events(promoCode.id), ['created', 'redeemed', 'redeem_rejected', 'redeem_rejected', 'redeem_rejected', 'redeem_rejected'])
  })

  it('lets exactly one of many concurrent redemptions succeed', async () => {
    const h = await harness()
    const { code } = await h.createCode()
    const results = await Promise.all(Array.from({ length: 12 }, (_, i) => h.redeem(code, `user${i}@example.com`)))
    const won = results.filter((r) => r.status === 201)
    assert.equal(won.length, 1)
    assert.ok(results.filter((r) => r.status !== 201).every((r) => r.status === 403 && r.json.error.code === 'code_invalid'))
    assert.equal(h.t.count('access_grants'), 1)
    const row = h.t.sqlite.prepare('SELECT grant_id FROM promo_codes').get() as { grant_id: string }
    assert.equal(row.grant_id, won[0].json.grantRef)
  })

  it('rejects an expired code and records the expiry', async () => {
    const h = await harness()
    const { code, promoCode } = await h.createCode({ expiresAt: '2026-11-25' })
    h.clock.now = new Date('2026-11-25T18:29:58Z')
    const later = await h.createCode()
    h.clock.now = new Date('2026-11-25T18:30:00Z')
    const res = await h.redeem(code)
    assert.equal(res.status, 403)
    assert.equal(res.json.error.code, 'code_invalid')
    assert.deepEqual(h.events(promoCode.id), ['created', 'expired', 'redeem_rejected'])
    const overview = await h.admin({ action: 'overview' })
    assert.equal(overview.json.codes.find((c: { id: string }) => c.id === promoCode.id).status, 'expired')
    assert.equal(overview.json.codes.find((c: { id: string }) => c.id === later.promoCode.id).status, 'unused')
    assert.equal(h.t.count('access_grants'), 0)
  })

  it('records expiry from the scheduled sweep even if nobody tries the code', async () => {
    const h = await harness()
    const { promoCode } = await h.createCode({ expiresAt: '2026-11-23T00:00:00Z' })
    assert.equal(await expirePromoCodes(h.t.env.DB, new Date('2026-11-22T12:00:00Z')), 0)
    assert.equal(await expirePromoCodes(h.t.env.DB, new Date('2026-11-23T00:00:01Z')), 1)
    assert.equal(await expirePromoCodes(h.t.env.DB, new Date('2026-11-24T00:00:00Z')), 0)
    assert.deepEqual(h.events(promoCode.id), ['created', 'expired'])
  })

  it('rejects invalid expiry values', async () => {
    const h = await harness()
    for (const expiresAt of ['2026-11-21', '2020-01-01T00:00:00Z', 'tomorrow', '2028-01-01', 42]) {
      assert.equal((await h.admin({ action: 'create_code', expiresAt })).status, 400, String(expiresAt))
    }
  })

  it('rejects a revoked code, and only unused codes can be revoked', async () => {
    const h = await harness()
    const { code, promoCode } = await h.createCode()
    const revoked = await h.admin({ action: 'revoke_code', codeId: promoCode.id })
    assert.equal(revoked.status, 200)
    assert.equal(revoked.json.codes[0].status, 'revoked')
    assert.equal((await h.redeem(code)).status, 403)
    assert.equal((await h.admin({ action: 'revoke_code', codeId: promoCode.id })).status, 409)

    const used = await h.createCode()
    assert.equal((await h.redeem(used.code)).status, 201)
    const res = await h.admin({ action: 'revoke_code', codeId: used.promoCode.id })
    assert.equal(res.status, 409)
    assert.equal(res.json.error.code, 'code_not_revocable')
    assert.deepEqual(h.events(promoCode.id), ['created', 'revoked', 'redeem_rejected'])
  })

  it('binds a code to an email address', async () => {
    const h = await harness()
    const { code, promoCode } = await h.createCode({ email: 'Friend@Example.com' })
    for (const email of [undefined, 'other@example.com', 'friend@example.co', 'not-an-email']) {
      const res = await h.redeem(code, email)
      assert.ok(res.status === 403 || res.status === 400, String(email))
    }
    assert.equal(h.t.count('access_grants'), 0)
    assert.equal((await h.redeem(code, ' friend@example.com ')).status, 201)
    const detail = h.t.sqlite.prepare("SELECT detail FROM access_events WHERE subject_id = ? AND event = 'redeem_rejected'").all(promoCode.id) as Array<{ detail: string }>
    assert.ok(detail.every((d) => d.detail === 'email mismatch'))
  })

  it('does not let a test-mode code unlock live access', async () => {
    const h = await harness()
    const { code } = await h.createCode()
    const testGrant = (await h.redeem(code)).json
    const second = await h.createCode()
    h.t.env.RAZORPAY_KEY_ID = 'rzp_live_LIVEKEY123456'
    assert.equal((await h.redeem(second.code)).status, 403)
    assert.equal((await h.exportInvoice(testGrant.grantRef, testGrant.accessToken)).status, 403)
    assert.equal((await h.t.call('GET', `/api/payments/grants/${testGrant.grantRef}`)).status, 404)
  })

  it('rejects unknown or malformed codes without revealing anything', async () => {
    const h = await harness()
    for (const code of [newPromoCode(), 'IPC-12345', '', 'x'.repeat(65), 42]) {
      const res = await h.t.call('POST', '/api/payments/grants/redeem', { body: { code } })
      assert.equal(res.status, 403)
      assert.equal(res.json.error.code, 'code_invalid')
    }
    assert.equal((await h.t.call('POST', '/api/payments/grants/redeem', { body: { code: newPromoCode(), extra: 1 } })).status, 400)
  })

  it('limits a promo grant to Invoice Pack', async () => {
    const h = await harness()
    const grant = (await h.redeem((await h.createCode()).code)).json
    const res = await h.t.call('POST', '/api/payments/exports/receipt', { body: { orderRef: grant.grantRef, accessToken: grant.accessToken, input: DEMO_RECEIPT } })
    assert.equal(res.status, 403)
    assert.equal(res.json.error.code, 'wrong_product')
  })

  it('refuses a grant with the wrong secret', async () => {
    const h = await harness()
    const grant = (await h.redeem((await h.createCode()).code)).json
    const other = (await h.redeem((await h.createCode()).code)).json
    assert.equal((await h.exportInvoice(grant.grantRef, other.accessToken)).status, 403)
    assert.equal((await h.createFollowup(grant.grantRef, other.accessToken)).status, 403)
  })
})

describe('payment integrity', () => {
  it('still requires a valid Razorpay payment from ordinary customers', async () => {
    const h = await harness()
    const order = await h.t.createOrder('invoice-pack')
    const res = await h.exportInvoice(order.orderRef, order.accessToken)
    assert.equal(res.status, 402)
    assert.equal((await h.createFollowup(order.orderRef, order.accessToken)).status, 402)
    const payment = h.t.razorpay.addPayment(order.razorpayOrderId)
    const forged = await h.t.call('POST', '/api/payments/verify', {
      body: { orderRef: order.orderRef, razorpay_order_id: order.razorpayOrderId, razorpay_payment_id: payment.id, razorpay_signature: 'a'.repeat(64) },
    })
    assert.equal(forged.status, 400)
    assert.equal((await h.exportInvoice(order.orderRef, order.accessToken)).status, 402)
  })

  it('keeps existing paid orders working, including their follow-ups', async () => {
    const h = await harness()
    const paid = await h.t.paidOrder()
    assert.equal((await h.exportInvoice(paid.orderRef, paid.accessToken)).status, 200)
    const followup = await h.createFollowup(paid.orderRef, paid.accessToken)
    assert.equal(followup.status, 201)
    const row = h.t.sqlite.prepare('SELECT order_id, grant_id FROM client_invoices').get() as Record<string, unknown>
    assert.deepEqual({ ...row }, { order_id: paid.orderRef, grant_id: null })
    assert.equal((await h.createFollowup(paid.orderRef, paid.accessToken)).status, 409)
  })

  it('cannot turn a grant into a Razorpay payment or a captured event', async () => {
    const h = await harness()
    const grant = (await h.redeem((await h.createCode()).code)).json
    const adminGrant = (await h.claimAdmin((await h.adminPass()).passToken)).json
    for (const ref of [grant.grantRef, adminGrant.grantRef]) {
      const verify = await h.t.call('POST', '/api/payments/verify', {
        body: { orderRef: ref, razorpay_order_id: 'order_FAKE00000001', razorpay_payment_id: 'pay_FAKE00000001', razorpay_signature: await checkoutSignature('order_FAKE00000001', 'pay_FAKE00000001') },
      })
      assert.equal(verify.status, 400)
      assert.equal((await h.t.call('GET', `/api/payments/orders/${ref}`)).status, 404)
    }
    const webhook = await h.t.sendWebhook('payment.captured', {
      id: 'pay_FAKE00000002', order_id: grant.grantRef, amount: 49900, currency: 'INR', status: 'captured', method: 'upi', error_code: null,
    })
    assert.equal(webhook.status, 200)
    assert.equal(h.t.count('orders') + h.t.count('payments'), 0)
    assert.equal(h.t.sqlite.prepare("SELECT COUNT(*) AS n FROM webhook_events WHERE status = 'processed'").get()!.n, 0)
    const sources = h.t.sqlite.prepare('SELECT DISTINCT source FROM access_grants ORDER BY source').all().map((r) => (r as { source: string }).source)
    assert.deepEqual(sources, ['admin_grant', 'promo_grant'])
  })

  it('rejects client-supplied grant fields', async () => {
    const h = await harness()
    const { code } = await h.createCode()
    assert.equal((await h.t.call('POST', '/api/payments/grants/redeem', { body: { code, source: 'admin_grant' } })).status, 400)
    assert.equal((await h.t.call('POST', '/api/payments/grants/admin', { body: { passToken: 'x'.repeat(43), mode: 'live' } })).status, 400)
  })
})

describe('migration 0004', () => {
  it('rebuilds client_invoices without losing existing paid-order follow-ups', () => {
    const sqlite = new DatabaseSync(':memory:')
    const dir = fileURLToPath(import.meta.resolve('../migrations/'))
    const files = readdirSync(dir).filter((name) => name.endsWith('.sql')).sort()
    for (const file of files.filter((f) => f < '0004')) sqlite.exec(readFileSync(`${dir}/${file}`, 'utf8'))
    sqlite.exec(`
      INSERT INTO orders (id, product_id, amount_paise, currency, mode, razorpay_order_id, status, created_at, updated_at, access_token_hash, document_key, export_count)
        VALUES ('IP-AAAAAAAAAAAAAAAAAAAA', 'invoice-pack', 49900, 'INR', 'live', 'order_LIVE00000001', 'paid', 't', 't', 'h', 'd', 3);
      INSERT INTO client_invoices (id, order_id, manage_token_hash, mode, business_name, client_name, client_email, invoice_number, amount_paise,
          currency, invoice_date, due_date, second_delay_days, third_delay_days, reminders_enabled, consent_at, created_at, updated_at)
        VALUES ('FU-AAAAAAAAAAAAAAAAAAAA', 'IP-AAAAAAAAAAAAAAAAAAAA', 'm', 'live', 'Asha', 'Acme', 'a@acme.example', 'INV-1', 100, 'INR',
          '2026-11-01', '2026-11-16', 7, 14, 1, 't', 't', 't');
      INSERT INTO client_reminders (id, invoice_id, stage, subject, body, status, due_at, next_attempt_at, updated_at)
        VALUES ('FU-AAAAAAAAAAAAAAAAAAAA-1', 'FU-AAAAAAAAAAAAAAAAAAAA', 1, 's', 'b', 'sent', 't', 't', 't');
      INSERT INTO client_reminder_events (invoice_id, stage, event, at) VALUES ('FU-AAAAAAAAAAAAAAAAAAAA', 1, 'sent', 't');
    `)
    // D1 applies each migration inside a transaction.
    sqlite.exec(`BEGIN; ${readFileSync(`${dir}/${files.find((f) => f.startsWith('0004'))}`, 'utf8')} COMMIT;`)
    const invoice = sqlite.prepare('SELECT * FROM client_invoices').get() as Record<string, unknown>
    assert.equal(invoice.order_id, 'IP-AAAAAAAAAAAAAAAAAAAA')
    assert.equal(invoice.grant_id, null)
    assert.equal(invoice.client_email, 'a@acme.example')
    assert.equal(invoice.reminders_enabled, 1)
    assert.equal((sqlite.prepare('SELECT COUNT(*) AS n FROM client_reminders').get() as { n: number }).n, 1)
    assert.equal((sqlite.prepare('SELECT COUNT(*) AS n FROM client_reminder_events').get() as { n: number }).n, 1)
    assert.deepEqual(sqlite.prepare('PRAGMA foreign_key_check').all(), [])
    const order = sqlite.prepare('SELECT status, export_count FROM orders').get() as Record<string, unknown>
    assert.deepEqual({ ...order }, { status: 'paid', export_count: 3 })
    assert.throws(() =>
      sqlite.exec(`INSERT INTO client_invoices (id, manage_token_hash, mode, business_name, client_name, invoice_number, amount_paise, currency,
        invoice_date, due_date, second_delay_days, third_delay_days, reminders_enabled, consent_at, created_at, updated_at)
        VALUES ('FU-B', 'm', 'live', 'a', 'b', 'c', 1, 'INR', 'd', 'e', 7, 14, 1, 't', 't', 't')`),
    )
  })
})
