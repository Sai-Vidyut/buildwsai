import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { CONTACT_EMAIL } from './logic'
import { EASE_OUT } from './motion-tokens'
import {
  announcePaid,
  createOrder,
  forgetOrder,
  getOrderStatus,
  isGrantRef,
  onlinePaymentsEnabled,
  PaymentsApiError,
  recentOrders,
  rememberOrder,
  verifyPayment,
  type CreatedOrder,
  type OrderStatus,
  type ProductId,
} from './payments-api'
import { loadCheckout, openCheckout } from './razorpay-checkout'

type Phase =
  | { name: 'idle' }
  | { name: 'starting' }
  | { name: 'open' }
  | { name: 'verifying' }
  | { name: 'processing'; orderRef: string; slow: boolean }
  | { name: 'paid'; order: OrderStatus }
  | { name: 'cancelled'; orderRef: string }
  | { name: 'failed'; orderRef: string; message: string }
  | { name: 'error'; message: string; orderRef?: string }

const POLL_MS = 3000
const POLL_LIMIT = 20

function formatInr(paise: number): string {
  return `₹${(paise / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
}

function formatTime(iso: string | null): string {
  if (!iso) return ''
  const date = new Date(iso)
  return Number.isNaN(date.getTime())
    ? ''
    : date.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata' }) + ' IST'
}

function messageOf(error: unknown): string {
  return error instanceof PaymentsApiError ? error.message : 'Something went wrong. Please try again.'
}

export function RazorpayPay({
  productId,
  amountInr,
}: {
  productId: ProductId
  amountInr: 499
}) {
  const [phase, setPhase] = useState<Phase>({ name: 'idle' })
  const orderRef = useRef<CreatedOrder | null>(null)
  const inFlight = useRef(false)

  const settleStatus = useCallback((status: OrderStatus) => {
    if (status.status === 'paid') {
      setPhase({ name: 'paid', order: status })
      announcePaid(status.productId)
    } else if (status.status === 'failed') setPhase({ name: 'failed', orderRef: status.orderRef, message: 'The payment did not go through.' })
    else setPhase({ name: 'processing', orderRef: status.orderRef, slow: false })
  }, [])

  // Restore a confirmation after a reload. The server decides whether the order is paid.
  useEffect(() => {
    const last = recentOrders(productId).find((held) => !isGrantRef(held.ref))?.ref
    if (!last) return
    let active = true
    getOrderStatus(last)
      .then((status) => {
        if (!active || status.productId !== productId) return
        if (status.status === 'paid' || status.status === 'processing') settleStatus(status)
      })
      .catch((error) => {
        if (error instanceof PaymentsApiError && error.status === 404) forgetOrder(productId, last)
      })
    return () => {
      active = false
    }
  }, [productId, settleStatus])

  const processingRef = phase.name === 'processing' && !phase.slow ? phase.orderRef : null
  useEffect(() => {
    if (!processingRef) return
    let tries = 0
    let active = true
    const timer = window.setInterval(() => {
      tries += 1
      getOrderStatus(processingRef)
        .then((status) => {
          if (!active) return
          if (status.status === 'paid' || status.status === 'failed') settleStatus(status)
          else if (tries >= POLL_LIMIT) setPhase({ name: 'processing', orderRef: processingRef, slow: true })
        })
        .catch(() => {
          if (active && tries >= POLL_LIMIT) setPhase({ name: 'processing', orderRef: processingRef, slow: true })
        })
    }, POLL_MS)
    return () => {
      active = false
      window.clearInterval(timer)
    }
  }, [processingRef, settleStatus])

  async function pay() {
    if (inFlight.current) return
    inFlight.current = true
    setPhase({ name: 'starting' })
    try {
      const [order] = await Promise.all([
        orderRef.current ? Promise.resolve(orderRef.current) : createOrder(productId),
        loadCheckout().catch(() => {
          throw new PaymentsApiError(0, 'checkout_unavailable', 'Razorpay Checkout could not load. Check your connection and try again.')
        }),
      ])
      orderRef.current = order
      rememberOrder(productId, { ref: order.orderRef, token: order.accessToken })
      setPhase({ name: 'open' })

      const outcome = await openCheckout({
        keyId: order.keyId,
        amount: order.amount,
        currency: order.currency,
        razorpayOrderId: order.razorpayOrderId,
        orderRef: order.orderRef,
        productName: order.productName,
      })

      if (outcome.kind === 'dismissed') {
        setPhase(
          outcome.lastError
            ? { name: 'failed', orderRef: order.orderRef, message: outcome.lastError }
            : { name: 'cancelled', orderRef: order.orderRef },
        )
        return
      }

      setPhase({ name: 'verifying' })
      try {
        const status = await verifyPayment(order.orderRef, outcome.response)
        if (status.status === 'paid') orderRef.current = null
        settleStatus(status)
      } catch (error) {
        // A network or server error here does not mean the payment failed; the webhook may still confirm it.
        if (error instanceof PaymentsApiError && error.status >= 400 && error.status < 500 && error.status !== 429) {
          setPhase({ name: 'error', orderRef: order.orderRef, message: 'We could not confirm this payment.' })
        } else {
          setPhase({ name: 'processing', orderRef: order.orderRef, slow: false })
        }
      }
    } catch (error) {
      setPhase({ name: 'error', message: messageOf(error) })
    } finally {
      inFlight.current = false
    }
  }

  async function recheck(ref: string) {
    setPhase({ name: 'processing', orderRef: ref, slow: false })
    try {
      settleStatus(await getOrderStatus(ref))
    } catch {
      setPhase({ name: 'processing', orderRef: ref, slow: true })
    }
  }

  const busy = phase.name === 'starting' || phase.name === 'open' || phase.name === 'verifying' || (phase.name === 'processing' && !phase.slow)
  const label =
    phase.name === 'starting'
      ? 'Opening secure checkout…'
      : phase.name === 'open'
        ? 'Complete payment in the Razorpay window'
        : phase.name === 'verifying' || phase.name === 'processing'
          ? 'Confirming payment…'
          : phase.name === 'cancelled' || phase.name === 'failed' || phase.name === 'error'
            ? `Try again · ₹${amountInr}`
            : `Pay ₹${amountInr} with Razorpay`

  if (phase.name === 'paid') {
    const order = phase.order
    return (
      <motion.div
        className="ip-rzp-paid"
        role="status"
        data-testid={`rzp-paid-${amountInr}`}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: EASE_OUT }}
      >
        <p className="ip-rzp-paid-head">
          <span className="ip-rzp-check" aria-hidden="true">
            <svg viewBox="0 0 16 16" width="14" height="14">
              <path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          Payment confirmed
        </p>
        <p className="ip-rzp-paid-sub">
          {order.productName} · {formatInr(order.amount)} · verified with Razorpay by our server.
        </p>
        <dl className="ip-rzp-facts">
          <div>
            <dt>Order reference</dt>
            <dd>{order.orderRef}</dd>
          </div>
          {order.razorpayPaymentId ? (
            <div>
              <dt>Razorpay payment ID</dt>
              <dd>{order.razorpayPaymentId}</dd>
            </div>
          ) : null}
          {order.paidAt ? (
            <div>
              <dt>Confirmed</dt>
              <dd>{formatTime(order.paidAt)}</dd>
            </div>
          ) : null}
        </dl>
        <p className="ip-fine">
          {onlinePaymentsEnabled() ? (
            <>
              <a href="#create" className="ip-rzp-export-link">
                Export your final invoice
              </a>{' '}
              from this browser.{' '}
            </>
          ) : null}
          Keep the order reference. No email is sent from this page. For anything about this order, write to{' '}
          <a href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(`Order ${order.orderRef}`)}`}>{CONTACT_EMAIL}</a>.
        </p>
        <button type="button" className="ip-plain ip-rzp-link" onClick={() => setPhase({ name: 'idle' })}>
          Start a new order
        </button>
      </motion.div>
    )
  }

  return (
    <div className="ip-rzp">
      <p>
        Pay ₹{amountInr} by UPI, card, netbanking, or wallet in Razorpay’s secure checkout. This page shows the order
        as paid only after our server confirms the payment with Razorpay.
      </p>
      <button
        type="button"
        className="ip-btn ip-rzp-btn"
        onClick={() => void pay()}
        disabled={busy}
        aria-busy={busy}
        data-testid={`rzp-pay-${amountInr}`}
      >
        {busy ? <span className="ip-spinner" aria-hidden="true" /> : null}
        <span>{label}</span>
      </button>

      <AnimatePresence mode="wait" initial={false}>
        {phase.name === 'idle' || phase.name === 'starting' || phase.name === 'open' ? null : (
          <motion.div
            key={phase.name + ('slow' in phase && phase.slow ? '-slow' : '')}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.25, ease: EASE_OUT }}
          >
            <StatusMessage phase={phase} onRecheck={recheck} />
          </motion.div>
        )}
      </AnimatePresence>

      <p className="ip-fine">
        Card and UPI details go to Razorpay, not to this site. The server stores the order reference, product, amount,
        Razorpay IDs, and payment status. It stores no name, email, or phone number.
      </p>
    </div>
  )
}

function StatusMessage({ phase, onRecheck }: { phase: Phase; onRecheck: (orderRef: string) => void }) {
  switch (phase.name) {
    case 'verifying':
      return (
        <p className="ip-rzp-status ip-rzp-status--info" role="status">
          Payment received by Razorpay. Confirming it with our server. Please keep this page open.
        </p>
      )
    case 'processing':
      return phase.slow ? (
        <div className="ip-rzp-status ip-rzp-status--warn" role="status">
          <p>
            Still confirming order <strong>{phase.orderRef}</strong>. If money left your account, it will be matched to
            this order automatically.
          </p>
          <button type="button" className="ip-plain ip-rzp-link" onClick={() => onRecheck(phase.orderRef)}>
            Check again
          </button>
        </div>
      ) : (
        <p className="ip-rzp-status ip-rzp-status--info" role="status">
          Waiting for Razorpay to confirm order <strong>{phase.orderRef}</strong>. This usually takes under a minute.
        </p>
      )
    case 'cancelled':
      return (
        <div className="ip-rzp-status ip-rzp-status--warn" role="status">
          <p>Checkout was closed before the payment finished. The order is not paid.</p>
        </div>
      )
    case 'failed':
      return (
        <div className="ip-rzp-status ip-rzp-status--err" role="alert">
          <p>{phase.message} You can try Razorpay again.</p>
        </div>
      )
    case 'error':
      return (
        <div className="ip-rzp-status ip-rzp-status--err" role="alert">
          <p>
            {phase.message}
            {phase.orderRef ? (
              <>
                {' '}
                If money left your account, write to <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> with order{' '}
                <strong>{phase.orderRef}</strong>.
              </>
            ) : null}
          </p>
        </div>
      )
    default:
      return null
  }
}
