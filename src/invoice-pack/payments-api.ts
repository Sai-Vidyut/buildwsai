export type ProductId = 'invoice-pack' | 'advance-receipt'

export type CreatedOrder = {
  orderRef: string
  accessToken: string
  razorpayOrderId: string
  amount: number
  currency: string
  keyId: string
  productId: ProductId
  productName: string
}

export type OrderStatus = {
  orderRef: string
  productId: ProductId
  productName: string
  amount: number
  currency: string
  status: 'pending' | 'processing' | 'paid' | 'failed'
  razorpayPaymentId: string | null
  paidAt: string | null
  alreadyVerified?: boolean
}

export type CheckoutSuccess = {
  razorpay_order_id: string
  razorpay_payment_id: string
  razorpay_signature: string
}

export class PaymentsApiError extends Error {
  readonly status: number
  readonly code: string
  readonly details: string[]
  constructor(status: number, code: string, message: string, details: string[] = []) {
    super(message)
    this.status = status
    this.code = code
    this.details = details
  }
}

function resolveBaseUrl(raw: string | undefined): string | null {
  if (!raw) return null
  try {
    const url = new URL(raw)
    const local = url.hostname === 'localhost' || url.hostname === '127.0.0.1'
    if (url.protocol !== 'https:' && !(local && url.protocol === 'http:')) return null
    return url.origin + url.pathname.replace(/\/+$/, '')
  } catch {
    return null
  }
}

const BASE_URL = resolveBaseUrl(import.meta.env.VITE_PAYMENTS_API_URL as string | undefined)

export function onlinePaymentsEnabled(): boolean {
  return BASE_URL !== null
}

const FRIENDLY: Record<number, string> = {
  429: 'Too many attempts. Please wait a minute and try again.',
  502: 'The payment provider could not be reached. Please try again.',
  503: 'Online payments are not available right now. You can still pay using UPI.',
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!BASE_URL) throw new PaymentsApiError(0, 'not_configured', FRIENDLY[503])
  let response: Response
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      ...init,
      headers: init.body ? { 'Content-Type': 'application/json' } : undefined,
      credentials: 'omit',
      signal: AbortSignal.timeout(20_000),
    })
  } catch {
    throw new PaymentsApiError(0, 'network', 'We could not reach the payment server. Check your connection and try again.')
  }
  let body: unknown = null
  try {
    body = await response.json()
  } catch {
    body = null
  }
  if (!response.ok) {
    const error = (body as { error?: { code?: unknown; message?: unknown; details?: unknown } } | null)?.error
    const code = typeof error?.code === 'string' ? error.code : 'unknown'
    const serverMessage = response.status < 500 && typeof error?.message === 'string' ? error.message.slice(0, 300) : null
    const message = serverMessage ?? FRIENDLY[response.status] ?? 'Something went wrong. Please try again.'
    const details = Array.isArray(error?.details)
      ? error.details.filter((item): item is string => typeof item === 'string').map((item) => item.slice(0, 200)).slice(0, 10)
      : []
    throw new PaymentsApiError(response.status, code, message, details)
  }
  return body as T
}

export function createOrder(productId: ProductId): Promise<CreatedOrder> {
  return request<CreatedOrder>('/api/payments/create-order', { method: 'POST', body: JSON.stringify({ productId }) })
}

export function verifyPayment(orderRef: string, result: CheckoutSuccess): Promise<OrderStatus> {
  return request<OrderStatus>('/api/payments/verify', {
    method: 'POST',
    body: JSON.stringify({
      orderRef,
      razorpay_order_id: result.razorpay_order_id,
      razorpay_payment_id: result.razorpay_payment_id,
      razorpay_signature: result.razorpay_signature,
    }),
  })
}

export function getOrderStatus(orderRef: string): Promise<OrderStatus> {
  return request<OrderStatus>(`/api/payments/orders/${encodeURIComponent(orderRef)}`)
}

const ORDER_REF = /^(IP|AR)-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{20}$/
const ACCESS_TOKEN = /^[A-Za-z0-9_-]{43}$/
const recentKey = (productId: ProductId) => `razorpay-orders-${productId}`

export type HeldOrder = { ref: string; token: string }

// The browser keeps the order reference and its export secret. Payment status always comes from the server.
export function rememberOrder(productId: ProductId, order: HeldOrder): void {
  try {
    const held = [order, ...recentOrders(productId).filter((item) => item.ref !== order.ref)].slice(0, 10)
    localStorage.setItem(recentKey(productId), JSON.stringify(held))
  } catch {
    // Storage may be blocked; the confirmation on screen still shows the reference.
  }
}

export function forgetOrder(productId: ProductId, orderRef: string): void {
  try {
    localStorage.setItem(recentKey(productId), JSON.stringify(recentOrders(productId).filter((item) => item.ref !== orderRef)))
  } catch {
    // Nothing to clean up when storage is blocked.
  }
}

export function recentOrders(productId: ProductId): HeldOrder[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(recentKey(productId)) || '[]')
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (item): item is HeldOrder =>
        !!item && typeof item === 'object' && ORDER_REF.test(String(item.ref)) && ACCESS_TOKEN.test(String(item.token)),
    )
  } catch {
    return []
  }
}

export const PAYMENT_CONFIRMED_EVENT = 'invoice-pack:payment-confirmed'

export function announcePaid(productId: ProductId): void {
  window.dispatchEvent(new CustomEvent(PAYMENT_CONFIRMED_EVENT, { detail: { productId } }))
}

// Returns the most recent order held in this browser that the server confirms as paid.
export async function findPaidOrder(productId: ProductId): Promise<HeldOrder | null> {
  for (const held of recentOrders(productId)) {
    try {
      const status = await getOrderStatus(held.ref)
      if (status.productId === productId && status.status === 'paid') return held
    } catch (error) {
      if (error instanceof PaymentsApiError && error.status === 404) forgetOrder(productId, held.ref)
      else throw error
    }
  }
  return null
}

export type ExportKind = 'invoice' | 'receipt'
export type ExportResult = { html: string; filename: string; exportsUsed: number; exportsLimit: number }

export function exportDocument(kind: ExportKind, order: HeldOrder, input: unknown): Promise<ExportResult> {
  return request<ExportResult>(`/api/payments/exports/${kind}`, {
    method: 'POST',
    body: JSON.stringify({ orderRef: order.ref, accessToken: order.token, input }),
  })
}
