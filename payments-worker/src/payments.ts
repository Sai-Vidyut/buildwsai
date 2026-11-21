import { newAccessToken, newOrderRef, ORDER_REF_PATTERN, sha256Hex, verifyHmac } from './crypto.ts'
import { keyMode, type Env } from './env.ts'
import { HttpError, json, readJsonObject, rejectUnknownFields } from './http.ts'
import { applyPayment, getOrderById, insertOrder, paymentMismatch, publicStatus, type OrderRow } from './orders.ts'
import { findProduct, PRODUCTS } from './products.ts'
import { RazorpayApiError, type RazorpayClient } from './razorpay.ts'

const RAZORPAY_ORDER_ID = /^order_[A-Za-z0-9]{8,40}$/
const RAZORPAY_PAYMENT_ID = /^pay_[A-Za-z0-9]{8,40}$/
const SIGNATURE = /^[0-9a-f]{64}$/i

export type Deps = { env: Env; razorpay: RazorpayClient; now: () => Date; headers: Record<string, string> }

const upstreamUnavailable = () => new HttpError(502, 'payment_provider_unavailable', 'The payment provider could not be reached. Please try again.')

function orderView(order: OrderRow) {
  return {
    orderRef: order.id,
    productId: order.product_id,
    productName: PRODUCTS[order.product_id].name,
    amount: order.amount_paise,
    currency: order.currency,
    status: publicStatus(order.status),
    razorpayPaymentId: order.status === 'paid' ? order.razorpay_payment_id : null,
    paidAt: order.paid_at,
  }
}

export async function createOrder(request: Request, deps: Deps): Promise<Response> {
  const body = await readJsonObject(request)
  rejectUnknownFields(body, ['productId'])
  const product = findProduct(body.productId)
  if (!product) throw new HttpError(400, 'unknown_product', 'Choose a valid product.')

  const mode = keyMode(deps.env.RAZORPAY_KEY_ID)
  if (!mode) throw new HttpError(503, 'payments_unavailable', 'Online payments are not available right now.')

  const orderRef = newOrderRef(product.refPrefix)
  let razorpayOrder
  try {
    razorpayOrder = await deps.razorpay.createOrder({
      amount: product.amountPaise,
      currency: product.currency,
      receipt: orderRef,
      notes: { order_ref: orderRef, product_id: product.id },
    })
  } catch (error) {
    console.error('create_order.razorpay_failed', error instanceof RazorpayApiError ? error.status : 'network')
    throw upstreamUnavailable()
  }

  if (!RAZORPAY_ORDER_ID.test(razorpayOrder.id) || razorpayOrder.amount !== product.amountPaise || razorpayOrder.currency !== product.currency) {
    console.error('create_order.unexpected_response')
    throw upstreamUnavailable()
  }

  const now = deps.now().toISOString()
  const accessToken = newAccessToken()
  await insertOrder(deps.env.DB, {
    id: orderRef,
    product_id: product.id,
    amount_paise: product.amountPaise,
    currency: product.currency,
    mode,
    razorpay_order_id: razorpayOrder.id,
    status: 'created',
    access_token_hash: await sha256Hex(accessToken),
    created_at: now,
    updated_at: now,
  })

  return json(
    {
      orderRef,
      accessToken,
      razorpayOrderId: razorpayOrder.id,
      amount: product.amountPaise,
      currency: product.currency,
      keyId: deps.env.RAZORPAY_KEY_ID,
      productId: product.id,
      productName: product.name,
    },
    201,
    deps.headers,
  )
}

export async function verifyPayment(request: Request, deps: Deps): Promise<Response> {
  const body = await readJsonObject(request)
  rejectUnknownFields(body, ['orderRef', 'razorpay_order_id', 'razorpay_payment_id', 'razorpay_signature'])
  const { orderRef, razorpay_order_id: orderId, razorpay_payment_id: paymentId, razorpay_signature: signature } = body
  if (
    typeof orderRef !== 'string' ||
    !ORDER_REF_PATTERN.test(orderRef) ||
    typeof orderId !== 'string' ||
    !RAZORPAY_ORDER_ID.test(orderId) ||
    typeof paymentId !== 'string' ||
    !RAZORPAY_PAYMENT_ID.test(paymentId) ||
    typeof signature !== 'string' ||
    !SIGNATURE.test(signature)
  ) {
    throw new HttpError(400, 'invalid_payment_details', 'The payment details are incomplete or malformed.')
  }

  const order = await getOrderById(deps.env.DB, orderRef)
  if (!order) throw new HttpError(404, 'order_not_found', 'We could not find that order.')
  if (order.razorpay_order_id !== orderId) {
    throw new HttpError(400, 'order_mismatch', 'The payment does not belong to this order.')
  }

  // The signed message uses the order id stored on the server, never the browser's copy.
  const validSignature = await verifyHmac(deps.env.RAZORPAY_KEY_SECRET, `${order.razorpay_order_id}|${paymentId}`, signature)
  if (!validSignature) {
    console.warn('verify.invalid_signature', order.id)
    throw new HttpError(400, 'invalid_signature', 'We could not verify this payment.')
  }

  if (order.status === 'paid') {
    if (order.razorpay_payment_id === paymentId) return json({ ...orderView(order), alreadyVerified: true }, 200, deps.headers)
    throw new HttpError(409, 'order_already_paid', 'This order has already been paid.')
  }

  let payment
  try {
    payment = await deps.razorpay.fetchPayment(paymentId)
  } catch (error) {
    console.error('verify.razorpay_failed', error instanceof RazorpayApiError ? error.status : 'network')
    throw upstreamUnavailable()
  }

  const mismatch = payment.id === paymentId ? paymentMismatch(order, payment) : 'payment_id_mismatch'
  if (mismatch) {
    console.warn('verify.payment_mismatch', order.id, mismatch)
    throw new HttpError(400, 'payment_mismatch', 'The payment does not match this order.')
  }

  const { outcome, order: updated } = await applyPayment(deps.env.DB, order, payment, 'verify', deps.now().toISOString())
  if (outcome === 'conflict') {
    console.error('verify.second_capture', order.id)
    throw new HttpError(409, 'order_already_paid', 'This order has already been paid.')
  }
  return json({ ...orderView(updated), alreadyVerified: outcome === 'already_paid' }, 200, deps.headers)
}

export async function getOrderStatus(orderRef: string, deps: Deps): Promise<Response> {
  if (!ORDER_REF_PATTERN.test(orderRef)) throw new HttpError(404, 'order_not_found', 'We could not find that order.')
  let order = await getOrderById(deps.env.DB, orderRef)
  if (!order) throw new HttpError(404, 'order_not_found', 'We could not find that order.')

  // An authorized payment becomes captured shortly after; reconcile with Razorpay if the webhook is late.
  if (order.status === 'authorized' && order.razorpay_payment_id) {
    try {
      const payment = await deps.razorpay.fetchPayment(order.razorpay_payment_id)
      if (payment.id === order.razorpay_payment_id && !paymentMismatch(order, payment)) {
        order = (await applyPayment(deps.env.DB, order, payment, 'reconcile', deps.now().toISOString())).order
      }
    } catch (error) {
      console.warn('status.reconcile_failed', error instanceof RazorpayApiError ? error.status : 'network')
    }
  }
  return json(orderView(order), 200, deps.headers)
}
