import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { DEMO_RECEIPT, buildPack, buildReceipt, examplePack } from '../../src/invoice-pack/logic.ts'
import { finalTitle, renderReceipt } from '../src/render.ts'
import { checkoutSignature, setup } from './helpers.ts'

type T = ReturnType<typeof setup>

async function paidOrder(t: T, productId: 'invoice-pack' | 'advance-receipt' = 'invoice-pack') {
  const order = await t.createOrder(productId)
  const payment = t.razorpay.addPayment(order.razorpayOrderId)
  const res = await t.call('POST', '/api/payments/verify', {
    body: {
      orderRef: order.orderRef,
      razorpay_order_id: order.razorpayOrderId,
      razorpay_payment_id: payment.id,
      razorpay_signature: await checkoutSignature(order.razorpayOrderId, payment.id),
    },
  })
  assert.equal(res.json.status, 'paid')
  return order
}

function exportInvoice(t: T, order: { orderRef: string; accessToken: string }, input: unknown = examplePack()) {
  return t.call('POST', '/api/payments/exports/invoice', { body: { orderRef: order.orderRef, accessToken: order.accessToken, input } })
}

describe('protected exports', () => {
  it('issues a per-order secret and stores only its hash', async () => {
    const t = setup()
    const order = await t.createOrder('invoice-pack')
    assert.match(order.accessToken, /^[A-Za-z0-9_-]{43}$/)
    const row = t.orderRow(order.orderRef)
    assert.match(String(row?.access_token_hash), /^[0-9a-f]{64}$/)
    assert.ok(!JSON.stringify(row).includes(order.accessToken))
  })

  it('exports the final invoice for a paid order', async () => {
    const t = setup()
    const order = await paidOrder(t)
    const res = await exportInvoice(t, order)
    assert.equal(res.status, 200)
    assert.match(res.json.html, /^<!doctype html>/)
    assert.ok(res.json.html.includes('Balance due'))
    assert.ok(!/DRAFT|DEMO/.test(res.json.html.replace(/<style>[\s\S]*?<\/style>/, '')))
    assert.match(res.json.filename, /^invoice-[A-Za-z0-9-]+\.html$/)
    assert.equal(res.json.exportsUsed, 1)
    assert.equal(res.json.exportsLimit, 20)
  })

  it('refuses unpaid, cancelled, and failed orders', async () => {
    const t = setup()
    const order = await t.createOrder('invoice-pack')
    assert.equal((await exportInvoice(t, order)).status, 402)
    const failed = t.razorpay.addPayment(order.razorpayOrderId, { status: 'failed' })
    await t.sendWebhook('payment.failed', failed, { eventId: 'evt_f' })
    const res = await exportInvoice(t, order)
    assert.equal(res.status, 402)
    assert.equal(res.json.error.code, 'payment_required')
    assert.equal(t.orderRow(order.orderRef)?.export_count, 0)
  })

  it('requires the secret: an order reference alone or a wrong secret is not enough', async () => {
    const t = setup()
    const order = await paidOrder(t)
    const other = await paidOrder(t)
    for (const accessToken of [undefined, '', 'x'.repeat(43), other.accessToken]) {
      const res = await t.call('POST', '/api/payments/exports/invoice', { body: { orderRef: order.orderRef, accessToken, input: examplePack() } })
      assert.equal(res.status, 403, String(accessToken))
      assert.equal(res.json.error.code, 'not_entitled')
    }
    const unknown = await t.call('POST', '/api/payments/exports/invoice', {
      body: { orderRef: 'IP-AAAAAAAAAAAAAAAAAAAA', accessToken: order.accessToken, input: examplePack() },
    })
    assert.equal(unknown.status, 403)
  })

  it('rejects client-asserted entitlement fields', async () => {
    const t = setup()
    const order = await t.createOrder('invoice-pack')
    const res = await t.call('POST', '/api/payments/exports/invoice', {
      body: { orderRef: order.orderRef, accessToken: order.accessToken, input: examplePack(), status: 'paid' },
    })
    assert.equal(res.status, 400)
  })

  it('does not let one product unlock the other', async () => {
    const t = setup()
    const receiptOrder = await paidOrder(t, 'advance-receipt')
    const res = await exportInvoice(t, receiptOrder)
    assert.equal(res.status, 403)
    assert.equal(res.json.error.code, 'wrong_product')
  })

  it('does not honour test-mode payments once live keys are configured', async () => {
    const t = setup()
    const order = await paidOrder(t)
    t.env.RAZORPAY_KEY_ID = 'rzp_live_LIVEKEY000001'
    const res = await exportInvoice(t, order)
    assert.equal(res.status, 403)
  })

  it('binds an order to one invoice number but allows corrections to it', async () => {
    const t = setup()
    const order = await paidOrder(t)
    const first = examplePack()
    assert.equal((await exportInvoice(t, order, first)).status, 200)

    const corrected = { ...first, clientAddress: 'Corrected address, Pune' }
    assert.equal((await exportInvoice(t, order, corrected)).status, 200)

    const different = { ...first, invoiceNumber: 'INV-999' }
    const res = await exportInvoice(t, order, different)
    assert.equal(res.status, 409)
    assert.equal(res.json.error.code, 'document_mismatch')
    assert.equal(t.orderRow(order.orderRef)?.export_count, 2)
    assert.match(String(t.orderRow(order.orderRef)?.document_key), /^[0-9a-f]{64}$/)
  })

  it('binds only one document under concurrent exports', async () => {
    const t = setup()
    const order = await paidOrder(t)
    const results = await Promise.all(
      ['INV-A1', 'INV-B2', 'INV-C3'].map((invoiceNumber) => exportInvoice(t, order, { ...examplePack(), invoiceNumber })),
    )
    assert.equal(results.filter((r) => r.status === 200).length, 1)
    assert.equal(results.filter((r) => r.status === 409).length, 2)
  })

  it('caps exports per order', async () => {
    const t = setup()
    const order = await paidOrder(t)
    t.sqlite.prepare('UPDATE orders SET export_count = 20 WHERE id = ?').run(order.orderRef)
    const res = await exportInvoice(t, order)
    assert.equal(res.status, 429)
    assert.equal(res.json.error.code, 'export_limit')
  })

  it('recomputes totals on the server and ignores injected fields', async () => {
    const t = setup()
    const order = await paidOrder(t)
    const input = { ...examplePack(), balance: 1, taxable: 1, lines: [{ description: 'Design work', amount: '10000' }], gstRegistered: false }
    const res = await exportInvoice(t, order, input)
    assert.equal(res.status, 200)
    assert.ok(res.json.html.includes('10,000.00'), 'server-computed amount appears')
    assert.ok(!res.json.html.includes('₹1.00'))
  })

  it('escapes user content in the exported HTML', async () => {
    const t = setup()
    const order = await paidOrder(t)
    const res = await exportInvoice(t, order, { ...examplePack(), supplierName: '<script>alert(1)</script>', remarks: '"><img src=x onerror=alert(1)>' })
    assert.equal(res.status, 200)
    assert.ok(!res.json.html.includes('<script>'))
    assert.ok(!res.json.html.includes('<img'))
    assert.ok(res.json.html.includes('&lt;script&gt;alert(1)&lt;/script&gt;'))
  })

  it('returns validation errors without consuming an export', async () => {
    const t = setup()
    const order = await paidOrder(t)
    const incomplete = await exportInvoice(t, order, { ...examplePack(), supplierName: '' })
    assert.equal(incomplete.status, 422)
    assert.ok(Array.isArray(incomplete.json.error.details) && incomplete.json.error.details.length > 0)
    const oversized = await exportInvoice(t, order, { ...examplePack(), remarks: 'x'.repeat(500) })
    assert.equal(oversized.status, 400)
    const badLines = await exportInvoice(t, order, { ...examplePack(), lines: 'nope' })
    assert.equal(badLines.status, 400)
    assert.equal(t.orderRow(order.orderRef)?.export_count, 0)
    assert.equal(t.orderRow(order.orderRef)?.document_key, null)
  })

  it('exports an advance receipt bound to its client', async () => {
    const t = setup()
    const order = await paidOrder(t, 'advance-receipt')
    const body = (input: unknown) => ({ orderRef: order.orderRef, accessToken: order.accessToken, input })
    const res = await t.call('POST', '/api/payments/exports/receipt', { body: body(DEMO_RECEIPT) })
    assert.equal(res.status, 200)
    assert.ok(res.json.html.includes('Advance received'))
    assert.match(res.json.filename, /^advance-receipt-/)
    const sameClient = await t.call('POST', '/api/payments/exports/receipt', { body: body({ ...DEMO_RECEIPT, client: `  ${DEMO_RECEIPT.client?.toUpperCase()} ` }) })
    assert.equal(sameClient.status, 200)
    const otherClient = await t.call('POST', '/api/payments/exports/receipt', { body: body({ ...DEMO_RECEIPT, client: 'Someone Else' }) })
    assert.equal(otherClient.status, 409)
  })
})

describe('paid export titles', () => {
  const kicker = (html: string) => html.match(/<p class="kicker">([^<]*)<\/p>/)?.[1]

  it('drops only a trailing draft suffix', () => {
    assert.equal(finalTitle('Invoice (draft)'), 'Invoice')
    assert.equal(finalTitle('Tax invoice (draft)'), 'Tax invoice')
    assert.equal(finalTitle('Tax invoice (DRAFT) '), 'Tax invoice')
    assert.equal(finalTitle('Invoice'), 'Invoice')
    assert.equal(finalTitle('Tax invoice'), 'Tax invoice')
    assert.equal(finalTitle('Draft invoice'), 'Draft invoice')
    assert.equal(finalTitle('(draft)'), '(draft)')
  })

  it('renders "Tax invoice" for a GST-registered export and keeps the disclaimers', async () => {
    const t = setup()
    const pack = buildPack(examplePack())
    assert.equal(pack.invoice?.title, 'Tax invoice (draft)')
    const res = await exportInvoice(t, await paidOrder(t))
    assert.equal(res.status, 200)
    assert.equal(kicker(res.json.html), 'Tax invoice')
    assert.ok(!/\(draft\)/i.test(res.json.html))
    assert.ok(res.json.html.includes('Not filed on the GST portal, and not tax advice.'))
    assert.equal(pack.invoice?.title, 'Tax invoice (draft)')
  })

  it('renders "Invoice" for an unregistered export', async () => {
    const t = setup()
    const input = { ...examplePack(), gstRegistered: false }
    assert.equal(buildPack(input).invoice?.title, 'Invoice (draft)')
    const res = await exportInvoice(t, await paidOrder(t), input)
    assert.equal(res.status, 200)
    assert.equal(kicker(res.json.html), 'Invoice')
    assert.ok(res.json.html.includes('Not filed on the GST portal, and not tax advice.'))
  })

  it('leaves the advance receipt wording unchanged', async () => {
    const t = setup()
    const order = await paidOrder(t, 'advance-receipt')
    const res = await t.call('POST', '/api/payments/exports/receipt', {
      body: { orderRef: order.orderRef, accessToken: order.accessToken, input: DEMO_RECEIPT },
    })
    assert.equal(res.status, 200)
    const built = buildReceipt(DEMO_RECEIPT)
    assert.ok(built.receipt)
    assert.equal(res.json.html, renderReceipt(built.receipt, built.message, order.orderRef))
    assert.equal(kicker(res.json.html), 'Advance receipt')
    assert.ok(
      res.json.html.includes('A receipt for the advance stated above. Not a contract, not a tax invoice, and not legal or tax advice.'),
    )
  })
})
