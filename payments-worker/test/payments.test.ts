import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { checkoutSignature, KEY_ID, KEY_SECRET, setup, WEBHOOK_SECRET } from './helpers.ts'

async function paidCheckout(t: ReturnType<typeof setup>, productId: 'invoice-pack' | 'advance-receipt' = 'invoice-pack') {
  const order = await t.createOrder(productId)
  const payment = t.razorpay.addPayment(order.razorpayOrderId)
  const body = {
    orderRef: order.orderRef,
    razorpay_order_id: order.razorpayOrderId,
    razorpay_payment_id: payment.id,
    razorpay_signature: await checkoutSignature(order.razorpayOrderId, payment.id),
  }
  return { order, payment, body }
}

describe('create-order', () => {
  it('creates a ₹499 Invoice Pack order priced on the server', async () => {
    const t = setup()
    const res = await t.call('POST', '/api/payments/create-order', { body: { productId: 'invoice-pack' } })
    assert.equal(res.status, 201)
    assert.equal(res.json.amount, 49900)
    assert.equal(res.json.currency, 'INR')
    assert.equal(res.json.keyId, KEY_ID)
    assert.match(res.json.orderRef, /^IP-[A-Z2-9]{20}$/)
    assert.match(res.json.razorpayOrderId, /^order_/)

    const sent = t.razorpay.requests.find((r) => r.path === '/v1/orders')
    assert.deepEqual(sent?.body, {
      amount: 49900,
      currency: 'INR',
      receipt: res.json.orderRef,
      notes: { order_ref: res.json.orderRef, product_id: 'invoice-pack' },
    })
    const row = t.orderRow(res.json.orderRef)
    assert.equal(row?.amount_paise, 49900)
    assert.equal(row?.status, 'created')
    assert.equal(row?.mode, 'test')
    assert.equal(row?.razorpay_order_id, res.json.razorpayOrderId)
  })

  it('creates a ₹399 Advance Receipt order priced on the server', async () => {
    const t = setup()
    const res = await t.call('POST', '/api/payments/create-order', { body: { productId: 'advance-receipt' } })
    assert.equal(res.status, 201)
    assert.equal(res.json.amount, 39900)
    assert.match(res.json.orderRef, /^AR-/)
    assert.equal(t.razorpay.requests[0].body && (t.razorpay.requests[0].body as { amount: number }).amount, 39900)
    assert.equal(t.orderRow(res.json.orderRef)?.amount_paise, 39900)
  })

  it('rejects client-supplied amounts and never contacts Razorpay', async () => {
    const t = setup()
    for (const body of [
      { productId: 'invoice-pack', amount: 100 },
      { productId: 'invoice-pack', amount: 49900, currency: 'USD' },
      { amount: 1 },
    ]) {
      const res = await t.call('POST', '/api/payments/create-order', { body })
      assert.equal(res.status, 400, JSON.stringify(body))
    }
    assert.equal(t.razorpay.requests.length, 0)
    assert.equal(t.count('orders'), 0)
  })

  it('rejects unknown products, prototype keys, and non-JSON bodies', async () => {
    const t = setup()
    for (const productId of ['invoice-pack-free', 'toString', '__proto__', 499, null]) {
      const res = await t.call('POST', '/api/payments/create-order', { body: { productId } })
      assert.equal(res.status, 400)
      assert.equal(res.json.error.code, 'unknown_product')
    }
    const form = await t.call('POST', '/api/payments/create-order', { rawBody: 'productId=invoice-pack', headers: { 'Content-Type': 'application/x-www-form-urlencoded' } })
    assert.equal(form.status, 415)
    const big = await t.call('POST', '/api/payments/create-order', { body: { productId: 'x'.repeat(10_000) } })
    assert.equal(big.status, 413)
  })

  it('stops reading oversized bodies that declare no Content-Length', async () => {
    const t = setup()
    const chunk = new TextEncoder().encode('x'.repeat(1024))
    let pulled = 0
    const stream = new ReadableStream<Uint8Array>({
      pull(controller) {
        pulled += 1
        if (pulled > 1000) controller.close()
        else controller.enqueue(chunk)
      },
    })
    const { createHandler } = await import('../src/index.ts')
    const response = await createHandler(t.razorpay.fetch)(
      new Request('https://payments.example.com/api/payments/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Razorpay-Signature': '0'.repeat(64) },
        body: stream,
        duplex: 'half',
      } as RequestInit),
      t.env,
    )
    assert.equal(response.status, 413)
    assert.ok(pulled < 300, `read ${pulled} KiB before stopping`)
  })

  it('returns a generic 502 when Razorpay is unavailable and stores nothing', async () => {
    const t = setup()
    t.razorpay.failNextWith = 500
    const res = await t.call('POST', '/api/payments/create-order', { body: { productId: 'invoice-pack' } })
    assert.equal(res.status, 502)
    assert.equal(res.json.error.code, 'payment_provider_unavailable')
    assert.equal(t.count('orders'), 0)
  })

  it('refuses to run without secrets configured', async () => {
    const t = setup()
    t.env.RAZORPAY_KEY_SECRET = ''
    const res = await t.call('POST', '/api/payments/create-order', { body: { productId: 'invoice-pack' } })
    assert.equal(res.status, 503)
  })
})

describe('verify', () => {
  it('rejects an invalid signature and leaves the order unpaid', async () => {
    const t = setup()
    const { order, body } = await paidCheckout(t)
    const forged = await checkoutSignature(order.razorpayOrderId, body.razorpay_payment_id, 'wrong-secret')
    const res = await t.call('POST', '/api/payments/verify', { body: { ...body, razorpay_signature: forged } })
    assert.equal(res.status, 400)
    assert.equal(res.json.error.code, 'invalid_signature')
    assert.equal(t.orderRow(order.orderRef)?.status, 'created')
    assert.equal(t.count('payments'), 0)
  })

  it('marks the order paid only after a valid signature and a matching captured payment', async () => {
    const t = setup()
    const { order, payment, body } = await paidCheckout(t)
    const res = await t.call('POST', '/api/payments/verify', { body })
    assert.equal(res.status, 200)
    assert.equal(res.json.status, 'paid')
    assert.equal(res.json.razorpayPaymentId, payment.id)
    assert.equal(res.json.alreadyVerified, false)
    const row = t.orderRow(order.orderRef)
    assert.equal(row?.status, 'paid')
    assert.equal(row?.razorpay_payment_id, payment.id)
    assert.ok(row?.paid_at)
    assert.equal(t.count('payments'), 1)
  })

  it('rejects a payment for a different order id', async () => {
    const t = setup()
    const first = await paidCheckout(t)
    const other = await t.createOrder('invoice-pack')
    const wrongOrderId = await t.call('POST', '/api/payments/verify', { body: { ...first.body, razorpay_order_id: other.razorpayOrderId } })
    assert.equal(wrongOrderId.status, 400)
    assert.equal(wrongOrderId.json.error.code, 'order_mismatch')

    // A correctly signed payment for order B cannot be replayed against order A.
    const otherPayment = t.razorpay.addPayment(other.razorpayOrderId)
    const replay = await t.call('POST', '/api/payments/verify', {
      body: {
        orderRef: first.order.orderRef,
        razorpay_order_id: first.order.razorpayOrderId,
        razorpay_payment_id: otherPayment.id,
        razorpay_signature: await checkoutSignature(other.razorpayOrderId, otherPayment.id),
      },
    })
    assert.equal(replay.status, 400)
    assert.equal(t.orderRow(first.order.orderRef)?.status, 'created')
  })

  it('rejects a payment whose amount or currency does not match the order', async () => {
    const t = setup()
    for (const overrides of [{ amount: 100 }, { currency: 'USD' }]) {
      const order = await t.createOrder('invoice-pack')
      const payment = t.razorpay.addPayment(order.razorpayOrderId, overrides)
      const res = await t.call('POST', '/api/payments/verify', {
        body: {
          orderRef: order.orderRef,
          razorpay_order_id: order.razorpayOrderId,
          razorpay_payment_id: payment.id,
          razorpay_signature: await checkoutSignature(order.razorpayOrderId, payment.id),
        },
      })
      assert.equal(res.status, 400)
      assert.equal(res.json.error.code, 'payment_mismatch')
      assert.equal(t.orderRow(order.orderRef)?.status, 'created')
    }
    assert.equal(t.count('payments'), 0)
  })

  it('is idempotent for duplicate verification requests', async () => {
    const t = setup()
    const { order, body } = await paidCheckout(t)
    const results = await Promise.all([1, 2, 3].map(() => t.call('POST', '/api/payments/verify', { body })))
    for (const res of results) assert.equal(res.json.status, 'paid')
    const again = await t.call('POST', '/api/payments/verify', { body })
    assert.equal(again.status, 200)
    assert.equal(again.json.alreadyVerified, true)
    assert.equal(t.count('payments'), 1)
    assert.equal(t.orderRow(order.orderRef)?.status, 'paid')
  })

  it('refuses a second payment against an already paid order', async () => {
    const t = setup()
    const { order, body } = await paidCheckout(t)
    await t.call('POST', '/api/payments/verify', { body })
    const second = t.razorpay.addPayment(order.razorpayOrderId)
    const res = await t.call('POST', '/api/payments/verify', {
      body: { ...body, razorpay_payment_id: second.id, razorpay_signature: await checkoutSignature(order.razorpayOrderId, second.id) },
    })
    assert.equal(res.status, 409)
    assert.equal(t.orderRow(order.orderRef)?.razorpay_payment_id, body.razorpay_payment_id)
  })

  it('keeps an authorized payment as processing until it is captured', async () => {
    const t = setup()
    const order = await t.createOrder('advance-receipt')
    const payment = t.razorpay.addPayment(order.razorpayOrderId, { status: 'authorized' })
    const res = await t.call('POST', '/api/payments/verify', {
      body: {
        orderRef: order.orderRef,
        razorpay_order_id: order.razorpayOrderId,
        razorpay_payment_id: payment.id,
        razorpay_signature: await checkoutSignature(order.razorpayOrderId, payment.id),
      },
    })
    assert.equal(res.json.status, 'processing')
    assert.equal(t.orderRow(order.orderRef)?.status, 'authorized')

    payment.status = 'captured'
    const status = await t.call('GET', `/api/payments/orders/${order.orderRef}`)
    assert.equal(status.json.status, 'paid')
    assert.equal(t.orderRow(order.orderRef)?.status, 'paid')
  })

  it('rejects malformed payment details and unknown orders', async () => {
    const t = setup()
    const { body } = await paidCheckout(t)
    const malformed = await t.call('POST', '/api/payments/verify', { body: { ...body, razorpay_signature: 'abc' } })
    assert.equal(malformed.status, 400)
    const extra = await t.call('POST', '/api/payments/verify', { body: { ...body, status: 'paid' } })
    assert.equal(extra.status, 400)
    const unknown = await t.call('POST', '/api/payments/verify', { body: { ...body, orderRef: 'IP-AAAAAAAAAAAAAAAAAAAA' } })
    assert.equal(unknown.status, 404)
  })
})

describe('failed and cancelled payments', () => {
  it('leaves a cancelled checkout pending and unpaid', async () => {
    const t = setup()
    const order = await t.createOrder('invoice-pack')
    // The customer closed the popup: Razorpay returns no payment id or signature, so nothing can be verified.
    const res = await t.call('POST', '/api/payments/verify', { body: { orderRef: order.orderRef, razorpay_order_id: order.razorpayOrderId } })
    assert.equal(res.status, 400)
    const status = await t.call('GET', `/api/payments/orders/${order.orderRef}`)
    assert.equal(status.json.status, 'pending')
    assert.equal(status.json.razorpayPaymentId, null)
  })

  it('records a failed payment and still accepts a successful retry on the same order', async () => {
    const t = setup()
    const order = await t.createOrder('invoice-pack')
    const failed = t.razorpay.addPayment(order.razorpayOrderId, { status: 'failed', error_code: 'BAD_REQUEST_ERROR' })
    await t.sendWebhook('payment.failed', failed, { eventId: 'evt_failed_1' })
    assert.equal((await t.call('GET', `/api/payments/orders/${order.orderRef}`)).json.status, 'failed')

    const retry = t.razorpay.addPayment(order.razorpayOrderId)
    const res = await t.call('POST', '/api/payments/verify', {
      body: {
        orderRef: order.orderRef,
        razorpay_order_id: order.razorpayOrderId,
        razorpay_payment_id: retry.id,
        razorpay_signature: await checkoutSignature(order.razorpayOrderId, retry.id),
      },
    })
    assert.equal(res.json.status, 'paid')
    assert.equal(t.count('payments'), 2)
  })
})

describe('http hardening', () => {
  it('allows only configured origins', async () => {
    const t = setup()
    const blocked = await t.call('POST', '/api/payments/create-order', { body: { productId: 'invoice-pack' }, headers: { Origin: 'https://evil.example' } })
    assert.equal(blocked.status, 403)
    assert.equal(blocked.headers.get('Access-Control-Allow-Origin'), null)

    const preflight = await t.call('OPTIONS', '/api/payments/create-order')
    assert.equal(preflight.status, 204)
    assert.equal(preflight.headers.get('Access-Control-Allow-Origin'), 'https://buildwsai.online')
    assert.equal(preflight.headers.get('Access-Control-Allow-Credentials'), null)
  })

  it('returns 429 when the rate limiter rejects a client', async () => {
    const t = setup({ limiter: { limit: async () => ({ success: false }) } })
    const res = await t.call('POST', '/api/payments/create-order', { body: { productId: 'invoice-pack' } })
    assert.equal(res.status, 429)
    assert.equal(t.razorpay.requests.length, 0)
  })

  it('never returns secrets in any response', async () => {
    const t = setup()
    const { body } = await paidCheckout(t)
    await t.call('POST', '/api/payments/verify', { body })
    await t.call('POST', '/api/payments/verify', { body: { ...body, razorpay_signature: '0'.repeat(64) } })
    await t.call('GET', '/api/payments/health')
    for (const text of t.responses) {
      assert.ok(!text.includes(KEY_SECRET))
      assert.ok(!text.includes(WEBHOOK_SECRET))
    }
  })

  it('reports health without leaking configuration', async () => {
    const t = setup()
    const res = await t.call('GET', '/api/payments/health')
    assert.deepEqual(res.json, { ok: true, configured: true })
    const missing = await t.call('GET', '/api/payments/nope')
    assert.equal(missing.status, 404)
  })
})
