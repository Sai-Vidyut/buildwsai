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

async function request<T>(path: string, init: RequestInit = {}, extraHeaders: Record<string, string> = {}): Promise<T> {
  if (!BASE_URL) throw new PaymentsApiError(0, 'not_configured', FRIENDLY[503])
  let response: Response
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      ...init,
      headers: { ...(init.body ? { 'Content-Type': 'application/json' } : {}), ...extraHeaders },
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

// IP/AR are Razorpay orders; GR is free access (admin or promo code) that unlocks the same features.
const ORDER_REF = /^(IP|AR|GR)-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{20}$/

export function isGrantRef(ref: string): boolean {
  return ref.startsWith('GR-')
}
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
      const status = isGrantRef(held.ref) ? await getGrantStatus(held.ref) : await getOrderStatus(held.ref)
      if (status.productId === productId && (status.status === 'paid' || status.status === 'active')) return held
    } catch (error) {
      if (error instanceof PaymentsApiError && error.status === 404) forgetOrder(productId, held.ref)
      else throw error
    }
  }
  return null
}

// ---- Free access ---------------------------------------------------------------------------------

export type GrantStatus = { grantRef: string; productId: ProductId; source: 'admin_grant' | 'promo_grant'; status: 'active'; grantedAt: string }
export type IssuedGrant = { grantRef: string; accessToken: string; productId: 'invoice-pack'; source: 'admin_grant' | 'promo_grant' }

export function getGrantStatus(ref: string): Promise<GrantStatus> {
  return request<GrantStatus>(`/api/payments/grants/${encodeURIComponent(ref)}`)
}

function holdGrant(grant: IssuedGrant): IssuedGrant {
  rememberOrder('invoice-pack', { ref: grant.grantRef, token: grant.accessToken })
  announcePaid('invoice-pack')
  return grant
}

export async function redeemPromoCode(code: string, email: string): Promise<IssuedGrant> {
  const body = email.trim() ? { code, email: email.trim() } : { code }
  return holdGrant(await request<IssuedGrant>('/api/payments/grants/redeem', { method: 'POST', body: JSON.stringify(body) }))
}

const ADMIN_PASS_KEY = 'invoice-pack-admin-pass'
const ADMIN_PASS_ID = /^AP-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{20}$/
export type HeldAdminPass = { id: string; token: string }

// The admin pass lets this browser claim free Invoice Pack purchases. The server checks it on every use
// and the admin can revoke it; holding a stale copy here grants nothing.
export function heldAdminPass(): HeldAdminPass | null {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(ADMIN_PASS_KEY) || 'null')
    if (!parsed || typeof parsed !== 'object') return null
    const { id, token } = parsed as Record<string, unknown>
    return ADMIN_PASS_ID.test(String(id)) && ACCESS_TOKEN.test(String(token)) ? { id: String(id), token: String(token) } : null
  } catch {
    return null
  }
}

export function rememberAdminPass(pass: HeldAdminPass): void {
  try {
    localStorage.setItem(ADMIN_PASS_KEY, JSON.stringify(pass))
  } catch {
    // Storage may be blocked; admin access then lasts only until the page closes.
  }
}

export function forgetAdminPass(): void {
  try {
    localStorage.removeItem(ADMIN_PASS_KEY)
  } catch {
    // Nothing to clean up when storage is blocked.
  }
}

export async function claimAdminGrant(pass: HeldAdminPass): Promise<IssuedGrant> {
  return holdGrant(await request<IssuedGrant>('/api/payments/grants/admin', { method: 'POST', body: JSON.stringify({ passToken: pass.token }) }))
}

export type PromoCodeStatus = 'unused' | 'redeemed' | 'expired' | 'revoked'
export type AdminPromoCode = {
  id: string
  hint: string
  mode: 'test' | 'live'
  note: string | null
  boundEmail: string | null
  expiresAt: string | null
  createdAt: string
  status: PromoCodeStatus
  redeemedAt: string | null
  redeemedEmail: string | null
  grantRef: string | null
  revokedAt: string | null
}
export type AdminPassInfo = {
  id: string
  label: string
  mode: 'test' | 'live'
  createdAt: string
  lastUsedAt: string | null
  revokedAt: string | null
  status: 'active' | 'revoked' | 'other_mode'
}
export type AdminOverview = {
  mode: 'test' | 'live'
  adminPasses: AdminPassInfo[]
  codes: AdminPromoCode[]
  events: { subjectType: 'admin_pass' | 'promo_code'; subjectId: string; event: string; actor: string; detail: string | null; at: string }[]
}
export type AdminAction =
  | { action: 'overview' }
  | { action: 'create_code'; email?: string; expiresAt?: string; note?: string }
  | { action: 'revoke_code'; codeId: string }
  | { action: 'create_admin_pass'; label?: string }
  | { action: 'revoke_admin_pass'; passId: string }

// The admin key is sent only as a header to the admin endpoint and is never stored by this page.
export function adminRequest<T = AdminOverview>(adminKey: string, action: AdminAction): Promise<T> {
  return request<T>('/api/payments/admin', { method: 'POST', body: JSON.stringify(action) }, { Authorization: `Bearer ${adminKey}` })
}

export type ExportKind = 'invoice' | 'receipt'
export type ExportResult = { html: string; filename: string; exportsUsed: number; exportsLimit: number }

export function exportDocument(kind: ExportKind, order: HeldOrder, input: unknown): Promise<ExportResult> {
  return request<ExportResult>(`/api/payments/exports/${kind}`, {
    method: 'POST',
    body: JSON.stringify({ orderRef: order.ref, accessToken: order.token, input }),
  })
}

export function getHealth(): Promise<{ ok: boolean; configured: boolean; emailDelivery?: boolean }> {
  return request('/api/payments/health')
}

export type ReminderStatus = 'scheduled' | 'sending' | 'sent' | 'failed' | 'cancelled' | 'paused'

export type FollowupReminder = {
  stage: 1 | 2 | 3
  status: ReminderStatus
  subject: string
  body: string
  rendered: { subject: string; body: string }
  dueAt: string
  nextAttemptAt: string
  sentAt: string | null
  sentVia: 'provider' | 'manual' | null
  attempts: number
  errorReason: string | null
}

export type Followup = {
  id: string
  businessName: string
  clientName: string
  invoiceNumber: string
  amount: number
  currency: string
  invoiceDate: string
  dueDate: string
  timezone: string
  contact: { clientEmail: string | null; clientPhone: string | null; replyTo: string | null }
  contactPurged: boolean
  invoiceLink: string | null
  paymentInstructions: string | null
  remindersEnabled: boolean
  paymentStatus: 'unpaid' | 'paid'
  paidSource: 'freelancer_confirmed' | null
  paidAt: string | null
  secondDelayDays: number
  thirdDelayDays: number
  delivery: 'email' | 'manual'
  reminders: FollowupReminder[]
  history: { stage: number | null; event: string; detail: string | null; at: string }[]
}

export type FollowupSetup = {
  contact: { clientEmail: string; clientPhone: string; replyTo: string }
  schedule: { enabled: boolean; secondDelayDays: number; thirdDelayDays: number }
  templates: { subject: string; body: string }[]
  invoiceLink: string
}

export function createFollowup(order: HeldOrder, input: unknown, setup: FollowupSetup): Promise<{ followup: Followup; manageToken: string }> {
  return request('/api/payments/followups', {
    method: 'POST',
    body: JSON.stringify({
      orderRef: order.ref,
      accessToken: order.token,
      input,
      contact: setup.contact,
      schedule: setup.schedule,
      templates: setup.templates,
      invoiceLink: setup.invoiceLink || undefined,
      consent: true,
    }),
  })
}

export type FollowupAction =
  | { action: 'view' | 'pause' | 'mark_paid' }
  | { action: 'resume'; sendMissed?: boolean }
  | { action: 'reschedule'; secondDelayDays: number; thirdDelayDays: number }
  | { action: 'update_template'; stage: 1 | 2 | 3; subject: string; body: string }
  | { action: 'update_contact'; contact: { clientEmail: string; clientPhone: string; replyTo: string }; invoiceLink?: string }
  | { action: 'mark_sent' | 'retry'; stage: 1 | 2 | 3 }

export function manageFollowup(held: HeldFollowup, action: FollowupAction): Promise<{ followup: Followup }> {
  return request('/api/payments/followups/manage', {
    method: 'POST',
    body: JSON.stringify({ id: held.id, token: held.token, ...action }),
  })
}

const FOLLOWUP_ID = /^FU-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{20}$/
const FOLLOWUPS_KEY = 'invoice-followups'

export type HeldFollowup = { id: string; token: string; orderRef: string }

// The management secret lives only in this browser; the server keeps its hash.
export function heldFollowups(): HeldFollowup[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(FOLLOWUPS_KEY) || '[]')
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (item): item is HeldFollowup =>
        !!item &&
        typeof item === 'object' &&
        FOLLOWUP_ID.test(String(item.id)) &&
        ACCESS_TOKEN.test(String(item.token)) &&
        ORDER_REF.test(String(item.orderRef)),
    )
  } catch {
    return []
  }
}

export function rememberFollowup(held: HeldFollowup): void {
  try {
    const next = [held, ...heldFollowups().filter((item) => item.id !== held.id && item.orderRef !== held.orderRef)].slice(0, 20)
    localStorage.setItem(FOLLOWUPS_KEY, JSON.stringify(next))
  } catch {
    // Storage may be blocked; reminders still run on the server.
  }
}

export function forgetFollowup(id: string): void {
  try {
    localStorage.setItem(FOLLOWUPS_KEY, JSON.stringify(heldFollowups().filter((item) => item.id !== id)))
  } catch {
    // Nothing to clean up when storage is blocked.
  }
}
