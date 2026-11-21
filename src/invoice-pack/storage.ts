export type StoredEnquiry = {
  name: string
  email: string
  note: string
  at: string
  payment: false
  sent: false
}

export type StoredOrder = {
  orderRef: string
  amountInr: 499 | 399
  upiId: string
  uri: string
  utr: string
  status: 'payment_pending'
  savedAt: string
}

const ENQUIRY_KEY = 'invoice-pack-enquiries'
const ORDER_KEYS = {
  499: 'invoice-pack-orders',
  399: 'advance-receipt-orders',
} as const

function readArray(key: string): unknown[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(key) || '[]')
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function isEnquiry(value: unknown): value is StoredEnquiry {
  if (!value || typeof value !== 'object') return false
  const row = value as Record<string, unknown>
  return (
    typeof row.name === 'string' &&
    row.name.length > 0 &&
    row.name.length <= 120 &&
    typeof row.email === 'string' &&
    row.email.length <= 160 &&
    typeof row.note === 'string' &&
    row.note.length <= 1000 &&
    typeof row.at === 'string' &&
    row.at.length <= 40 &&
    row.payment === false &&
    row.sent === false
  )
}

function isPendingOrder(value: unknown, amount: 499 | 399): value is StoredOrder {
  if (!value || typeof value !== 'object') return false
  const row = value as Record<string, unknown>
  return (
    typeof row.orderRef === 'string' &&
    /^(IP|AR)[0-9]{12}[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{4}$/.test(row.orderRef) &&
    row.amountInr === amount &&
    row.upiId === 'saividyut2@okicici' &&
    typeof row.uri === 'string' &&
    row.uri.startsWith('upi://pay?') &&
    row.uri.includes('pa=saividyut2@okicici') &&
    typeof row.utr === 'string' &&
    /^[A-Za-z0-9]{6,35}$/.test(row.utr) &&
    row.status === 'payment_pending' &&
    typeof row.savedAt === 'string' &&
    row.savedAt.length <= 40
  )
}

export function loadEnquiries(): StoredEnquiry[] {
  return readArray(ENQUIRY_KEY).filter(isEnquiry).slice(0, 20)
}

export function saveEnquiry(item: StoredEnquiry): boolean {
  try {
    const all = [item, ...loadEnquiries()].slice(0, 20)
    localStorage.setItem(ENQUIRY_KEY, JSON.stringify(all))
    return true
  } catch {
    return false
  }
}

export function loadOrders(amount: 499 | 399): StoredOrder[] {
  return readArray(ORDER_KEYS[amount]).filter((row) => isPendingOrder(row, amount)).slice(0, 20)
}

export function saveOrder(order: StoredOrder): boolean {
  try {
    const all = [order, ...loadOrders(order.amountInr)].slice(0, 20)
    localStorage.setItem(ORDER_KEYS[order.amountInr], JSON.stringify(all))
    return true
  } catch {
    return false
  }
}
