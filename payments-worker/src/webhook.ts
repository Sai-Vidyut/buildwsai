import { sha256Hex, verifyHmac } from './crypto.ts'
import type { Env } from './env.ts'
import { HttpError, json, readBodyText } from './http.ts'
import { applyPayment, getOrderByRazorpayOrderId, paymentMismatch } from './orders.ts'
import type { RazorpayPayment } from './razorpay.ts'

const MAX_WEBHOOK_BYTES = 256 * 1024
const HANDLED_EVENTS = new Set(['payment.captured', 'payment.failed', 'order.paid'])

type EventStatus = 'processed' | 'ignored' | 'failed'

type WebhookBody = {
  event?: unknown
  payload?: { payment?: { entity?: RazorpayPayment }; order?: { entity?: { id?: string } } }
}

async function finishEvent(db: D1Database, eventId: string, status: EventStatus, note: string | null, now: string) {
  await db
    .prepare('UPDATE webhook_events SET status = ?, note = ?, processed_at = ? WHERE event_id = ?')
    .bind(status, note, now, eventId)
    .run()
}

/**
 * Razorpay retries deliveries until it gets a 2xx and may deliver events out of order.
 * The raw body is authenticated first; nothing is parsed or stored before that.
 */
export async function handleWebhook(request: Request, env: Env, now: () => Date): Promise<Response> {
  const rawBody = await readBodyText(request, MAX_WEBHOOK_BYTES)
  const signature = request.headers.get('X-Razorpay-Signature') ?? ''
  if (!(await verifyHmac(env.RAZORPAY_WEBHOOK_SECRET, rawBody, signature))) {
    console.warn('webhook.invalid_signature')
    throw new HttpError(401, 'invalid_signature', 'Invalid webhook signature.')
  }

  let body: WebhookBody
  try {
    body = JSON.parse(rawBody) as WebhookBody
  } catch {
    throw new HttpError(400, 'invalid_json', 'The webhook body is not valid JSON.')
  }

  const eventType = typeof body.event === 'string' ? body.event.slice(0, 64) : 'unknown'
  const headerId = request.headers.get('X-Razorpay-Event-Id')
  const eventId = headerId && /^[A-Za-z0-9_-]{1,64}$/.test(headerId) ? headerId : `sha256:${await sha256Hex(rawBody)}`
  const payment = body.payload?.payment?.entity
  const razorpayOrderId = payment?.order_id ?? body.payload?.order?.entity?.id ?? null
  const receivedAt = now().toISOString()

  const inserted = await env.DB.prepare(
    `INSERT INTO webhook_events (event_id, event_type, razorpay_order_id, razorpay_payment_id, status, received_at)
     VALUES (?, ?, ?, ?, 'received', ?)
     ON CONFLICT (event_id) DO NOTHING`,
  )
    .bind(eventId, eventType, razorpayOrderId, payment?.id ?? null, receivedAt)
    .run()

  if (inserted.meta.changes === 0) {
    const existing = await env.DB.prepare('SELECT status FROM webhook_events WHERE event_id = ?').bind(eventId).first<{ status: string }>()
    if (existing && (existing.status === 'processed' || existing.status === 'ignored')) {
      return json({ ok: true, duplicate: true })
    }
    await env.DB.prepare('UPDATE webhook_events SET attempts = attempts + 1 WHERE event_id = ?').bind(eventId).run()
  }

  try {
    const [status, note] = await processEvent(env.DB, eventType, payment, razorpayOrderId, now().toISOString())
    await finishEvent(env.DB, eventId, status, note, now().toISOString())
    return json({ ok: true, status })
  } catch (error) {
    console.error('webhook.processing_failed', eventType, error instanceof Error ? error.name : 'unknown')
    await finishEvent(env.DB, eventId, 'failed', 'processing_error', now().toISOString()).catch(() => {})
    throw new HttpError(500, 'webhook_failed', 'The webhook could not be processed.')
  }
}

async function processEvent(
  db: D1Database,
  eventType: string,
  payment: RazorpayPayment | undefined,
  razorpayOrderId: string | null,
  now: string,
): Promise<[EventStatus, string | null]> {
  if (!HANDLED_EVENTS.has(eventType)) return ['ignored', 'unhandled_event']
  if (!payment || typeof payment.id !== 'string' || !razorpayOrderId) return ['ignored', 'missing_payment']

  const order = await getOrderByRazorpayOrderId(db, razorpayOrderId)
  if (!order) return ['ignored', 'unknown_order']

  const mismatch = paymentMismatch(order, payment)
  if (mismatch) {
    console.warn('webhook.payment_mismatch', order.id, mismatch)
    return ['ignored', mismatch]
  }

  const { outcome } = await applyPayment(db, order, payment, 'webhook', now)
  if (outcome === 'conflict') console.error('webhook.second_capture', order.id)
  return ['processed', outcome]
}
