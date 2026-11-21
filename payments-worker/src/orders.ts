import type { ProductId } from './products.ts'
import type { RazorpayPayment } from './razorpay.ts'

export type OrderStatus = 'created' | 'authorized' | 'paid' | 'failed'

export type OrderRow = {
  id: string
  product_id: ProductId
  amount_paise: number
  currency: string
  mode: 'test' | 'live'
  razorpay_order_id: string
  razorpay_payment_id: string | null
  status: OrderStatus
  failure_code: string | null
  paid_at: string | null
  created_at: string
  updated_at: string
}

export type PaymentSource = 'verify' | 'webhook' | 'reconcile'

export type ApplyOutcome = 'paid' | 'already_paid' | 'authorized' | 'failed' | 'unchanged' | 'conflict'

export async function insertOrder(db: D1Database, order: OrderRow): Promise<void> {
  await db
    .prepare(
      `INSERT INTO orders (id, product_id, amount_paise, currency, mode, razorpay_order_id, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(order.id, order.product_id, order.amount_paise, order.currency, order.mode, order.razorpay_order_id, order.status, order.created_at, order.updated_at)
    .run()
}

export function getOrderById(db: D1Database, id: string): Promise<OrderRow | null> {
  return db.prepare('SELECT * FROM orders WHERE id = ?').bind(id).first<OrderRow>()
}

export function getOrderByRazorpayOrderId(db: D1Database, razorpayOrderId: string): Promise<OrderRow | null> {
  return db.prepare('SELECT * FROM orders WHERE razorpay_order_id = ?').bind(razorpayOrderId).first<OrderRow>()
}

// Returns a short reason when a Razorpay payment does not belong to this order, otherwise null.
export function paymentMismatch(order: OrderRow, payment: RazorpayPayment): string | null {
  if (payment.order_id !== order.razorpay_order_id) return 'order_id_mismatch'
  if (payment.amount !== order.amount_paise) return 'amount_mismatch'
  if (payment.currency !== order.currency) return 'currency_mismatch'
  return null
}

const LEDGER_STATUS: Record<string, 'authorized' | 'captured' | 'failed'> = {
  authorized: 'authorized',
  captured: 'captured',
  failed: 'failed',
}

/**
 * Applies a payment that has already been authenticated (checkout signature or webhook signature)
 * and checked with paymentMismatch. Every write is conditional, so concurrent or repeated calls
 * from verify, webhooks, and reconciliation converge on the same state. `paid` is terminal.
 */
export async function applyPayment(
  db: D1Database,
  order: OrderRow,
  payment: RazorpayPayment,
  source: PaymentSource,
  now: string,
): Promise<{ outcome: ApplyOutcome; order: OrderRow }> {
  const ledgerStatus = LEDGER_STATUS[payment.status]
  if (!ledgerStatus) return { outcome: 'unchanged', order }

  await db
    .prepare(
      `INSERT INTO payments (razorpay_payment_id, order_id, amount_paise, currency, status, method, error_code, source, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT (razorpay_payment_id) DO UPDATE SET
         status = excluded.status,
         method = COALESCE(excluded.method, payments.method),
         error_code = excluded.error_code,
         updated_at = excluded.updated_at
       WHERE payments.status <> 'captured' AND payments.status <> excluded.status`,
    )
    .bind(payment.id, order.id, payment.amount, payment.currency, ledgerStatus, payment.method ?? null, payment.error_code ?? null, source, now, now)
    .run()

  let changes = 0
  if (ledgerStatus === 'captured') {
    const result = await db
      .prepare(
        `UPDATE orders SET status = 'paid', razorpay_payment_id = ?, paid_at = ?, failure_code = NULL, updated_at = ?
         WHERE id = ? AND status <> 'paid'`,
      )
      .bind(payment.id, now, now, order.id)
      .run()
    changes = result.meta.changes
  } else if (ledgerStatus === 'authorized') {
    const result = await db
      .prepare(
        `UPDATE orders SET status = 'authorized', razorpay_payment_id = ?, failure_code = NULL, updated_at = ?
         WHERE id = ? AND status IN ('created', 'failed')`,
      )
      .bind(payment.id, now, order.id)
      .run()
    changes = result.meta.changes
  } else {
    const result = await db
      .prepare(
        `UPDATE orders SET status = 'failed', failure_code = ?, updated_at = ?
         WHERE id = ? AND (status = 'created' OR (status = 'authorized' AND razorpay_payment_id = ?))`,
      )
      .bind(payment.error_code ?? 'payment_failed', now, order.id, payment.id)
      .run()
    changes = result.meta.changes
  }

  const fresh = (await getOrderById(db, order.id)) ?? order
  if (changes > 0) return { outcome: fresh.status === 'paid' ? 'paid' : fresh.status === 'authorized' ? 'authorized' : 'failed', order: fresh }
  if (fresh.status === 'paid') {
    return { outcome: fresh.razorpay_payment_id === payment.id ? 'already_paid' : ledgerStatus === 'captured' ? 'conflict' : 'unchanged', order: fresh }
  }
  return { outcome: 'unchanged', order: fresh }
}

export type PublicOrderStatus = 'pending' | 'processing' | 'paid' | 'failed'

export function publicStatus(status: OrderStatus): PublicOrderStatus {
  switch (status) {
    case 'paid':
      return 'paid'
    case 'authorized':
      return 'processing'
    case 'failed':
      return 'failed'
    default:
      return 'pending'
  }
}
