export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>

export type RazorpayOrder = {
  id: string
  amount: number
  currency: string
  receipt: string | null
  status: string
}

export type RazorpayPayment = {
  id: string
  order_id: string | null
  amount: number
  currency: string
  status: 'created' | 'authorized' | 'captured' | 'refunded' | 'failed' | string
  method?: string | null
  error_code?: string | null
}

export class RazorpayApiError extends Error {
  readonly status: number
  constructor(status: number) {
    super(`Razorpay API request failed with HTTP ${status}`)
    this.status = status
  }
}

const API_BASE = 'https://api.razorpay.com/v1'
const TIMEOUT_MS = 8000

export class RazorpayClient {
  private readonly auth: string
  private readonly fetchImpl: FetchLike

  constructor(keyId: string, keySecret: string, fetchImpl: FetchLike) {
    this.auth = `Basic ${btoa(`${keyId}:${keySecret}`)}`
    this.fetchImpl = fetchImpl
  }

  createOrder(input: { amount: number; currency: string; receipt: string; notes: Record<string, string> }): Promise<RazorpayOrder> {
    return this.request<RazorpayOrder>('POST', '/orders', input)
  }

  fetchPayment(paymentId: string): Promise<RazorpayPayment> {
    return this.request<RazorpayPayment>('GET', `/payments/${encodeURIComponent(paymentId)}`)
  }

  private async request<T>(method: 'GET' | 'POST', path: string, body?: unknown): Promise<T> {
    const response = await this.fetchImpl(`${API_BASE}${path}`, {
      method,
      headers: { Authorization: this.auth, 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
    if (!response.ok) throw new RazorpayApiError(response.status)
    return (await response.json()) as T
  }
}
