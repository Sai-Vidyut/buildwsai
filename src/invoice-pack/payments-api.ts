export type ProductId = 'invoice-pack' | 'advance-receipt'

export type CreatedOrder = {
  orderRef: string
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
  constructor(status: number, code: string, message: string) {
    super(message)
    this.status = status
    this.code = code
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
    const error = (body as { error?: { code?: unknown; message?: unknown } } | null)?.error
    const code = typeof error?.code === 'string' ? error.code : 'unknown'
    const message =
      FRIENDLY[response.status] ??
      (response.status < 500 && typeof error?.message === 'string' ? error.message : 'Something went wrong. Please try again.')
    throw new PaymentsApiError(response.status, code, message)
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
const recentKey = (productId: ProductId) => `razorpay-orders-${productId}`

// Only order references are kept in the browser. Payment status always comes from the server.
export function rememberOrder(productId: ProductId, orderRef: string): void {
  try {
    const refs = [orderRef, ...recentOrders(productId).filter((ref) => ref !== orderRef)].slice(0, 10)
    localStorage.setItem(recentKey(productId), JSON.stringify(refs))
  } catch {
    // Storage may be blocked; the confirmation on screen still shows the reference.
  }
}

export function forgetOrder(productId: ProductId, orderRef: string): void {
  try {
    localStorage.setItem(recentKey(productId), JSON.stringify(recentOrders(productId).filter((ref) => ref !== orderRef)))
  } catch {
    // Nothing to clean up when storage is blocked.
  }
}

export function recentOrders(productId: ProductId): string[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(recentKey(productId)) || '[]')
    return Array.isArray(parsed) ? parsed.filter((ref): ref is string => typeof ref === 'string' && ORDER_REF.test(ref)) : []
  } catch {
    return []
  }
}
