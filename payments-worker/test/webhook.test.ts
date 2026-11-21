import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { checkoutSignature, setup } from './helpers.ts'

describe('webhook', () => {
  it('rejects an invalid signature without storing or changing anything', async () => {
    const t = setup()
    const order = await t.createOrder('invoice-pack')
    const payment = t.razorpay.addPayment(order.razorpayOrderId)
    const res = await t.sendWebhook('payment.captured', payment, { eventId: 'evt_bad', secret: 'not-the-secret' })
    assert.equal(res.status, 401)
    assert.equal(t.count('webhook_events'), 0)
    assert.equal(t.orderRow(order.orderRef)?.status, 'created')

    const unsigned = await t.call('POST', '/api/payments/webhook', { rawBody: '{"event":"payment.captured"}', headers: { 'Content-Type': 'application/json' } })
    assert.equal(unsigned.status, 401)
  })

  it('marks an order paid from payment.captured even if the browser never verified', async () => {
    const t = setup()
    const order = await t.createOrder('advance-receipt')
    const payment = t.razorpay.addPayment(order.razorpayOrderId)
    const res = await t.sendWebhook('payment.captured', payment, { eventId: 'evt_cap_1' })
    assert.equal(res.status, 200)
    assert.equal(res.json.status, 'processed')
    assert.equal(t.orderRow(order.orderRef)?.status, 'paid')
    const event = t.sqlite.prepare('SELECT * FROM webhook_events WHERE event_id = ?').get('evt_cap_1') as Record<string, unknown>
    assert.equal(event.status, 'processed')
    assert.equal(event.event_type, 'payment.captured')
  })

  it('ignores duplicate deliveries of the same event', async () => {
    const t = setup()
    const order = await t.createOrder('invoice-pack')
    const payment = t.razorpay.addPayment(order.razorpayOrderId)
    await t.sendWebhook('payment.captured', payment, { eventId: 'evt_dup' })
    const again = await t.sendWebhook('payment.captured', payment, { eventId: 'evt_dup' })
    assert.equal(again.status, 200)
    assert.equal(again.json.duplicate, true)
    assert.equal(t.count('webhook_events'), 1)
    assert.equal(t.count('payments'), 1)
  })

  it('reconciles order.paid, payment.captured, and verify without duplicate ledger entries', async () => {
    const t = setup()
    const order = await t.createOrder('invoice-pack')
    const payment = t.razorpay.addPayment(order.razorpayOrderId)
    await t.sendWebhook('order.paid', payment, { eventId: 'evt_order_paid' })
    await t.sendWebhook('payment.captured', payment, { eventId: 'evt_captured' })
    const verify = await t.call('POST', '/api/payments/verify', {
      body: {
        orderRef: order.orderRef,
        razorpay_order_id: order.razorpayOrderId,
        razorpay_payment_id: payment.id,
        razorpay_signature: await checkoutSignature(order.razorpayOrderId, payment.id),
      },
    })
    assert.equal(verify.json.status, 'paid')
    assert.equal(verify.json.alreadyVerified, true)
    assert.equal(t.count('payments'), 1)
    assert.equal(t.count('webhook_events'), 2)
  })

  it('never downgrades a paid order when a late payment.failed arrives', async () => {
    const t = setup()
    const order = await t.createOrder('invoice-pack')
    const failedAttempt = t.razorpay.addPayment(order.razorpayOrderId, { status: 'failed', error_code: 'GATEWAY_ERROR' })
    const captured = t.razorpay.addPayment(order.razorpayOrderId)
    await t.sendWebhook('payment.captured', captured, { eventId: 'evt_a' })
    await t.sendWebhook('payment.failed', failedAttempt, { eventId: 'evt_b' })
    await t.sendWebhook('payment.failed', { ...captured, status: 'failed' }, { eventId: 'evt_c' })
    const row = t.orderRow(order.orderRef)
    assert.equal(row?.status, 'paid')
    assert.equal(row?.razorpay_payment_id, captured.id)
    const ledger = t.sqlite.prepare('SELECT status FROM payments WHERE razorpay_payment_id = ?').get(captured.id) as { status: string }
    assert.equal(ledger.status, 'captured')
  })

  it('keeps the first captured payment when a second capture arrives for a paid order', async () => {
    const t = setup()
    const order = await t.createOrder('invoice-pack')
    const first = t.razorpay.addPayment(order.razorpayOrderId)
    const second = t.razorpay.addPayment(order.razorpayOrderId)
    await t.sendWebhook('payment.captured', first, { eventId: 'evt_first' })
    const res = await t.sendWebhook('payment.captured', second, { eventId: 'evt_second' })
    assert.equal(res.status, 200)
    const row = t.orderRow(order.orderRef)
    assert.equal(row?.razorpay_payment_id, first.id)
    assert.equal(row?.status, 'paid')
    const note = t.sqlite.prepare('SELECT note FROM webhook_events WHERE event_id = ?').get('evt_second') as { note: string }
    assert.equal(note.note, 'conflict')
  })

  it('marks an order failed from payment.failed', async () => {
    const t = setup()
    const order = await t.createOrder('advance-receipt')
    const failed = t.razorpay.addPayment(order.razorpayOrderId, { status: 'failed', error_code: 'BAD_REQUEST_ERROR' })
    const res = await t.sendWebhook('payment.failed', failed, { eventId: 'evt_fail' })
    assert.equal(res.json.status, 'processed')
    const row = t.orderRow(order.orderRef)
    assert.equal(row?.status, 'failed')
    assert.equal(row?.failure_code, 'BAD_REQUEST_ERROR')
  })

  it('ignores events for unknown orders, mismatched amounts, and unhandled types', async () => {
    const t = setup()
    const order = await t.createOrder('invoice-pack')
    const stranger = t.razorpay.addPayment('order_UNKNOWN00000001', { amount: 49900, currency: 'INR' })
    assert.equal((await t.sendWebhook('payment.captured', stranger, { eventId: 'evt_u' })).json.status, 'ignored')

    const cheap = t.razorpay.addPayment(order.razorpayOrderId, { amount: 100 })
    assert.equal((await t.sendWebhook('payment.captured', cheap, { eventId: 'evt_m' })).json.status, 'ignored')
    assert.equal(t.orderRow(order.orderRef)?.status, 'created')

    const authorized = t.razorpay.addPayment(order.razorpayOrderId, { status: 'authorized' })
    assert.equal((await t.sendWebhook('payment.authorized', authorized, { eventId: 'evt_x' })).json.status, 'ignored')
    assert.equal(t.count('payments'), 0)
  })

  it('reprocesses an event that previously failed when Razorpay retries it', async () => {
    const t = setup()
    const order = await t.createOrder('invoice-pack')
    const payment = t.razorpay.addPayment(order.razorpayOrderId)
    t.sqlite
      .prepare(`INSERT INTO webhook_events (event_id, event_type, status, received_at) VALUES ('evt_retry', 'payment.captured', 'failed', '2026-01-01T00:00:00Z')`)
      .run()
    const res = await t.sendWebhook('payment.captured', payment, { eventId: 'evt_retry' })
    assert.equal(res.json.status, 'processed')
    const event = t.sqlite.prepare('SELECT status, attempts FROM webhook_events WHERE event_id = ?').get('evt_retry') as Record<string, unknown>
    assert.equal(event.status, 'processed')
    assert.equal(event.attempts, 2)
    assert.equal(t.orderRow(order.orderRef)?.status, 'paid')
  })

  it('deduplicates by body hash when the event id header is missing', async () => {
    const t = setup()
    const order = await t.createOrder('invoice-pack')
    const payment = t.razorpay.addPayment(order.razorpayOrderId)
    await t.sendWebhook('payment.captured', payment)
    const again = await t.sendWebhook('payment.captured', payment)
    assert.equal(again.json.duplicate, true)
    assert.equal(t.count('webhook_events'), 1)
  })
})
