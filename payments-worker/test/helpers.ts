import { readFileSync } from 'node:fs'
import { DatabaseSync, type SQLInputValue } from 'node:sqlite'
import { fileURLToPath } from 'node:url'
import { hmacSha256Hex } from '../src/crypto.ts'
import type { Env, RateLimiter } from '../src/env.ts'
import { createHandler } from '../src/index.ts'
import type { RazorpayPayment } from '../src/razorpay.ts'

export const KEY_ID = 'rzp_test_TESTKEY123456'
export const KEY_SECRET = 'test-key-secret-do-not-use'
export const WEBHOOK_SECRET = 'test-webhook-secret'
export const ORIGIN = 'https://buildwsai.online'

// Implements the subset of the D1 API the worker uses, on a real SQLite database.
export function createD1(): { d1: D1Database; sqlite: DatabaseSync } {
  const sqlite = new DatabaseSync(':memory:')
  sqlite.exec(readFileSync(fileURLToPath(import.meta.resolve('../migrations/0001_init.sql')), 'utf8'))
  const prepare = (sql: string) => {
    let params: SQLInputValue[] = []
    const statement = {
      bind(...values: unknown[]) {
        params = values as SQLInputValue[]
        return statement
      },
      async run() {
        const result = sqlite.prepare(sql).run(...params)
        return { success: true, meta: { changes: Number(result.changes) } }
      },
      async first<T>() {
        const row = sqlite.prepare(sql).get(...params)
        return (row ? { ...row } : null) as T | null
      },
      async all<T>() {
        return { success: true, results: sqlite.prepare(sql).all(...params).map((row) => ({ ...row })) as T[] }
      },
    }
    return statement
  }
  return { d1: { prepare } as unknown as D1Database, sqlite }
}

type FakeOrder = { id: string; amount: number; currency: string; receipt: string; notes: Record<string, string> }

export class FakeRazorpay {
  orders = new Map<string, FakeOrder>()
  payments = new Map<string, RazorpayPayment>()
  requests: { method: string; path: string; body: unknown }[] = []
  failNextWith: number | null = null
  private counter = 0

  fetch = async (input: string, init: RequestInit = {}): Promise<Response> => {
    const url = new URL(input)
    const method = init.method ?? 'GET'
    const body = typeof init.body === 'string' ? JSON.parse(init.body) : undefined
    this.requests.push({ method, path: url.pathname, body })

    const expectedAuth = `Basic ${btoa(`${KEY_ID}:${KEY_SECRET}`)}`
    if ((init.headers as Record<string, string>)?.Authorization !== expectedAuth) return Response.json({ error: 'auth' }, { status: 401 })
    if (this.failNextWith) {
      const status = this.failNextWith
      this.failNextWith = null
      return Response.json({ error: { code: 'SERVER_ERROR' } }, { status })
    }

    if (method === 'POST' && url.pathname === '/v1/orders') {
      const order: FakeOrder = { id: `order_${this.nextId()}`, amount: body.amount, currency: body.currency, receipt: body.receipt, notes: body.notes }
      this.orders.set(order.id, order)
      return Response.json({ ...order, status: 'created', entity: 'order' })
    }
    const paymentMatch = /^\/v1\/payments\/(pay_[A-Za-z0-9]+)$/.exec(url.pathname)
    if (method === 'GET' && paymentMatch) {
      const payment = this.payments.get(paymentMatch[1])
      return payment ? Response.json(payment) : Response.json({ error: { code: 'BAD_REQUEST_ERROR' } }, { status: 400 })
    }
    return Response.json({ error: 'not found' }, { status: 404 })
  }

  addPayment(orderId: string, overrides: Partial<RazorpayPayment> = {}): RazorpayPayment {
    const order = this.orders.get(orderId)
    const payment: RazorpayPayment = {
      id: `pay_${this.nextId()}`,
      order_id: orderId,
      amount: order?.amount ?? 0,
      currency: order?.currency ?? 'INR',
      status: 'captured',
      method: 'upi',
      error_code: null,
      ...overrides,
    }
    this.payments.set(payment.id, payment)
    return payment
  }

  private nextId(): string {
    this.counter += 1
    return `TEST${String(this.counter).padStart(10, '0')}`
  }
}

export function checkoutSignature(orderId: string, paymentId: string, secret = KEY_SECRET): Promise<string> {
  return hmacSha256Hex(secret, `${orderId}|${paymentId}`)
}

export function setup(options: { limiter?: RateLimiter } = {}) {
  const { d1, sqlite } = createD1()
  const razorpay = new FakeRazorpay()
  const env: Env = {
    DB: d1,
    RAZORPAY_KEY_ID: KEY_ID,
    RAZORPAY_KEY_SECRET: KEY_SECRET,
    RAZORPAY_WEBHOOK_SECRET: WEBHOOK_SECRET,
    ALLOWED_ORIGINS: `${ORIGIN},http://localhost:5173`,
    ORDER_LIMITER: options.limiter,
    VERIFY_LIMITER: options.limiter,
  }
  const handle = createHandler(razorpay.fetch)
  const responses: string[] = []

  async function call(method: string, path: string, init: { body?: unknown; rawBody?: string; headers?: Record<string, string> } = {}) {
    const headers: Record<string, string> = { Origin: ORIGIN, ...init.headers }
    let body: string | undefined
    if (init.rawBody !== undefined) body = init.rawBody
    else if (init.body !== undefined) {
      body = JSON.stringify(init.body)
      headers['Content-Type'] ??= 'application/json'
    }
    const response = await handle(new Request(`https://payments.example.com${path}`, { method, headers, body }), env)
    const text = await response.text()
    responses.push(text)
    return { status: response.status, headers: response.headers, json: text ? JSON.parse(text) : null }
  }

  async function createOrder(productId: 'invoice-pack' | 'advance-receipt' = 'invoice-pack') {
    const res = await call('POST', '/api/payments/create-order', { body: { productId } })
    if (res.status !== 201) throw new Error(`create-order failed: ${res.status}`)
    return res.json as { orderRef: string; razorpayOrderId: string; amount: number; currency: string; keyId: string }
  }

  async function sendWebhook(event: string, payment: RazorpayPayment, options: { eventId?: string; secret?: string } = {}) {
    const payload: Record<string, unknown> = { payment: { entity: payment } }
    if (event === 'order.paid') payload.order = { entity: { id: payment.order_id, status: 'paid' } }
    const rawBody = JSON.stringify({ entity: 'event', event, contains: Object.keys(payload), payload, created_at: 1 })
    const signature = await hmacSha256Hex(options.secret ?? WEBHOOK_SECRET, rawBody)
    return call('POST', '/api/payments/webhook', {
      rawBody,
      headers: {
        Origin: '',
        'Content-Type': 'application/json',
        'X-Razorpay-Signature': signature,
        ...(options.eventId ? { 'X-Razorpay-Event-Id': options.eventId } : {}),
      },
    })
  }

  const orderRow = (ref: string) => sqlite.prepare('SELECT * FROM orders WHERE id = ?').get(ref) as Record<string, unknown> | undefined
  const count = (table: string) => Number((sqlite.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get() as { n: number }).n)

  return { env, sqlite, razorpay, call, createOrder, sendWebhook, orderRow, count, responses }
}
