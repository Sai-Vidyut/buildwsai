import type { CheckoutSuccess } from './payments-api'

type FailureResponse = { error?: { description?: string; reason?: string } }

type RazorpayInstance = {
  open(): void
  on(event: 'payment.failed', handler: (response: FailureResponse) => void): void
}

type RazorpayOptions = {
  key: string
  amount: number
  currency: string
  order_id: string
  name: string
  description: string
  notes: Record<string, string>
  theme: { color: string }
  handler: (response: CheckoutSuccess) => void
  modal: { ondismiss: () => void; confirm_close: boolean; escape: boolean }
}

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => RazorpayInstance
  }
}

const SCRIPT_SRC = 'https://checkout.razorpay.com/v1/checkout.js'
let loading: Promise<void> | null = null

export function loadCheckout(): Promise<void> {
  if (window.Razorpay) return Promise.resolve()
  if (loading) return loading
  loading = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = SCRIPT_SRC
    script.async = true
    const timer = window.setTimeout(() => fail(), 15_000)
    function fail() {
      window.clearTimeout(timer)
      script.remove()
      loading = null
      reject(new Error('checkout_unavailable'))
    }
    script.onload = () => {
      window.clearTimeout(timer)
      if (window.Razorpay) resolve()
      else fail()
    }
    script.onerror = fail
    document.head.appendChild(script)
  })
  return loading
}

export type CheckoutOutcome =
  | { kind: 'success'; response: CheckoutSuccess }
  | { kind: 'dismissed'; lastError: string | null }

/**
 * Opens Razorpay Checkout for an order created on the server. Resolves once the customer either
 * completes a payment (which still has to be verified on the server) or closes the window.
 * Failed attempts inside the window are retried by Razorpay; the last failure is reported on close.
 */
export function openCheckout(input: {
  keyId: string
  amount: number
  currency: string
  razorpayOrderId: string
  orderRef: string
  productName: string
}): Promise<CheckoutOutcome> {
  return new Promise((resolve) => {
    const Razorpay = window.Razorpay
    if (!Razorpay) throw new Error('checkout_unavailable')
    let lastError: string | null = null
    let settled = false
    const settle = (outcome: CheckoutOutcome) => {
      if (settled) return
      settled = true
      resolve(outcome)
    }
    const instance = new Razorpay({
      key: input.keyId,
      amount: input.amount,
      currency: input.currency,
      order_id: input.razorpayOrderId,
      name: 'Sai Vidyut',
      description: input.productName,
      notes: { order_ref: input.orderRef },
      theme: { color: '#b4532a' },
      handler: (response) => settle({ kind: 'success', response }),
      modal: { ondismiss: () => settle({ kind: 'dismissed', lastError }), confirm_close: true, escape: true },
    })
    instance.on('payment.failed', (response) => {
      lastError = response.error?.description?.slice(0, 200) || 'The payment did not go through.'
    })
    instance.open()
  })
}
